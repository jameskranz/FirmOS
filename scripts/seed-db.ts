import { PostgresStateManager } from '../dist/src/state/postgres.js';
import fs from 'node:fs/promises';
import path from 'node:path';

async function seed() {
    console.log('Starting seed...');
    try {
        const manager = new PostgresStateManager();
        await manager.initializeSchema();

        const roles = [
            { name: 'hr/director', desc: 'Chief Organizational Architect' },
            { name: 'hr/recruiter', desc: 'Evaluates project context and identifies team gaps' },
            { name: 'intake/consultant', desc: 'Entry point for external requests' }
        ];

        for (const r of roles) {
            const sla = await fs.readFile(path.join('company/roles', `${r.name}.md`), 'utf8');
            await manager.upsertRole({
                roleName: r.name,
                description: r.desc,
                slaContent: sla,
                modelTier: 'MAX'
            });
            console.log(`✅ Seeded ${r.name}`);
        }
        await manager.disconnect();
        console.log('Seed complete.');
    } catch (err) {
        console.error('💥 Seed failed:', err);
    }
}

seed();
