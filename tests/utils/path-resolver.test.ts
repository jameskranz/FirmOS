import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
// @ts-ignore
import { getProjectRoot, validateProjectRoot } from '../../src/utils/path-resolver.js';

async function testPathResolver() {
    console.log('Running path-resolver.test.ts');

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'firmos-test-'));
    const originalCwd = process.cwd();

    try {
        // 1. Test validation failure (no project structure)
        process.chdir(tempDir);
        assert.throws(() => validateProjectRoot(), /FirmOS context not found/, 'Should throw if no .firmosrc');
        console.log('✓ Validation failure test passed');

        // 2. Test validation failure with ONLY conductor/ (now insufficient)
        const conductorDir = path.join(tempDir, 'conductor');
        await fs.mkdir(conductorDir);
        assert.throws(() => validateProjectRoot(), /FirmOS context not found/, 'Should throw if only conductor/ exists');
        console.log('✓ Validation failure (conductor/ only) passed');

        // 3. Test validation success with .firmosrc
        const firmosrcFile = path.join(tempDir, '.firmosrc');
        await fs.writeFile(firmosrcFile, '');
        assert.doesNotThrow(() => validateProjectRoot(), 'Should not throw if .firmosrc exists');
        assert.strictEqual(getProjectRoot(), tempDir, 'getProjectRoot should return CWD');
        console.log('✓ Validation success (.firmosrc) passed');

    } finally {
        process.chdir(originalCwd);
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

testPathResolver().catch(err => {
    console.error('✗ PathResolver test failed:', err.message);
    process.exit(1);
});
