import pkg from 'pg';
const { Pool } = pkg;
import type { Pool as PoolType } from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseStateManager } from './base.js';
import { MigrationManager } from './migration-manager.js';

// Repositories
import { PostgresWorkflowRepository } from './repositories/postgres-workflow.js';
import { PostgresTicketRepository } from './repositories/postgres-ticket.js';
import { PostgresRoleRepository } from './repositories/postgres-role.js';
import { PostgresDirectiveRepository } from './repositories/postgres-directive.js';
import { PostgresReviewRepository } from './repositories/postgres-review.js';
import { PostgresProjectConfigRepository } from './repositories/postgres-config.js';
import { PostgresCeoMemoryRepository } from './repositories/postgres-ceo.js';
import { PostgresAuditLogRepository } from './repositories/postgres-audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENGINE_ROOT = __dirname.includes(path.join('dist', 'src'))
    ? path.resolve(__dirname, '..', '..', '..')
    : path.resolve(__dirname, '..', '..');

export class PostgresStateManager extends BaseStateManager {
    private pool: PoolType;

    public workflows: PostgresWorkflowRepository;
    public tickets: PostgresTicketRepository;
    public roles: PostgresRoleRepository;
    public directives: PostgresDirectiveRepository;
    public reviews: PostgresReviewRepository;
    public config: PostgresProjectConfigRepository;
    public ceoMemory: PostgresCeoMemoryRepository;
    public auditLogs: PostgresAuditLogRepository;

    constructor(projectId: string = 'default', connectionString?: string) {
        super(projectId);
        this.pool = new Pool({
            connectionString: connectionString || process.env.DATABASE_URL || 'postgresql://firmos_admin:firmos_password@localhost:5432/firmos'
        }) as any;

        this.workflows = new PostgresWorkflowRepository(this.pool, this.projectId);
        this.tickets = new PostgresTicketRepository(this.pool, this.projectId);
        this.roles = new PostgresRoleRepository(this.pool, this.projectId);
        this.directives = new PostgresDirectiveRepository(this.pool, this.projectId);
        this.reviews = new PostgresReviewRepository(this.pool, this.projectId);
        this.config = new PostgresProjectConfigRepository(this.pool, this.projectId);
        this.ceoMemory = new PostgresCeoMemoryRepository(this.pool, this.projectId);
        this.auditLogs = new PostgresAuditLogRepository(this.pool, this.projectId);
    }

    async initializeSchema() {
        const manager = new MigrationManager(this.pool as any, ENGINE_ROOT);
        await manager.migrate();
    }

    async purgeProjectData(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM artifact_reviews WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM directive_history WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM workflows WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM tickets WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM roles WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM ceo_interactions WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM directives WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM model_tiers WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM project_config WHERE project_id = $1', [this.projectId]);
            await client.query('DELETE FROM system_audit_logs WHERE project_id = $1', [this.projectId]);
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
