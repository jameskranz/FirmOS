import amqp from 'amqplib';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.ts';
import type { ToolDefinition } from './base.ts';

export class RequestHireTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "request_hire",
            description: "Used by an agent to request the hiring of a new role when they identify a gap in the team. This tasks the Recruiter to define the role and initiate the hiring chain.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    rolePurpose: {
                        type: SchemaType.STRING,
                        description: "The intended purpose of the new role (e.g., 'security-specialist' or 'database-expert')."
                    },
                    featureId: {
                        type: SchemaType.STRING,
                        description: "The ID of the feature currently being worked on."
                    },
                    taskDetails: {
                        type: SchemaType.STRING,
                        description: "The specific task details the new hire should perform once onboarded."
                    },
                    note: {
                        type: SchemaType.STRING,
                        description: "Optional: Additional context for the recruiter."
                    }
                },
                required: ["rolePurpose", "featureId", "taskDetails"]
            }
        };
    }

    async execute(args: { rolePurpose: string, featureId: string, taskDetails: string, note?: string }): Promise<string> {
        const { rolePurpose, featureId, taskDetails, note } = args;
        const QUEUE_NAME = 'task_routing';

        try {
            const connection = await amqp.connect('amqp://localhost');
            const channel = await connection.createChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });

            const recruitmentPrompt = `HIRE REQUEST: A new role is needed for purpose: '${rolePurpose}'.

Context:
Feature ID: ${featureId}
Pending Task for New Hire: ${taskDetails}

Note from Requester: ${note || 'No additional notes.'}

Please identify the specific role family/task, define the requirements, and task the HR Director to hire them. Ensure the final task details are passed through to the HR Director so the new hire can be immediately task upon arrival.`;

            const payload = JSON.stringify({ role: 'recruiter', prompt: recruitmentPrompt });
            channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true });

            await new Promise(r => setTimeout(r, 200));
            await connection.close();

            console.log(`🤝 Executed Tool: request_hire -> 📨 tasked [recruiter] for [${rolePurpose}]`);
            return `SUCCESS: Hiring request for '${rolePurpose}' has been sent to the Recruiter. The system will now initiate the recruitment flow.`;
        } catch (err: any) {
            throw new Error(`Failed to request hire: ${err.message}`);
        }
    }
}
