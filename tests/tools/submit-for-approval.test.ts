import assert from 'node:assert';
// @ts-ignore
import { SubmitForApprovalTool } from '../../src/tools/submit-for-approval.ts';

console.log('Running submit-for-approval.test.ts');

try {
  const tool = new SubmitForApprovalTool();
  assert.strictEqual(tool.definition.name, 'submit_for_approval');
  assert.ok(tool.definition.parameters.required.includes('featureId'));
  assert.ok(tool.definition.parameters.required.includes('featureName'));
  console.log('✓ submit_for_approval definition is correct');
} catch (err: any) {
  console.error('✗ submit_for_approval test failed:', err.message);
  process.exit(1);
}
