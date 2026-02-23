import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';

export class SubmitFeedbackTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "submit_feedback",
            description: "Used by the Architect to return technical feedback to the Product Manager.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    featureId: {
                        type: SchemaType.STRING,
                        description: "The unique ID of the feature (slugified name)."
                    },
                    feedback: {
                        type: SchemaType.STRING,
                        description: "The detailed technical feedback or assessment."
                    },
                    targetRole: {
                        type: SchemaType.STRING,
                        description: "Optional: The specific role that should receive the feedback (e.g., 'product-manager' or 'engineering-lead'). Defaults to 'product/define'."
                    }
                },
                required: ["featureId", "feedback"]
            }
        };
    }

    async execute(args: { featureId: string, feedback: string, targetRole?: string }): Promise<string> {
        console.log(`🚀 Intent: submit_feedback -> Feature: ${args.featureId}`);
        return `SUCCESS: Feedback for feature '${args.featureId}' has been submitted${args.targetRole ? ` to [${args.targetRole}]` : ''}. The loop will now route accordingly.`;
    }

    get guidance(): string {
        return "Use this tool to return a feature to an upstream role (typically 'product/define') with specific technical feedback, concerns, or requirements for revision. It effectively 'rejects' the current version and asks for changes based on your assessment.";
    }
}
