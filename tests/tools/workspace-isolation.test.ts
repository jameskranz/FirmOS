import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { SaveFileTool } from '../../src/tools/save-file.js';
// @ts-ignore
import { ReadFileTool } from '../../src/tools/read-file.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_ROOT = path.resolve(__dirname, '../../tmp-workspace-test');
const WS1 = path.join(TEST_ROOT, 'ws1');
const WS2 = path.join(TEST_ROOT, 'ws2');

async function testWorkspaceIsolation() {
    console.log('Running workspace-isolation.test.ts');

    await fs.rm(TEST_ROOT, { recursive: true, force: true });
    await fs.mkdir(WS1, { recursive: true });
    await fs.mkdir(WS2, { recursive: true });

    try {
        const saveTool = new SaveFileTool();
        const readTool = new ReadFileTool();

        // 1. Write to Workspace 1
        process.env.TARGET_WORKSPACE = WS1;
        await saveTool.execute({ relativePath: 'note.txt', content: 'content in ws1' });
        
        assert.ok(await fs.stat(path.join(WS1, 'note.txt')).then(() => true), 'File should exist in WS1');
        
        // 2. Verify Workspace 2 is empty
        try {
            await fs.stat(path.join(WS2, 'note.txt'));
            assert.fail('File should NOT exist in WS2');
        } catch (e: any) {
            assert.strictEqual(e.code, 'ENOENT');
        }
        console.log('✓ File creation isolation passed');

        // 3. Read from Workspace 1
        const content = await readTool.execute({ relativePath: 'note.txt' });
        assert.strictEqual(content, 'content in ws1');
        console.log('✓ Read isolation passed');

        // 4. Switch to Workspace 2 and verify read fails
        process.env.TARGET_WORKSPACE = WS2;
        try {
            await readTool.execute({ relativePath: 'note.txt' });
            assert.fail('Read should have failed in WS2');
        } catch (e: any) {
            assert.ok(e.message.includes('not found') || e.message.includes('ENOENT'));
        }
        console.log('✓ Workspace switching passed');

    } catch (err) {
        console.error('✗ Workspace isolation test failed:', err);
        process.exit(1);
    } finally {
        delete process.env.TARGET_WORKSPACE;
        await fs.rm(TEST_ROOT, { recursive: true, force: true });
    }
}

testWorkspaceIsolation().catch(err => {
    console.error(err);
    process.exit(1);
});
