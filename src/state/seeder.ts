import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BaseStateManager } from './base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resources dir relative to this file
const RESOURCES_DIR = path.resolve(__dirname, '..', 'resources', 'default-roles');

const SEED_CONFIG_KEY = 'system.initial_seed_applied';

export async function seedDefaultData(state: BaseStateManager) {
    console.log(`🌱 Checking default roles in: ${process.cwd()}`);

    try {
        // Check if already seeded via persistent flag
        const isSeeded = await state.config.get(SEED_CONFIG_KEY);
        if (isSeeded === 'true') {
            console.log('✅ System already seeded. Skipping default role synchronization.');
            return;
        }

        // 1. Seed Tiers
        console.log('📦 Seeding default model tiers...');
        await state.roles.upsertTier('MAX', 'gemini-2.0-pro-exp');
        await state.roles.upsertTier('HIGH', 'gemini-2.0-pro-exp');
        await state.roles.upsertTier('MEDIUM', 'gemini-2.0-flash-exp');
        await state.roles.upsertTier('LOW', 'gemini-2.0-flash-exp');
        console.log('✅ Default model tiers seeded.');

        // 2. Seed Roles
        console.log('👥 Seeding starter team roles...');
        const starterRoles = [
            { id: 'ceo', name: 'ceo', tier: 'MAX', desc: 'Chief Executive Officer' },
            { id: 'hr-director', name: 'hr/director', tier: 'MAX', desc: 'Chief Organizational Architect' },
            { id: 'hr-recruiter', name: 'hr/recruiter', tier: 'MEDIUM', desc: 'Evaluates project context and identifies team gaps. MANDATORY: You must call list_roles first, then publish_message to hr/director.' },
            { id: 'intake-consultant', name: 'intake/consultant', tier: 'MEDIUM', desc: 'Entry point for external requests' },
            { id: 'devops-manager', name: 'devops/manager', tier: 'HIGH', desc: 'Infrastructure and Environment Manager' }
        ];

        for (const role of starterRoles) {
            try {
                const slaPath = path.join(RESOURCES_DIR, `${role.id}.md`);
                const slaContent = await fs.readFile(slaPath, 'utf8');
                await state.roles.upsert({
                    roleName: role.name,
                    description: role.desc,
                    slaContent: slaContent,
                    modelTier: role.tier
                });
                console.log(`✅ Seeded role: ${role.name}`);
            } catch (err: any) {
                console.warn(`⚠️  Failed to seed role ${role.name}: ${err.message}`);
            }
        }

        // 3. Seed Initial Directive
        const existingCeoDirective = await state.directives.get('ceo');
        if (!existingCeoDirective) {
            await state.directives.upsert('ceo', '# CEO Directives\n\nNo mandates recorded yet.', 'system', 'Initial project setup');
            console.log('✅ Seeded initial CEO directive.');
        }

        // 4. Mark as Seeded
        await state.config.upsert(SEED_CONFIG_KEY, 'true');
        await state.auditLogs.log('SEEDING', 'INITIAL_FACTORY_SETUP', {
            rolesSeeded: starterRoles.map(r => r.name),
            timestamp: new Date().toISOString()
        });

        console.log('🚀 Starter team fully hired and recorded in audit logs.');
    } catch (err: any) {
        console.error(`❌ Auto-seed failed: ${err.message}`);
    }
}
