import amqp from 'amqplib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_NAME = 'task_routing';

async function testIntegration() {
  console.log('Running end-to-end integration test');
  
  // 1. Prepare a mock task
  const mockTask = {
    role: 'hr-director',
    prompt: 'Create a new role file for a "Lead DevOps Engineer" in company/roles/.'
  };
  const taskPath = path.join(__dirname, 'mock-task.json');
  await fs.writeFile(taskPath, JSON.stringify(mockTask));

  // 2. Start RabbitMQ (assumed to be running for this environment)
  // In a real CI, we might start a container here.

  // 3. Start the Daemon in a subprocess
  console.log('Starting daemon...');
  const daemon = spawn('npx', ['ts-node', '--esm', 'src/daemon.ts'], {
    env: { ...process.env, CI: 'true' },
    stdio: 'pipe'
  });

  daemon.stdout.on('data', (data) => {
    console.log(`[Daemon STDOUT]: ${data}`);
  });

  daemon.stderr.on('data', (data) => {
    console.error(`[Daemon STDERR]: ${data}`);
  });

  // 4. Publish the task
  console.log('Publishing task...');
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(mockTask)));
  
  // 5. Wait for execution and verify file creation
  console.log('Waiting for agent execution (30s)...');
  const targetFile = path.join(__dirname, '..', 'company', 'roles', 'lead-devops-engineer.md');
  
  let success = false;
  for (let i = 0; i < 30; i++) {
    try {
      await fs.access(targetFile);
      console.log('✓ Target file created by agent!');
      success = true;
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Cleanup
  console.log('Cleaning up...');
  daemon.kill();
  await connection.close();
  await fs.unlink(taskPath);
  if (success) {
    await fs.unlink(targetFile);
    console.log('✓ Integration test passed!');
  } else {
    console.error('✗ Integration test failed: Target file not created in time.');
    process.exit(1);
  }
}

testIntegration().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
