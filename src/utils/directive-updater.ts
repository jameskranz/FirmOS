import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getProjectRoot } from './path-resolver.js';
import { BaseStateManager } from '../state/base.js';

export class DirectiveUpdater {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async updateDirectives(interaction: { prompt: string, response: string }, managerRole: string = 'ceo', stateManager?: BaseStateManager) {
        const root = getProjectRoot();
        const filename = `${managerRole.replace('/', '-')}.md`;
        const directivesPath = path.join(root, 'company', 'work', 'directives', filename);
        
        // 1. Get current state (prefer DB, fallback to file for init)
        let currentDirectives = '';
        if (stateManager) {
            currentDirectives = await stateManager.getDirective(managerRole) || '';
        }

        if (!currentDirectives) {
            try {
                currentDirectives = await fs.readFile(directivesPath, 'utf8');
            } catch (e) {
                currentDirectives = `# Directives from ${managerRole.toUpperCase()}

This file contains an up-to-date summary of mandates and strategic corrections from ${managerRole}.`;
            }
        }

        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const systemPrompt = `You are the Organizational Architect for FirmOS. Your job is to maintain mandates for '${managerRole}'.
When the manager provides feedback, you must integrate it into the existing directives.
CONFLICT RESOLUTION: If the new feedback contradicts old directives, the NEW feedback takes precedence.
FOCUS: Summarize what is TRUE NOW. Keep the document concise and actionable.
Do not output conversational text. Output the full updated Markdown content.`;

        const updatePrompt = `EXISTING DIRECTIVES:
---
${currentDirectives}
---

NEW INTERACTION:
Context: ${interaction.prompt}
Response: ${interaction.response}

Update the directives now.`;

        try {
            const result = await model.generateContent([systemPrompt, updatePrompt]);
            const updatedContent = result.response.text().trim();
            
            // 2. Persist to DB (Primary)
            if (stateManager) {
                await stateManager.upsertDirective(managerRole, updatedContent);
            }

            // 3. Sync to Filesystem (for human visibility/discovery)
            await fs.mkdir(path.dirname(directivesPath), { recursive: true });
            await fs.writeFile(directivesPath, updatedContent);
            
            console.log(`📝 Directives for [${managerRole}] updated successfully.`);
        } catch (err: any) {
            console.error(`❌ Failed to update Directives for ${managerRole}: ${err.message}`);
        }
    }
}
