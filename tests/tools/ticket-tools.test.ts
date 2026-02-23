import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { CreateTicketTool, AssignTicketTool, UpdateTicketTool, ListTicketsTool } from '../../src/tools/ticket-tools.ts';
// @ts-ignore
import { JsonStateManager } from '../../src/state/json.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const STATE_FILE = path.join(PROJECT_ROOT, 'company', 'state', 'workflows.json');
const TICKETS_FILE = path.join(PROJECT_ROOT, 'company', 'state', 'tickets.json');

async function testTicketTools() {
    console.log('Running ticket-tools.test.ts (Refactored)');

    // Cleanup
    try { await fs.unlink(STATE_FILE); } catch (e) {}
    try { await fs.unlink(TICKETS_FILE); } catch (e) {}
    try { await fs.mkdir(path.dirname(STATE_FILE), { recursive: true }); } catch (e) {}
    await fs.writeFile(STATE_FILE, '{}');
    await fs.writeFile(TICKETS_FILE, '{}');

    // 1. Test Create
    const createTool = new CreateTicketTool();
    const createResult = await createTool.execute({
        title: 'Refactored Test Ticket',
        description: 'Testing the new create tool.',
        requirements: 'Testing skills'
    });
    console.log(createResult);
    assert.ok(createResult.includes('Successfully created ticket'), 'Create should succeed');

    const listTool = new ListTicketsTool();
    const listResultJson = await listTool.execute({});
    const tickets = JSON.parse(listResultJson);
    assert.strictEqual(tickets.length, 1);
    const ticketId = tickets[0].id;
    assert.strictEqual(tickets[0].assignedRole, undefined, 'Ticket should be unassigned');
    console.log('✓ Create & List (Unassigned) passed');

    // 2. Test Assign
    const assignTool = new AssignTicketTool();
    const assignResult = await assignTool.execute({
        ticketId: ticketId,
        assignedRole: 'tester'
    });
    console.log(assignResult);
    assert.ok(assignResult.includes('Successfully assigned ticket'), 'Assign should succeed');

    const assignedListJson = await listTool.execute({});
    const assignedTickets = JSON.parse(assignedListJson);
    assert.strictEqual(assignedTickets[0].assignedRole, 'tester', 'Role should be assigned');
    console.log('✓ Assign passed');

    // 3. Test Update
    const updateTool = new UpdateTicketTool();
    await updateTool.execute({
        ticketId: ticketId,
        status: 'In Progress'
    });
    const updatedListJson = await listTool.execute({});
    const updatedTickets = JSON.parse(updatedListJson);
    assert.strictEqual(updatedTickets[0].status, 'In Progress');
    console.log('✓ Update passed');

    // Cleanup
    try { await fs.unlink(STATE_FILE); } catch (e) {}
    try { await fs.unlink(TICKETS_FILE); } catch (e) {}
}

testTicketTools().catch(err => {
    console.error('✗ Ticket tools test failed:', err);
    process.exit(1);
});
