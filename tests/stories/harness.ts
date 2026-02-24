import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import amqp from 'amqplib';

export class StoryHarness {
    public testId: string;
    public workDir: string;
    public projectId: string;

    constructor(name: string) {
        this.testId = crypto.randomBytes(4).toString('hex');
        this.projectId = crypto.randomUUID();
        this.workDir = path.join(os.tmpdir(), `firmos-story-${name}-${this.testId}`);
    }

    async setup() {
        await fs.mkdir(this.workDir, { recursive: true });
    }

    async cleanup() {
        await fs.rm(this.workDir, { recursive: true, force: true });
    }

    /**
     * Spawns the FirmOS CLI in the temporary work directory.
     */
    runCli(args: string[], env: Record<string, string> = {}) {
        const binPath = path.resolve(process.cwd(), 'dist/cli/index.js');
        const child = spawn('node', [binPath, ...args], {
            cwd: this.workDir,
            env: { ...process.env, ...env, PROJECT_ID: this.projectId, TERM: 'dumb', FORCE_COLOR: '0' },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        return child;
    }

    /**
     * Manually creates a .firmosrc in the work dir.
     */
    async createConfig() {
        const rcPath = path.join(this.workDir, '.firmosrc');
        await fs.writeFile(rcPath, `project_id: ${this.projectId}
`);
    }

    /**
     * Returns a project-scoped queue name.
     */
    getQueueName(base: string) {
        return `${base}_${this.projectId}`;
    }

    /**
     * Connects to RabbitMQ and returns channel for scoped testing.
     */
    async getChannel() {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
        const conn = await amqp.connect(rabbitUrl);
        const channel = await conn.createChannel();
        return { conn, channel };
    }
}
