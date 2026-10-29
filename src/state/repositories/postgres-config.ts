import type { Pool } from 'pg';
import { IProjectConfigRepository } from '../base.js';

export class PostgresProjectConfigRepository implements IProjectConfigRepository {
    constructor(private pool: Pool, private projectId: string) {}

    async upsert(key: string, value: string): Promise<void> {
        await this.pool.query(
            'INSERT INTO project_config (project_id, config_key, config_value) VALUES ($1, $2, $3) ON CONFLICT (project_id, config_key) DO UPDATE SET config_value = $3',
            [this.projectId, key, value]
        );
    }

    async get(key: string): Promise<string | null> {
        const res = await this.pool.query('SELECT config_value FROM project_config WHERE project_id = $1 AND config_key = $2', [this.projectId, key]);
        if (res.rowCount === 0) return null;
        return res.rows[0].config_value;
    }
}
