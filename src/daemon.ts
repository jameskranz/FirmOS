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
import { HandoffManager } from './utils/handoff-manager.js';
import { ModelResolver } from './utils/model-resolver.js';
import { LoopMonitor } from './utils/loop-monitor.js';
import { GitClient } from './utils/git-client.js';
import { getProjectRoot, validateProjectRoot } from './utils/path-resolver.js';
import { eventBus, FirmOsEvent } from './utils/event-bus.js';
import { DirectiveUpdater } from './utils/directive-updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. ENGINE_ROOT: Where the FirmOS engine itself is installed (e.g. /app in Docker)
// Keep this for resolving .env and roles from the install dir if workspace doesn't have them
const ENGINE_ROOT = __dirname.includes(path.join('dist', 'src'))
    ? path.resolve(__dirname, '..', '..')
    : path.resolve(__dirname, '..');

// 2. WORKSPACE_ROOT: The target project we are working on (defaults to CWD)
let WORKSPACE_ROOT = getProjectRoot();

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

dotenv.config({ path: path.join(ENGINE_ROOT, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ FATAL: GEMINI_API_KEY is missing from .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey.trim().replace(/\r/g, '')); 
let PROJECT_ID = 'default';
let QUEUE_NAME = 'task_routing';
let EXTERNAL_QUEUE = 'external_requests';
let ERROR_QUEUE = 'error_tasks';
let CEO_QUEUE = 'ceo_requests';
const PID_FILE = path.join(WORKSPACE_ROOT, 'daemon.pid');

let stateManager: any;

const handoffManager = new HandoffManager();
const modelResolver = new ModelResolver(path.join(WORKSPACE_ROOT, 'company', 'role-models.json'));

let amqpConnection: amqp.Connection | null = null;
let amqpChannel: amqp.Channel | null = null;
let isProcessing = false;
let isPaused = false;

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

async function processTask(role: string, prompt: string, modelOverride?: string, originalMsg?: amqp.ConsumeMessage, gitInfo?: { repositoryUrl: string, branchName?: string }) {
    isProcessing = true;
    const payload = { role, prompt, model: modelOverride, gitInfo };

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
        
        const dbRole = await stateManager.getRole(role);
        if (dbRole) {
            systemPrompt = dbRole.slaContent;
            console.log(`📖 Loaded SLA for [${role}] from Database (${systemPrompt.length} chars)`);
        } else {
            const findSLA = async (root: string) => {
                let rolePath = path.join(root, 'company', 'roles', `${role}.md`);
                if (role.includes('/')) {
                    const familyTaskPath = path.join(root, 'company', 'roles', `${role}.md`);
                    try {
                        await fs.access(familyTaskPath);
                        return familyTaskPath;
                    } catch {
                        const familyBase = path.join(root, 'company', 'roles', `${role.split('/')[0]}.md`);
                        try {
                            await fs.access(familyBase);
                            return familyBase;
                        } catch {}
                    }
                }
                try { await fs.access(rolePath); return rolePath; } catch { return null; }
            };

            const workspacePath = await findSLA(WORKSPACE_ROOT);
            const enginePath = await findSLA(ENGINE_ROOT);
            const finalPath = workspacePath || enginePath;

            if (finalPath) {
                systemPrompt = await fs.readFile(finalPath, 'utf8');
                console.log(`📖 Loaded SLA for [${role}] from File [${finalPath === workspacePath ? 'Workspace' : 'Engine'}] (${systemPrompt.length} chars)`);
            } else {
                console.log(`⚠️  Role [${role}] not found in DB, Workspace, or Engine. Routing to [hr/recruiter] for dynamic hiring.`);
                if (role !== 'hr/recruiter') {
                    const retryPrompt = `DYNAMIC HIRE REQUIRED: Role [${role}] is missing. Please evaluate the project context and hire this role.\n\nOriginal Task:\n${prompt}`;
                    const payload = JSON.stringify({ role: 'hr/recruiter', prompt: retryPrompt, gitInfo });
                    amqpChannel?.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true });
                }
                if (originalMsg) amqpChannel?.ack(originalMsg);
                isProcessing = false;
                return;
            }
        }
        
        const toolDoc = generateToolDocumentation(firmOsTools);
        let directiveContext = '';

        // Hierarchical Directive Injection
        if (dbRole?.managerRole) {
            const manager = dbRole.managerRole;
            const filename = `${manager.replace('/', '-')}.md`;
            const directivePath = path.join(WORKSPACE_ROOT, 'company', 'work', 'directives', filename);
            try {
                const directives = await fs.readFile(directivePath, 'utf8');
                directiveContext = `\n\n# MANDATORY DIRECTIVES FROM YOUR MANAGER (${manager.toUpperCase()})\n${directives}\n\n`;
                console.log(`📋 Injected directives from [${manager}]`);
            } catch (e) {
                // No directives yet, that's fine
            }
        }

        const systemInstruction = toolDoc + directiveContext + systemPrompt;

        console.log(`🧠 Thinking...`);
        
        let model;
        try {
            model = genAI.getGenerativeModel({ 
                model: modelName, 
                systemInstruction: systemInstruction,
                tools: [firmOsTools] 
            });
        } catch (err: any) {
            console.log(`🔍 Model initialization error: ${err.message}`);
            if (modelName !== 'gemini-2.5-flash') {
                console.log(`⚠️  Fallback to default model (gemini-2.5-flash) due to error: ${err.message}`);
                model = genAI.getGenerativeModel({ 
                    model: 'gemini-2.5-flash', 
                    systemInstruction: systemInstruction,
                    tools: [firmOsTools] 
                });
            } else {
                throw err;
            }
        }

        const chat = model.startChat();
        let currentPrompt: string | Array<any> = prompt;
        let loopCount = 0;
        let maxLoops = 5;
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
                            await stateManager.initializeWorkflow({
                                featureId: slug,
                                featureName: (call.args as any).featureName,
                                currentAgent: role,
                                status: 'drafting',
                                workbookPath: `company/work/${slug}.md`,
                                repositoryUrl: (call.args as any).repositoryUrl,
                                approvals: {}
                            });
                            console.log(`✨ [State] Initialized tracking for feature '${slug}'.`);
                        }

                        const handoffConfig = handoffManager.getHandoffConfig(call.name, call.args);
                        if (handoffConfig) {
                            const { featureId } = call.args as any;
                            const nextPrompt = handoffConfig.promptTemplate(call.args);
                            
                            console.log(`📡 [Handoff] Routing feature '${featureId}' to ${handoffConfig.targetRole}...`);
                            
                            await stateManager.updateWorkflow(featureId, {
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
                                const payload = JSON.stringify({ role: handoffConfig.targetRole, prompt: nextPrompt, gitInfo });
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
    console.log('\n🏁 Shutting down daemon...');
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

async function checkSingleton() {
    try {
        if (await fs.access(PID_FILE).then(() => true).catch(() => false)) {
            const pid = await fs.readFile(PID_FILE, 'utf8');
            try {
                process.kill(parseInt(pid, 10), 0);
                console.error(`❌ FATAL: Another daemon instance is already running (PID: ${pid}).`);
                process.exit(1);
            } catch (e) {
                await fs.unlink(PID_FILE).catch(() => {});
            }
        }
    } catch (e) {}
    await fs.writeFile(PID_FILE, process.pid.toString());
    process.on('exit', () => { if (fsSync.existsSync(PID_FILE)) fsSync.unlinkSync(PID_FILE); });
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGHUP', shutdown);
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

    rl.close();
    console.log("✨ Project initialized successfully!\n");
}

export async function startDaemon(options: { tuiMode?: boolean } = {}) {
    setupLogging(options.tuiMode);
    await checkSingleton();

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
    }

    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
        amqpConnection = await amqp.connect(rabbitUrl) as any;
        amqpChannel = await (amqpConnection as any).createChannel();
        
        await amqpChannel!.assertQueue(QUEUE_NAME, { durable: true });
        await amqpChannel!.assertQueue(EXTERNAL_QUEUE, { durable: true });
        await amqpChannel!.assertQueue(ERROR_QUEUE, { durable: true });
        
        const toolNames = (firmOsTools as any).functionDeclarations?.map((f: any) => f.name).join(', ') || 'none';
        console.log(`👂 FirmOS Orchestrator listening... [Model: gemini-2.5-flash]`);
        console.log(`🛠️  Tools loaded: [${toolNames}]`);

        // --- State Management Selection ---
        if (process.env.DATABASE_URL) {
            stateManager = new PostgresStateManager(PROJECT_ID, process.env.DATABASE_URL);
            await stateManager.initializeSchema();
            console.log(`🗄️  Using PostgreSQL for state management (Project: ${PROJECT_ID}).`);
        } else {
            const STATE_FILE = path.join(WORKSPACE_ROOT, 'company', 'state', 'workflows.json');
            stateManager = new JsonStateManager(STATE_FILE, PROJECT_ID);
            console.log(`📄 Using JSON files for state management (Project: ${PROJECT_ID}).`);
        }

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
            await processTask(payload.role, payload.prompt, payload.model, msg, payload.gitInfo);
        });

        amqpChannel!.consume(EXTERNAL_QUEUE, async (msg) => {
            if (!msg) return;
            console.log(`\n📥 External Request Received -> Routing to [intake/consultant]`);
            await processTask('intake/consultant', msg.content.toString(), undefined, msg);
        });

        // Listen for CEO responses from TUI
        eventBus.on('ceo_response', async ({ originalPayload, response }) => {
            console.log(`\n👑 CEO Decision received for [${originalPayload.role}]`);
            
            // 1. Log to DB
            if (stateManager) {
                await stateManager.logCeoInteraction(originalPayload.prompt, response);
            }

            // 2. Update summary artifact
            const directiveUpdater = new DirectiveUpdater(apiKey as string);
            await directiveUpdater.updateDirectives({ 
                prompt: originalPayload.prompt, 
                response: response 
            });

            const payload = {
                role: originalPayload.role,
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
                await stateManager.logCeoInteraction('Initial Task Dispatch', prompt);
            }

            // 2. Update summary artifact
            const directiveUpdater = new DirectiveUpdater(apiKey as string);
            await directiveUpdater.updateDirectives({ 
                prompt: 'Initial Task Dispatch', 
                response: prompt 
            });

            const payload = {
                role: 'intake/consultant',
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

    } catch (error) {
        console.error('Fatal Connection Error:', error);
    }
}

const isMain = process.argv[1] && (path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));
if (isMain) {
    startDaemon();
}
