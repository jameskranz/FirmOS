import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { ListRolesTool } from '../../src/tools/list-roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROLES_DIR = path.resolve(__dirname, '../../company/roles');
const REGISTRY_FILE = path.resolve(__dirname, '../../company/role-registry.json');

async function testListRoles() {
    console.log('Running list-roles.test.ts');

    // 1. Backup current state
    const originalRegistry = await fs.readFile(REGISTRY_FILE, 'utf8').catch(() => null);
    
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

    const mockRegistry = {
        "hr-director": {
            "description": "Test HR Director",
            "slaPath": "company/roles/hr-director.md",
            "modelTier": "MAX"
        },
        "product/define": {
            "description": "Test Product",
            "slaPath": "company/roles/product/define.md",
            "modelTier": "MEDIUM"
        },
        "architect/review": {
            "description": "Test Architect",
            "slaPath": "company/roles/architect/review.md",
            "modelTier": "HIGH"
        }
    };
    await fs.writeFile(REGISTRY_FILE, JSON.stringify(mockRegistry, null, 2));

    try {
        const tool = new ListRolesTool();
        const result = await tool.execute({});
        
        console.log(`Tool Result:\n${result}`);

        assert.ok(result.includes('hr-director'), 'Should list hr-director');
        assert.ok(result.includes('product/define'), 'Should list product/define');
        assert.ok(result.includes('architect/review'), 'Should list architect/review');
        assert.ok(result.includes('MAX'), 'Should include tier MAX');
        assert.ok(result.includes('Test HR Director'), 'Should include description');

        console.log('✓ ListRoles discovery passed');

    } finally {
        // Cleanup test files
        await fs.unlink(path.join(ROLES_DIR, 'product/define.md')).catch(() => {});
        await fs.unlink(path.join(ROLES_DIR, 'architect/review.md')).catch(() => {});
        // Be careful not to delete real directories if they contain other files, 
        // but in this test flow we are mocking specific files. 
        // Best to just leave directories or use a more robust cleanup if needed.
        
        if (originalRegistry) {
            await fs.writeFile(REGISTRY_FILE, originalRegistry);
        } else {
            await fs.unlink(REGISTRY_FILE).catch(() => {});
        }
    }
}

testListRoles().catch(err => {
    console.error('✗ ListRoles test failed:', err.message);
    process.exit(1);
});
