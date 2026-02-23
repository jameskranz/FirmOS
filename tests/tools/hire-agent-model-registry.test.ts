import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { HireAgentTool } from '../../src/tools/hire-agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_FILE = path.resolve(__dirname, '../../company/role-models.json');
const REGISTRY_FILE = path.resolve(__dirname, '../../company/role-registry.json');
const ROLES_DIR = path.resolve(__dirname, '../../company/roles');

async function testHireAgentModelRegistry() {
    console.log('Running hire-agent-model-registry.test.ts');

    const originalModels = await fs.readFile(MODELS_FILE, 'utf8').catch(() => null);
    const originalRegistry = await fs.readFile(REGISTRY_FILE, 'utf8').catch(() => null);
    const tool = new HireAgentTool();

    try {
        // 1. Test explicit model assignment
        await tool.execute({
            roleName: 'test-role-1',
            description: 'A test role for explicit model assignment.',
            slaContent: '# Test Role 1',
            model: 'MAX'
        });
        const models1 = JSON.parse(await fs.readFile(MODELS_FILE, 'utf8'));
        assert.strictEqual(models1['test-role-1'], 'MAX', 'Should assign explicit model tier');
        
        const registry1 = JSON.parse(await fs.readFile(REGISTRY_FILE, 'utf8'));
        assert.strictEqual(registry1['test-role-1'].description, 'A test role for explicit model assignment.', 'Should record description in registry');
        console.log('✓ Explicit model assignment and registry update passed');

        // 2. Test seniority-based assignment (Senior)
        await tool.execute({
            roleName: 'senior-dev',
            description: 'A senior developer role.',
            slaContent: `# Senior Backend Developer
You are an expert in Node.js.`
        });
        const models2 = JSON.parse(await fs.readFile(MODELS_FILE, 'utf8'));
        assert.strictEqual(models2['senior-dev'], 'HIGH', 'Should assign HIGH tier for Senior');
        console.log('✓ Seniority keyword detection (Senior) passed');

        // 3. Test seniority-based assignment (Architect)
        await tool.execute({
            roleName: 'architect/review',
            description: 'A system architect role for design reviews.',
            slaContent: `# System Architect
You review designs.`
        });
        const models3 = JSON.parse(await fs.readFile(MODELS_FILE, 'utf8'));
        assert.strictEqual(models3['architect/review'], 'HIGH', 'Should assign HIGH tier for Architect');
        console.log('✓ Seniority keyword detection (Architect) passed');

        // 4. Test default assignment (Junior/Regular)
        await tool.execute({
            roleName: 'junior-dev',
            description: 'A junior developer role.',
            slaContent: `# Junior Developer
You write code.`
        });
        const models4 = JSON.parse(await fs.readFile(MODELS_FILE, 'utf8'));
        assert.strictEqual(models4['junior-dev'], 'MEDIUM', 'Should assign MEDIUM tier for Junior');
        console.log('✓ Default model assignment (Junior) passed');

    } finally {
        // Cleanup
        if (originalModels) {
            await fs.writeFile(MODELS_FILE, originalModels);
        }
        if (originalRegistry) {
            await fs.writeFile(REGISTRY_FILE, originalRegistry);
        }
        await fs.unlink(path.join(ROLES_DIR, 'test-role-1.md')).catch(() => {});
        await fs.unlink(path.join(ROLES_DIR, 'senior-dev.md')).catch(() => {});
        await fs.mkdir(path.join(ROLES_DIR, 'architect'), { recursive: true });
        await fs.unlink(path.join(ROLES_DIR, 'architect/review.md')).catch(() => {});
        await fs.unlink(path.join(ROLES_DIR, 'junior-dev.md')).catch(() => {});
    }
}

testHireAgentModelRegistry().catch(err => {
    console.error('✗ HireAgent model registry test failed:', err.message);
    process.exit(1);
});
