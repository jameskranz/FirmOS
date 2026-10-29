import fs from 'node:fs/promises';
import path from 'node:path';
import { IAuditLogRepository } from '../base.js';
import { randomUUID } from 'node:crypto';

export class JsonAuditLogRepository implements IAuditLogRepository {
    constructor(private filePath: string) {}

    private async read(): Promise<any[]> {
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(content);
        } catch (error: any) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }

    private async write(data: any[]): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }

    async log(eventType: string, eventName: string, details?: any): Promise<void> {
        const logs = await this.read();
        logs.push({
            id: randomUUID(),
            projectId: 'default',
            eventType,
            eventName,
            details,
            timestamp: new Date().toISOString()
        });
        await this.write(logs);
    }

    async list(eventType?: string): Promise<any[]> {
        const logs = await this.read();
        if (eventType) {
            return logs.filter(l => l.eventType === eventType);
        }
        return logs;
    }
}
