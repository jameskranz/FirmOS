import assert from 'node:assert';
// @ts-ignore
import { startDaemon } from '../src/daemon.js';

console.log('Running daemon.test.ts');

try {
  assert.strictEqual(typeof startDaemon, 'function');
  console.log('✓ startDaemon is a function');
} catch (err) {
  console.error('✗ startDaemon is missing or not a function');
  process.exit(1);
}
