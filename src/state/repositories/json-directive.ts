import fs from 'node:fs/promises';
import path from 'node:path';
import { IDirectiveRepository } from '../base.js';

export class JsonDirectiveRepository implements IDirectiveRepository {
    constructor(private filePath: string) {}

    private async read(): Promise<{ current: Record<string, string>, history: any[] }> {
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(content);
        } catch (error: any) {
            if (error.code === 'ENOENT') return { current: {}, history: [] };
            throw error;
        }
    }

    private async write(data: { current: Record<string, string>, history: any[] }): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }

    async upsert(roleName: string, content: string, updatedBy: string = 'system', reason?: string): Promise<void> {
        const data = await this.read();
        data.current[roleName] = content;
        data.history.push({
            roleName,
            content,
            updatedBy,
            reason,
            timestamp: new Date().toISOString()
        });
        await this.write(data);
    }

    async get(roleName: string): Promise<string | null> {
        const data = await this.read();
        return data.current[roleName] || null;
    }

    async listHistory(roleName: string): Promise<any[]> {
        const data = await this.read();
        return data.history
            .filter(h => h.roleName === roleName)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
}
