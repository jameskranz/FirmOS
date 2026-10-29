import fs from 'node:fs/promises';
import path from 'node:path';
import { IProjectConfigRepository } from '../base.js';

export class JsonProjectConfigRepository implements IProjectConfigRepository {
    constructor(private filePath: string) {}

    private async read(): Promise<Record<string, string>> {
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(content);
        } catch (error: any) {
            if (error.code === 'ENOENT') return {};
            throw error;
        }
    }

    private async write(data: Record<string, string>): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }

    async upsert(key: string, value: string): Promise<void> {
        const data = await this.read();
        data[key] = value;
        await this.write(data);
    }

    async get(key: string): Promise<string | null> {
        const data = await this.read();
        return data[key] || null;
    }
}
