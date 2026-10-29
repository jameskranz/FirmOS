import type { Pool } from 'pg';
import { IAuditLogRepository } from '../base.js';

export class PostgresAuditLogRepository implements IAuditLogRepository {
    constructor(private pool: Pool, private projectId: string) {}

    async log(eventType: string, eventName: string, details?: any): Promise<void> {
        await this.pool.query(
            'INSERT INTO system_audit_logs (project_id, event_type, event_name, details) VALUES ($1, $2, $3, $4)',
            [this.projectId, eventType, eventName, details ? JSON.stringify(details) : null]
        );
    }

    async list(eventType?: string): Promise<any[]> {
        let query = 'SELECT * FROM system_audit_logs WHERE project_id = $1';
        const params: any[] = [this.projectId];
        
        if (eventType) {
            query += ' AND event_type = $2';
            params.push(eventType);
        }
        
        query += ' ORDER BY timestamp DESC';
        const res = await this.pool.query(query, params);
        return res.rows;
    }
}
