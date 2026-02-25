#!/usr/bin/env node
import { Command } from 'commander';
import amqp from 'amqplib';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { startDaemon, initializeProjectContext } from '../daemon.js';
import { getProjectRoot, validateProjectRoot } from '../utils/path-resolver.js';
import { startTui } from './tui/screen.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root or engine root
dotenv.config();

const program = new Command();

program
  .name('firmos')
  .description('FirmOS CLI - Manage your AI Swarm')
  .version('1.0.0');

program
  .command('tui')
  .description('Launch the FirmOS Terminal User Interface')
  .action(() => {
    startTui();
  });

program
  .command('start')
  .description('Start or re-attach to the FirmOS Orchestrator and TUI')
  .option('--force', 'Force start even if a PID file exists')
  .action(async (options) => {
    console.log('🚀 Initializing FirmOS...');
    try {
      // 1. Validate Context & Initialize if needed (before TUI takes over stdin)
      let projectId = 'default';
      try {
          validateProjectRoot();
          // Fix: Ensure .firmosrc exists even if folder exists (e.g. user deleted config)
          const root = getProjectRoot();
          const rcPath = path.join(root, '.firmosrc');
          if (!fs.existsSync(rcPath)) {
              projectId = crypto.randomUUID();
              fs.writeFileSync(rcPath, `# FirmOS Project Configuration\ncreated_at: ${new Date().toISOString()}\nproject_id: ${projectId}\n`);
          } else {
              const rcContent = fs.readFileSync(rcPath, 'utf8');
              const match = rcContent.match(/project_id:\s*([a-zA-Z0-9-]+)/);
              if (match) projectId = match[1];
          }
      } catch (e) {
          await initializeProjectContext();
          // Re-validate after initialization
          validateProjectRoot();
          const rcPath = path.join(getProjectRoot(), '.firmosrc');
          const rcContent = fs.readFileSync(rcPath, 'utf8');
          const match = rcContent.match(/project_id:\s*([a-zA-Z0-9-]+)/);
          if (match) projectId = match[1];
      }

      const root = getProjectRoot();
      const pidFile = path.join(root, 'daemon.pid');
      let isAlreadyRunning = false;

      if (fs.existsSync(pidFile) && !options.force) {
          const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
          try {
              process.kill(pid, 0); // Check if alive
              isAlreadyRunning = true;
          } catch (e) {
              // Stale PID file, ignore
          }
      }

      // 2. Start TUI
      const { screen, panels } = startTui();
      
      if (isAlreadyRunning) {
          panels.log.log(`🔗 Re-attached to existing orchestrator (PID: ${fs.readFileSync(pidFile, 'utf8')})`);
          screen.render();
      } else {
          panels.log.log('🚀 Starting new Orchestrator daemon...');
          // 3. Start Daemon in background (it will emit events to the TUI)
          startDaemon({ tuiMode: true }).then(async () => {
              // --- Auto-Bootstrap Check ---
              const seedPath = process.env.PRD_SEED_PATH || path.join(root, 'initial-prd.md');
              if (fs.existsSync(seedPath)) {
                  const { PostgresStateManager } = await import('../state/postgres.js');
                  const { JsonStateManager } = await import('../state/json.js');
                  
                  // Quick check if project is empty
                  let state;
                  if (process.env.DATABASE_URL) {
                      state = new PostgresStateManager(projectId, process.env.DATABASE_URL);
                  } else {
                      state = new JsonStateManager(path.join(root, 'company', 'state', 'workflows.json'), projectId);
                  }
                  
                  const tickets = await state.listAllTickets();
                  if (tickets.length === 0) {
                      panels.log.log('🌱 Project is empty. Auto-bootstrapping from seed PRD...');
                      const { eventBus, FirmOsEvent } = await import('../utils/event-bus.js');
                      eventBus.emit(FirmOsEvent.BOOTSTRAP_SEED);
                  }
                  if (process.env.DATABASE_URL) await (state as any).disconnect();
              }
          }).catch(err => {
              let errorMsg = `❌ Daemon Error: ${err.message}`;
              if (err.message.includes('ECONNREFUSED') || err.code === 'ECONNREFUSED') {
                  errorMsg += '\n\n💡 TIP: Is RabbitMQ running? Try:\n   docker-compose up -d rabbitmq';
              }
              panels.log.log(errorMsg);
              screen.render();
          });
      }
    } catch (err: any) {
      console.error(`❌ Failed to initialize: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check the status of FirmOS components')
  .action(async () => {
    console.log('🔍 Checking FirmOS status...');
    
    // Check RabbitMQ
    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    try {
      const conn = await amqp.connect(rabbitUrl);
      console.log('✅ RabbitMQ: Connected');
      await conn.close();
    } catch (err: any) {
      console.log(`❌ RabbitMQ: Disconnected (${err.message})`);
      console.log('   💡 TIP: Is RabbitMQ running? Try: docker-compose up -d rabbitmq');
    }

    // Check Daemon PID
    try {
      validateProjectRoot();
      const pidFile = path.join(getProjectRoot(), 'daemon.pid');
      if (fs.existsSync(pidFile)) {
        const pid = fs.readFileSync(pidFile, 'utf8');
        try {
          process.kill(parseInt(pid, 10), 0);
          console.log(`✅ Orchestrator: Running (PID: ${pid})`);
        } catch (e) {
          console.log('❌ Orchestrator: Not running (Stale PID file)');
        }
      } else {
        console.log('❌ Orchestrator: Not running');
      }
    } catch (err: any) {
      console.log(`⚠️  Project Context: ${err.message}`);
    }
  });

program
  .command('dispatch')
  .alias('-m')
  .description('Dispatch a task to the intake queue')
  .argument('<prompt>', 'The task prompt')
  .option('-r, --role <role>', 'Target role (defaults to intake/consultant)', 'intake/consultant')
  .action(async (prompt, options) => {
    // Resolve Project ID
    let projectId = 'default';
    try {
        validateProjectRoot();
        const rcPath = path.join(getProjectRoot(), '.firmosrc');
        if (fs.existsSync(rcPath)) {
            const rcContent = fs.readFileSync(rcPath, 'utf8');
            const match = rcContent.match(/project_id:\s*([a-zA-Z0-9-]+)/);
            if (match) projectId = match[1];
        }
    } catch (e) {
        console.warn('⚠️  Could not resolve project context. Using default queue.');
    }

    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    try {
      const conn = await amqp.connect(rabbitUrl);
      const channel = await conn.createChannel();
      const queue = `task_routing_${projectId}`;
      
      await channel.assertQueue(queue, { durable: true });
      const payload = {
        role: options.role,
        prompt: prompt,
        timestamp: new Date().toISOString()
      };
      
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
      console.log(`✅ Task dispatched to [${options.role}]`);
      
      await channel.close();
      await conn.close();
    } catch (err: any) {
      console.error(`❌ Failed to dispatch task: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Gracefully shut down the FirmOS swarm for this project')
  .action(async () => {
    // Resolve Project ID
    let projectId = 'default';
    try {
        validateProjectRoot();
        const root = getProjectRoot();
        const rcPath = path.join(root, '.firmosrc');
        if (fs.existsSync(rcPath)) {
            const rcContent = fs.readFileSync(rcPath, 'utf8');
            const match = rcContent.match(/project_id:\s*([a-zA-Z0-9-]+)/);
            if (match) projectId = match[1];
        }
    } catch (e) {}

    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    try {
      const conn = await amqp.connect(rabbitUrl);
      const channel = await conn.createChannel();
      const queue = `task_routing_${projectId}`;
      
      await channel.assertQueue(queue, { durable: true });
      const payload = {
        role: 'system/shutdown',
        prompt: 'STOP_COMMAND_RECEIVED'
      };
      
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
      console.log(`✅ Shutdown signal sent to project [${projectId}]`);
      
      await channel.close();
      await conn.close();
    } catch (err: any) {
      console.error(`❌ Failed to send shutdown signal: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('reset')
  .description('Reset project state (purges queues and database)')
  .option('--hard', 'Also deletes local .firmosrc (Nuclear reset)')
  .action(async (options) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('⚠️  Are you sure you want to reset this project? (y/n): ');
    rl.close();

    if (answer.toLowerCase() !== 'y') {
        console.log('Reset cancelled.');
        return;
    }

    // Resolve Project ID
    let projectId = 'default';
    try {
        validateProjectRoot();
        const root = getProjectRoot();
        const rcPath = path.join(root, '.firmosrc');
        if (fs.existsSync(rcPath)) {
            const rcContent = fs.readFileSync(rcPath, 'utf8');
            const match = rcContent.match(/project_id:\s*([a-zA-Z0-9-]+)/);
            if (match) projectId = match[1];
        }

        if (options.hard) {
            console.log('🔥 Hard reset: Deleting .firmosrc...');
            fs.unlinkSync(rcPath);
        }
    } catch (e) {}

    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    try {
      const conn = await amqp.connect(rabbitUrl);
      const channel = await conn.createChannel();
      
      // We publish a 'reset' role message to the project queue. 
      // The daemon picks it up and executes purgeProjectData.
      const queue = `task_routing_${projectId}`;
      await channel.assertQueue(queue, { durable: true });
      
      const payload = {
        role: 'system/reset', // Special role handled by daemon if needed, or just a trigger
        prompt: 'RESET_TRIGGERED'
      };
      
      // Actually, since the daemon might not be running, 
      // the CLI should probably try to talk to DB directly if DATABASE_URL exists.
      // But for consistency with 'purge', let's use the eventBus if daemon IS running,
      // or a direct DB call if it isn't.
      
      // For now, let's keep it simple: The CLI informs the user if the daemon 
      // needs to be running, OR we implement direct DB purge in CLI.
      
      // Let's do direct purge in CLI for better UX when daemon is off.
      const { PostgresStateManager } = await import('../state/postgres.js');
      const { JsonStateManager } = await import('../state/json.js');
      
      let state;
      if (process.env.DATABASE_URL) {
          state = new PostgresStateManager(projectId, process.env.DATABASE_URL);
          // Ensure schema is up to date before purging
          console.log('📜 Initializing schema migrations...');
          await state.initializeSchema();
      } else {
          const root = getProjectRoot();
          state = new JsonStateManager(path.join(root, 'company', 'state', 'workflows.json'), projectId);
      }

      console.log(`🧹 Purging database for project [${projectId}]...`);
      await state.purgeProjectData();

      console.log(`💣 Purging RabbitMQ queues for project [${projectId}]...`);
      const routingQueue = `task_routing_${projectId}`;
      const externalQueue = `external_requests_${projectId}`;
      const ceoQueue = `ceo_requests_${projectId}`;
      
      await channel.assertQueue(routingQueue, { durable: true });
      await channel.purgeQueue(routingQueue);
      
      await channel.assertQueue(externalQueue, { durable: true });
      await channel.purgeQueue(externalQueue);

      await channel.assertQueue(ceoQueue, { durable: true });
      await channel.purgeQueue(ceoQueue);

      console.log('✅ Reset complete.');
      
      await channel.close();
      await conn.close();
    } catch (err: any) {
      console.error(`❌ Reset failed: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
