import amqp from 'amqplib';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_NAME = 'task_routing';

async function testModelFallback() {
    console.log('Running model-fallback.test.ts');

    // 1. Pre-purge queue
    const preConn = await amqp.connect('amqp://localhost');
    const preChan = await preConn.createChannel();
    await preChan.assertQueue(QUEUE_NAME, { durable: true });
    await preChan.purgeQueue(QUEUE_NAME);
    await preConn.close();

    // 2. Start Daemon
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

    // 3. Publish task with INVALID model
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    
    console.log(`Publishing task with invalid model...`);
    const task = {
        role: 'product-manager',
        model: 'this-model-does-not-exist-at-all-12345',
        prompt: 'Just say hello.'
    };
    await channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(task)));

    // 4. Wait for execution and verify fallback
    console.log('Waiting for fallback processing...');
    let success = false;
    for (let i = 0; i < 40; i++) {
        if (daemonOutput.includes('⚠️  Fallback to default model (gemini-2.5-flash)')) {
            console.log('✓ Found fallback warning in daemon logs!');
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
    console.log('✓ RabbitMQ connections closed');

    if (success) {
        console.log('✓ Integration test passed!');
    } else {
        console.error('✗ Integration test failed: Fallback log not found');
        console.log('Daemon output was:', daemonOutput);
        process.exit(1);
    }
}

testModelFallback().catch(err => {
    console.error('Test Error:', err);
    process.exit(1);
});
