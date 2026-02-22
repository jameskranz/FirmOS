import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.ts';
import type { ToolDefinition } from './base.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ReadFileTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "read_file",
            description: "Reads the content of a file relative to the FirmOS project root.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    relativePath: {
                        type: SchemaType.STRING,
                        description: "The relative path to the file, e.g., 'prd.md' or 'src/daemon.ts'"
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
            const content = await fs.readFile(fullPath, 'utf8');
            console.log(`📖 Executed Tool: read_file -> 📂 ${relativePath}`);
            return content;
        } catch (err: any) {
            throw new Error(`Failed to read file ${relativePath}: ${err.message}`);
        }
    }
}
