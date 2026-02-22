import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.ts';
import type { ToolDefinition } from './base.ts';

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
                    }
                },
                required: ["featureId", "feedback"]
            }
        };
    }

    async execute(args: { featureId: string, feedback: string }): Promise<string> {
        console.log(`🚀 Intent: submit_feedback -> Feature: ${args.featureId}`);
        return `SUCCESS: Feedback for feature '${args.featureId}' has been submitted. The loop will now route back to the Product Manager for revisions.`;
    }
}
