import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
// @ts-ignore
import { GitClient } from '../../src/utils/git-client.ts';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname, '../../tmp-git-test');
const REMOTE_REPO = path.join(TEST_DIR, 'remote.git');
const LOCAL_REPO = path.join(TEST_DIR, 'local-clone');

async function testGitClient() {
    console.log('Running git-client.test.ts');

    // 1. Setup Mock Remote
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });
    await execAsync(`git init --bare ${REMOTE_REPO}`);
    console.log('✓ Mock remote initialized');

    const client = new GitClient(LOCAL_REPO);

    try {
        // 2. Test Clone
        // We need an initial commit in the remote to clone effectively if we want a 'main' branch
        const tempInit = path.join(TEST_DIR, 'temp-init');
        await fs.mkdir(tempInit);
        await execAsync('git init', { cwd: tempInit });
        await fs.writeFile(path.join(tempInit, 'README.md'), '# Test Repo');
        await execAsync('git add . && git commit -m "initial"', { cwd: tempInit });
        await execAsync(`git remote add origin ${REMOTE_REPO}`, { cwd: tempInit });
        await execAsync('git push origin master', { cwd: tempInit });

        await client.clone(REMOTE_REPO);
        assert.ok(await fs.stat(path.join(LOCAL_REPO, '.git')).then(() => true), 'Should have .git directory');
        console.log('✓ Clone passed');

        // 3. Test Checkout (Branch)
        await client.checkout('feature-test', true);
        const branchRes = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: LOCAL_REPO });
        assert.strictEqual(branchRes.stdout.trim(), 'feature-test');
        console.log('✓ Checkout -b passed');

        // 4. Test Commit
        await fs.writeFile(path.join(LOCAL_REPO, 'new-file.txt'), 'hello');
        await client.commit('test commit');
        const logRes = await execAsync('git log -1 --pretty=%B', { cwd: LOCAL_REPO });
        assert.strictEqual(logRes.stdout.trim(), 'test commit');
        console.log('✓ Commit passed');

        // 5. Test Push
        // We push to the bare remote
        await client.push('origin', 'feature-test');
        const remoteBranchRes = await execAsync(`git ls-remote --heads ${REMOTE_REPO} feature-test`);
        assert.ok(remoteBranchRes.stdout.includes('feature-test'), 'Remote should have the new branch');
        console.log('✓ Push passed');

    } catch (err) {
        console.error('✗ Git client test failed:', err);
        process.exit(1);
    } finally {
        await fs.rm(TEST_DIR, { recursive: true, force: true });
    }
}

testGitClient().catch(err => {
    console.error(err);
    process.exit(1);
});
