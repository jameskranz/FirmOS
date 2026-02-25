import fs from 'node:fs/promises';
import path from 'node:path';
import type { Pool, PoolClient } from 'pg';

export class MigrationManager {
    private pool: Pool;
    private engineRoot: string;

    constructor(pool: Pool, engineRoot: string) {
        this.pool = pool;
        this.engineRoot = engineRoot;
    }

    /**
     * Ensures the migrations table exists and applies all pending migrations.
     */
    async migrate() {
        const client = await this.pool.connect();
        try {
            await this.ensureMigrationTable(client);
            const applied = await this.getAppliedMigrations(client);
            const pending = await this.getPendingMigrations(applied);

            if (pending.length === 0) {
                // console.log('✅ No pending migrations.');
                return;
            }

            for (const file of pending) {
                await this.applyMigration(client, file);
            }
            console.log('✅ All migrations applied successfully.');
        } finally {
            client.release();
        }
    }

    private async ensureMigrationTable(client: PoolClient) {
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    private async getAppliedMigrations(client: PoolClient): Promise<string[]> {
        const res = await client.query('SELECT name FROM migrations ORDER BY name ASC');
        return res.rows.map(row => row.name);
    }

    private async getPendingMigrations(applied: string[]): Promise<string[]> {
        const migrationsDir = path.join(this.engineRoot, 'src', 'state', 'migrations');
        const files = await fs.readdir(migrationsDir);
        const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

        if (sqlFiles.length === 0) {
            throw new Error(`No migration files found in ${migrationsDir}.`);
        }

        return sqlFiles.filter(file => !applied.includes(file));
    }

    private async applyMigration(client: PoolClient, filename: string) {
        const migrationsDir = path.join(this.engineRoot, 'src', 'state', 'migrations');
        const sql = await fs.readFile(path.join(migrationsDir, filename), 'utf8');

        console.log(`🚀 Applying migration: ${filename}...`);
        
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO migrations (name) VALUES ($1)', [filename]);
            await client.query('COMMIT');
            console.log(`✅ Migration applied: ${filename}`);
        } catch (err: any) {
            await client.query('ROLLBACK');
            console.error(`❌ Failed to apply migration ${filename}: ${err.message}`);
            throw err;
        }
    }
}
