import amqp from 'amqplib';

const QUEUE_NAME = 'task_routing';

async function purgeQueue() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        const result = await channel.purgeQueue(QUEUE_NAME);
        
        console.log(`🧹 Purged ${result.messageCount} messages from [${QUEUE_NAME}].`);
        
        await connection.close();
    } catch (error: any) {
        console.error('❌ Failed to purge queue:', error.message);
        process.exit(1);
    }
}

purgeQueue();
