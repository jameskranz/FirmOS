import amqp from 'amqplib';

const EXTERNAL_QUEUE = 'external_requests';

async function publishExternal() {
    const message = process.argv[2] || "Hello from the outside world!";
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue(EXTERNAL_QUEUE, { durable: true });
        channel.sendToQueue(EXTERNAL_QUEUE, Buffer.from(message), { persistent: true });
        console.log(`🚀 Published to ${EXTERNAL_QUEUE}: "${message}"`);
        setTimeout(() => connection.close(), 500);
    } catch (error: any) {
        console.error('❌ Failed to publish:', error.message);
        process.exit(1);
    }
}

publishExternal();
