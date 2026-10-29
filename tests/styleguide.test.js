import fs from 'node:fs';
import assert from 'node:assert';

console.log('Running styleguide.test.js');

try {
  assert.ok(fs.existsSync('./src/resources/default-roles/hr-director.md'));
  console.log('✓ hr-director.md exists in resources');
} catch (err) {
  console.error('✗ hr-director.md is missing from resources');
  process.exit(1);
}
