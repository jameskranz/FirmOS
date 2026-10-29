import type { Pool } from 'pg';
import { ITicketRepository, Ticket } from '../base.js';
import { randomUUID } from 'node:crypto';

export class PostgresTicketRepository implements ITicketRepository {
    constructor(private pool: Pool, private projectId: string) {}

    async create(ticketData: Omit<Ticket, 'id' | 'created' | 'updated' | 'status'>): Promise<string> {
        const id = randomUUID();
        await this.pool.query(
            'INSERT INTO tickets (id, project_id, parent_id, title, description, requirements, repository_url, status, assigned_role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [id, this.projectId, ticketData.parentId, ticketData.title, ticketData.description, ticketData.requirements, ticketData.repositoryUrl, 'Open', ticketData.assignedRole]
        );
        return id;
    }

    async update(ticketId: string, updates: Partial<Omit<Ticket, 'id' | 'created'>>): Promise<void> {
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

    async get(ticketId: string): Promise<Ticket | null> {
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

    async list(parentId: string | null): Promise<Ticket[]> {
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

    async listAll(): Promise<Ticket[]> {
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
}
