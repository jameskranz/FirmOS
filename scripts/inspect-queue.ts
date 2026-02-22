import amqp from 'amqplib';

const QUEUE_NAME = 'task_routing';

async function inspectQueue() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        
        const q = await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`Queue: [${QUEUE_NAME}]`);
        console.log(`   Message count: ${q.messageCount}`);
        console.log(`   Consumer count: ${q.consumerCount}`);

        const msg = await channel.get(QUEUE_NAME, { noAck: false });
        if (msg) {
            console.log('\nPeek at first message:');
            console.log(msg.content.toString());
            channel.nack(msg, false, true);
            console.log('\nMessage returned to queue (nacked).');
        } else {
            console.log('\nQueue is empty.');
        }
        
        await new Promise(r => setTimeout(r, 500));
        await connection.close();
    } catch (error: any) {
        console.error('Failed to inspect queue:', error.message);
        process.exit(1);
    }
}

inspectQueue();
