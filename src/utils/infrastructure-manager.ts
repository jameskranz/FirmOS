import Docker from 'dockerode';
import path from 'path';

export interface WorkerConfig {
    repoUrl: string;
    taskFilter?: string;
    cpuShares?: number;
    memoryLimit?: number; // in MB
    projectId?: string;
}

export class InfrastructureManager {
    private docker: Docker;

    constructor() {
        // Connect to local docker socket
        this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    }

    /**
     * Spawns a new worker container pinned to a specific repository.
     */
    async spawnWorker(config: WorkerConfig): Promise<string> {
        const env = [
            `GEMINI_API_KEY=${process.env.GEMINI_API_KEY}`,
            `RABBITMQ_URL=${process.env.RABBITMQ_URL_INTERNAL || 'amqp://guest:guest@rabbitmq:5672'}`,
            `DATABASE_URL=${process.env.DATABASE_URL_INTERNAL || 'postgresql://firmos_admin:firmos_password@postgres:5432/firmos'}`,
            `AUTOCLONE_REPO=${config.repoUrl}`,
            `TASK_FILTER=${config.taskFilter || ''}`,
            `PROJECT_ID=${config.projectId || 'default'}`,
            `NODE_ENV=production`
        ];

        // Ensure we attach to the correct network so we can reach Rabbit/PG
        // Assuming 'firmos_default' based on standard compose naming
        const networkName = process.env.DOCKER_NETWORK || 'firmos_default';

        try {
            const container = await this.docker.createContainer({
                Image: 'firmos-runner',
                Cmd: ['node', '/app/dist/src/daemon.js'],
                Env: env,
                Labels: {
                    'type': 'firmos-worker',
                    'repo': config.repoUrl,
                    'managed_by': 'firmos-orchestrator'
                },
                HostConfig: {
                    NetworkMode: networkName,
                    Memory: config.memoryLimit ? config.memoryLimit * 1024 * 1024 : undefined,
                    CpuShares: config.cpuShares,
                    AutoRemove: true // Clean up when it stops
                }
            });

            await container.start();
            return container.id;
        } catch (error: any) {
            throw new Error(`Failed to spawn worker: ${error.message}`);
        }
    }

    /**
     * Lists all active FirmOS workers.
     */
    async listWorkers(): Promise<any[]> {
        try {
            const containers = await this.docker.listContainers({
                filters: {
                    label: ['type=firmos-worker']
                }
            });

            return containers.map(c => ({
                id: c.Id.substring(0, 12),
                status: c.Status,
                repo: c.Labels['repo'],
                created: new Date(c.Created * 1000).toISOString()
            }));
        } catch (error: any) {
            throw new Error(`Failed to list workers: ${error.message}`);
        }
    }

    /**
     * Terminates a worker container.
     */
    async terminateWorker(containerId: string): Promise<void> {
        try {
            const container = this.docker.getContainer(containerId);
            await container.stop();
            // AutoRemove is set, so it should disappear
        } catch (error: any) {
            throw new Error(`Failed to terminate worker ${containerId}: ${error.message}`);
        }
    }
}
