import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.ts';
import type { ToolDefinition } from './base.ts';

export class SubmitForReviewTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "submit_for_review",
            description: "Used by the Product Manager to request an architectural review of a feature workbook.",
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
                    workbookPath: {
                        type: SchemaType.STRING,
                        description: "The relative path to the feature workbook."
                    },
                    note: {
                        type: SchemaType.STRING,
                        description: "Optional note or summary for the reviewer."
                    },
                    targetRole: {
                        type: SchemaType.STRING,
                        description: "Optional: The specific role that should review this feature (e.g., 'architect/review' or 'security/audit'). Defaults to 'architect/review'."
                    }
                },
                required: ["featureId", "featureName", "workbookPath"]
            }
        };
    }

    async execute(args: { featureId: string, featureName: string, workbookPath: string, note?: string, targetRole?: string }): Promise<string> {
        console.log(`🚀 Intent: submit_for_review -> Feature: ${args.featureName} (${args.featureId})`);
        return `SUCCESS: Feature '${args.featureName}' has been submitted for technical review${args.targetRole ? ` to [${args.targetRole}]` : ''}. The loop will now route accordingly.`;
    }
}
