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
const ERROR_QUEUE = 'error_tasks';
const PID_FILE = path.join(__dirname, '..', 'daemon.pid');
const STATE_FILE = path.join(__dirname, '..', 'company', 'state', 'workflows.json');

const stateManager = new JsonStateManager(STATE_FILE);
const handoffManager = new HandoffManager();

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
    
    // Cleanup PID file on exit
    const cleanup = async () => {
        try { await fs.unlink(PID_FILE); } catch (e) {}
        process.exit();
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
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
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.assertQueue(ERROR_QUEUE, { durable: true });
        
        const toolNames = firmOsTools.functionDeclarations?.map(f => f.name).join(', ') || 'none';
        console.log(`👂 FirmOS Orchestrator listening... [Model: gemini-2.5-flash]`);
        console.log(`🛠️  Tools loaded: [${toolNames}]`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (!msg) return;
            const contentString = msg.content.toString();
            const payload = JSON.parse(contentString);
            const { role, prompt } = payload;

            try {
                console.log(`\n📥 Task Received: [${role}]`);
                const rolePath = path.join(__dirname, '..', 'company', 'roles', `${role}.md`);
                const fileContent = await fs.readFile(rolePath, 'utf8');
                
                // Inject dynamic tool documentation
                const toolDoc = generateToolDocumentation(firmOsTools);
                const systemInstruction = toolDoc + fileContent;

                console.log(`📖 Loaded SLA for [${role}] (${fileContent.length} chars) + injected tool docs.`);

                console.log(`🧠 Thinking...`);
                
                const model = genAI.getGenerativeModel({ 
                    model: 'gemini-2.5-flash', 
                    systemInstruction: systemInstruction,
                    tools: [firmOsTools] 
                });

                const chat = model.startChat();
                let currentPrompt: string | Array<any> = prompt;
                let loopCount = 0;
                const MAX_LOOPS = 5;

                while (loopCount < MAX_LOOPS) {
                    loopCount++;
                    const result = await chat.sendMessage(currentPrompt);
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

                    console.log(`🔧 [Loop ${loopCount}/${MAX_LOOPS}] Executing ${functionCalls.length} tool call(s)...`);
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
                                        channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true });
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

                if (loopCount >= MAX_LOOPS) {
                    console.warn(`⚠️  Micro-loop hit MAX_LOOPS (${MAX_LOOPS})`);
                }

                console.log(`🏁 Task Completed: [${role}]`);
                channel.ack(msg);
            } catch (error: any) {
                console.error(`❌ Error:`, error.message);
                
                const isFatal = error.message.includes('not found') || 
                               error.message.includes('401') || 
                               error.message.includes('403') ||
                               error.code === 'ENOENT';

                if (isFatal) {
                    await channel.sendToQueue(ERROR_QUEUE, Buffer.from(JSON.stringify({ payload, error: error.message })), { persistent: true });
                    channel.ack(msg);
                } else {
                    setTimeout(() => channel.nack(msg), 10000);
                }
            }
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
