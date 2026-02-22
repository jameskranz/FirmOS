import amqp from 'amqplib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Tool } from '@google/generative-ai';
import dotenv from 'dotenv';

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

// ==========================================
// 🛠️ TOOL DEFINITIONS
// ==========================================
const firmOsTools: Tool = {
    functionDeclarations: [
        {
            name: "save_file",
            description: "Saves text or markdown content to a specified file path relative to the FirmOS project root. Use this to create or update roles, code, and documentation.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    relativePath: {
                        type: SchemaType.STRING,
                        description: "The relative path to save the file, e.g., 'company/roles/frontend-developer.md' or 'src/components/Button.jsx'"
                    },
                    content: {
                        type: SchemaType.STRING,
                        description: "The complete, raw content to be written to the file."
                    }
                },
                required: ["relativePath", "content"]
            }
        }
    ]
};

export async function startDaemon() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.assertQueue(ERROR_QUEUE, { durable: true });
        
        console.log(`👂 FirmOS Orchestrator listening... [Model: gemini-2.5-flash]`);
        console.log(`🛠️  Tools loaded: [save_file]`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (!msg) return;
            const contentString = msg.content.toString();
            const payload = JSON.parse(contentString);
            const { role, prompt } = payload;

            try {
                console.log(`\n📥 Task Received: [${role}]`);
                const rolePath = path.join(__dirname, '..', 'company', 'roles', `${role}.md`);
                const systemInstruction = await fs.readFile(rolePath, 'utf8');

                console.log(`🧠 Thinking...`);
                
                // Pass the tools array into the model configuration
                const model = genAI.getGenerativeModel({ 
                    model: 'gemini-2.5-flash', 
                    systemInstruction: systemInstruction,
                    tools: [firmOsTools] 
                });

                const result = await model.generateContent(prompt);
                const response = result.response;
                
                console.log(`✅ Agent Response Received.`);

                // ==========================================
                // ⚙️ TOOL EXECUTION ENGINE
                // ==========================================
                const functionCalls = response.functionCalls();
                
                if (functionCalls && functionCalls.length > 0) {
                    for (const call of functionCalls) {
                        if (call.name === 'save_file') {
                            const args = call.args as { relativePath: string, content: string };
                            let { relativePath, content } = args;
                            
                            // Safety fallback if the agent forgets the directory for a role
                            if (role === 'hr-director' && !relativePath.includes('/')) {
                                relativePath = `company/roles/${relativePath}`;
                            }

                            const fullOutputPath = path.resolve(__dirname, '..', relativePath);
                            
                            await fs.mkdir(path.dirname(fullOutputPath), { recursive: true });
                            await fs.writeFile(fullOutputPath, content.replace(/\r/g, ''));
                            
                            console.log(`🛠️  Executed Tool: save_file -> 📂 ${relativePath}`);
                        }
                    }
                } else {
                    // Fallback if the agent just talks instead of using a tool
                    console.log(`📝 Text Output:\n${response.text()}`);
                }

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
