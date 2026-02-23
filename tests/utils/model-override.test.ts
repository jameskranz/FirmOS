import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { ModelResolver } from '../../src/utils/model-resolver.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROLES_FILE = path.resolve(__dirname, '../../company/role-models.test.json');
const TIERS_FILE = path.resolve(__dirname, '../../company/model-tiers.test.json');

async function testModelOverride() {
    console.log('Running model-override.test.ts');

    // 1. Setup mock files with expensive models
    const mockRoles = { "hr-director": "MAX", "default": "MEDIUM" };
    const mockTiers = { "MAX": "expensive-model-1", "MEDIUM": "expensive-model-2" };
    await fs.writeFile(ROLES_FILE, JSON.stringify(mockRoles, null, 2));
    await fs.writeFile(TIERS_FILE, JSON.stringify(mockTiers, null, 2));

    try {
        const resolver = new ModelResolver(ROLES_FILE, TIERS_FILE);

        // A. Verify standard resolution (No override)
        delete process.env.FIRM_OS_MODEL_OVERRIDE;
        const model1 = await resolver.resolve('hr-director');
        assert.strictEqual(model1, 'expensive-model-1', 'Should resolve normally without override');
        console.log('✓ Normal resolution passed');

        // B. Verify global override
        process.env.FIRM_OS_MODEL_OVERRIDE = 'cheap-dev-model';
        const model2 = await resolver.resolve('hr-director');
        assert.strictEqual(model2, 'cheap-dev-model', 'Should use FIR_OS_MODEL_OVERRIDE');
        console.log('✓ Global override passed');

        // C. Verify ticket override still wins
        const model3 = await resolver.resolve('hr-director', 'explicit-ticket-model');
        assert.strictEqual(model3, 'explicit-ticket-model', 'Ticket override should still take top precedence');
        console.log('✓ Ticket override precedence passed');

    } finally {
        delete process.env.FIRM_OS_MODEL_OVERRIDE;
        await fs.unlink(ROLES_FILE).catch(() => {});
        await fs.unlink(TIERS_FILE).catch(() => {});
    }
}

testModelOverride().catch(err => {
    console.error('✗ ModelOverride test failed:', err.message);
    process.exit(1);
});
