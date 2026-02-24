import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { getProjectRoot } from '../utils/path-resolver.js';

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
        const fullPath = path.join(getProjectRoot(), relativePath);
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

    get guidance(): string {
        return "Use this tool for surgical updates to specific lines or blocks of text within large files (like long Markdown documents or code files). It is safer than 'save_file' for large documents because it preserves the rest of the content. You must provide the EXACT existing text (including whitespace) for the replacement to succeed. If the text is not found exactly, the tool will fail.";
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
