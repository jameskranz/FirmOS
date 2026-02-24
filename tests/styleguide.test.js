import fs from 'node:fs';
import assert from 'node:assert';

console.log('Running styleguide.test.js');

try {
  assert.ok(fs.existsSync('./company/roles/hr/director.md'));
  console.log('✓ hr/director.md exists');
} catch (err) {
  console.error('✗ hr/director.md is missing');
  process.exit(1);
}
