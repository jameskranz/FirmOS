import assert from 'node:assert';
// @ts-ignore
import { HandoffManager } from '../../src/utils/handoff-manager.ts';

console.log('Running handoff-manager.test.ts');

try {
    const manager = new HandoffManager();
    
    // 1. Test PM -> Architect handoff
    const handoff1 = manager.getHandoffConfig('submit_for_review');
    assert.ok(handoff1, 'Should have config for submit_for_review');
    assert.strictEqual(handoff1.targetRole, 'senior-systems-architect');
    assert.strictEqual(handoff1.nextStatus, 'reviewing');
    console.log('✓ PM -> Architect mapping correct');

    // 2. Test Architect -> PM handoff
    const handoff2 = manager.getHandoffConfig('submit_feedback');
    assert.ok(handoff2, 'Should have config for submit_feedback');
    assert.strictEqual(handoff2.targetRole, 'product-manager');
    assert.strictEqual(handoff2.nextStatus, 'revising');
    console.log('✓ Architect -> PM mapping correct');

    // 3. Test PM -> Human handoff
    const handoff3 = manager.getHandoffConfig('submit_for_approval');
    assert.ok(handoff3, 'Should have config for submit_for_approval');
    assert.strictEqual(handoff3.targetRole, 'human');
    assert.strictEqual(handoff3.nextStatus, 'pending_approval');
    console.log('✓ PM -> Human mapping correct');

} catch (err: any) {
    console.error('✗ HandoffManager test failed:', err.message);
    process.exit(1);
}
