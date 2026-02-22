import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.ts';
import type { ToolDefinition } from './base.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ListDirectoryTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "list_directory",
            description: "Lists the files and folders in a directory relative to the FirmOS project root.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    relativePath: {
                        type: SchemaType.STRING,
                        description: "The relative path to the directory, e.g., 'src' or 'company/roles'."
                    }
                },
                required: ["relativePath"]
            }
        };
    }

    async execute(args: { relativePath: string }): Promise<string> {
        const { relativePath } = args;
        const fullPath = path.resolve(__dirname, '..', '..', relativePath);
        
        try {
            const items = await fs.readdir(fullPath);
            console.log(`📂 Executed Tool: list_directory -> 📂 ${relativePath}`);
            return items.join(', ');
        } catch (err: any) {
            throw new Error(`Failed to list directory ${relativePath}: ${err.message}`);
        }
    }
}
