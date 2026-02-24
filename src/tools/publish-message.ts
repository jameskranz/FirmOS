import amqp from 'amqplib';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { MessageBroker } from '../utils/message-broker.js';

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
        const broker = new MessageBroker();
        try {
            await broker.publish({
                role: args.role,
                prompt: args.prompt,
                gitInfo: args.gitInfo
            });

            console.log(`🚀 Executed Tool: publish_message -> 📨 handoff to [${args.role}]`);
            return `SUCCESS: Message published to '${args.role}' queue (Project: ${broker.getProjectId()}).`;
        } catch (err: any) {
            throw new Error(`Failed to publish message: ${err.message}`);
        } finally {
            await broker.close();
        }
    }

    get guidance(): string {
        return "This is your primary tool for collaboration. Use it to delegate tasks to other agents, hand off completed work for the next phase of the SDLC, or communicate context between departments. Always ensure the 'role' corresponds to an existing hierarchical role in the organization chart.";
    }
}
