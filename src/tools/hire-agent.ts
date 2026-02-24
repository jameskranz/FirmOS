import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { PostgresStateManager } from '../state/postgres.js';
import { JsonStateManager } from '../state/json.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class HireAgentTool extends BaseTool {
    private getProjectRoot(): string {
        return process.env.TARGET_WORKSPACE || (__dirname.includes(path.join('dist', 'src'))
            ? path.resolve(__dirname, '..', '..', '..')
            : path.resolve(__dirname, '..', '..'));
    }

    get definition(): ToolDefinition {
        return {
            name: "hire_agent",
            description: "Creates a new corporate role (agent) by saving its Markdown SLA to the database and workspace. Only use this when explicitly asked to hire someone.",
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
                    }
                },
                required: ["roleName", "description", "slaContent"]
            }
        };
    }

    async execute(args: { roleName: string, description: string, slaContent: string, model?: string }): Promise<string> {
        const { roleName, description, slaContent, model } = args;
        const projectRoot = this.getProjectRoot();
        
        let assignedModel = model;
        if (!assignedModel) {
            const isSenior = slaContent.match(/Senior|Expert|Lead|Architect/i);
            assignedModel = isSenior ? 'HIGH' : 'MEDIUM';
        }

        // 1. Persist to Database (Primary for Swarm)
        if (process.env.DATABASE_URL) {
            const stateManager = new PostgresStateManager(process.env.DATABASE_URL);
            await stateManager.upsertRole({
                roleName,
                description,
                slaContent,
                modelTier: assignedModel
            });
            await stateManager.disconnect();
            console.log(`🗄️  Persisted role [${roleName}] to Database.`);
        }

        // 2. Persist to Workspace Filesystem (For VCS and local discovery)
        const relativePath = `company/roles/${roleName.replace('.md', '')}.md`;
        const fullOutputPath = path.join(projectRoot, relativePath);
        
        await fs.mkdir(path.dirname(fullOutputPath), { recursive: true });
        await fs.writeFile(fullOutputPath, slaContent.replace(/\r/g, ''));

        // 3. Update legacy JSON files if using JsonStateManager or for local compatibility
        const registryPath = path.join(projectRoot, 'company', 'role-registry.json');
        let registry: Record<string, any> = {};
        try {
            const content = await fs.readFile(registryPath, 'utf8');
            registry = JSON.parse(content);
        } catch (e) {}

        registry[roleName] = {
            description: description,
            slaPath: relativePath,
            modelTier: assignedModel
        };
        await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

        const modelsPath = path.join(projectRoot, 'company', 'role-models.json');
        let models: Record<string, any> = {};
        try {
            const content = await fs.readFile(modelsPath, 'utf8');
            models = JSON.parse(content);
        } catch (e) {}
        models[roleName] = assignedModel;
        await fs.writeFile(modelsPath, JSON.stringify(models, null, 2));

        console.log(`🤝 Executed Tool: hire_agent -> 👤 hired [${roleName}] (Model/Tier: ${assignedModel})`);
        return `Successfully hired agent ${roleName}. SLA saved to database and ${relativePath}. Model tier set to ${assignedModel}.`;
    }

    get guidance(): string {
        return "This tool is exclusively for use by the 'hr/director' role. It creates a formal Service Level Agreement (SLA) for a new agent. You must provide a clear hierarchical name (family/task), a concise purpose description, and the full Markdown system prompt for the new hire. Assign model tiers (MAX, HIGH, MEDIUM, LOW) based on the cognitive complexity of the task.";
    }
}
