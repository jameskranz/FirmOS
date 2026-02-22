import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.ts';
import type { ToolDefinition } from './base.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SaveFileTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "save_file",
            description: "Saves text or markdown content to a specified file path relative to the FirmOS project root. Use this to update code and documentation.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    relativePath: {
                        type: SchemaType.STRING,
                        description: "The relative path to save the file, e.g., 'src/components/Button.tsx' or 'prd.md'"
                    },
                    content: {
                        type: SchemaType.STRING,
                        description: "The complete, raw content to be written to the file."
                    }
                },
                required: ["relativePath", "content"]
            }
        };
    }

    async execute(args: { relativePath: string, content: string }): Promise<string> {
        const { relativePath, content } = args;
        const fullOutputPath = path.resolve(__dirname, '..', '..', relativePath);
        
        await fs.mkdir(path.dirname(fullOutputPath), { recursive: true });
        await fs.writeFile(fullOutputPath, content.replace(/\r/g, ''));
        
        console.log(`🛠️  Executed Tool: save_file -> 📂 ${relativePath}`);
        return `Successfully saved file to ${relativePath}`;
    }
}

// Entry point for direct testing or CLI usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const tool = new SaveFileTool();
    const args = JSON.parse(process.argv[2] || '{}');
    tool.execute(args).catch(err => {
        console.error(err);
        process.exit(1);
    });
}
