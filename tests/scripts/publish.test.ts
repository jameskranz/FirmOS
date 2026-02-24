import assert from 'node:assert';
// @ts-ignore
import { sendTask } from '../scripts/publish.js';

console.log('Running publish.test.ts');

try {
  assert.strictEqual(typeof sendTask, 'function');
  console.log('✓ sendTask is a function');
} catch (err) {
  console.error('✗ sendTask is missing or not a function');
  process.exit(1);
}
