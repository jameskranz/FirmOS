import amqp from 'amqplib';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';

export class PublishMessageTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "publish_message",
            description: "Publishes a task or information to another role's queue. Use this for department handoffs.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    role: {
                        type: SchemaType.STRING,
                        description: "The hierarchical role name to target, e.g., 'hr/director', 'architect/design'."
                    },
                    prompt: {
                        type: SchemaType.STRING,
                        description: "The detailed instruction or information for the target role."
                    },
                    gitInfo: {
                        type: SchemaType.OBJECT,
                        description: "Optional: Git context for multi-tenant routing.",
                        properties: {
                            repositoryUrl: { type: SchemaType.STRING },
                            branchName: { type: SchemaType.STRING }
                        }
                    }
                },
                required: ["role", "prompt"]
            }
        };
    }

    async execute(args: { role: string, prompt: string, gitInfo?: { repositoryUrl: string, branchName?: string } }): Promise<string> {
        const { role, prompt, gitInfo } = args;
        const QUEUE_NAME = 'task_routing';

        try {
            const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
            const connection = await amqp.connect(rabbitUrl);
            const channel = await connection.createChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });

            const payload = JSON.stringify({ role, prompt, gitInfo });
            channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), {
                persistent: true
            });

            // Small delay to ensure message is sent
            await new Promise(r => setTimeout(r, 200));
            await connection.close();

            console.log(`🚀 Executed Tool: publish_message -> 📨 handoff to [${role}]`);
            return `SUCCESS: Message published to '${role}' queue.`;
        } catch (err: any) {
            throw new Error(`Failed to publish message: ${err.message}`);
        }
    }

    get guidance(): string {
        return "This is your primary tool for collaboration. Use it to delegate tasks to other agents, hand off completed work for the next phase of the SDLC, or communicate context between departments. Always ensure the 'role' corresponds to an existing hierarchical role in the organization chart.";
    }
}
