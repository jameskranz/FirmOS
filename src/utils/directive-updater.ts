import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getProjectRoot } from './path-resolver.js';

export class DirectiveUpdater {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async updateDirectives(interaction: { prompt: string, response: string }) {
        const root = getProjectRoot();
        const directivesPath = path.join(root, 'company', 'work', 'ceo-directives.md');
        
        let currentDirectives = '';
        try {
            currentDirectives = await fs.readFile(directivesPath, 'utf8');
        } catch (e) {
            currentDirectives = `# CEO Directives

This file contains an up-to-date summary of the CEO's mandates and strategic corrections.`;
        }

        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const systemPrompt = `You are the System Architect for FirmOS. Your job is to maintain 'ceo-directives.md', which is the single source of truth for human mandates.
When the CEO provides feedback, you must integrate it into the existing directives.
CONFLICT RESOLUTION: If the new feedback contradicts old directives, the NEW feedback takes precedence.
FOCUS: Summarize what is TRUE NOW. Keep the document concise and actionable.
Do not output conversational text. Output the full updated Markdown content for 'ceo-directives.md'.`;

        const updatePrompt = `EXISTING DIRECTIVES:
---
${currentDirectives}
---

NEW CEO INTERACTION:
Prompt from system: ${interaction.prompt}
CEO Response: ${interaction.response}

Update the directives now.`;

        try {
            const result = await model.generateContent([systemPrompt, updatePrompt]);
            const updatedContent = result.response.text();
            
            await fs.mkdir(path.dirname(directivesPath), { recursive: true });
            await fs.writeFile(directivesPath, updatedContent.trim());
            console.log('📝 CEO Directives updated successfully.');
        } catch (err: any) {
            console.error(`❌ Failed to update CEO Directives: ${err.message}`);
        }
    }
}
