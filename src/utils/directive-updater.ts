import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseStateManager } from '../state/base.js';

export class DirectiveUpdater {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async updateDirectives(interaction: { prompt: string, response: string }, managerRole: string = 'ceo', stateManager?: BaseStateManager) {
        // 1. Get current state from DB
        let currentDirectives = '';
        if (stateManager) {
            currentDirectives = await stateManager.directives.get(managerRole) || '';
        }

        if (!currentDirectives) {
            currentDirectives = `# Directives from ${managerRole.toUpperCase()}\n\nThis file contains an up-to-date summary of mandates and strategic corrections from ${managerRole}.`;
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
            
            // 2. Persist to DB (Primary) - includes history tracking
            if (stateManager) {
                await stateManager.directives.upsert(
                    managerRole, 
                    updatedContent, 
                    managerRole, 
                    interaction.prompt // The reason/context
                );
            }
            
            console.log(`📝 Directives for [${managerRole}] updated successfully in Database (History recorded).`);
        } catch (err: any) {
            console.error(`❌ Failed to update Directives for ${managerRole}: ${err.message}`);
        }
    }
}
