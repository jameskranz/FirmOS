import amqp from 'amqplib';
import fs from 'node:fs';
import path from 'node:path';
import { getProjectRoot } from './path-resolver.js';

export interface MessagePayload {
    role: string;
    prompt: string;
    model?: string;
    gitInfo?: {
        repositoryUrl: string;
        branchName?: string;
    };
    timestamp?: string;
}

export class MessageBroker {
    private connection: amqp.Connection | null = null;
    private channel: amqp.Channel | null = null;
    private projectId: string = 'default';
    private rabbitUrl: string;

    constructor() {
        this.rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
        this.resolveProjectId();
    }

    private resolveProjectId() {
        // Priority: Env Var > .firmosrc > 'default'
        if (process.env.PROJECT_ID) {
            this.projectId = process.env.PROJECT_ID;
            return;
        }

        try {
            const rcPath = path.join(getProjectRoot(), '.firmosrc');
            if (fs.existsSync(rcPath)) {
                const rcContent = fs.readFileSync(rcPath, 'utf8');
                const match = rcContent.match(/project_id:\s*([a-zA-Z0-9-]+)/);
                if (match) this.projectId = match[1];
            }
        } catch (e) {
            // Ignore errors, default to 'default'
        }
    }

    public getQueueName(baseName: string): string {
        return `${baseName}_${this.projectId}`;
    }

    public getProjectId(): string {
        return this.projectId;
    }

    async connect() {
        if (this.connection) return;
        try {
            this.connection = await amqp.connect(this.rabbitUrl) as any;
            if (this.connection) {
                this.channel = await (this.connection as any).createChannel();
            }
        } catch (err: any) {
            throw new Error(`MessageBroker Connection Failed: ${err.message}`);
        }
    }

    async publish(payload: MessagePayload, queueName: string = 'task_routing') {
        if (!this.channel) await this.connect();
        
        const scopedQueue = this.getQueueName(queueName);
        await this.channel!.assertQueue(scopedQueue, { durable: true });

        const finalPayload = {
            ...payload,
            timestamp: payload.timestamp || new Date().toISOString()
        };

        this.channel!.sendToQueue(scopedQueue, Buffer.from(JSON.stringify(finalPayload)), { persistent: true });
    }

    async consume(queueName: string, onMessage: (msg: amqp.ConsumeMessage | null) => void) {
        if (!this.channel) await this.connect();

        const scopedQueue = this.getQueueName(queueName);
        await this.channel!.assertQueue(scopedQueue, { durable: true });
        
        this.channel!.consume(scopedQueue, onMessage);
    }

    async ack(msg: amqp.ConsumeMessage) {
        if (this.channel) this.channel.ack(msg);
    }

    async nack(msg: amqp.ConsumeMessage, allUpTo?: boolean, requeue?: boolean) {
        if (this.channel) this.channel.nack(msg, allUpTo, requeue);
    }

    async close() {
        try {
            if (this.channel) await (this.channel as any).close();
            if (this.connection) await (this.connection as any).close();
        } catch (e) {}
        this.channel = null;
        this.connection = null;
    }
}
