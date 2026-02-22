import assert from 'node:assert';
// @ts-ignore
import { SubmitForReviewTool } from '../../src/tools/submit-for-review.ts';

console.log('Running submit-for-review.test.ts');

try {
  const tool = new SubmitForReviewTool();
  assert.strictEqual(tool.definition.name, 'submit_for_review');
  assert.ok(tool.definition.parameters.required.includes('featureId'));
  assert.ok(tool.definition.parameters.required.includes('featureName'));
  assert.ok(tool.definition.parameters.required.includes('workbookPath'));
  console.log('✓ submit_for_review definition is correct');
} catch (err: any) {
  console.error('✗ submit_for_review test failed:', err.message);
  process.exit(1);
}
