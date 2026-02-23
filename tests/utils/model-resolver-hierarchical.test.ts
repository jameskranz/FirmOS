import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { ModelResolver } from '../../src/utils/model-resolver.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_FILE = path.resolve(__dirname, '../../company/models.json');

async function testHierarchicalModelResolver() {
    console.log('Running model-resolver-hierarchical.test.ts');

    // Setup mock models.json
    const originalModels = await fs.readFile(MODELS_FILE, 'utf8').catch(() => null);
    const mockModels = {
        "architect/design": "gemini-3-pro",
        "architect": "gemini-2.5-pro",
        "default": "gemini-2.5-flash"
    };
    await fs.writeFile(MODELS_FILE, JSON.stringify(mockModels, null, 2));

    try {
        const resolver = new ModelResolver(MODELS_FILE);

        // 1. Test Specific Task Mapping
        const model1 = await resolver.resolve('architect/design');
        assert.strictEqual(model1, 'gemini-3-pro', 'Should use specific task mapping');
        console.log('✓ Specific task mapping passed');

        // 2. Test Family Mapping Fallback
        const model2 = await resolver.resolve('architect/review');
        assert.strictEqual(model2, 'gemini-2.5-pro', 'Should fallback to family mapping');
        console.log('✓ Family mapping fallback passed');

        // 3. Test Global Default Fallback
        const model3 = await resolver.resolve('developer/code');
        assert.strictEqual(model3, 'gemini-2.5-flash', 'Should fallback to global default');
        console.log('✓ Global default fallback passed');

        // 4. Test Ticket Override (Still highest priority)
        const model4 = await resolver.resolve('architect/design', 'gemini-1.5-flash');
        assert.strictEqual(model4, 'gemini-1.5-flash', 'Should respect ticket override over task mapping');
        console.log('✓ Ticket override remains top priority');

    } finally {
        // Restore original models.json
        if (originalModels) {
            await fs.writeFile(MODELS_FILE, originalModels);
        } else {
            await fs.unlink(MODELS_FILE).catch(() => {});
        }
    }
}

testHierarchicalModelResolver().catch(err => {
    console.error('✗ Hierarchical ModelResolver test failed:', err.message);
    process.exit(1);
});
