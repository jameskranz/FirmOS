import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { InfrastructureManager } from '../utils/infrastructure-manager.js';

export class ListWorkersTool extends BaseTool {
    private infrastructure: InfrastructureManager;

    constructor() {
        super();
        this.infrastructure = new InfrastructureManager();
    }

    get definition(): ToolDefinition {
        return {
            name: "list_workers",
            description: "Lists all active worker containers in the FirmOS swarm. Use this to monitor scaling and resource usage.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {},
                required: []
            }
        };
    }

    async execute(args: {}): Promise<string> {
        try {
            const workers = await this.infrastructure.listWorkers();
            return JSON.stringify(workers, null, 2);
        } catch (error: any) {
            throw new Error(`Failed to list workers: ${error.message}`);
        }
    }

    get guidance(): string {
        return "Use this tool to check which repos are currently being processed and to identify if we have enough or too many workers.";
    }
}
