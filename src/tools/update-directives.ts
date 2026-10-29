import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { DirectiveUpdater } from '../utils/directive-updater.js';

export class UpdateDirectivesTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "update_directives",
            description: "Updates the mandatory directives for your subordinates. Use this to set project-wide standards or correct team behavior.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    directiveSummary: {
                        type: SchemaType.STRING,
                        description: "The new instruction or correction to add to your team's directives."
                    },
                    context: {
                        type: SchemaType.STRING,
                        description: "The reason or background for this change."
                    },
                    role: {
                        type: SchemaType.STRING,
                        description: "Your own hierarchical role name (the manager)."
                    }
                },
                required: ["directiveSummary", "context", "role"]
            }
        };
    }

    async execute(args: { directiveSummary: string, context: string, role: string }): Promise<string> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY missing");

        const stateManager = (global as any).firmOsStateManager;
        const updater = new DirectiveUpdater(apiKey);
        
        try {
            await updater.updateDirectives({
                prompt: args.context,
                response: args.directiveSummary
            }, args.role, stateManager);

            return `SUCCESS: Directives for subordinates of ${args.role} have been updated in the Database.`;
        } catch (err: any) {
            throw new Error(`Failed to update directives: ${err.message}`);
        }
    }

    get guidance(): string {
        return "Use this tool to manage your team effectively. When you see agents making mistakes or want to pivot the project strategy, update their directives. These instructions will be injected into their system prompt automatically.";
    }
}
