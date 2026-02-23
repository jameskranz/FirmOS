import amqp from 'amqplib';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTERNAL_QUEUE = 'external_requests';

async function testExternalRequests() {
    console.log('Running external-requests.test.ts');

    // 1. Purge queue
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    await channel.assertQueue(EXTERNAL_QUEUE, { durable: true });
    await channel.purgeQueue(EXTERNAL_QUEUE);

    // 2. Start Daemon
    const daemon = spawn('npx', ['ts-node', '--esm', 'src/daemon.ts'], {
        env: { ...process.env, CI: 'true' },
        stdio: 'pipe',
        detached: true
    });

    let daemonOutput = '';
    daemon.stdout.on('data', (data) => {
        daemonOutput += data.toString();
        // console.log(data.toString()); // Debug
    });

    // Wait for daemon to be ready
    await new Promise(r => setTimeout(r, 5000));

    // 3. Publish external request
    const request = "I want a new app for tracking habits.";
    channel.sendToQueue(EXTERNAL_QUEUE, Buffer.from(request), { persistent: true });
    console.log(`🚀 Sent external request: "${request}"`);

    // 4. Verify routing to intake-consultant
    console.log('Waiting for daemon to process external request...');
    let success = false;
    for (let i = 0; i < 30; i++) {
        if (daemonOutput.includes('📥 External Request Received -> Routing to [intake-consultant]')) {
            console.log('✓ Found external routing log!');
            success = true;
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    // Cleanup
    if (daemon.pid) {
        try { process.kill(-daemon.pid, 'SIGTERM'); } catch (e) {}
    }
    await channel.close();
    await connection.close();

    if (success) {
        console.log('✓ External requests integration test passed!');
    } else {
        console.error('✗ External requests integration test failed: Routing log not found');
        console.log('Daemon output was:', daemonOutput);
        process.exit(1);
    }
}

testExternalRequests().catch(err => {
    console.error('Test Error:', err);
    process.exit(1);
});
