import amqp from 'amqplib';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';

export class RequestHireTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "request_hire",
            description: "Used to identify a gap in the current team and request the hiring of a new specialized role.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    rolePurpose: {
                        type: SchemaType.STRING,
                        description: "The core responsibility of the missing role, e.g., 'security-audit' or 'database-optimization'."
                    },
                    taskDetails: {
                        type: SchemaType.STRING,
                        description: "The specific task or context you want the new hire to pick up immediately."
                    },
                    note: {
                        type: SchemaType.STRING,
                        description: "Optional: Additional justification or requirements for the HR Director."
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
                required: ["rolePurpose", "taskDetails"]
            }
        };
    }

    async execute(args: { rolePurpose: string, taskDetails: string, note?: string, gitInfo?: any }): Promise<string> {
        const { rolePurpose, taskDetails, note, gitInfo } = args;
        const QUEUE_NAME = 'task_routing';

        try {
            const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
            const connection = await amqp.connect(rabbitUrl);
            const channel = await connection.createChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });

            const recruitmentPrompt = `HIRE REQUEST:
Missing Specialist Role: ${rolePurpose}
Pending Task for New Hire: ${taskDetails}

Note from Requester: ${note || 'No additional notes.'}

Please identify the specific role family/task, define the requirements, and task the HR Director to evaluate the project context and determine the next logical hire according to the SDLC. Ensure the final task details are passed through to the HR Director so the new hire can be immediately tasked upon arrival.`;

            const payload = JSON.stringify({ role: 'hr/recruiter', prompt: recruitmentPrompt, gitInfo });
            channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true });

            await new Promise(r => setTimeout(r, 200));
            await connection.close();

            console.log(`🤝 Executed Tool: request_hire -> 📨 tasked [hr/recruiter] for [${rolePurpose}]`);
            return `SUCCESS: Hiring request for '${rolePurpose}' has been sent to the Recruiter. The system will now initiate the recruitment flow.`;
        } catch (err: any) {
            throw new Error(`Failed to request hire: ${err.message}`);
        }
    }

    get guidance(): string {
        return "Use this tool proactively when you identify a gap in the organizational chart that prevents you from completing a task. Instead of struggling with a task outside your expertise (e.g., a PM doing security design), call this tool to request a specialist. Describe the *purpose* of the role (e.g., 'security-audit') and provide the exact task details you want them to pick up. The HR department will then handle the evaluation, hiring, and onboarding of that specialist to help you.";
    }
}
