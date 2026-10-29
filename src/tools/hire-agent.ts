import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';

export class HireAgentTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "hire_agent",
            description: "Creates a new corporate role (agent) by saving its SLA to the database. Only use this when explicitly asked to hire someone.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    roleName: {
                        type: SchemaType.STRING,
                        description: "The name of the role in kebab-case, e.g., 'backend-developer' or 'qa-engineer'. Use slashes for sub-tasks like 'architect/design'."
                    },
                    description: {
                        type: SchemaType.STRING,
                        description: "A concise (1-2 sentence) description of what this role is designed to do."
                    },
                    slaContent: {
                        type: SchemaType.STRING,
                        description: "The complete Markdown SLA content for the new agent, including its identity, responsibilities, and tool guidelines."
                    },
                    model: {
                        type: SchemaType.STRING,
                        description: "Optional: The model tier (MAX, HIGH, MEDIUM, LOW) or specific Gemini model name. If omitted, defaults based on seniority keywords (Senior/Expert -> HIGH)."
                    },
                    managerRole: {
                        type: SchemaType.STRING,
                        description: "Optional: The hierarchical name of the role this new agent reports to. Defaults to your own role."
                    },
                    allowedTools: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: "Optional: A list of specific tools this agent is allowed to use. If omitted, they may be given a default set."
                    }
                },
                required: ["roleName", "description", "slaContent"]
            }
        };
    }

    async execute(args: { roleName: string, description: string, slaContent: string, model?: string, managerRole?: string, allowedTools?: string[] }): Promise<string> {
        const { roleName, description, slaContent, model, managerRole, allowedTools } = args;
        const stateManager = (global as any).firmOsStateManager;
        
        let assignedModel = model;
        if (!assignedModel) {
            const isSenior = slaContent.match(/Senior|Expert|Lead|Architect/i);
            assignedModel = isSenior ? 'HIGH' : 'MEDIUM';
        }

        // Persist to Database (Primary and Only source of truth)
        await stateManager.roles.upsert({
            roleName,
            description,
            slaContent,
            modelTier: assignedModel,
            managerRole: managerRole,
            allowedTools: allowedTools
        });

        console.log(`🤝 Executed Tool: hire_agent -> 👤 hired [${roleName}] (Model/Tier: ${assignedModel})`);
        return `Successfully hired agent ${roleName} in the Database. Model tier set to ${assignedModel}.`;
    }

    get guidance(): string {
        return "This tool is exclusively for use by the 'hr/director' role. It creates a formal Service Level Agreement (SLA) for a new agent. You must provide a clear hierarchical name (family/task), a concise purpose description, and the full Markdown system prompt for the new hire. Assign model tiers (MAX, HIGH, MEDIUM, LOW) based on the cognitive complexity of the task.";
    }
}
