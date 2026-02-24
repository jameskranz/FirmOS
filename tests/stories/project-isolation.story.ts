import assert from 'node:assert';
import { StoryHarness } from './harness.js';

async function testProjectIsolation() {
    console.log('📖 Story: Multi-Tenant Project Isolation');
    
    const projectA = new StoryHarness('isolation-a');
    const projectB = new StoryHarness('isolation-b');
    
    await projectA.setup();
    await projectB.setup();
    
    await projectA.createConfig();
    await projectB.createConfig();

    const { conn, channel } = await projectA.getChannel();

    try {
        console.log(`  Project A ID: ${projectA.projectId}`);
        console.log(`  Project B ID: ${projectB.projectId}`);

        const queueA = projectA.getQueueName('task_routing');
        const queueB = projectB.getQueueName('task_routing');

        await channel.assertQueue(queueA, { durable: true });
        await channel.assertQueue(queueB, { durable: true });

        // 1. Project A publishes a task
        console.log('  Project A publishing task...');
        const payload = { role: 'test', prompt: 'hello from A' };
        channel.sendToQueue(queueA, Buffer.from(JSON.stringify(payload)));

        // 2. Try to consume from Project B's queue
        console.log('  Checking Project B queue...');
        const msgB = await channel.get(queueB);
        assert.strictEqual(msgB, false, "Project B should NOT receive Project A's message");

        // 3. Consume from Project A's queue
        console.log('  Checking Project A queue...');
        const msgA = await channel.get(queueA);
        assert.notStrictEqual(msgA, false, 'Project A SHOULD receive its own message');
        
        const received = JSON.parse(msgA !== false ? msgA.content.toString() : '{}');
        assert.strictEqual(received.prompt, 'hello from A');

        console.log('  ✓ Isolation story passed');

    } catch (err) {
        console.error('  ✗ Story failed:', err);
        process.exit(1);
    } finally {
        await conn.close();
        await projectA.cleanup();
        await projectB.cleanup();
    }
}

testProjectIsolation().catch(err => {
    console.error(err);
    process.exit(1);
});
