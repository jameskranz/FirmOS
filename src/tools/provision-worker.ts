import fs from 'node:fs';
import path from 'node:path';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { InfrastructureManager } from '../utils/infrastructure-manager.js';
import { getProjectRoot } from '../utils/path-resolver.js';

export class ProvisionWorkerTool extends BaseTool {
    private infrastructure: InfrastructureManager;

    constructor() {
        super();
        this.infrastructure = new InfrastructureManager();
    }

    get definition(): ToolDefinition {
        return {
            name: "provision_worker",
            description: "Spawns a new worker container pinned to a specific repository. Use this to scale up processing for a new project.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    repoUrl: {
                        type: SchemaType.STRING,
                        description: "The Git repository URL for the new worker to clone and work on."
                    },
                    taskFilter: {
                        type: SchemaType.STRING,
                        description: "Optional: A tag to filter tasks for this worker (e.g., 'repo-123')."
                    },
                    memoryLimit: {
                        type: SchemaType.NUMBER,
                        description: "Optional: Memory limit in MB (default: 512)."
                    }
                },
                required: ["repoUrl"]
            }
        };
    }

    async execute(args: { repoUrl: string, taskFilter?: string, memoryLimit?: number }): Promise<string> {
        let projectId = 'default';
        try {
            const rcPath = path.join(getProjectRoot(), '.firmosrc');
            if (fs.existsSync(rcPath)) {
                const rcContent = fs.readFileSync(rcPath, 'utf8');
                const match = rcContent.match(/project_id:\s*([a-zA-Z0-9-]+)/);
                if (match) projectId = match[1];
            }
        } catch (e) {}

        try {
            const containerId = await this.infrastructure.spawnWorker({
                repoUrl: args.repoUrl,
                taskFilter: args.taskFilter,
                memoryLimit: args.memoryLimit || 512,
                projectId: projectId
            });
            return `SUCCESS: Spawned worker container ${containerId} for repo ${args.repoUrl}.`;
        } catch (error: any) {
            throw new Error(`Failed to provision worker: ${error.message}`);
        }
    }

    get guidance(): string {
        return "Use this tool when you need to onboard a new project or scale up processing power. Providing a repoUrl ensures the new worker is dedicated to that codebase.";
    }
}
