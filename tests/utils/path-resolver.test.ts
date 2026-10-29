import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { getProjectRoot, validateProjectRoot, getArtifactsDir } from '../../src/utils/path-resolver.js';

async function testPathResolver() {
    console.log('Running path-resolver.test.ts');

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'firmos-test-'));
    const originalCwd = process.cwd();

    try {
        process.chdir(tempDir);
        
        // 1. Validation failure (no .firmosrc)
        assert.throws(() => validateProjectRoot(), /FirmOS context not found/);
        
        // 2. Validation success (.firmosrc exists)
        await fs.writeFile(path.join(tempDir, '.firmosrc'), '');
        validateProjectRoot();
        assert.strictEqual(getProjectRoot(), tempDir);
        console.log('✓ Project root validation passed');

        // 3. Default Artifacts Dir
        const defaultArtifacts = getArtifactsDir();
        assert.strictEqual(defaultArtifacts, path.join(tempDir, 'artifacts'));
        console.log('✓ Default artifacts directory passed');

        // 4. Overridden Artifacts Dir
        process.env.FIRMOS_ARTIFACTS_DIR = '/tmp/custom-artifacts';
        assert.strictEqual(getArtifactsDir(), '/tmp/custom-artifacts');
        delete process.env.FIRMOS_ARTIFACTS_DIR;
        console.log('✓ Overridden artifacts directory passed');

    } finally {
        process.chdir(originalCwd);
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

testPathResolver().catch(err => {
    console.error('✗ PathResolver test failed:', err.message);
    process.exit(1);
});
