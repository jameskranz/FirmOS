import assert from 'node:assert';
import { PostgresStateManager } from '../../dist/src/state/postgres.js';

async function testPostgresState() {
    console.log('Running postgres.test.ts against dist/');

    const manager = new PostgresStateManager();
    
    try {
        await manager.initializeSchema();

        const featureId = 'test-pg-feature-' + Date.now();
        
        // 1. Initialize Workflow
        await manager.initializeWorkflow({
            featureId,
            featureName: 'PG Test Feature',
            currentAgent: 'tester',
            status: 'drafting',
            workbookPath: 'test.md',
            approvals: {}
        });
        console.log('✓ Initialize Workflow passed');

        // 2. Update Workflow
        await manager.updateWorkflow(featureId, {
            status: 'reviewing',
            currentAgent: 'architect'
        }, {
            timestamp: new Date().toISOString(),
            fromAgent: 'tester',
            toAgent: 'architect',
            action: 'submit',
            note: 'Initial draft'
        });
        
        const workflow = await manager.getWorkflow(featureId);
        assert.ok(workflow);
        assert.strictEqual(workflow.status, 'reviewing');
        assert.strictEqual(workflow.history.length, 1);
        console.log('✓ Update Workflow passed');

        // 3. Tickets
        const ticketId = await manager.createTicket({
            title: 'PG Ticket',
            description: 'Database test',
            requirements: 'SQL',
            repositoryUrl: 'https://github.com/test/repo',
            parentId: null
        });
        assert.ok(ticketId);

        const ticket = await manager.getTicket(ticketId);
        assert.ok(ticket);
        assert.strictEqual(ticket.repositoryUrl, 'https://github.com/test/repo');
        console.log('✓ Create & Get Ticket passed');

        // 4. List Tickets
        const tickets = await manager.listTickets(null);
        assert.ok(tickets.length > 0);
        console.log('✓ List Tickets passed');

        // 5. Roles
        await manager.upsertRole({
            roleName: 'architect/design',
            description: 'Test Architect',
            slaContent: '# Architect SLA',
            modelTier: 'HIGH'
        });
        
        const role = await manager.getRole('architect/design');
        assert.ok(role);
        assert.strictEqual(role.description, 'Test Architect');
        console.log('✓ Upsert & Get Role passed');

        const roles = await manager.listRoles();
        assert.ok(roles.length > 0);
        console.log('✓ List Roles passed');

    } catch (err) {
        console.error('✗ Postgres state test failed:', err);
        process.exit(1);
    } finally {
        await manager.disconnect();
    }
}

testPostgresState().catch(err => {
    console.error(err);
    process.exit(1);
});
