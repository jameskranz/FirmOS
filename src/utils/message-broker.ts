import amqp from 'amqplib';
import fs from 'node:fs';
import path from 'node:path';
import { getProjectRoot } from './path-resolver.js';

export interface MessagePayload {
    role: string;
    fromRole?: string;
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

    public getBroadcastExchange(): string {
        return `tui_events_${this.projectId}`;
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
                // Ensure broadcast exchange exists
                await this.channel!.assertExchange(this.getBroadcastExchange(), 'fanout', { durable: false });
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

    async broadcast(event: string, payload: any) {
        if (!this.channel) await this.connect();
        const msg = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
        this.channel!.publish(this.getBroadcastExchange(), '', Buffer.from(msg));
    }

    async subscribeToBroadcast(onEvent: (event: string, payload: any) => void) {
        if (!this.channel) await this.connect();
        const exchange = this.getBroadcastExchange();
        const q = await this.channel!.assertQueue('', { exclusive: true });
        await this.channel!.bindQueue(q.queue, exchange, '');
        
        this.channel!.consume(q.queue, (msg) => {
            if (msg) {
                const data = JSON.parse(msg.content.toString());
                onEvent(data.event, data.details || data.payload);
            }
        }, { noAck: true });
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
