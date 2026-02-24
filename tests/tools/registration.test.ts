import assert from 'node:assert';
// @ts-ignore
import { firmOsTools } from '../../src/tools/index.js';

console.log('Running registration.test.ts');

const toolNames = (firmOsTools as any).functionDeclarations?.map((f: any) => f.name) || [];

try {
  assert.ok(toolNames.includes('submit_for_review'), 'submit_for_review should be registered');
  assert.ok(toolNames.includes('submit_feedback'), 'submit_feedback should be registered');
  assert.ok(toolNames.includes('submit_for_approval'), 'submit_for_approval should be registered');
  console.log('✓ All handoff tools are registered');
} catch (err: any) {
  console.error('✗ Registration test failed:', err.message);
  process.exit(1);
}
