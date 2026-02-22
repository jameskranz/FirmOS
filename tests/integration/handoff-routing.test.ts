import amqp from 'amqplib';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_NAME = 'task_routing';
const STATE_FILE = path.resolve(__dirname, '../../company/state/workflows.json');

async function testHandoffRouting() {
    console.log('Running handoff-routing.test.ts');

    // 1. Cleanup
    try { await fs.unlink(STATE_FILE); } catch (e) {}
    try { await fs.unlink(path.resolve(__dirname, '../../daemon.pid')); } catch (e) {}

    // 2. Start Daemon
    const daemon = spawn('npx', ['ts-node', '--esm', 'src/daemon.ts'], {
        env: { ...process.env, CI: 'true' },
        stdio: 'pipe'
    });

    let daemonOutput = '';
    daemon.stdout.on('data', (data) => {
        daemonOutput += data.toString();
        // console.log(`[Daemon]: ${data}`);
    });

    // Wait for daemon to be ready
    await new Promise(r => setTimeout(r, 5000));

    // 3. Connect to RabbitMQ to publish and inspect
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.purgeQueue(QUEUE_NAME);

    // 4. Publish specialized task: PM initializing work
    console.log('Publishing initialization task...');
    const initTask = {
        role: 'product-manager',
        prompt: "Use 'initialize_feature_work' for 'Handoff Test'. Then use 'submit_for_review' with featureId='handoff-test', featureName='Handoff Test', workbookPath='company/work/handoff-test.md'."
    };
    await channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(initTask)));

    // 5. Wait for execution and verify daemon output
    console.log('Waiting for handoff processing...');
    let success = false;
    for (let i = 0; i < 30; i++) {
        if (daemonOutput.includes('Published task for senior-systems-architect')) {
            console.log('✓ Found handoff confirmation in daemon logs!');
            success = true;
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    // 6. Verify State
    const stateContent = await fs.readFile(STATE_FILE, 'utf8');
    const state = JSON.parse(stateContent);
    assert.ok(state['handoff-test'], 'State should be tracked');
    assert.strictEqual(state['handoff-test'].status, 'reviewing');
    console.log('✓ State correctly updated to reviewing');

    // Cleanup
    daemon.kill();
    await connection.close();
    if (success) {
        console.log('✓ Integration test passed!');
        process.exit(0);
    } else {
        console.error('✗ Integration test failed: Handoff confirmation not found in daemon logs');
        console.log('Daemon output was:', daemonOutput);
        process.exit(1);
    }
}

testHandoffRouting().catch(err => {
    console.error('Test Error:', err);
    process.exit(1);
});
