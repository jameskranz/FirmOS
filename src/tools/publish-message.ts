import amqp from 'amqplib';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';

export class PublishMessageTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "publish_message",
            description: "Publishes a JSON task to a RabbitMQ queue. Use this to hand off work to another agent role.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    role: {
                        type: SchemaType.STRING,
                        description: "The target agent role, e.g., 'senior-systems-architect'."
                    },
                    prompt: {
                        type: SchemaType.STRING,
                        description: "The detailed task description for the target agent."
                    }
                },
                required: ["role", "prompt"]
            }
        };
    }

    async execute(args: { role: string, prompt: string }): Promise<string> {
        const { role, prompt } = args;
        const QUEUE_NAME = 'task_routing';

        try {
            const connection = await amqp.connect('amqp://localhost');
            const channel = await connection.createChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });

            const payload = JSON.stringify({ role, prompt });
            channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true });

            console.log(`🚀 Executed Tool: publish_message -> 📨 handoff to [${role}]`);
            
            // Short delay to ensure message is sent
            await new Promise(r => setTimeout(r, 200));
            await connection.close();
            
            return `Successfully published handoff message to ${role}`;
        } catch (err: any) {
            throw new Error(`Failed to publish message: ${err.message}`);
        }
    }

    get guidance(): string {
        return "This is your primary tool for collaboration. Use it to delegate tasks to other agents, hand off completed work for the next phase of the SDLC, or communicate context between departments. Always ensure the 'role' corresponds to an existing hierarchical role in the organization chart.";
    }
}
