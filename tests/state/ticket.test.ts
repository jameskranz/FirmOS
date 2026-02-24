import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { JsonStateManager } from '../../src/state/json.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.resolve(__dirname, '../../company/state/workflows.json');
const TICKETS_FILE = path.resolve(__dirname, '../../company/state/tickets.json');

async function testTicketSchema() {
    console.log('Running ticket.test.ts');

    // Cleanup before test
    try { await fs.unlink(STATE_FILE); } catch (e) {}
    try { await fs.unlink(TICKETS_FILE); } catch (e) {}
    try { await fs.mkdir(path.dirname(STATE_FILE), { recursive: true }); } catch (e) {}
    await fs.writeFile(STATE_FILE, '{}');
    await fs.writeFile(TICKETS_FILE, '{}');

    const manager = new JsonStateManager(STATE_FILE);

    // 1. Test Create Ticket
    const ticketId = await manager.createTicket({
        title: 'Define PRD',
        description: 'Create the initial PRD for the feature.',
        assignedRole: 'product/define',
        parentId: null
    });
    assert.ok(ticketId, 'Ticket ID should be returned');
    
    const ticket = await manager.getTicket(ticketId);
    assert.ok(ticket, 'Ticket should be retrieved');
    assert.strictEqual(ticket.title, 'Define PRD');
    assert.strictEqual(ticket.status, 'Open');
    console.log('✓ Create Ticket passed');

    // 2. Test Update Ticket
    await manager.updateTicket(ticketId, {
        status: 'In Progress'
    });
    const updatedTicket = await manager.getTicket(ticketId);
    assert.strictEqual(updatedTicket?.status, 'In Progress');
    console.log('✓ Update Ticket passed');

    // 3. Test List Tickets
    const subTicketId = await manager.createTicket({
        title: 'Draft Spec',
        description: 'Write the first draft.',
        assignedRole: 'product/define',
        parentId: ticketId
    });

    const rootTickets = await manager.listTickets(null);
    assert.strictEqual(rootTickets.length, 1);
    assert.strictEqual(rootTickets[0].id, ticketId);

    const subTickets = await manager.listTickets(ticketId);
    assert.strictEqual(subTickets.length, 1);
    assert.strictEqual(subTickets[0].id, subTicketId);
    console.log('✓ List Tickets passed');

    // Cleanup after test
    try { await fs.unlink(STATE_FILE); } catch (e) {}
    try { await fs.unlink(TICKETS_FILE); } catch (e) {}
}

testTicketSchema().catch(err => {
    console.error('✗ Ticket schema test failed:', err);
    process.exit(1);
});
