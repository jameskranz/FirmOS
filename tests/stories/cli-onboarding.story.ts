import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { StoryHarness } from './harness.js';

async function testOnboardingFlow() {
    console.log('📖 Story: CLI Cold Start Onboarding');
    const harness = new StoryHarness('onboarding');
    await harness.setup();

    try {
        console.log('  Scenario: User accepts initialization');
        const cli = harness.runCli(['start']);
        
        let output = '';
        cli.stdout?.on('data', (data) => { 
            const s = data.toString();
            // console.log(`[STDOUT]: ${s}`);
            output += s; 
        });
        cli.stderr?.on('data', (data) => { 
            const s = data.toString();
            console.error(`[STDERR]: ${s}`);
            output += s; 
        });
        cli.on('close', (code) => { if (code !== null) console.log(`  CLI exited with code ${code}`); });

        // Wait for the prompt
        await new Promise(r => setTimeout(r, 5000));
        const foundPrompt = output.toLowerCase().includes('initialize one?');
        if (!foundPrompt) {
            console.error('Actual Output (Length: ' + output.length + '):', output);
        }
        assert.ok(foundPrompt, 'Should prompt for initialization');

        const rcPath = path.join(harness.workDir, '.firmosrc');

        // Respond 'y' and Enter, then '1' for git init
        console.log('  Sending inputs to stdin...');
        if (cli.exitCode !== null) {
            console.error(`  CLI already exited with code ${cli.exitCode} before input sent!`);
        }
        cli.stdin?.write('y\n');
        setTimeout(() => cli.stdin?.write('1\n'), 500);
        setTimeout(() => cli.stdin?.end(), 1000);
        
        // Wait for config creation (it might involve git init, so wait longer)
        console.log('  Waiting for initialization to complete...');
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const exists = await fs.stat(rcPath).then(() => true).catch(() => false);
            if (exists) break;
            process.stdout.write('.');
        }
        console.log('');
        
        const rcExists = await fs.stat(rcPath).then(() => true).catch(() => false);
        if (!rcExists) {
            console.log('  Directory contents:', await fs.readdir(harness.workDir));
        }
        assert.ok(rcExists, '.firmosrc should be created');
        
        const conductorExists = await fs.stat(path.join(harness.workDir, 'conductor')).then(() => true).catch(() => false);
        assert.ok(conductorExists, 'conductor/ directory should be created');
        
        console.log('  ✓ Acceptance scenario passed');
        cli.kill();

    } catch (err) {
        console.error('  ✗ Story failed:', err);
        process.exit(1);
    } finally {
        await harness.cleanup();
    }

    // --- Scenario: User declines ---
    const harness2 = new StoryHarness('onboarding-decline');
    await harness2.setup();
    try {
        console.log('  Scenario: User declines initialization');
        const cli = harness2.runCli(['start']);
        
        await new Promise(r => setTimeout(r, 1000));
        cli.stdin?.write('n\n');
        
        const exitCode = await new Promise(resolve => {
            cli.on('exit', (code) => resolve(code));
        });

        assert.strictEqual(exitCode, 1, 'Should exit with code 1 when declined');
        console.log('  ✓ Decline scenario passed');

    } catch (err) {
        console.error('  ✗ Story failed:', err);
        process.exit(1);
    } finally {
        await harness2.cleanup();
    }
}

testOnboardingFlow().catch(err => {
    console.error(err);
    process.exit(1);
});
