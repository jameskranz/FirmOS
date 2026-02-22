import assert from 'node:assert';
// @ts-ignore
import { SubmitFeedbackTool } from '../../src/tools/submit-feedback.ts';

console.log('Running submit-feedback.test.ts');

try {
  const tool = new SubmitFeedbackTool();
  assert.strictEqual(tool.definition.name, 'submit_feedback');
  assert.ok(tool.definition.parameters.required.includes('featureId'));
  assert.ok(tool.definition.parameters.required.includes('feedback'));
  console.log('✓ submit_feedback definition is correct');
} catch (err: any) {
  console.error('✗ submit_feedback test failed:', err.message);
  process.exit(1);
}
