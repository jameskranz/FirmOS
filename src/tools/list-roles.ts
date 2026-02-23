import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.ts';
import type { ToolDefinition } from './base.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        const rolesDir = path.resolve(__dirname, '..', '..', 'company', 'roles');
        const modelsFile = path.resolve(__dirname, '..', '..', 'company', 'role-models.json');

        try {
            // 1. Read model mappings
            let models: Record<string, string> = {};
            try {
                const modelsContent = await fs.readFile(modelsFile, 'utf8');
                models = JSON.parse(modelsContent);
            } catch (e) {}

            // 2. Recursively find role files
            const roles = await this.scanRoles(rolesDir);

            if (roles.length === 0) {
                return "No roles found in company/roles/.";
            }

            // 3. Format output
            let output = `# Current Organization Chart\n\n`;
            for (const rolePath of roles) {
                const roleName = rolePath.replace('.md', '');
                const tier = models[roleName] || models['default'] || 'MEDIUM';
                output += `- **${roleName}** (Tier: ${tier})\n`;
            }

            return output;
        } catch (error: any) {
            return `Error listing roles: ${error.message}`;
        }
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
