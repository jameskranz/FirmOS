import amqp from 'amqplib';
import fs from 'fs/promises';
import fsSync from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. ENGINE_ROOT: Where the FirmOS engine itself is installed (e.g. /app in Docker)
const ENGINE_ROOT = __dirname.includes(path.join('dist', 'src'))
    ? path.resolve(__dirname, '..', '..')
    : path.resolve(__dirname, '..');

// 2. WORKSPACE_ROOT: The target project we are working on (defaults to engine root if not provided)
const WORKSPACE_ROOT = process.env.TARGET_WORKSPACE || ENGINE_ROOT;

// --- Logging Setup ---
const LOGS_DIR = path.join(WORKSPACE_ROOT, 'logs');
let logStream: fsSync.WriteStream | null = null;

function setupLogging() {
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
        originalLog(...args);
    };

    console.error = (...args: any[]) => {
        writeToLog(args, 'ERROR');
        originalError(...args);
    };

    console.warn = (...args: any[]) => {
        writeToLog(args, 'WARN');
        originalWarn(...args);
    };

    console.log(`📝 Logging initialized. File: ${logFile}`);
}

dotenv.config({ path: path.join(ENGINE_ROOT, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ FATAL: GEMINI_API_KEY is missing from .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey.trim().replace(/\r/g, '')); 
const QUEUE_NAME = 'task_routing';
const EXTERNAL_QUEUE = 'external_requests';
const ERROR_QUEUE = 'error_tasks';
const PID_FILE = path.join(WORKSPACE_ROOT, 'daemon.pid');

// --- State Management Selection ---
let stateManager: any;
if (process.env.DATABASE_URL) {
    stateManager = new PostgresStateManager(process.env.DATABASE_URL);
    console.log('🗄️  Using PostgreSQL for state management.');
} else {
    const STATE_FILE = path.join(WORKSPACE_ROOT, 'company', 'state', 'workflows.json');
    stateManager = new JsonStateManager(STATE_FILE);
    console.log('📄 Using JSON files for state management.');
}

const handoffManager = new HandoffManager();
const modelResolver = new ModelResolver(path.join(WORKSPACE_ROOT, 'company', 'role-models.json'));

let amqpConnection: amqp.Connection | null = null;
let amqpChannel: amqp.Channel | null = null;
let isProcessing = false;

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
        const systemInstruction = toolDoc + systemPrompt;

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

            if (!functionCalls || functionCalls.length === 0) {
                const text = response.text();
                if (text && text.trim()) {
                    console.log(`📝 Text Output:\n${text}`);
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

export async function startDaemon() {
    setupLogging();
    await checkSingleton();
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

        if (process.env.DATABASE_URL) {
            const stateManager = new PostgresStateManager(process.env.DATABASE_URL);
            await stateManager.initializeSchema();
            await stateManager.disconnect();
        }

        amqpChannel!.consume(QUEUE_NAME, async (msg) => {
            if (!msg) return;
            const payload = JSON.parse(msg.content.toString());
            await processTask(payload.role, payload.prompt, payload.model, msg, payload.gitInfo);
        });

        amqpChannel!.consume(EXTERNAL_QUEUE, async (msg) => {
            if (!msg) return;
            console.log(`\n📥 External Request Received -> Routing to [intake/consultant]`);
            await processTask('intake/consultant', msg.content.toString(), undefined, msg);
        });

    } catch (error) {
        console.error('Fatal Connection Error:', error);
    }
}

const isMain = process.argv[1] && (path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));
if (isMain) {
    startDaemon();
}
