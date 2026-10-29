import fs from 'node:fs/promises';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { JsonStateManager } from '../state/json.js';
import { getProjectRoot, getArtifactsDir } from '../utils/path-resolver.js';
import { MessageBroker } from '../utils/message-broker.js';

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
                    artifactType: {
                        type: SchemaType.STRING,
                        description: "The type of artifact reviewed. Options: 'workbook', 'prd', 'design', 'test-plan'."
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
                required: ["featureId", "artifactType", "approved", "note", "role"]
            }
        };
    }

    async execute(args: { featureId: string, artifactType: string, approved: boolean, note: string, role: string }): Promise<string> {
        const { featureId, artifactType, approved, note, role } = args;
        const stateManager = (global as any).firmOsStateManager;
        
        const broker = new MessageBroker();

        const workflow = await stateManager.workflows.get(featureId);
        if (!workflow) {
            throw new Error(`Workflow not found for feature: ${featureId}`);
        }

        // Capture content snapshot
        let contentSnapshot = "CONTENT_NOT_FOUND";
        try {
            const filename = artifactType === 'workbook' ? `${featureId}.md` : `${featureId}-${artifactType}.md`;
            const filePath = path.join(getArtifactsDir(), filename);
            contentSnapshot = await fs.readFile(filePath, 'utf8');
        } catch (e) {}

        // Record in DB
        await stateManager.reviews.record(
            featureId,
            artifactType,
            contentSnapshot,
            role,
            approved ? 'approved' : 'revisions_needed',
            note
        );

        const approvals = workflow.approvals || {};
        approvals[role] = {
            approved,
            timestamp: new Date().toISOString(),
            note
        };

        const nextAgent = approved ? 'system' : 'product/define';
        const status = approved ? workflow.status : 'revising';

        await stateManager.workflows.update(featureId, {
            approvals,
            status
        }, {
            timestamp: new Date().toISOString(),
            fromAgent: role,
            toAgent: nextAgent,
            action: 'submit_review_result',
            note: `${approved ? 'APPROVED' : 'REJECTED'} by ${role}: ${note}`
        });

        // Auto-notify via MessageBroker
        try {
            const notificationPrompt = approved
                ? `REVIEW APPROVED: The feature '${featureId}' has been approved by ${role}.\n\nNote: ${note}\n\nPlease proceed to the next phase.`
                : `REVIEW REJECTED: The feature '${featureId}' requires changes based on feedback from ${role}.\n\nFeedback: ${note}\n\nPlease revise the artifact and resubmit.`;

            const targetRole = approved ? 'hr/director' : 'product/define';
            
            await broker.publish({
                role: targetRole,
                prompt: notificationPrompt
            });
            
            console.log(`🚀 Auto-Notified [${targetRole}] of review result (Project: ${broker.getProjectId()}).`);
        } catch (err) {
            console.error('Failed to send auto-notification:', err);
        } finally {
            await broker.close();
        }

        console.log(`⚖️  Review Result: [${featureId}] -> ${approved ? '✅ APPROVED' : '❌ REJECTED'} by ${role}`);
        return `SUCCESS: Your review result has been recorded and the relevant parties have been automatically notified.`;
    }

    get guidance(): string {
        return "Use this tool to officially sign off on or reject a phase artifact. It AUTOMATICALLY notifies the author or the next role, so you do NOT need to manually call 'publish_message' after using this. If you reject, it routes back for revision. If you approve, it signals readiness for the next phase.";
    }
}
