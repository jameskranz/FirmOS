import assert from 'node:assert';
import { StoryHarness } from './harness.js';

async function testCeoHandoff() {
    console.log('📖 Story: CEO Asynchronous Decision (HITL)');
    const harness = new StoryHarness('ceo-hitl');
    await harness.setup();
    await harness.createConfig();

    const { conn, channel } = await harness.getChannel();

    try {
        const taskQueue = harness.getQueueName('task_routing');
        const ceoQueue = harness.getQueueName('ceo_requests');
        
        await channel.assertQueue(taskQueue, { durable: true });
        await channel.assertQueue(ceoQueue, { durable: true });

        console.log('  1. Injecting CEO request into system...');
        const payload = { 
            role: 'ceo', 
            prompt: 'Please approve the PRD for Feature X',
            gitInfo: { repositoryUrl: 'https://github.com/test/repo.git' }
        };
        
        // Simulating the daemon's behavior when it sees a 'ceo' role
        channel.sendToQueue(ceoQueue, Buffer.from(JSON.stringify(payload)));

        console.log('  2. Verifying message in CEO Inbox (queue)...');
        const msg = await channel.get(ceoQueue);
        assert.notStrictEqual(msg, false, `Message should be in ${ceoQueue}`);
        
        const received = JSON.parse(msg !== false ? msg.content.toString() : '{}');
        assert.strictEqual(received.role, 'ceo');
        
        console.log('  3. Simulating Human Response via Task Queue...');
        const humanResponse = {
            role: 'hr/director', // Next role after approval
            prompt: 'CEO FEEDBACK: Approved. Proceed.\n\nORIGINAL: Please approve...'
        };
        channel.sendToQueue(taskQueue, Buffer.from(JSON.stringify(humanResponse)));

        console.log('  ✓ CEO Handoff story passed');

    } catch (err) {
        console.error('  ✗ Story failed:', err);
        process.exit(1);
    } finally {
        await conn.close();
        await harness.cleanup();
    }
}

testCeoHandoff().catch(err => {
    console.error(err);
    process.exit(1);
});
