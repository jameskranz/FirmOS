#!/usr/bin/env node
import amqp from 'amqplib';
import fs from 'fs/promises';
import fsSync from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'node:readline/promises';
import crypto from 'node:crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Tool } from '@google/generative-ai';
import dotenv from 'dotenv';
import { firmOsTools, allTools } from './tools/index.js';
import { JsonStateManager } from './state/json.js';
import { PostgresStateManager } from './state/postgres.js';
import { seedDefaultData } from './state/seeder.js';
import { HandoffManager } from './utils/handoff-manager.js';
import { ModelResolver } from './utils/model-resolver.js';
import { LoopMonitor } from './utils/loop-monitor.js';
import { GitClient } from './utils/git-client.js';
import { getProjectRoot, validateProjectRoot, getArtifactsDir } from './utils/path-resolver.js';
import { eventBus, FirmOsEvent, bridgeToBroker } from './utils/event-bus.js';
import { DirectiveUpdater } from './utils/directive-updater.js';
import { MessageBroker } from './utils/message-broker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. ENGINE_ROOT: Where the FirmOS engine itself is installed (e.g. /app in Docker)
// Keep this for resolving .env and roles from the install dir if workspace doesn't have them
const ENGINE_ROOT = __dirname.includes(path.join('dist', 'src'))
    ? path.resolve(__dirname, '..', '..')
    : path.resolve(__dirname, '..');

// 2. WORKSPACE_ROOT: The target project we are working on (defaults to CWD)
let WORKSPACE_ROOT = getProjectRoot();

// --- Global Variables ---
let PROJECT_ID = 'default';
let QUEUE_NAME = 'task_routing';
let EXTERNAL_QUEUE = 'external_requests';
let ERROR_QUEUE = 'error_tasks';
let CEO_QUEUE = 'ceo_requests';
let PID_FILE: string;

let stateManager: any;
let handoffManager: HandoffManager;
let modelResolver: ModelResolver;
let genAI: GoogleGenerativeAI;
let apiKey: string | undefined;

let amqpConnection: amqp.Connection | null = null;
let amqpChannel: amqp.Channel | null = null;
let isProcessing = false;
let isPaused = false;

// --- Logging Setup ---
const LOGS_DIR = path.join(WORKSPACE_ROOT, 'logs');
let logStream: fsSync.WriteStream | null = null;

function setupLogging(tuiMode = false) {
    if (!fsSync.existsSync(LOGS_DIR)) {
        fsSync.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(LOGS_DIR, `daemon-${timestamp}.log`);
    logStream = fsSync.createWriteStream(logFile, { flags: 'a' });

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const writeToLog = (args: any[], type: string) => {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
        const entry = `[${new Date().toISOString()}] [${type}] ${msg}\n`;
        logStream?.write(entry);
    };

    console.log = (...args: any[]) => {
        writeToLog(args, 'INFO');
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
        eventBus.emit(FirmOsEvent.LOG, msg);
        if (!tuiMode) originalLog(...args);
    };

    console.error = (...args: any[]) => {
        writeToLog(args, 'ERROR');
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
        eventBus.emit(FirmOsEvent.LOG, `❌ ERROR: ${msg}`);
        if (!tuiMode) originalError(...args);
    };

    console.warn = (...args: any[]) => {
        writeToLog(args, 'WARN');
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
        eventBus.emit(FirmOsEvent.LOG, `⚠️ WARN: ${msg}`);
        if (!tuiMode) originalWarn(...args);
    };

    if (!tuiMode) console.log(`📝 Logging initialized. File: ${logFile}`);
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let attempt = 0;
    while (attempt < maxAttempts) {
        try {
            return await fn();
        } catch (err: any) {
            attempt++;
            const isRateLimit = err.message?.includes('429') || err.message?.includes('Too Many Requests');
            if (isRateLimit && attempt < maxAttempts) {
                let delayMs = 15000;
                const retryMatch = err.message?.match(/retry in ([\d\.]+)s/);
                if (retryMatch) {
                    delayMs = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000;
                }
                
                console.warn(`🛑 Rate limit (429) hit. Retrying in ${Math.ceil(delayMs/1000)}s... (Attempt ${attempt}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
            }
            throw err;
        }
    }
    throw new Error('Max retry attempts reached');
}

async function processTask(role: string, prompt: string, modelOverride?: string, originalMsg?: amqp.ConsumeMessage, gitInfo?: { repositoryUrl: string, branchName?: string }, fromRole?: string) {
    if (isProcessing) {
        console.log(`⏳ Busy processing another task. Re-queueing [${role}]...`);
        if (originalMsg) {
            // Delay slightly before nacking to avoid a tight spin loop if only one worker
            setTimeout(() => amqpChannel?.nack(originalMsg, false, true), 1000);
        }
        return;
    }
    isProcessing = true;
    const payload = { role, fromRole, prompt, model: modelOverride, gitInfo };

    try {
        // --- 1. Workspace Sync (Git) ---
        if (gitInfo?.repositoryUrl && process.env.TARGET_WORKSPACE) {
            console.log(`🌀 Syncing workspace: ${gitInfo.repositoryUrl}`);
            const git = new GitClient(process.env.TARGET_WORKSPACE);
            
            const hasGit = await fs.stat(path.join(process.env.TARGET_WORKSPACE, '.git')).then(() => true).catch(() => false);
            
            if (!hasGit) {
                console.log(`Workspace not a git repo. Wiping and cloning...`);
                await fs.rm(process.env.TARGET_WORKSPACE, { recursive: true, force: true });
                await git.clone(gitInfo.repositoryUrl);
            } else {
                try {
                    const currentRemote = await git.run('remote get-url origin').then(r => r.stdout.trim());
                    if (currentRemote !== gitInfo.repositoryUrl) {
                        console.log(`Repository mismatch (${currentRemote} vs ${gitInfo.repositoryUrl}). Wiping workspace...`);
                        await fs.rm(process.env.TARGET_WORKSPACE, { recursive: true, force: true });
                        await git.clone(gitInfo.repositoryUrl);
                    } else {
                        await git.pull();
                    }
                } catch (e) {
                     console.log(`Git check failed. Forcing re-clone...`);
                     await fs.rm(process.env.TARGET_WORKSPACE, { recursive: true, force: true });
                     await git.clone(gitInfo.repositoryUrl);
                }
            }

            if (gitInfo.branchName) {
                await git.checkout(gitInfo.branchName, true);
            }
        }

        // --- 2. Logic Execution ---
        if (role === 'ceo') {
            console.log(`\n👑 HITL: Routing task to [ceo] (Human User)`);
            eventBus.emit(FirmOsEvent.CEO_REQUEST, payload);
            await amqpChannel!.assertQueue(CEO_QUEUE, { durable: true });
            await amqpChannel!.sendToQueue(CEO_QUEUE, Buffer.from(JSON.stringify(payload)), { persistent: true });
            if (originalMsg) amqpChannel!.ack(originalMsg);
            isProcessing = false;
            return;
        }

        const modelName = await modelResolver.resolve(role, modelOverride);
        console.log(`\n📥 Task Received: [${role}] (Model: ${modelName})`);
        
        let systemPrompt = '';
        
        const dbRole = await stateManager.roles.get(role);
        if (dbRole) {
            systemPrompt = dbRole.slaContent;
            console.log(`📖 Loaded SLA for [${role}] from Database (${systemPrompt.length} chars)`);
        } else {
            console.log(`⚠️  Role [${role}] not found in DB. Routing to [hr/recruiter] for dynamic hiring.`);
            if (role !== 'hr/recruiter') {
                const retryPrompt = `DYNAMIC HIRE REQUIRED: Role [${role}] is missing. Please evaluate the project context and hire this role.\n\nOriginal Task:\n${prompt}`;
                const payload = JSON.stringify({ role: 'hr/recruiter', fromRole: role, prompt: retryPrompt, gitInfo });
                amqpChannel?.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true });
            }
            if (originalMsg) amqpChannel?.ack(originalMsg);
            isProcessing = false;
            return;
        }
        
        // Filter tools based on allowedTools
        let filteredTools = allTools;
        if (dbRole?.allowedTools && Array.isArray(dbRole.allowedTools)) {
            filteredTools = allTools.filter(t => dbRole.allowedTools.includes(t.definition.name));
        }

        const toolDoc = generateToolDocumentation({ functionDeclarations: filteredTools.map(t => t.definition) } as any);
        let directiveContext = '';

        // Help Bubbling Instruction
        const helpInstruction = `\n\n# PLATFORM LIMITATIONS & ASSISTANCE
If you find that your current toolset is insufficient to complete a task, you MUST NOT hallucinate tools or struggle indefinitely.
Instead, use 'publish_message' to contact your manager (${dbRole?.managerRole || 'ceo'}) or use 'request_hire' to request a specialized agent who possesses the necessary capabilities.
Always be explicit about what tool or capability you are missing.\n\n`;

        // Hierarchical Directive Injection
        if (dbRole?.managerRole) {
            const manager = dbRole.managerRole;
            const directives = await stateManager.directives.get(manager);

            if (directives) {
                directiveContext = `\n\n# MANDATORY DIRECTIVES FROM YOUR MANAGER (${manager.toUpperCase()})\n${directives}\n\n`;
                console.log(`📋 Injected directives from [${manager}]`);
            }
        }

        const systemInstruction = toolDoc + helpInstruction + directiveContext + systemPrompt;

        console.log(`🧠 Thinking...`);
        
        let model;
        try {
            model = genAI.getGenerativeModel({ 
                model: modelName, 
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations: filteredTools.map(t => t.definition) } as any] 
            });
        } catch (err: any) {
            console.log(`🔍 Model initialization error: ${err.message}`);
            if (modelName !== 'gemini-2.5-flash') {
                console.log(`⚠️  Fallback to default model (gemini-2.5-flash) due to error: ${err.message}`);
                model = genAI.getGenerativeModel({ 
                    model: 'gemini-2.5-flash', 
                    systemInstruction: systemInstruction,
                    tools: [{ functionDeclarations: filteredTools.map(t => t.definition) } as any] 
                });
            } else {
                throw err;
            }
        }

        const chat = model.startChat();
        let currentPrompt: string | Array<any> = prompt;
        let loopCount = 0;
        let maxLoops = 10;
        const loopMonitorModelName = await modelResolver.resolve('system/loop-monitor');
        const loopMonitor = new LoopMonitor(genAI, loopMonitorModelName);

        while (loopCount < maxLoops) {
            loopCount++;
            let result;
            try {
                result = await withRetry(() => chat.sendMessage(currentPrompt));
            } catch (err: any) {
                console.log(`🔍 Runtime error in micro-loop: ${err.message}`);
                if (loopCount === 1 && modelName !== 'gemini-2.5-flash') {
                    console.log(`⚠️  Fallback to default model (gemini-2.5-flash) due to runtime error: ${err.message}`);
                    const fallbackModel = genAI.getGenerativeModel({ 
                        model: 'gemini-2.5-flash', 
                        systemInstruction: systemInstruction,
                        tools: [firmOsTools] 
                    });
                    const fallbackChat = fallbackModel.startChat();
                    result = await withRetry(() => fallbackChat.sendMessage(prompt));
                } else {
                    throw err;
                }
            }
            const response = result.response;
            const functionCalls = response.functionCalls();
            const text = response.text();

            if (text && text.trim()) {
                console.log(`💭 Reasoning:\n${text}`);
            }

            if (!functionCalls || functionCalls.length === 0) {
                // If we already logged it as reasoning, maybe we don't need 'Text Output' label here,
                // but let's keep it for final responses to distinguish them.
                if (text && text.trim()) {
                    console.log(`🏁 Final Response:\n${text}`);
                } else if (loopCount === 1) {
                    console.log(`⚠️  Empty response received from model.`);
                }
                break;
            }

            console.log(`🔧 [Loop ${loopCount}/${maxLoops}] Executing ${functionCalls.length} tool call(s)...`);
            
            if (loopCount === maxLoops && maxLoops < 15) {
                console.log(`👁️‍🗨️  Analyzing loop progress...`);
                const history = await chat.getHistory();
                const status = await loopMonitor.analyze(history);
                if (status === 'PROGRESSING') {
                    console.log(`🚀 LoopMonitor detected progress. Extending limit (+5).`);
                    maxLoops += 5;
                } else {
                    console.log(`🛑 LoopMonitor detected a STUCK state. Halting.`);
                }
            }

            const toolResponses: any[] = [];
            let handoffOccurred = false;

            for (const call of functionCalls) {
                const tool = allTools.find(t => t.definition.name === call.name);
                if (tool) {
                    try {
                        const toolResult = await tool.execute(call.args as any);
                        toolResponses.push({
                            functionResponse: {
                                name: call.name,
                                response: { content: toolResult || "Success" }
                            }
                        });

                        if (call.name === 'initialize_feature_work') {
                            const slug = (call.args as any).featureName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim();
                            await stateManager.workflows.initialize({
                                featureId: slug,
                                featureName: (call.args as any).featureName,
                                currentAgent: role,
                                status: 'drafting',
                                workbookPath: path.join(getArtifactsDir(), `${slug}.md`),
                                repositoryUrl: (call.args as any).repositoryUrl,
                                approvals: {}
                            });
                            console.log(`✨ [State] Initialized tracking for feature '${slug}'.`);
                        }

                        const handoffConfig = handoffManager.getHandoffConfig(call.name, call.args);
                        if (handoffConfig || call.name === 'publish_message' || call.name === 'submit_review_result' || call.name === 'submit_feedback') {
                            handoffOccurred = true;
                        }

                        if (handoffConfig) {
                            const { featureId } = call.args as any;
                            const nextPrompt = handoffConfig.promptTemplate(call.args);
                            
                            console.log(`📡 [Handoff] Routing feature '${featureId}' to ${handoffConfig.targetRole}...`);
                            
                            await stateManager.workflows.update(featureId, {
                                currentAgent: handoffConfig.targetRole,
                                status: handoffConfig.nextStatus
                            }, {
                                timestamp: new Date().toISOString(),
                                fromAgent: role,
                                toAgent: handoffConfig.targetRole,
                                action: call.name,
                                note: (call.args as any).note || (call.args as any).feedback
                            });

                            if (handoffConfig.targetRole !== 'human') {
                                const payload = JSON.stringify({ role: handoffConfig.targetRole, fromRole: role, prompt: nextPrompt, gitInfo });
                                amqpChannel!.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true });
                                console.log(`🚀 [Handoff] Published task for ${handoffConfig.targetRole}.`);
                            } else {
                                console.log(`🛑 [Handoff] Workflow paused for human approval.`);
                            }
                        }
                    } catch (err: any) {
                        console.error(`❌ Error executing ${call.name}:`, err.message);
                        toolResponses.push({
                            functionResponse: {
                                name: call.name,
                                response: { error: err.message }
                            }
                        });
                    }
                } else {
                    console.error(`⚠️  Unknown tool requested: ${call.name}`);
                }
            }
            currentPrompt = toolResponses;
            if (handoffOccurred) {
                console.log(`🏁 Handoff completed. Terminating micro-loop.`);
                break;
            }
        }

        if (loopCount >= maxLoops) {
            console.warn(`⚠️  Micro-loop hit maxLoops (${maxLoops})`);
        }

        console.log(`🏁 Task Completed: [${role}]`);
        if (originalMsg) amqpChannel!.ack(originalMsg);
    } catch (error: any) {
        console.error(`❌ Error:`, error.message);
        const isFatal = error.message.includes('401') || error.message.includes('403') || error.code === 'EACCES';
        if (isFatal) {
            await amqpChannel!.sendToQueue(ERROR_QUEUE, Buffer.from(JSON.stringify({ payload, error: error.message })), { persistent: true });
            if (originalMsg) amqpChannel!.ack(originalMsg);
        } else {
            if (originalMsg) setTimeout(() => amqpChannel!.nack(originalMsg), 10000);
        }
    } finally {
        isProcessing = false;
    }
}

async function shutdown() {
    const msg = '\n🏁 Shutting down daemon...';
    console.log(msg);
    setTimeout(() => {
        console.error('🔥 Graceful shutdown timed out. Force exiting.');
        process.exit(1);
    }, 15000).unref();

    if (isProcessing) {
        console.log('⏳ Waiting for active task to complete...');
        let waitCount = 0;
        while (isProcessing && waitCount < 10) {
            await new Promise(r => setTimeout(r, 1000));
            waitCount++;
        }
    }

    try {
        if (amqpChannel) await (amqpChannel as any).close();
        if (amqpConnection) await (amqpConnection as any).close();
        if (logStream) logStream.end();
    } catch (e) {}
    process.exit(0);
}

async function checkSingleton(tuiMode = false) {
    try {
        if (await fs.access(PID_FILE).then(() => true).catch(() => false)) {
            const pid = await fs.readFile(PID_FILE, 'utf8');
            try {
                process.kill(parseInt(pid, 10), 0);
                const msg = `❌ FATAL: Another daemon instance is already running (PID: ${pid}).`;
                if (tuiMode) {
                    eventBus.emit(FirmOsEvent.LOG, msg);
                    process.exit(1);
                } else {
                    console.error(msg);
                    process.exit(1);
                }
            } catch (e) {
                await fs.unlink(PID_FILE).catch(() => {});
            }
        }
    } catch (e) {}
    await fs.writeFile(PID_FILE, process.pid.toString());
    process.on('exit', () => { if (fsSync.existsSync(PID_FILE)) fsSync.unlinkSync(PID_FILE); });
    
    if (!tuiMode) {
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        process.on('SIGHUP', shutdown);
    }
    
    process.on('uncaughtException', (err) => { console.error('💥 Uncaught Exception:', err); shutdown(); });
    process.on('unhandledRejection', (reason, promise) => { console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason); shutdown(); });
}

function generateToolDocumentation(tools: Tool): string {
    let doc = "# PLATFORM CAPABILITIES (AUTO-INJECTED)\n\n";
    doc += "You operate in a tool-enabled environment. The following function calls are available to you:\n\n";
    (tools as any).functionDeclarations?.forEach((fn: any) => {
        const toolInstance = allTools.find(t => t.definition.name === fn.name);
        doc += `## Tool: ${fn.name}\nDescription: ${fn.description}\n`;
        if (toolInstance?.guidance) doc += `Usage Guidance: ${toolInstance.guidance}\n`;
        doc += "Parameters (JSON Schema):\n";
        doc += `\`\`\`json\n${JSON.stringify(fn.parameters, null, 2)}\n\`\`\`\n\n`;
    });
    doc += "---\n\n";
    return doc;
}

export async function initializeProjectContext() {
    // If we are already running in a context where stdin is managed (like TUI), 
    // we should NOT use readline here.
    if (process.stdin.isTTY && (process as any)._blessed) {
        return;
    }
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("\n🚀 Welcome to FirmOS!");
    const answer = await rl.question("No FirmOS project found in this directory. Would you like to initialize one? (y/n): ");
    
    if (answer.toLowerCase() !== 'y') {
        console.log("❌ Initialization cancelled. Exiting.");
        process.exit(1);
    }

    const cwd = process.cwd();
    const git = new GitClient(cwd);
    let hasGit = fsSync.existsSync(path.join(cwd, '.git'));

    if (hasGit) {
        console.log("📂 Git repository detected.");
    } else {
        const gitAction = await rl.question("No git repository found. (1) Initialize new git repo, (2) Provide remote URL to clone, (3) Skip git: ");
        if (gitAction === '1') {
            await git.run('init');
            console.log("✅ Initialized new git repository.");
            hasGit = true;
        } else if (gitAction === '2') {
            const url = await rl.question("Enter remote repository URL: ");
            await git.clone(url);
            console.log("✅ Cloned repository.");
            hasGit = true;
        }
    }

    // Create .firmosrc
    const projectId = crypto.randomUUID();
    await fs.writeFile(path.join(cwd, '.firmosrc'), `# FirmOS Project Configuration\ncreated_at: ${new Date().toISOString()}\nproject_id: ${projectId}\n`);
    console.log(`✅ Created .firmosrc (Project ID: ${projectId})`);

    // --- PRD Seeding (Reference Artifact) ---
    const seedPath = process.env.PRD_SEED_PATH || path.join(cwd, 'initial-prd.md');
    if (fsSync.existsSync(seedPath)) {
        const seedContent = fsSync.readFileSync(seedPath, 'utf8');
        const workDir = getArtifactsDir();
        if (!fsSync.existsSync(workDir)) await fs.mkdir(workDir, { recursive: true });
        
        const prdPath = path.join(workDir, 'seed-prd.md');
        await fs.writeFile(prdPath, seedContent);
        console.log(`🌱 Seed PRD saved to ${prdPath}`);
    }

    rl.close();
    console.log("✨ Project initialized successfully!\n");
}

export async function startDaemon(options: { tuiMode?: boolean } = {}) {
    WORKSPACE_ROOT = getProjectRoot();
    PID_FILE = path.join(WORKSPACE_ROOT, 'daemon.pid');

    setupLogging(options.tuiMode);
    await checkSingleton(options.tuiMode);

    dotenv.config({ path: path.join(ENGINE_ROOT, '.env') });
    apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        const msg = "❌ FATAL: GEMINI_API_KEY is missing from .env";
        if (options.tuiMode) {
            eventBus.emit(FirmOsEvent.LOG, msg);
            return;
        } else {
            console.error(msg);
            process.exit(1);
        }
    }

    genAI = new GoogleGenerativeAI(apiKey.trim().replace(/\r/g, ''));
    handoffManager = new HandoffManager();

    // --- Dynamic Worker Initialization ---
    if (process.env.AUTOCLONE_REPO) {
        console.log(`🔒 Worker pinned to repo: ${process.env.AUTOCLONE_REPO}`);
        process.env.TARGET_WORKSPACE = '/workspace';
        
        // Ensure workspace directory exists
        if (!fsSync.existsSync('/workspace')) {
            await fs.mkdir('/workspace', { recursive: true });
        }
        
        const git = new GitClient('/workspace');
        const hasGit = await fs.stat(path.join('/workspace', '.git')).then(() => true).catch(() => false);
        
        if (!hasGit) {
            console.log(`⬇️  Cloning ${process.env.AUTOCLONE_REPO}...`);
            await git.clone(process.env.AUTOCLONE_REPO);
        } else {
             // Validate it's the right repo
             const currentRemote = await git.run('remote get-url origin').then(r => r.stdout.trim()).catch(() => '');
             if (currentRemote !== process.env.AUTOCLONE_REPO) {
                 console.log(`⚠️  Existing repo (${currentRemote}) differs from pinned repo. Wiping...`);
                 await fs.rm('/workspace', { recursive: true, force: true });
                 await fs.mkdir('/workspace');
                 await git.clone(process.env.AUTOCLONE_REPO);
             }
        }
        process.chdir('/workspace');
        WORKSPACE_ROOT = '/workspace';
        // Create .firmosrc if missing to satisfy validation
        if (!fsSync.existsSync(path.join(WORKSPACE_ROOT, '.firmosrc'))) {
             await fs.writeFile(path.join(WORKSPACE_ROOT, '.firmosrc'), `# Auto-generated by Worker\n`);
        }
    }

    try {
        validateProjectRoot();
    } catch (err) {
        if (options.tuiMode) {
            eventBus.emit(FirmOsEvent.LOG, "⚠️ FirmOS context not found. Initialization required.");
            return;
        }
        await initializeProjectContext();
        // Re-validate and update WORKSPACE_ROOT after init
        validateProjectRoot();
        WORKSPACE_ROOT = getProjectRoot();
    }

    // --- Resolve Project ID & Queues (Post-Initialization) ---
    PROJECT_ID = process.env.PROJECT_ID || 'default';
    if (PROJECT_ID === 'default') {
        try {
            const rcPath = path.join(WORKSPACE_ROOT, '.firmosrc');
            if (fsSync.existsSync(rcPath)) {
                const rcContent = fsSync.readFileSync(rcPath, 'utf8');
                const match = rcContent.match(/project_id:\s*([a-zA-Z0-9-]+)/);
                if (match) PROJECT_ID = match[1];
            }
        } catch (e) {}
    }
    
    QUEUE_NAME = `task_routing_${PROJECT_ID}`;
    EXTERNAL_QUEUE = `external_requests_${PROJECT_ID}`;
    ERROR_QUEUE = `error_tasks_${PROJECT_ID}`;
    CEO_QUEUE = `ceo_requests_${PROJECT_ID}`;

    if (!options.tuiMode) {
        console.log(`🔒 Project Context: ${PROJECT_ID}`);
        console.log(`📨 Listening on queues: ${QUEUE_NAME}, ${EXTERNAL_QUEUE}`);
    } else {
        eventBus.emit(FirmOsEvent.LOG, `🔒 Project Context: ${PROJECT_ID}`);
    }

    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
        amqpConnection = await amqp.connect(rabbitUrl) as any;
        amqpChannel = await (amqpConnection as any).createChannel();

        // Setup cross-process event bridging
        const broker = new MessageBroker();
        await broker.connect();
        bridgeToBroker(broker);
        
        await amqpChannel!.assertQueue(QUEUE_NAME, { durable: true });
        await amqpChannel!.assertQueue(EXTERNAL_QUEUE, { durable: true });
        await amqpChannel!.assertQueue(ERROR_QUEUE, { durable: true });
        
        // Ensure we only handle one message at a time globally (even across queues)
        await amqpChannel!.prefetch(1);
        
        const toolNames = (firmOsTools as any).functionDeclarations?.map((f: any) => f.name).join(', ') || 'none';
        if (!options.tuiMode) {
            console.log(`👂 FirmOS Orchestrator listening... [Model: gemini-2.5-flash]`);
            console.log(`🛠️  Tools loaded: [${toolNames}]`);
        } else {
            eventBus.emit(FirmOsEvent.LOG, `👂 Orchestrator online (Project: ${PROJECT_ID})`);
        }

        // --- State Management Selection ---
        if (process.env.DATABASE_URL) {
            stateManager = new PostgresStateManager(PROJECT_ID, process.env.DATABASE_URL);
            await (stateManager as PostgresStateManager).initializeSchema();
            if (!options.tuiMode) console.log(`🗄️  Using PostgreSQL for state management (Project: ${PROJECT_ID}).`);
        } else {
            const STATE_FILE = path.join(WORKSPACE_ROOT, '.firmos-state.json');
            stateManager = new JsonStateManager(STATE_FILE, PROJECT_ID);
            if (!options.tuiMode) console.log(`📄 Using JSON files for state management (Project: ${PROJECT_ID}).`);
        }

        // Expose stateManager globally for tools to use
        (global as any).firmOsStateManager = stateManager;

        // Auto-seed default roles and tiers
        await seedDefaultData(stateManager);

        modelResolver = new ModelResolver(stateManager);

        amqpChannel!.consume(QUEUE_NAME, async (msg) => {
            if (!msg) return;

            // --- Pause Logic ---
            while (isPaused) {
                await new Promise(r => setTimeout(r, 1000));
            }

            // --- Filter Logic ---
            const taskFilter = process.env.TASK_FILTER;
            if (taskFilter) {
                // Check headers
                const msgRepo = msg.properties.headers?.['x-repo-url'];
                // Also check payload just in case
                const payload = JSON.parse(msg.content.toString());
                const payloadRepo = payload.gitInfo?.repositoryUrl;

                const targetRepo = msgRepo || payloadRepo;
                
                // If we have a filter, and the message doesn't match it (or has no repo info), skip it.
                // NOTE: If message has NO repo info, generic workers should pick it up. 
                // Pinned workers should ONLY pick up matching repo info.
                if (targetRepo !== process.env.AUTOCLONE_REPO) {
                     // Nack with requeue so generic workers can take it
                     amqpChannel!.nack(msg, false, true);
                     return;
                }
            }

            const payload = JSON.parse(msg.content.toString());

            // --- System Message Handling ---
            if (payload.role === 'system/shutdown') {
                console.log('🛑 RECEIVED SYSTEM SHUTDOWN MESSAGE');
                eventBus.emit(FirmOsEvent.SHUTDOWN);
                if (msg) amqpChannel!.ack(msg);
                return;
            }

            await processTask(payload.role, payload.prompt, payload.model, msg, payload.gitInfo, payload.fromRole);
        });

        amqpChannel!.consume(EXTERNAL_QUEUE, async (msg) => {
            if (!msg) return;
            console.log(`\n📥 External Request Received -> Routing to [intake/consultant]`);
            await processTask('intake/consultant', msg.content.toString(), undefined, msg);
        });

        // Listen for CEO responses from TUI
        eventBus.on('ceo_response', async ({ originalPayload, response }) => {
            console.log(`\n👑 CEO Decision received for [${originalPayload.fromRole || 'unknown'}]`);
            
            // 1. Log to DB
            if (stateManager) {
                await stateManager.ceoMemory.log(originalPayload.prompt, response);
            }

            // 2. Update summary artifact
            const directiveUpdater = new DirectiveUpdater(apiKey as string);
            await directiveUpdater.updateDirectives({ 
                prompt: originalPayload.prompt, 
                response: response 
            }, 'ceo', stateManager);

            const targetRole = originalPayload.fromRole || 'hr/director';
            const payload = {
                role: targetRole,
                fromRole: 'ceo',
                prompt: `CEO FEEDBACK:\n${response}\n\nORIGINAL PROMPT:\n${originalPayload.prompt}`,
                gitInfo: originalPayload.gitInfo
            };
            await amqpChannel!.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), { persistent: true });
        });

        // Listen for TUI task dispatch
        eventBus.on(FirmOsEvent.DISPATCH_TASK, async (prompt) => {
            console.log(`\n📨 TUI Dispatch: ${prompt}`);

            // 1. Log to DB
            if (stateManager) {
                await stateManager.ceoMemory.log('Initial Task Dispatch', prompt);
            }

            // 2. Update summary artifact
            const directiveUpdater = new DirectiveUpdater(apiKey as string);
            await directiveUpdater.updateDirectives({ 
                prompt: 'Initial Task Dispatch', 
                response: prompt 
            }, 'ceo', stateManager);

            const payload = {
                role: 'intake/consultant',
                fromRole: 'ceo',
                prompt: prompt,
                timestamp: new Date().toISOString()
            };
            await amqpChannel!.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), { persistent: true });
        });

        // --- Control Listeners ---
        eventBus.on(FirmOsEvent.PAUSE, () => {
            isPaused = true;
            console.log('⏸️  Swarm PAUSED');
            eventBus.emit(FirmOsEvent.STATUS_UPDATE, 'PAUSED');
        });

        eventBus.on(FirmOsEvent.RESUME, () => {
            isPaused = false;
            console.log('▶️  Swarm RESUMED');
            eventBus.emit(FirmOsEvent.STATUS_UPDATE, 'RUNNING');
        });

        eventBus.on(FirmOsEvent.PURGE, async () => {
            console.log('💣 PURGING QUEUES...');
            try {
                await amqpChannel!.purgeQueue(QUEUE_NAME);
                await amqpChannel!.purgeQueue(EXTERNAL_QUEUE);
                console.log('✅ Queues purged.');
            } catch (err: any) {
                console.error(`❌ Purge failed: ${err.message}`);
            }
        });

        eventBus.on(FirmOsEvent.SHUTDOWN, async () => {
            await shutdown();
        });

        eventBus.on('request_tickets', async () => {
            if (stateManager) {
                try {
                    const all = await stateManager.tickets.listAll();
                    eventBus.emit('tickets_list', all);
                } catch (e) {
                    console.error('Failed to fetch tickets for TUI');
                }
            }
        });

        eventBus.on(FirmOsEvent.RESET, async () => {
            console.log('🧹 RECEIVED RESET COMMAND...');
            if (stateManager) {
                await stateManager.purgeProjectData();
            }
            // Queues are already handled by PURGE event, 
            // but we'll re-trigger it here for a full reset.
            eventBus.emit(FirmOsEvent.PURGE);
        });

        eventBus.on(FirmOsEvent.BOOTSTRAP_SEED, async () => {
            console.log('🌱 BOOTSTRAPPING PROJECT FROM SEED PRD...');
            const seedPath = process.env.PRD_SEED_PATH || path.join(WORKSPACE_ROOT, 'initial-prd.md');
            try {
                if (fsSync.existsSync(seedPath)) {
                    const seedContent = await fs.readFile(seedPath, 'utf8');
                    
                    const payload = {
                        role: 'intake/consultant',
                        fromRole: 'ceo',
                        prompt: `BOOTSTRAP REQUEST: I am providing an initial seed PRD to bootstrap this project. Please review the content below, initialize the necessary feature workbooks, and initiate the standard SDLC triage process.\n\nSEED CONTENT:\n${seedContent}`,
                        timestamp: new Date().toISOString()
                    };

                    await amqpChannel!.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), { persistent: true });
                    console.log(`✅ Successfully dispatched bootstrap task from ${seedPath}`);
                } else {
                    console.error(`❌ Seed file not found at: ${seedPath}`);
                }
            } catch (err: any) {
                console.error(`❌ Bootstrap failed: ${err.message}`);
            }
        });

    } catch (error) {
        console.error('Fatal Connection Error:', error);
    }
}

const isMain = process.argv[1] && (path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));
if (isMain) {
    startDaemon();
}
