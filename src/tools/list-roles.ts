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

export class ListRolesTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "list_roles",
            description: "Returns a structured list of all current agent roles and their assigned model tiers. Use this to discover who is already hired and what tasks they can perform.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {},
                required: []
            }
        };
    }

    async execute(_args: {}): Promise<string> {
        const registryPath = path.join(PROJECT_ROOT, 'company', 'role-registry.json');

        try {
            let registry: Record<string, { description: string, modelTier: string }> = {};
            try {
                const registryContent = await fs.readFile(registryPath, 'utf8');
                registry = JSON.parse(registryContent);
            } catch (e) {
                return "Role registry not found or empty.";
            }

            if (Object.keys(registry).length === 0) {
                return "No roles found in the organization chart.";
            }

            // 3. Format output
            let output = `# Current Organization Chart\n\n`;
            for (const [roleName, details] of Object.entries(registry)) {
                output += `- **${roleName}** (Tier: ${details.modelTier})\n`;
                output += `  *Description: ${details.description}*\n`;
            }

            return output;
        } catch (error: any) {
            return `Error listing roles: ${error.message}`;
        }
    }

    get guidance(): string {
        return "Use this tool to maintain situational awareness of the current team. It helps you discover which specialized roles are already available for handoffs. ALWAYS call this tool before calling 'request_hire' or 'publish_message' to ensure you are routing to the correct, existing agent.";
    }

    private async scanRoles(dir: string, baseDir: string = ''): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        let files: string[] = [];

        for (const entry of entries) {
            const entryRelativePath = path.join(baseDir, entry.name);
            const entryFullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                files = files.concat(await this.scanRoles(entryFullPath, entryRelativePath));
            } else if (entry.name.endsWith('.md')) {
                files.push(entryRelativePath.replace(/\\/g, '/'));
            }
        }

        return files;
    }
}

// Entry point for direct testing or CLI usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const tool = new ListRolesTool();
    tool.execute({}).then(console.log).catch(console.error);
}
