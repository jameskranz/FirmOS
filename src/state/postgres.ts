import pkg from 'pg';
const { Pool } = pkg;
import type { Pool as PoolType } from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseStateManager } from './base.js';
import type { WorkflowState, WorkflowHistoryEntry, Ticket, Role } from './base.js';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust root detection:
const PROJECT_ROOT = __dirname.includes(path.join('dist', 'src'))
    ? path.resolve(__dirname, '..', '..', '..')
    : path.resolve(__dirname, '..', '..');

export class PostgresStateManager extends BaseStateManager {
    private pool: PoolType;

    constructor(connectionString?: string) {
        super();
        this.pool = new Pool({
            connectionString: connectionString || process.env.DATABASE_URL || 'postgresql://firmos_admin:firmos_password@localhost:5432/firmos'
        }) as any;
    }

    async initializeSchema() {
        const migrationPath = path.join(PROJECT_ROOT, 'src', 'state', 'migrations', '001_initial_schema.sql');
        const sql = await fs.readFile(migrationPath, 'utf8');

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
            console.log('✅ Postgres schema initialized from SQL file.');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // --- Workflows ---

    async initializeWorkflow(state: Omit<WorkflowState, 'history' | 'updatedAt'>): Promise<void> {
        await this.pool.query(
            'INSERT INTO workflows (feature_id, feature_name, current_agent, status, workbook_path, approvals, repository_url) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (feature_id) DO NOTHING',
            [state.featureId, state.featureName, state.currentAgent, state.status, state.workbookPath, state.approvals, state.repositoryUrl]
        );
    }

    async updateWorkflow(featureId: string, updates: Partial<Omit<WorkflowState, 'featureId' | 'history'>>, historyEntry?: WorkflowHistoryEntry): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get current workflow to append history
            const res = await client.query('SELECT history FROM workflows WHERE feature_id = $1 FOR UPDATE', [featureId]);
            if (res.rowCount === 0) throw new Error(`Workflow not found: ${featureId}`);
            
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
            
            values.push(featureId);
            const query = `UPDATE workflows SET ${setClauses.join(', ')} WHERE feature_id = $${i}`;
            
            await client.query(query, values);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getWorkflow(featureId: string): Promise<WorkflowState | null> {
        const res = await this.pool.query('SELECT * FROM workflows WHERE feature_id = $1', [featureId]);
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

    async listWorkflows(): Promise<WorkflowState[]> {
        const res = await this.pool.query('SELECT * FROM workflows');
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

    // --- Tickets ---

    async createTicket(ticketData: Omit<Ticket, 'id' | 'created' | 'updated' | 'status'>): Promise<string> {
        const id = randomUUID();
        await this.pool.query(
            'INSERT INTO tickets (id, parent_id, title, description, requirements, repository_url, status, assigned_role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, ticketData.parentId, ticketData.title, ticketData.description, ticketData.requirements, ticketData.repositoryUrl, 'Open', ticketData.assignedRole]
        );
        return id;
    }

    async updateTicket(ticketId: string, updates: Partial<Omit<Ticket, 'id' | 'created'>>): Promise<void> {
        const setClauses = [];
        const values = [];
        let i = 1;

        if (updates.status) { setClauses.push(`status = $${i++}`); values.push(updates.status); }
        if (updates.assignedRole) { setClauses.push(`assigned_role = $${i++}`); values.push(updates.assignedRole); }
        if (updates.outputArtifact) { setClauses.push(`output_artifact = $${i++}`); values.push(updates.outputArtifact); }
        if (updates.repositoryUrl) { setClauses.push(`repository_url = $${i++}`); values.push(updates.repositoryUrl); }
        
        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(ticketId);
        
        const query = `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = $${i}`;
        await this.pool.query(query, values);
    }

    async getTicket(ticketId: string): Promise<Ticket | null> {
        const res = await this.pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
        if (res.rowCount === 0) return null;
        const row = res.rows[0];
        return {
            id: row.id,
            parentId: row.parent_id,
            title: row.title,
            description: row.description,
            requirements: row.requirements,
            repositoryUrl: row.repository_url,
            status: row.status as any,
            assignedRole: row.assigned_role,
            outputArtifact: row.output_artifact,
            created: row.created_at.toISOString(),
            updated: row.updated_at.toISOString()
        };
    }

    async listTickets(parentId: string | null): Promise<Ticket[]> {
        const query = parentId === null 
            ? 'SELECT * FROM tickets WHERE parent_id IS NULL'
            : 'SELECT * FROM tickets WHERE parent_id = $1';
        const values = parentId === null ? [] : [parentId];
        
        const res = await this.pool.query(query, values);
        return res.rows.map((row: any) => ({
            id: row.id,
            parentId: row.parent_id,
            title: row.title,
            description: row.description,
            requirements: row.requirements,
            repositoryUrl: row.repository_url,
            status: row.status as any,
            assignedRole: row.assigned_role,
            outputArtifact: row.output_artifact,
            created: row.created_at.toISOString(),
            updated: row.updated_at.toISOString()
        }));
    }

    // --- Roles ---

    async upsertRole(role: Omit<Role, 'updatedAt'>): Promise<void> {
        await this.pool.query(
            'INSERT INTO roles (role_name, description, sla_content, model_tier) VALUES ($1, $2, $3, $4) ON CONFLICT (role_name) DO UPDATE SET description = $2, sla_content = $3, model_tier = $4, updated_at = CURRENT_TIMESTAMP',
            [role.roleName, role.description, role.slaContent, role.modelTier]
        );
    }

    async getRole(roleName: string): Promise<Role | null> {
        const res = await this.pool.query('SELECT * FROM roles WHERE role_name = $1', [roleName]);
        if (res.rowCount === 0) return null;
        const row = res.rows[0];
        return {
            roleName: row.role_name,
            description: row.description,
            slaContent: row.sla_content,
            modelTier: row.model_tier,
            updatedAt: row.updated_at.toISOString()
        };
    }

    async listRoles(): Promise<Role[]> {
        const res = await this.pool.query('SELECT * FROM roles');
        return res.rows.map((row: any) => ({
            roleName: row.role_name,
            description: row.description,
            slaContent: row.sla_content,
            modelTier: row.model_tier,
            updatedAt: row.updated_at.toISOString()
        }));
    }

    async disconnect() {
        await this.pool.end();
    }
}
