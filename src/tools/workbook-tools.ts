import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { getProjectRoot, getArtifactsDir } from '../utils/path-resolver.js';

function getSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim();
}

function getWorkDir(): string {
    return getArtifactsDir();
}

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
                    },
                    repositoryUrl: {
                        type: SchemaType.STRING,
                        description: "Optional: The Git repository URL where the feature work will reside."
                    }
                },
                required: ["featureName"]
            }
        };
    }

    async execute(args: { featureName: string, repositoryUrl?: string }): Promise<string> {
        const slug = getSlug(args.featureName);
        const filePath = path.join(getWorkDir(), `${slug}.md`);
        
        await fs.mkdir(getWorkDir(), { recursive: true });
        const initialContent = `# Feature Workbook: ${args.featureName}

Created: ${new Date().toISOString()}
Repository: ${args.repositoryUrl || 'N/A'}

---
`;
        
        await fs.writeFile(filePath, initialContent);
        console.log(`📝 Initialized workbook: ${slug}.md`);
        return `SUCCESS: Workbook initialized. featureId='${slug}', path='${path.relative(getProjectRoot(), filePath)}'${args.repositoryUrl ? `, repositoryUrl='${args.repositoryUrl}'` : ''}`;
    }

    get guidance(): string {
        return "Use this tool at the very beginning of a new project or feature. It creates a dedicated Markdown workbook which will serve as the source of truth for the entire feature lifecycle. Use the returned 'featureId' for all subsequent updates.";
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
        const filePath = path.join(getWorkDir(), `${slug}.md`);
        
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

    get guidance(): string {
        return "Use this tool to record every step of your progress, including initial drafts, refined requirements, architectural decisions, or feedback summaries. The feature workbook must contain the complete history of the feature's evolution.";
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
        const filePath = path.join(getWorkDir(), `${slug}.md`);
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            console.log(`📖 Read workbook: ${slug}.md`);
            return content;
        } catch (err: any) {
            throw new Error(`Workbook not found for feature: ${args.featureName}`);
        }
    }

    get guidance(): string {
        return "Use this tool whenever you take over a feature from another agent. It allows you to read the full history and specifications recorded in the workbook, ensuring context is preserved across handoffs.";
    }
}
