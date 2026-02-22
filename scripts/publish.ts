import amqp from 'amqplib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const QUEUE_NAME = 'task_routing';

export async function sendTask() {
    // Grab the first argument passed to the CLI
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('❌ Please provide a path to a JSON task file.');
        console.error('Usage: ts-node scripts/publish.ts <path-to-task.json>');
        return;
    }

    try {
        // Read and parse the task JSON file
        const absolutePath = path.resolve(filePath);
        const fileContent = await fs.readFile(absolutePath, 'utf8');
        const task = JSON.parse(fileContent);

        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        const payload = JSON.stringify(task);
        
        channel.sendToQueue(QUEUE_NAME, Buffer.from(payload));
        console.log(`🚀 Sent task from ${filePath} to [${QUEUE_NAME}]:\n`, task);

        // Close connection gracefully after a short delay
        setTimeout(() => {
            connection.close();
            // Don't exit if it's imported
            if (process.argv[1] === fileURLToPath(import.meta.url)) {
                process.exit(0);
            }
        }, 500);

    } catch (error: any) {
        console.error('❌ Failed to send message:', error.message);
        if (process.argv[1] === fileURLToPath(import.meta.url)) {
            process.exit(1);
        }
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    sendTask();
}
