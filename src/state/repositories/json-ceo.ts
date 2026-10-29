import fs from 'node:fs/promises';
import path from 'node:path';
import { ICeoMemoryRepository, CeoInteraction } from '../base.js';
import { randomUUID } from 'node:crypto';

export class JsonCeoMemoryRepository implements ICeoMemoryRepository {
    constructor(private filePath: string) {}

    private async read(): Promise<CeoInteraction[]> {
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(content);
        } catch (error: any) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }

    private async write(data: CeoInteraction[]): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }

    async log(prompt: string, response: string): Promise<void> {
        const logs = await this.read();
        logs.push({
            id: randomUUID(),
            projectId: 'default',
            originalPrompt: prompt,
            ceoResponse: response,
            timestamp: new Date().toISOString()
        });
        await this.write(logs);
    }

    async list(): Promise<CeoInteraction[]> {
        return this.read();
    }
}
