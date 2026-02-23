import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { ModelResolver } from '../../src/utils/model-resolver.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_FILE = path.resolve(__dirname, '../../company/models.json');

async function testModelResolver() {
    console.log('Running model-resolver.test.ts');

    // Setup mock models.json
    const originalModels = await fs.readFile(MODELS_FILE, 'utf8').catch(() => null);
    const mockModels = {
        "test-role": "gemini-2.5-pro",
        "default": "gemini-2.5-flash"
    };
    await fs.writeFile(MODELS_FILE, JSON.stringify(mockModels, null, 2));

    try {
        const resolver = new ModelResolver(MODELS_FILE);

        // 1. Test Ticket Override
        const model1 = await resolver.resolve('test-role', 'gemini-3-flash');
        assert.strictEqual(model1, 'gemini-3-flash', 'Should use ticket override');
        console.log('✓ Ticket override passed');

        // 2. Test Registry Mapping
        const model2 = await resolver.resolve('test-role');
        assert.strictEqual(model2, 'gemini-2.5-pro', 'Should use registry mapping');
        console.log('✓ Registry mapping passed');

        // 3. Test Default Fallback (no mapping, no override)
        const model3 = await resolver.resolve('unknown-role');
        assert.strictEqual(model3, 'gemini-2.5-flash', 'Should fallback to default');
        console.log('✓ Default fallback passed');

    } finally {
        // Restore original models.json
        if (originalModels) {
            await fs.writeFile(MODELS_FILE, originalModels);
        } else {
            await fs.unlink(MODELS_FILE).catch(() => {});
        }
    }
}

testModelResolver().catch(err => {
    console.error('✗ ModelResolver test failed:', err.message);
    process.exit(1);
});
