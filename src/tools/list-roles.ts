import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { PostgresStateManager } from '../state/postgres.js';
import { getProjectRoot } from '../utils/path-resolver.js';

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
        console.log(`📋 Executed Tool: list_roles`);
        const stateManager = (global as any).firmOsStateManager;
        let roles: any[] = [];

        try {
            roles = await stateManager.roles.list();
        } catch (e) {
            console.error(`⚠️ Database role fetch failed: ${e}`);
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
