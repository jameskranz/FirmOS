#!/usr/bin/env node
import { Command } from 'commander';
import amqp from 'amqplib';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';
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
  .description('Start the FirmOS Orchestrator and TUI')
  .action(async () => {
    console.log('🚀 Initializing FirmOS...');
    try {
      // 1. Validate Context & Initialize if needed (before TUI takes over stdin)
      try {
          validateProjectRoot();
          // Fix: Ensure .firmosrc exists even if folder exists (e.g. user deleted config)
          const root = getProjectRoot();
          const rcPath = path.join(root, '.firmosrc');
          if (!fs.existsSync(rcPath)) {
              const projectId = crypto.randomUUID();
              fs.writeFileSync(rcPath, `# FirmOS Project Configuration\ncreated_at: ${new Date().toISOString()}\nproject_id: ${projectId}\n`);
          }
      } catch (e) {
          await initializeProjectContext();
          // Re-validate after initialization
          validateProjectRoot();
      }

      // 2. Start TUI
      const { screen, panels } = startTui();
      panels.log.log('🚀 Starting Orchestrator daemon...');
      
      // 3. Start Daemon in background (it will emit events to the TUI)
      // Note: validateProjectRoot will pass inside startDaemon now.
      startDaemon({ tuiMode: true }).catch(err => {
          let errorMsg = `❌ Daemon Error: ${err.message}`;
          if (err.message.includes('ECONNREFUSED') || err.code === 'ECONNREFUSED') {
              errorMsg += '\n\n💡 TIP: Is RabbitMQ running? Try:\n   docker-compose up -d rabbitmq';
          }
          panels.log.log(errorMsg);
          screen.render();
      });
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

program.parse();
