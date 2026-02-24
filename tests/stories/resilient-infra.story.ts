import assert from 'node:assert';
import { StoryHarness } from './harness.js';

async function testResilientInfra() {
    console.log('📖 Story: Resilient Infrastructure (RabbitMQ Down)');
    const harness = new StoryHarness('resilience');
    await harness.setup();
    await harness.createConfig();

    try {
        console.log('  Scenario: Running status while RabbitMQ is unreachable');
        const cli = harness.runCli(['status'], {
            RABBITMQ_URL: 'amqp://non-existent-host:5672'
        });

        let output = '';
        cli.stdout?.on('data', (data) => { output += data.toString(); });
        cli.stderr?.on('data', (data) => { output += data.toString(); });

        await new Promise(resolve => {
            cli.on('exit', () => resolve(true));
        });

        assert.ok(output.includes('💡 TIP: Is RabbitMQ running?'), 'Should show troubleshooting tip');
        console.log('  ✓ Resilience story passed');

    } catch (err) {
        console.error('  ✗ Story failed:', err);
        process.exit(1);
    } finally {
        await harness.cleanup();
    }
}

testResilientInfra().catch(err => {
    console.error(err);
    process.exit(1);
});
