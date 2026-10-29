import type { Pool } from 'pg';
import { IRoleRepository, Role } from '../base.js';

export class PostgresRoleRepository implements IRoleRepository {
    constructor(private pool: Pool, private projectId: string) {}

    async upsert(role: Omit<Role, 'updatedAt'>): Promise<void> {
        await this.pool.query(
            'INSERT INTO roles (project_id, role_name, description, sla_content, model_tier, manager_role, allowed_tools) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (project_id, role_name) DO UPDATE SET description = $3, sla_content = $4, model_tier = $5, manager_role = $6, allowed_tools = $7, updated_at = CURRENT_TIMESTAMP',
            [this.projectId, role.roleName, role.description, role.slaContent, role.modelTier, role.managerRole || null, role.allowedTools ? JSON.stringify(role.allowedTools) : null]
        );
    }

    async get(roleName: string): Promise<Role | null> {
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

    async list(): Promise<Role[]> {
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

    // Tier Management
    async upsertTier(tierName: string, modelName: string): Promise<void> {
        await this.pool.query(
            'INSERT INTO model_tiers (project_id, tier_name, model_name) VALUES ($1, $2, $3) ON CONFLICT (project_id, tier_name) DO UPDATE SET model_name = $3',
            [this.projectId, tierName, modelName]
        );
    }

    async getTier(tierName: string): Promise<string | null> {
        const res = await this.pool.query('SELECT model_name FROM model_tiers WHERE project_id = $1 AND tier_name = $2', [this.projectId, tierName]);
        if (res.rowCount === 0) return null;
        return res.rows[0].model_name;
    }

    async listTiers(): Promise<Record<string, string>> {
        const res = await this.pool.query('SELECT tier_name, model_name FROM model_tiers WHERE project_id = $1', [this.projectId]);
        const tiers: Record<string, string> = {};
        for (const row of res.rows) {
            tiers[row.tier_name] = row.model_name;
        }
        return tiers;
    }
}
