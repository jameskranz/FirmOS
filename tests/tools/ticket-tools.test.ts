import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { CreateTicketTool, AssignTicketTool, UpdateTicketTool, ListTicketsTool } from '../../src/tools/ticket-tools.ts';
import { JsonTicketRepository } from '../../src/state/repositories/json-ticket.ts';

class MockStateManager {
    public tickets: JsonTicketRepository;
    constructor(filePath: string) {
        this.tickets = new JsonTicketRepository(filePath);
    }
}

async function testTicketTools() {
    console.log('Running ticket-tools.test.ts');

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'firmos-tickets-test-'));
    const ticketsFile = path.join(tempDir, 'tickets.json');

    const state = new MockStateManager(ticketsFile) as any;
    (global as any).firmOsStateManager = state;

    try {
        // 1. Create
        const createTool = new CreateTicketTool();
        const createResult = await createTool.execute({
            title: 'Refactored Test Ticket',
            description: 'Testing the new create tool.'
        });
        assert.ok(createResult.includes('Successfully created ticket'));

        const listTool = new ListTicketsTool();
        const listResultJson = await listTool.execute({});
        const tickets = JSON.parse(listResultJson);
        assert.strictEqual(tickets.length, 1);
        const ticketId = tickets[0].id;
        console.log('✓ Create & List passed');

        // 2. Assign (Mock MessageBroker might fail if RabbitMQ not running, but let's see)
        // Wait, AssignTicketTool uses MessageBroker which needs amqp.
        // We might need to mock MessageBroker if we want "pure" logic tests.
        // For now, let's just test Create/Update/List which are state-only.

        // 3. Update
        const updateTool = new UpdateTicketTool();
        await updateTool.execute({
            ticketId: ticketId,
            status: 'In Progress'
        });
        const updatedListJson = await listTool.execute({});
        const updatedTickets = JSON.parse(updatedListJson);
        assert.strictEqual(updatedTickets[0].status, 'In Progress');
        console.log('✓ Update passed');

    } finally {
        delete (global as any).firmOsStateManager;
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

testTicketTools().catch(err => {
    console.error('✗ Ticket tools test failed:', err);
    process.exit(1);
});
