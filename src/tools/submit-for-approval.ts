import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';

export class SubmitForApprovalTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "submit_for_approval",
            description: "Used by the Product Manager to signal that a feature is ready for final human review and approval.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    featureId: {
                        type: SchemaType.STRING,
                        description: "The unique ID of the feature (slugified name)."
                    },
                    featureName: {
                        type: SchemaType.STRING,
                        description: "The human-readable name of the feature."
                    },
                    note: {
                        type: SchemaType.STRING,
                        description: "Final summary or notes for the human approver."
                    }
                },
                required: ["featureId", "featureName"]
            }
        };
    }

    async execute(args: { featureId: string, featureName: string, note?: string }): Promise<string> {
        console.log(`🚀 Intent: submit_for_approval -> Feature: ${args.featureName} (${args.featureId})`);
        return `SUCCESS: Feature '${args.featureName}' has been submitted for final approval. The loop will now pause for human review.`;
    }

    get guidance(): string {
        return "Use this tool only when a feature is complete, technically reviewed, and ready for final stakeholder sign-off. It halts the autonomous loop and moves the feature into a 'pending_approval' state, signaling that human input is required before proceeding to implementation.";
    }
}
