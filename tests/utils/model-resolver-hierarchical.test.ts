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

async function testHierarchicalModelResolver() {
    console.log('Running model-resolver-hierarchical.test.ts');

    // Setup mock files
    const mockRoles = {
        "architect/design": "HIGH",
        "architect": "MEDIUM",
        "default": "LOW"
    };
    const mockTiers = {
        "HIGH": "gemini-3-pro-preview",
        "MEDIUM": "gemini-3-flash-preview",
        "LOW": "gemini-2.5-flash"
    };
    
    await fs.writeFile(ROLES_FILE, JSON.stringify(mockRoles, null, 2));
    await fs.writeFile(TIERS_FILE, JSON.stringify(mockTiers, null, 2));

    try {
        const resolver = new ModelResolver(ROLES_FILE, TIERS_FILE);

        // 1. Test Specific Task Mapping (via Tier)
        const model1 = await resolver.resolve('architect/design');
        assert.strictEqual(model1, 'gemini-3-pro-preview', 'Should resolve specific task to its tier model');
        console.log('✓ Specific task mapping passed');

        // 2. Test Family Mapping Fallback (via Tier)
        const model2 = await resolver.resolve('architect/review');
        assert.strictEqual(model2, 'gemini-3-flash-preview', 'Should fallback to family mapping tier model');
        console.log('✓ Family mapping fallback passed');

        // 3. Test Global Default Fallback (via Tier)
        const model3 = await resolver.resolve('developer/code');
        assert.strictEqual(model3, 'gemini-2.5-flash', 'Should fallback to global default tier model');
        console.log('✓ Global default fallback passed');

        // 4. Test Ticket Override (Still highest priority)
        const model4 = await resolver.resolve('architect/design', 'manual-override-model');
        assert.strictEqual(model4, 'manual-override-model', 'Should respect ticket override over everything');
        console.log('✓ Ticket override remains top priority');

    } finally {
        // Cleanup test files
        await fs.unlink(ROLES_FILE).catch(() => {});
        await fs.unlink(TIERS_FILE).catch(() => {});
    }
}

testHierarchicalModelResolver().catch(err => {
    console.error('✗ Hierarchical ModelResolver test failed:', err.message);
    process.exit(1);
});
