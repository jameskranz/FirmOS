import fs from 'node:fs';
import assert from 'node:assert';

console.log('Running styleguide.test.js');

try {
  assert.ok(fs.existsSync('./conductor/code_styleguides/typescript.md'));
  console.log('✓ typescript.md exists');
} catch (err) {
  console.error('✗ typescript.md is missing');
  process.exit(1);
}
