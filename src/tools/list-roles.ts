import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { PostgresStateManager } from '../state/postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ListRolesTool extends BaseTool {
    private getProjectRoot(): string {
        return process.env.TARGET_WORKSPACE || (__dirname.includes(path.join('dist', 'src'))
            ? path.resolve(__dirname, '..', '..', '..')
            : path.resolve(__dirname, '..', '..'));
    }

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
        let roles: any[] = [];

        // 1. Try Database First (For Swarm consistency)
        if (process.env.DATABASE_URL) {
            try {
                const stateManager = new PostgresStateManager(process.env.DATABASE_URL);
                roles = await stateManager.listRoles();
                await stateManager.disconnect();
            } catch (e) {
                console.error(`⚠️ Database role fetch failed: ${e}`);
            }
        }

        // 2. Fallback to Workspace JSON if DB is empty or missing
        if (roles.length === 0) {
            const projectRoot = this.getProjectRoot();
            const registryPath = path.join(projectRoot, 'company', 'role-registry.json');
            try {
                const content = await fs.readFile(registryPath, 'utf8');
                const registry = JSON.parse(content);
                roles = Object.entries(registry).map(([name, details]: [string, any]) => ({
                    roleName: name,
                    description: details.description,
                    modelTier: details.modelTier
                }));
            } catch (e) {}
        }

        if (roles.length === 0) {
            return "No roles found in the organization chart.";
        }

        // 3. Format output
        let output = `# Current Organization Chart\n\n`;
        for (const role of roles) {
            output += `- **${role.roleName}** (Tier: ${role.modelTier})\n`;
            output += `  *Description: ${role.description}*\n`;
        }

        return output;
    }

    get guidance(): string {
        return "Use this tool to maintain situational awareness of the current team. It helps you discover which specialized roles are already available for handoffs. ALWAYS call this tool before calling 'request_hire' or 'publish_message' to ensure you are routing to the correct, existing agent.";
    }
}
