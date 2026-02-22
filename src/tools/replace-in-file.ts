import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.ts';
import type { ToolDefinition } from './base.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ReplaceInFileTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "replace_in_file",
            description: "Replaces specific text within a file. Use this for granular updates to large documents like the PRD.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    relativePath: {
                        type: SchemaType.STRING,
                        description: "The relative path to the file."
                    },
                    oldText: {
                        type: SchemaType.STRING,
                        description: "The exact text to be replaced. Provide enough context to make it unique."
                    },
                    newText: {
                        type: SchemaType.STRING,
                        description: "The new text to replace the old text with."
                    }
                },
                required: ["relativePath", "oldText", "newText"]
            }
        };
    }

    async execute(args: { relativePath: string, oldText: string, newText: string }): Promise<string> {
        const { relativePath, oldText, newText } = args;
        const fullPath = path.resolve(__dirname, '..', '..', relativePath);
        const currentContent = await fs.readFile(fullPath, 'utf8');
        
        console.log(`🔍 [replace_in_file] Debug: Looking for text (length ${oldText.length}): "${oldText}"`);
        if (currentContent.includes(oldText)) {
            const updatedContent = currentContent.replace(oldText, newText);
            await fs.writeFile(fullPath, updatedContent.replace(/\r/g, ''));
            console.log(`🛠️  Executed Tool: replace_in_file -> 📝 ${relativePath}`);
            return `Successfully replaced text in ${relativePath}`;
        } else {
            console.log(`❌ [replace_in_file] Debug: Text not found. File preview: "${currentContent.substring(0, 200).replace(/\n/g, '\\n')}"`);
            throw new Error(`replace_in_file failed: oldText not found in ${relativePath}`);
        }
    }
}

// Entry point for direct testing or CLI usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const tool = new ReplaceInFileTool();
    const args = JSON.parse(process.argv[2] || '{}');
    tool.execute(args).catch(err => {
        console.error(err);
        process.exit(1);
    });
}
