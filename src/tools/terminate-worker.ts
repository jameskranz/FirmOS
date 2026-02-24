import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { InfrastructureManager } from '../utils/infrastructure-manager.js';

export class TerminateWorkerTool extends BaseTool {
    private infrastructure: InfrastructureManager;

    constructor() {
        super();
        this.infrastructure = new InfrastructureManager();
    }

    get definition(): ToolDefinition {
        return {
            name: "terminate_worker",
            description: "Terminates a specific worker container by ID. Use this to remove idle resources or faulty workers.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    containerId: {
                        type: SchemaType.STRING,
                        description: "The Docker Container ID to terminate."
                    }
                },
                required: ["containerId"]
            }
        };
    }

    async execute(args: { containerId: string }): Promise<string> {
        try {
            await this.infrastructure.terminateWorker(args.containerId);
            return `SUCCESS: Terminated worker container ${args.containerId}.`;
        } catch (error: any) {
            throw new Error(`Failed to terminate worker: ${error.message}`);
        }
    }

    get guidance(): string {
        return "Use this tool responsibly. Ensure the worker is idle before terminating.";
    }
}
