import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { ListRolesTool } from '../../src/tools/list-roles.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROLES_DIR = path.resolve(__dirname, '../../company/roles');
const MODELS_FILE = path.resolve(__dirname, '../../company/role-models.json');

async function testListRoles() {
    console.log('Running list-roles.test.ts');

    // 1. Backup current state
    const originalModels = await fs.readFile(MODELS_FILE, 'utf8').catch(() => null);
    
    // 2. Setup mock roles and models
    const testRoles = [
        { path: 'hr-director.md', tier: 'MAX' },
        { path: 'product/define.md', tier: 'MEDIUM' },
        { path: 'architect/review.md', tier: 'HIGH' }
    ];

    for (const role of testRoles) {
        const fullPath = path.join(ROLES_DIR, role.path);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, `# ${role.path} SLA`);
    }

    const mockModels = {
        "hr-director": "MAX",
        "product/define": "MEDIUM",
        "architect/review": "HIGH",
        "default": "MEDIUM"
    };
    await fs.writeFile(MODELS_FILE, JSON.stringify(mockModels, null, 2));

    try {
        const tool = new ListRolesTool();
        const result = await tool.execute({});
        
        console.log(`Tool Result:\n${result}`);

        assert.ok(result.includes('hr-director'), 'Should list hr-director');
        assert.ok(result.includes('product/define'), 'Should list product/define');
        assert.ok(result.includes('architect/review'), 'Should list architect/review');
        assert.ok(result.includes('MAX'), 'Should include tier MAX');
        assert.ok(result.includes('HIGH'), 'Should include tier HIGH');
        assert.ok(result.includes('MEDIUM'), 'Should include tier MEDIUM');

        console.log('✓ ListRoles discovery passed');

    } finally {
        // Cleanup test files
        await fs.unlink(path.join(ROLES_DIR, 'product/define.md')).catch(() => {});
        await fs.unlink(path.join(ROLES_DIR, 'architect/review.md')).catch(() => {});
        await fs.rm(path.join(ROLES_DIR, 'product'), { recursive: true, force: true }).catch(() => {});
        await fs.rm(path.join(ROLES_DIR, 'architect'), { recursive: true, force: true }).catch(() => {});
        
        if (originalModels) {
            await fs.writeFile(MODELS_FILE, originalModels);
        }
    }
}

testListRoles().catch(err => {
    console.error('✗ ListRoles test failed:', err.message);
    process.exit(1);
});
