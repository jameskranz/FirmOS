import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust root detection:
const PROJECT_ROOT = __dirname.includes(path.join('dist', 'src'))
    ? path.resolve(__dirname, '..', '..', '..')
    : path.resolve(__dirname, '..', '..');

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
        const fullPath = path.join(PROJECT_ROOT, relativePath);
        
        try {
            const content = await fs.readFile(fullPath, 'utf8');
            console.log(`📖 Executed Tool: read_file -> 📂 ${relativePath}`);
            return content;
        } catch (err: any) {
            throw new Error(`Failed to read file ${relativePath}: ${err.message}`);
        }
    }

    get guidance(): string {
        return "Use this tool to inspect the contents of any file in the codebase. It is essential for gathering context before you propose changes or when you need to understand existing architectural patterns. Always verify that a file exists before attempting to read it if you are unsure.";
    }
}
