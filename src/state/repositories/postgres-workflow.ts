import type { Pool } from 'pg';
import { IWorkflowRepository, WorkflowState, WorkflowHistoryEntry } from '../base.js';

export class PostgresWorkflowRepository implements IWorkflowRepository {
    constructor(private pool: Pool, private projectId: string) {}

    async initialize(state: Omit<WorkflowState, 'history' | 'updatedAt'>): Promise<void> {
        await this.pool.query(
            'INSERT INTO workflows (project_id, feature_id, feature_name, current_agent, status, workbook_path, approvals, repository_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (project_id, feature_id) DO NOTHING',
            [this.projectId, state.featureId, state.featureName, state.currentAgent, state.status, state.workbookPath, state.approvals, state.repositoryUrl]
        );
    }

    async update(featureId: string, updates: Partial<Omit<WorkflowState, 'featureId' | 'history'>>, historyEntry?: WorkflowHistoryEntry): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get current workflow to append history
            const res = await client.query('SELECT history FROM workflows WHERE project_id = $1 AND feature_id = $2 FOR UPDATE', [this.projectId, featureId]);
            if (res.rowCount === 0) throw new Error(`Workflow not found: ${featureId} in project ${this.projectId}`);
            
            const currentHistory = res.rows[0].history || [];
            if (historyEntry) currentHistory.push(historyEntry);

            // Dynamically build SET clause
            const setClauses = [];
            const values = [];
            let i = 1;

            if (updates.currentAgent) { setClauses.push(`current_agent = $${i++}`); values.push(updates.currentAgent); }
            if (updates.status) { setClauses.push(`status = $${i++}`); values.push(updates.status); }
            if (updates.workbookPath) { setClauses.push(`workbook_path = $${i++}`); values.push(updates.workbookPath); }
            if (updates.approvals) { setClauses.push(`approvals = $${i++}`); values.push(updates.approvals); }
            if (updates.repositoryUrl) { setClauses.push(`repository_url = $${i++}`); values.push(updates.repositoryUrl); }
            
            setClauses.push(`history = $${i++}`); values.push(JSON.stringify(currentHistory));
            setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
            
            values.push(this.projectId);
            values.push(featureId);
            const query = `UPDATE workflows SET ${setClauses.join(', ')} WHERE project_id = $${i} AND feature_id = $${i+1}`;
            
            await client.query(query, values);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async get(featureId: string): Promise<WorkflowState | null> {
        const res = await this.pool.query('SELECT * FROM workflows WHERE project_id = $1 AND feature_id = $2', [this.projectId, featureId]);
        if (res.rowCount === 0) return null;
        const row = res.rows[0];
        return {
            featureId: row.feature_id,
            featureName: row.feature_name,
            currentAgent: row.current_agent,
            status: row.status as any,
            workbookPath: row.workbook_path,
            repositoryUrl: row.repository_url,
            approvals: row.approvals,
            history: row.history,
            updatedAt: row.updated_at.toISOString()
        };
    }

    async list(): Promise<WorkflowState[]> {
        const res = await this.pool.query('SELECT * FROM workflows WHERE project_id = $1', [this.projectId]);
        return res.rows.map((row: any) => ({
            featureId: row.feature_id,
            featureName: row.feature_name,
            currentAgent: row.current_agent,
            status: row.status as any,
            workbookPath: row.workbook_path,
            repositoryUrl: row.repository_url,
            approvals: row.approvals,
            history: row.history,
            updatedAt: row.updated_at.toISOString()
        }));
    }
}
