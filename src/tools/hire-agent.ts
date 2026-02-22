import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.ts';
import type { ToolDefinition } from './base.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
                        description: "The name of the role in kebab-case, e.g., 'backend-developer' or 'qa-engineer'."
                    },
                    slaContent: {
                        type: SchemaType.STRING,
                        description: "The complete Markdown SLA content for the new agent, including its identity, responsibilities, and tool guidelines."
                    }
                },
                required: ["roleName", "slaContent"]
            }
        };
    }

    async execute(args: { roleName: string, slaContent: string }): Promise<string> {
        const { roleName, slaContent } = args;
        
        // Enforce role placement in company/roles/
        const relativePath = `company/roles/${roleName.replace('.md', '')}.md`;
        const fullOutputPath = path.resolve(__dirname, '..', '..', relativePath);
        
        await fs.mkdir(path.dirname(fullOutputPath), { recursive: true });
        await fs.writeFile(fullOutputPath, slaContent.replace(/\r/g, ''));
        
        console.log(`🤝 Executed Tool: hire_agent -> 👤 hired [${roleName}]`);
        return `Successfully hired agent ${roleName} and saved SLA to ${relativePath}`;
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
