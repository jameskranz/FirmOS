import type { Pool } from 'pg';
import { IDirectiveRepository } from '../base.js';

export class PostgresDirectiveRepository implements IDirectiveRepository {
    constructor(private pool: Pool, private projectId: string) {}

    async upsert(roleName: string, content: string, updatedBy: string = 'system', reason?: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Update the current directive
            await client.query(
                'INSERT INTO directives (project_id, role_name, content) VALUES ($1, $2, $3) ON CONFLICT (project_id, role_name) DO UPDATE SET content = $3, updated_at = CURRENT_TIMESTAMP',
                [this.projectId, roleName, content]
            );

            // 2. Log history
            await client.query(
                'INSERT INTO directive_history (project_id, role_name, content, reason, updated_by) VALUES ($1, $2, $3, $4, $5)',
                [this.projectId, roleName, content, reason, updatedBy]
            );

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async get(roleName: string): Promise<string | null> {
        const res = await this.pool.query('SELECT content FROM directives WHERE project_id = $1 AND role_name = $2', [this.projectId, roleName]);
        if (res.rowCount === 0) return null;
        return res.rows[0].content;
    }

    async listHistory(roleName: string): Promise<any[]> {
        const res = await this.pool.query('SELECT * FROM directive_history WHERE project_id = $1 AND role_name = $2 ORDER BY timestamp DESC', [this.projectId, roleName]);
        return res.rows;
    }
}
