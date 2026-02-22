import assert from 'node:assert';
// @ts-ignore
import { BaseStateManager } from '../../src/state/base.ts';

console.log('Running base.test.ts');

try {
  // Test if BaseStateManager is defined and is an abstract class (or at least a function/class)
  assert.strictEqual(typeof BaseStateManager, 'function', 'BaseStateManager should be a class');
  console.log('✓ BaseStateManager is defined');
} catch (err: any) {
  console.error('✗ BaseStateManager test failed:', err.message);
  process.exit(1);
}
