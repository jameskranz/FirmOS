import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { getProjectRoot, getArtifactsDir } from '../utils/path-resolver.js';
import { JsonStateManager } from '../state/json.js';

export class ReviewArtifactTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "review_artifact",
            description: "Retrieves the content of a specific project artifact (PRD, Technical Design, etc.) for review. Also returns recent review comments.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    featureId: {
                        type: SchemaType.STRING,
                        description: "The unique ID of the feature."
                    },
                    artifactType: {
                        type: SchemaType.STRING,
                        description: "The type of artifact to review. Options: 'workbook' (default), 'prd', 'design', 'test-plan'."
                    }
                },
                required: ["featureId"]
            }
        };
    }

    async execute(args: { featureId: string, artifactType?: string }): Promise<string> {
        const { featureId, artifactType = 'workbook' } = args;
        
        let filename = '';
        switch (artifactType.toLowerCase()) {
            case 'prd':
                filename = `${featureId}-prd.md`;
                break;
            case 'design':
                filename = `${featureId}-design.md`;
                break;
            case 'test-plan':
                filename = `${featureId}-test-plan.md`;
                break;
            case 'workbook':
            default:
                filename = `${featureId}.md`;
                break;
        }

        const workDir = getArtifactsDir();
        const filePath = path.join(workDir, filename);
        
        // Selection logic for state manager
        const stateFile = path.join(getProjectRoot(), 'company', 'state', 'workflows.json');
        const stateManager = (global as any).firmOsStateManager;

        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            // Retrieve Review History if possible
            let historyText = "";
            if (stateManager.reviews) {
                const reviews = await stateManager.reviews.list(featureId);
                const relevantReviews = reviews.filter((r: any) => r.artifactType === artifactType);
                if (relevantReviews.length > 0) {
                    historyText = "\n\n--- REVIEWS & COMMENTS ---\n";
                    relevantReviews.forEach((r: any) => {
                        historyText += `\n[${r.timestamp}] ${r.reviewerRole}: ${r.status.toUpperCase()}\nNote: ${r.note || 'None'}\n`;
                    });
                }
            }

            console.log(`📖 Executed Tool: review_artifact -> 📂 ${filename}`);
            return content + historyText;
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                // Fallback: try finding the main workbook if specialized artifact missing
                if (artifactType !== 'workbook') {
                    console.warn(`⚠️ Artifact ${filename} not found. Falling back to main workbook.`);
                    try {
                        const workbookPath = path.join(workDir, `${featureId}.md`);
                        const content = await fs.readFile(workbookPath, 'utf8');
                        return `NOTE: Specific artifact '${filename}' not found. Returning main workbook content:\n\n${content}`;
                    } catch (e) {}
                }
                return `Error: Artifact '${filename}' not found for feature '${featureId}'.`;
            }
            throw new Error(`Failed to read artifact: ${err.message}`);
        }
    }

    get guidance(): string {
        return "Use this tool to read project documents for review. It returns the document content followed by any structured review feedback already recorded. This ensures you see the full lifecycle of feedback for the document.";
    }
}
