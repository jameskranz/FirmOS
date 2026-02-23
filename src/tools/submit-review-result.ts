import amqp from 'amqplib';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { JsonStateManager } from '../state/json.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust root detection:
const PROJECT_ROOT = __dirname.includes(path.join('dist', 'src'))
    ? path.resolve(__dirname, '..', '..', '..')
    : path.resolve(__dirname, '..', '..');

const STATE_FILE = path.join(PROJECT_ROOT, 'company', 'state', 'workflows.json');
const stateManager = new JsonStateManager(STATE_FILE);
const QUEUE_NAME = 'task_routing';

export class SubmitReviewResultTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "submit_review_result",
            description: "Used by a reviewer (Architect, Security, QA) to officially record their review. Automatically notifies the author of the outcome.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    featureId: {
                        type: SchemaType.STRING,
                        description: "The unique ID of the feature."
                    },
                    approved: {
                        type: SchemaType.BOOLEAN,
                        description: "Whether the artifact is approved (true) or requires changes (false)."
                    },
                    note: {
                        type: SchemaType.STRING,
                        description: "Detailed feedback or justification for the review decision."
                    },
                    role: {
                        type: SchemaType.STRING,
                        description: "Your hierarchical role name (e.g., 'architect/design', 'architect/security')."
                    }
                },
                required: ["featureId", "approved", "note", "role"]
            }
        };
    }

    async execute(args: { featureId: string, approved: boolean, note: string, role: string }): Promise<string> {
        const { featureId, approved, note, role } = args;

        const workflow = await stateManager.getWorkflow(featureId);
        if (!workflow) {
            throw new Error(`Workflow not found for feature: ${featureId}`);
        }

        const approvals = workflow.approvals || {};
        approvals[role] = {
            approved,
            timestamp: new Date().toISOString(),
            note
        };

        const nextAgent = approved ? 'system' : 'product/define'; // Simplify for now, ideally dynamic
        const status = approved ? workflow.status : 'revising';

        await stateManager.updateWorkflow(featureId, {
            approvals,
            status
        }, {
            timestamp: new Date().toISOString(),
            fromAgent: role,
            toAgent: nextAgent,
            action: 'submit_review_result',
            note: `${approved ? 'APPROVED' : 'REJECTED'} by ${role}: ${note}`
        });

        // Auto-notify via RabbitMQ
        try {
            const connection = await amqp.connect('amqp://localhost');
            const channel = await connection.createChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });

            const notificationPrompt = approved
                ? `REVIEW APPROVED: The feature '${featureId}' has been approved by ${role}.\n\nNote: ${note}\n\nPlease proceed to the next phase.`
                : `REVIEW REJECTED: The feature '${featureId}' requires changes based on feedback from ${role}.\n\nFeedback: ${note}\n\nPlease revise the artifact and resubmit.`;

            const targetRole = approved ? 'hr/director' : 'product/define'; // Default routing
            
            const payload = JSON.stringify({ role: targetRole, prompt: notificationPrompt });
            channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true });
            
            await new Promise(r => setTimeout(r, 200));
            await connection.close();
            console.log(`🚀 Auto-Notified [${targetRole}] of review result.`);
        } catch (err) {
            console.error('Failed to send auto-notification:', err);
        }

        console.log(`⚖️  Review Result: [${featureId}] -> ${approved ? '✅ APPROVED' : '❌ REJECTED'} by ${role}`);
        return `SUCCESS: Your review result has been recorded and the relevant parties have been automatically notified.`;
    }

    get guidance(): string {
        return "Use this tool to officially sign off on or reject a phase artifact. It AUTOMATICALLY notifies the author or the next role, so you do NOT need to manually call 'publish_message' after using this. If you reject, it routes back for revision. If you approve, it signals readiness for the next phase.";
    }
}
