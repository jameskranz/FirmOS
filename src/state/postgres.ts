import pkg from 'pg';
const { Pool } = pkg;
import type { Pool as PoolType } from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseStateManager } from './base.js';
import type { WorkflowState, WorkflowHistoryEntry, Ticket, Role, CeoInteraction } from './base.js';
import { randomUUID } from 'node:crypto';
import { getProjectRoot } from '../utils/path-resolver.js';
import { MigrationManager } from './migration-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust root detection:
const ENGINE_ROOT = __dirname.includes(path.join('dist', 'src'))
    ? path.resolve(__dirname, '..', '..', '..')
    : path.resolve(__dirname, '..', '..');

export class PostgresStateManager extends BaseStateManager {
    private pool: PoolType;

    constructor(projectId: string = 'default', connectionString?: string) {
        super(projectId);
        this.pool = new Pool({
            connectionString: connectionString || process.env.DATABASE_URL || 'postgresql://firmos_admin:firmos_password@localhost:5432/firmos'
        }) as any;
    }

    async initializeSchema() {
        const manager = new MigrationManager(this.pool as any, ENGINE_ROOT);
        await manager.migrate();
    }

    // --- Workflows ---

    async initializeWorkflow(state: Omit<WorkflowState, 'history' | 'updatedAt'>): Promise<void> {
        await this.pool.query(
            'INSERT INTO workflows (project_id, feature_id, feature_name, current_agent, status, workbook_path, approvals, repository_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (project_id, feature_id) DO NOTHING',
            [this.projectId, state.featureId, state.featureName, state.currentAgent, state.status, state.workbookPath, state.approvals, state.repositoryUrl]
        );
    }

    async updateWorkflow(featureId: string, updates: Partial<Omit<WorkflowState, 'featureId' | 'history'>>, historyEntry?: WorkflowHistoryEntry): Promise<void> {
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

    async getWorkflow(featureId: string): Promise<WorkflowState | null> {
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

    async listWorkflows(): Promise<WorkflowState[]> {
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

    // --- Tickets ---

    async createTicket(ticketData: Omit<Ticket, 'id' | 'created' | 'updated' | 'status'>): Promise<string> {
        const id = randomUUID();
        await this.pool.query(
            'INSERT INTO tickets (id, project_id, parent_id, title, description, requirements, repository_url, status, assigned_role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [id, this.projectId, ticketData.parentId, ticketData.title, ticketData.description, ticketData.requirements, ticketData.repositoryUrl, 'Open', ticketData.assignedRole]
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
        values.push(this.projectId);
        values.push(ticketId);
        
        const query = `UPDATE tickets SET ${setClauses.join(', ')} WHERE project_id = $${i} AND id = $${i+1}`;
        await this.pool.query(query, values);
    }

    async getTicket(ticketId: string): Promise<Ticket | null> {
        const res = await this.pool.query('SELECT * FROM tickets WHERE project_id = $1 AND id = $2', [this.projectId, ticketId]);
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
            ? 'SELECT * FROM tickets WHERE project_id = $1 AND parent_id IS NULL'
            : 'SELECT * FROM tickets WHERE project_id = $1 AND parent_id = $2';
        const values = parentId === null ? [this.projectId] : [this.projectId, parentId];
        
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

    async listAllTickets(): Promise<Ticket[]> {
        const res = await this.pool.query('SELECT * FROM tickets WHERE project_id = $1', [this.projectId]);
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
            'INSERT INTO roles (project_id, role_name, description, sla_content, model_tier, manager_role, allowed_tools) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (project_id, role_name) DO UPDATE SET description = $3, sla_content = $4, model_tier = $5, manager_role = $6, allowed_tools = $7, updated_at = CURRENT_TIMESTAMP',
            [this.projectId, role.roleName, role.description, role.slaContent, role.modelTier, role.managerRole || null, role.allowedTools ? JSON.stringify(role.allowedTools) : null]
        );
    }

    async getRole(roleName: string): Promise<Role | null> {
        const res = await this.pool.query('SELECT * FROM roles WHERE project_id = $1 AND role_name = $2', [this.projectId, roleName]);
        if (res.rowCount === 0) return null;
        const row = res.rows[0];
        return {
            roleName: row.role_name,
            description: row.description,
            slaContent: row.sla_content,
            modelTier: row.model_tier,
            managerRole: row.manager_role,
            allowedTools: row.allowed_tools,
            updatedAt: row.updated_at.toISOString()
        };
    }

    async listRoles(): Promise<Role[]> {
        const res = await this.pool.query('SELECT * FROM roles WHERE project_id = $1', [this.projectId]);
        return res.rows.map((row: any) => ({
            roleName: row.role_name,
            description: row.description,
            slaContent: row.sla_content,
            modelTier: row.model_tier,
            managerRole: row.manager_role,
            allowedTools: row.allowed_tools,
            updatedAt: row.updated_at.toISOString()
        }));
    }

    // --- CEO Memory ---

    async logCeoInteraction(prompt: string, response: string): Promise<void> {
        await this.pool.query(
            'INSERT INTO ceo_interactions (project_id, original_prompt, ceo_response) VALUES ($1, $2, $3)',
            [this.projectId, prompt, response]
        );
    }

    async listCeoInteractions(): Promise<CeoInteraction[]> {
        const res = await this.pool.query('SELECT * FROM ceo_interactions WHERE project_id = $1 ORDER BY timestamp ASC', [this.projectId]);
        return res.rows.map((row: any) => ({
            id: row.id,
            projectId: row.project_id,
            originalPrompt: row.original_prompt,
            ceoResponse: row.ceo_response,
            timestamp: row.timestamp.toISOString()
        }));
    }

    // --- Directives ---

    async upsertDirective(roleName: string, content: string): Promise<void> {
        await this.pool.query(
            'INSERT INTO directives (project_id, role_name, content) VALUES ($1, $2, $3) ON CONFLICT (project_id, role_name) DO UPDATE SET content = $3, updated_at = CURRENT_TIMESTAMP',
            [this.projectId, roleName, content]
        );
    }

    async getDirective(roleName: string): Promise<string | null> {
        const res = await this.pool.query('SELECT content FROM directives WHERE project_id = $1 AND role_name = $2', [this.projectId, roleName]);
        if (res.rowCount === 0) return null;
        return res.rows[0].content;
    }

    async purgeProjectData(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM workflows WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM tickets WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM roles WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM ceo_interactions WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM directives WHERE project_id = $1', [this.projectId]);
            await client.query('COMMIT');
            console.log(`🧹 Purged all data for project [${this.projectId}] from Database.`);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async disconnect() {
        await this.pool.end();
    }
}
