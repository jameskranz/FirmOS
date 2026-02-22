import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { JsonStateManager } from '../../src/state/json.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.resolve(__dirname, '../../company/state/workflows.json');

async function testJsonStateManager() {
    console.log('Running json.test.ts');

    // Cleanup before test
    try { await fs.unlink(STATE_FILE); } catch (e) {}
    try { await fs.mkdir(path.dirname(STATE_FILE), { recursive: true }); } catch (e) {}

    const manager = new JsonStateManager(STATE_FILE);

    const featureId = 'test-feature';
    const featureName = 'Test Feature';
    const workbookPath = 'company/work/test-feature.md';

    // 1. Test Initialize
    await manager.initializeWorkflow({
        featureId,
        featureName,
        currentAgent: 'product-manager',
        status: 'drafting',
        workbookPath
    });

    const state = await manager.getWorkflow(featureId);
    assert.ok(state, 'Workflow should be initialized');
    assert.strictEqual(state.featureName, featureName);
    assert.strictEqual(state.status, 'drafting');
    assert.strictEqual(state.history.length, 0);
    console.log('✓ Initialization passed');

    // 2. Test Update
    const historyEntry = {
        timestamp: new Date().toISOString(),
        fromAgent: 'product-manager',
        toAgent: 'senior-systems-architect',
        action: 'submit_for_review',
        note: 'Initial draft complete'
    };

    await manager.updateWorkflow(featureId, {
        currentAgent: 'senior-systems-architect',
        status: 'reviewing'
    }, historyEntry);

    const updatedState = await manager.getWorkflow(featureId);
    assert.ok(updatedState);
    assert.strictEqual(updatedState.status, 'reviewing');
    assert.strictEqual(updatedState.currentAgent, 'senior-systems-architect');
    assert.strictEqual(updatedState.history.length, 1);
    assert.strictEqual(updatedState.history[0].action, 'submit_for_review');
    console.log('✓ Update passed');

    // 3. Test List
    const workflows = await manager.listWorkflows();
    assert.strictEqual(workflows.length, 1);
    console.log('✓ Listing passed');

    // Cleanup after test
    try { await fs.unlink(STATE_FILE); } catch (e) {}
}

testJsonStateManager().catch(err => {
    console.error('✗ JsonStateManager test failed:', err.message);
    process.exit(1);
});
