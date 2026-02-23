import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export class LoopMonitor {
    private model: GenerativeModel;

    constructor(genAI: GoogleGenerativeAI, modelName: string) {
        this.model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: `You are a "Loop Monitor" for an autonomous agent swarm. 
            Your task is to analyze the history of a conversation and determine if the agent is stuck in a loop or making no progress.
            Look for:
            1. Repeatedly calling the same tool with the exact same arguments.
            2. Alternating between the same two tools without outcome change.
            3. Giving the same textual response multiple times.
            
            Answer ONLY with "STUCK" or "PROGRESSING".`
        });
    }

    async analyze(history: any[]): Promise<'STUCK' | 'PROGRESSING'> {
        const historyText = JSON.stringify(history);
        const result = await this.model.generateContent(`Analyze this conversation history for loops:

${historyText}`);
        const responseText = result.response.text().trim().toUpperCase();
        
        return responseText.includes('STUCK') ? 'STUCK' : 'PROGRESSING';
    }
}
