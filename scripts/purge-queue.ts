import amqp from 'amqplib';

const QUEUE_NAME = 'task_routing';
const EXTERNAL_QUEUE = 'external_requests';

async function purgeQueue() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        const result1 = await channel.purgeQueue(QUEUE_NAME);
        console.log(`🧹 Purged ${result1.messageCount} messages from [${QUEUE_NAME}].`);

        await channel.assertQueue(EXTERNAL_QUEUE, { durable: true });
        const result2 = await channel.purgeQueue(EXTERNAL_QUEUE);
        console.log(`🧹 Purged ${result2.messageCount} messages from [${EXTERNAL_QUEUE}].`);
        
        await connection.close();
    } catch (error: any) {
        console.error('❌ Failed to purge queue:', error.message);
        process.exit(1);
    }
}

purgeQueue();
