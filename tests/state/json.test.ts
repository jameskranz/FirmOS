import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { JsonStateManager } from '../../src/state/json.js';

async function testJsonStateManager() {
    console.log('Running json.test.ts');

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'firmos-json-test-'));
    const stateFile = path.join(tempDir, 'workflows.json');

    try {
        const manager = new JsonStateManager(stateFile);

        const featureId = 'test-feature';
        const featureName = 'Test Feature';
        const workbookPath = 'artifacts/test-feature.md';

        // 1. Test Initialize
        await manager.workflows.initialize({
            featureId,
            featureName,
            currentAgent: 'product-manager',
            status: 'drafting',
            workbookPath,
            approvals: {}
        });

        const state = await manager.workflows.get(featureId);
        assert.ok(state, 'Workflow should be initialized');
        assert.strictEqual(state.featureName, featureName);
        assert.strictEqual(state.status, 'drafting');
        console.log('✓ Initialization passed');

        // 2. Test Update
        const historyEntry = {
            timestamp: new Date().toISOString(),
            fromAgent: 'product-manager',
            toAgent: 'architect',
            action: 'submit',
            note: 'Initial draft'
        };

        await manager.workflows.update(featureId, {
            status: 'reviewing',
            currentAgent: 'architect'
        }, historyEntry);

        const updatedState = await manager.workflows.get(featureId);
        assert.ok(updatedState);
        assert.strictEqual(updatedState.status, 'reviewing');
        assert.strictEqual(updatedState.history.length, 1);
        console.log('✓ Update passed');

        // 3. Test Tickets
        const ticketId = await manager.tickets.create({
            title: 'JSON Ticket',
            description: 'Testing JSON repo',
            parentId: null
        });
        const ticket = await manager.tickets.get(ticketId);
        assert.ok(ticket);
        assert.strictEqual(ticket.title, 'JSON Ticket');
        console.log('✓ Tickets (JSON) passed');

    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

testJsonStateManager().catch(err => {
    console.error('✗ JsonStateManager test failed:', err.message);
    process.exit(1);
});
