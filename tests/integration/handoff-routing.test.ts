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
const WORKBOOK_FILE = path.resolve(__dirname, '../../company/work/handoff-test.md');

async function testHandoffRouting() {
    console.log('Running handoff-routing.test.ts');

    // 1. Cleanup
    try { await fs.unlink(STATE_FILE); } catch (e) {}
    try { await fs.unlink(WORKBOOK_FILE); } catch (e) {}
    try { await fs.unlink(path.resolve(__dirname, '../../daemon.pid')); } catch (e) {}

    // 2. Pre-purge queue
    const preConn = await amqp.connect('amqp://localhost');
    const preChan = await preConn.createChannel();
    await preChan.assertQueue(QUEUE_NAME, { durable: true });
    await preChan.purgeQueue(QUEUE_NAME);
    await preConn.close();

    // 3. Start Daemon
    const daemon = spawn('npx', ['ts-node', '--esm', 'src/daemon.ts'], {
        env: { ...process.env, CI: 'true' },
        stdio: 'pipe',
        detached: true 
    });

    let daemonOutput = '';
    daemon.stdout.on('data', (data) => {
        daemonOutput += data.toString();
    });

    // Wait for daemon to be ready
    await new Promise(r => setTimeout(r, 5000));

    // 4. Publish specialized task
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    
    console.log(`Publishing initialization task...`);
    // We'll look for the featureId in the logs since the daemon logs it explicitly
    const initTask = {
        role: 'product-manager',
        prompt: `Use 'initialize_feature_work' for 'Handoff Test'. Then use 'submit_for_review' with featureId='handoff-test', featureName='Handoff Test', workbookPath='company/work/handoff-test.md'.`
    };
    await channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(initTask)));

    // 5. Wait for execution and verify
    console.log('Waiting for handoff processing...');
    let success = false;
    for (let i = 0; i < 60; i++) {
        const hasLog = daemonOutput.includes('Routing feature \'handoff-test\' to senior-systems-architect') && 
                      daemonOutput.includes('🏁 Task Completed: [product-manager]');
        
        let hasFile = false;
        try {
            await fs.access(WORKBOOK_FILE);
            hasFile = true;
        } catch (e) {}

        if (hasLog && hasFile) {
            console.log('✓ Verified: Logs contain handoff and file exists.');
            success = true;
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    // 6. Verify State
    if (success) {
        const stateContent = await fs.readFile(STATE_FILE, 'utf8');
        const state = JSON.parse(stateContent);
        assert.ok(state['handoff-test'], 'State should be tracked');
        // It might have moved past 'reviewing' if the Architect already processed it
        assert.ok(['reviewing', 'revising', 'pending_approval'].includes(state['handoff-test'].status));
        console.log('✓ State correctly updated and tracked');
    }

    // 7. Cleanup Resources
    console.log('Cleaning up resources...');
    if (daemon.pid) {
        try { process.kill(-daemon.pid, 'SIGTERM'); } catch (e) {}
    }

    await channel.close();
    await connection.close();
    console.log('✓ RabbitMQ connections closed');

    if (success) {
        console.log('✓ Integration test passed!');
    } else {
        console.error('✗ Integration test failed: Expected output or file content not found');
        console.log('Daemon output was:', daemonOutput);
        process.exit(1);
    }
}

testHandoffRouting().catch(err => {
    console.error('Test Error:', err);
    process.exit(1);
});
