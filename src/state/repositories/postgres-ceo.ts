import type { Pool } from 'pg';
import { ICeoMemoryRepository, CeoInteraction } from '../base.js';

export class PostgresCeoMemoryRepository implements ICeoMemoryRepository {
    constructor(private pool: Pool, private projectId: string) {}

    async log(prompt: string, response: string): Promise<void> {
        await this.pool.query(
            'INSERT INTO ceo_interactions (project_id, original_prompt, ceo_response) VALUES ($1, $2, $3)',
            [this.projectId, prompt, response]
        );
    }

    async list(): Promise<CeoInteraction[]> {
        const res = await this.pool.query('SELECT * FROM ceo_interactions WHERE project_id = $1 ORDER BY timestamp ASC', [this.projectId]);
        return res.rows.map((row: any) => ({
            id: row.id,
            projectId: row.project_id,
            originalPrompt: row.original_prompt,
            ceoResponse: row.ceo_response,
            timestamp: row.timestamp.toISOString()
        }));
    }
}
