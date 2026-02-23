import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust root detection:
// 1. If we are in dist/src/tools, root is three levels up
// 2. If we are in src/tools, root is two levels up
const PROJECT_ROOT = __dirname.includes(path.join('dist', 'src'))
    ? path.resolve(__dirname, '..', '..', '..')
    : path.resolve(__dirname, '..', '..');

export class HireAgentTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "hire_agent",
            description: "Creates a new corporate role (agent) by saving its Markdown SLA to the company/roles/ directory. Only use this when explicitly asked to hire someone.",
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
        
        // Enforce role placement in company/roles/
        const relativePath = `company/roles/${roleName.replace('.md', '')}.md`;
        const fullOutputPath = path.join(PROJECT_ROOT, relativePath);
        
        await fs.mkdir(path.dirname(fullOutputPath), { recursive: true });
        await fs.writeFile(fullOutputPath, slaContent.replace(/\r/g, ''));
        
        // Update role registry (SLA paths are recorded as absolute project relative paths)
        const registryPath = path.join(PROJECT_ROOT, 'company', 'role-registry.json');
        let registry: Record<string, any> = {};
        try {
            const content = await fs.readFile(registryPath, 'utf8');
            registry = JSON.parse(content);
        } catch (e) {}

        let assignedModel = model;
        if (!assignedModel) {
            const isSenior = slaContent.match(/Senior|Expert|Lead|Architect/i);
            assignedModel = isSenior ? 'HIGH' : 'MEDIUM';
        }

        registry[roleName] = {
            description: description,
            slaPath: relativePath,
            modelTier: assignedModel
        };
        await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

        // Sync to legacy role-models.json for model resolver
        const modelsPath = path.join(PROJECT_ROOT, 'company', 'role-models.json');
        let models: Record<string, any> = {};
        try {
            const content = await fs.readFile(modelsPath, 'utf8');
            models = JSON.parse(content);
        } catch (e) {}
        models[roleName] = assignedModel;
        await fs.writeFile(modelsPath, JSON.stringify(models, null, 2));

        console.log(`🤝 Executed Tool: hire_agent -> 👤 hired [${roleName}] (Model/Tier: ${assignedModel})`);
        return `Successfully hired agent ${roleName} and saved SLA to ${relativePath}. Model tier set to ${assignedModel}. Registry updated with description.`;
    }
}

// Entry point for direct testing or CLI usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const tool = new HireAgentTool();
    const args = JSON.parse(process.argv[2] || '{}');
    tool.execute(args).catch(err => {
        console.error(err);
        process.exit(1);
    });
}
