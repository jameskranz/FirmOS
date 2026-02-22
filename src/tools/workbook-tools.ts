import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.ts';
import type { ToolDefinition } from './base.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim();
}

const WORK_DIR = path.resolve(__dirname, '..', '..', 'company', 'work');

export class InitializeFeatureWorkTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "initialize_feature_work",
            description: "Initializes a new dedicated workbook for a feature iteration. Returns the path to the workbook.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    featureName: {
                        type: SchemaType.STRING,
                        description: "The human-readable name of the feature, e.g., 'Multi-Queue Routing'."
                    }
                },
                required: ["featureName"]
            }
        };
    }

    async execute(args: { featureName: string }): Promise<string> {
        const slug = getSlug(args.featureName);
        const filePath = path.join(WORK_DIR, `${slug}.md`);
        
        await fs.mkdir(WORK_DIR, { recursive: true });
        const initialContent = `# Feature Workbook: ${args.featureName}

Created: ${new Date().toISOString()}

---
`;
        
        await fs.writeFile(filePath, initialContent);
        console.log(`📝 Initialized workbook: ${slug}.md`);
        return `Workbook initialized at company/work/${slug}.md`;
    }
}

export class AddFeatureNoteTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "add_feature_note",
            description: "Appends a new note, draft, or piece of feedback to an existing feature workbook.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    featureName: {
                        type: SchemaType.STRING,
                        description: "The name of the feature (must match the one used during initialization)."
                    },
                    noteTitle: {
                        type: SchemaType.STRING,
                        description: "A short title for this entry, e.g., 'Initial Draft' or 'Architectural Feedback'."
                    },
                    content: {
                        type: SchemaType.STRING,
                        description: "The Markdown content to add."
                    }
                },
                required: ["featureName", "noteTitle", "content"]
            }
        };
    }

    async execute(args: { featureName: string, noteTitle: string, content: string }): Promise<string> {
        const slug = getSlug(args.featureName);
        const filePath = path.join(WORK_DIR, `${slug}.md`);
        
        const entry = `
## ${args.noteTitle}
**Timestamp:** ${new Date().toISOString()}

${args.content}

---
`;
        
        await fs.appendFile(filePath, entry);
        console.log(`🖋️  Added note to workbook: ${slug}.md`);
        return `Successfully added note to ${args.featureName} workbook.`;
    }
}

export class ReadFeatureWorkTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "read_feature_work",
            description: "Reads the entire history of a feature workbook.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    featureName: {
                        type: SchemaType.STRING,
                        description: "The name of the feature workbook to read."
                    }
                },
                required: ["featureName"]
            }
        };
    }

    async execute(args: { featureName: string }): Promise<string> {
        const slug = getSlug(args.featureName);
        const filePath = path.join(WORK_DIR, `${slug}.md`);
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            console.log(`📖 Read workbook: ${slug}.md`);
            return content;
        } catch (err: any) {
            throw new Error(`Workbook not found for feature: ${args.featureName}`);
        }
    }
}
