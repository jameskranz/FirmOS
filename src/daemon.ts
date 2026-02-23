import amqp from 'amqplib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Tool } from '@google/generative-ai';
import dotenv from 'dotenv';
import { firmOsTools, allTools } from './tools/index.ts';
import { JsonStateManager } from './state/json.ts';
import { HandoffManager } from './utils/handoff-manager.ts';
import { ModelResolver } from './utils/model-resolver.ts';
import { LoopMonitor } from './utils/loop-monitor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ FATAL: GEMINI_API_KEY is missing from .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey.trim().replace(/\r/g, '')); 
const QUEUE_NAME = 'task_routing';
const EXTERNAL_QUEUE = 'external_requests';
const ERROR_QUEUE = 'error_tasks';
const PID_FILE = path.join(__dirname, '..', 'daemon.pid');
const STATE_FILE = path.join(__dirname, '..', 'company', 'state', 'workflows.json');

const stateManager = new JsonStateManager(STATE_FILE);
const handoffManager = new HandoffManager();
const modelResolver = new ModelResolver(path.join(__dirname, '..', 'company', 'role-models.json'));

let amqpConnection: amqp.Connection | null = null;
let amqpChannel: amqp.Channel | null = null;
let isProcessing = false;

async function processTask(role: string, prompt: string, modelOverride?: string, originalMsg?: amqp.ConsumeMessage) {
    isProcessing = true;
    const payload = { role, prompt, model: modelOverride };

    try {
        const modelName = await modelResolver.resolve(role, modelOverride);
        console.log(`\n📥 Task Received: [${role}] (Model: ${modelName})`);
        
        // SLA Resolution Hierarchy:
        // 1. Hierarchical (e.g. company/roles/architect/design.md)
        // 2. Legacy/Flat (e.g. company/roles/senior-systems-architect.md)
        let rolePath = path.join(__dirname, '..', 'company', 'roles', `${role}.md`);
        if (role.includes('/')) {
            const familyTaskPath = path.join(__dirname, '..', 'company', 'roles', `${role}.md`);
            try {
                await fs.access(familyTaskPath);
                rolePath = familyTaskPath;
            } catch {
                // If role/task.md doesn't exist, check if the family has a base SLA
                const familyBase = path.join(__dirname, '..', 'company', 'roles', `${role.split('/')[0]}.md`);
                try {
                    await fs.access(familyBase);
                    rolePath = familyBase;
                } catch {
                    // Keep default rolePath and let it fail if not found
                }
            }
        }

        const fileContent = await fs.readFile(rolePath, 'utf8');
        
        // Inject dynamic tool documentation
        const toolDoc = generateToolDocumentation(firmOsTools);
        const systemInstruction = toolDoc + fileContent;

        console.log(`📖 Loaded SLA for [${role}] (${fileContent.length} chars) + injected tool docs.`);

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
                result = await chat.sendMessage(currentPrompt);
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
                    result = await fallbackChat.sendMessage(prompt);
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
                break; // Exit loop if no more tool calls
            }

            console.log(`🔧 [Loop ${loopCount}/${maxLoops}] Executing ${functionCalls.length} tool call(s)...`);
            
            // Check if we are approaching the limit and might need an extension
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
                        const toolResult = await tool.execute(call.args);
                        toolResponses.push({
                            functionResponse: {
                                name: call.name,
                                response: { content: toolResult || "Success" }
                            }
                        });

                        // Check for specialized tool effects
                        if (call.name === 'initialize_feature_work') {
                            const slug = call.args.featureName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim();
                            await stateManager.initializeWorkflow({
                                featureId: slug,
                                featureName: call.args.featureName,
                                currentAgent: role,
                                status: 'drafting',
                                workbookPath: `company/work/${slug}.md`
                            });
                            console.log(`✨ [State] Initialized tracking for feature '${slug}'.`);
                        }

                        // Check for handoff intent
                        const handoffConfig = handoffManager.getHandoffConfig(call.name);
                        if (handoffConfig) {
                            const { featureId } = call.args;
                            const nextPrompt = handoffConfig.promptTemplate(call.args);
                            
                            console.log(`📡 [Handoff] Routing feature '${featureId}' to ${handoffConfig.targetRole}...`);
                            
                            // 1. Update State
                            await stateManager.updateWorkflow(featureId, {
                                currentAgent: handoffConfig.targetRole,
                                status: handoffConfig.nextStatus
                            }, {
                                timestamp: new Date().toISOString(),
                                fromAgent: role,
                                toAgent: handoffConfig.targetRole,
                                action: call.name,
                                note: call.args.note || call.args.feedback
                            });

                            // 2. Publish next task (if not human gate)
                            if (handoffConfig.targetRole !== 'human') {
                                const payload = JSON.stringify({ role: handoffConfig.targetRole, prompt: nextPrompt });
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

            // Feed tool results back for the next turn
            currentPrompt = toolResponses;
        }

        if (loopCount >= maxLoops) {
            console.warn(`⚠️  Micro-loop hit maxLoops (${maxLoops})`);
        }

        console.log(`🏁 Task Completed: [${role}]`);
        if (originalMsg) amqpChannel!.ack(originalMsg);
    } catch (error: any) {
        console.error(`❌ Error:`, error.message);
        
        const isFatal = error.message.includes('401') || 
                       error.message.includes('403') ||
                       error.code === 'EACCES';

        if (error.code === 'ENOENT' || error.message.includes('not found')) {
            console.log(`⚠️  Role [${role}] not found. Routing to [recruiter] for dynamic hiring.`);
            const recruitmentPrompt = `The system attempted to task the role '${role}', but no SLA for this role was found. 
            
Original Task intended for '${role}':
${prompt}

Please identify the gap, define the requirements for '${role}', and task the HR Director to hire them.`;
            
            const recoveryPayload = JSON.stringify({ role: 'recruiter', prompt: recruitmentPrompt });
            await amqpChannel!.sendToQueue(QUEUE_NAME, Buffer.from(recoveryPayload), { persistent: true });
            if (originalMsg) amqpChannel!.ack(originalMsg);
            return;
        }

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
    
    // Wait for current task to finish if processing
    if (isProcessing) {
        console.log('⏳ Waiting for active task to complete...');
        let waitCount = 0;
        while (isProcessing && waitCount < 10) {
            await new Promise(r => setTimeout(r, 1000));
            waitCount++;
        }
    }

    try {
        if (amqpChannel) await amqpChannel.close();
        if (amqpConnection) await amqpConnection.close();
        await fs.unlink(PID_FILE).catch(() => {});
        console.log('🛑 Daemon halted safely.');
    } catch (e) {}
    process.exit(0);
}

async function checkSingleton() {
    try {
        const pid = await fs.readFile(PID_FILE, 'utf8');
        try {
            process.kill(parseInt(pid, 10), 0);
            console.error(`❌ FATAL: Another daemon instance is already running (PID: ${pid}).`);
            process.exit(1);
        } catch (e) {
            // Process not running, we can take over
        }
    } catch (e) {
        // PID file doesn't exist
    }
    await fs.writeFile(PID_FILE, process.pid.toString());
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

/**
 * Generates a Markdown documentation block from the Tool definitions.
 * This is injected into agent prompts so they always know what tools are available.
 */
function generateToolDocumentation(tools: Tool): string {
    let doc = "# PLATFORM CAPABILITIES (AUTO-INJECTED)\n\n";
    doc += "You operate in a tool-enabled environment. The following function calls are available to you:\n\n";
    
    tools.functionDeclarations?.forEach(fn => {
        doc += `## Tool: ${fn.name}\n`;
        doc += `Description: ${fn.description}\n`;
        doc += "Parameters (JSON Schema):\n";
        doc += `\`\`\`json\n${JSON.stringify(fn.parameters, null, 2)}\n\`\`\`\n\n`;
    });

    doc += "---\n\n";
    return doc;
}

export async function startDaemon() {
    await checkSingleton();
    try {
        amqpConnection = await amqp.connect('amqp://localhost');
        amqpChannel = await amqpConnection.createChannel();
        
        await amqpChannel.assertQueue(QUEUE_NAME, { durable: true });
        await amqpChannel.assertQueue(EXTERNAL_QUEUE, { durable: true });
        await amqpChannel.assertQueue(ERROR_QUEUE, { durable: true });
        
        const toolNames = firmOsTools.functionDeclarations?.map(f => f.name).join(', ') || 'none';
        console.log(`👂 FirmOS Orchestrator listening... [Model: gemini-2.5-flash]`);
        console.log(`🛠️  Tools loaded: [${toolNames}]`);

        // 1. Internal Task Queue
        amqpChannel.consume(QUEUE_NAME, async (msg) => {
            if (!msg) return;
            const contentString = msg.content.toString();
            const payload = JSON.parse(contentString);
            await processTask(payload.role, payload.prompt, payload.model, msg);
        });

        // 2. External Request Queue
        amqpChannel.consume(EXTERNAL_QUEUE, async (msg) => {
            if (!msg) return;
            const requestText = msg.content.toString();
            console.log(`\n📥 External Request Received -> Routing to [intake-consultant]`);
            await processTask('intake-consultant', requestText, undefined, msg);
        });

    } catch (error) {
        console.error('Fatal Connection Error:', error);
    }
}

// Only start the daemon if this file is run directly
const isMain = process.argv[1] && (path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));
if (isMain) {
    startDaemon();
}
