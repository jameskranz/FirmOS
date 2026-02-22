import fs from 'node:fs';
import assert from 'node:assert';

console.log('Running scripts.test.js');

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

try {
  assert.ok(pkg.scripts.build, 'build script is missing');
  assert.ok(pkg.scripts.start, 'start script is missing');
  assert.ok(pkg.scripts.publish, 'publish script is missing');
  console.log('✓ package.json scripts are present');
} catch (err) {
  console.error('✗ package.json scripts are missing:', err.message);
  process.exit(1);
}
