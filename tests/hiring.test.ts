import fs from 'node:fs';
import assert from 'node:assert';

console.log('Running hiring.test.ts');

const daemonContent = fs.readFileSync('./src/daemon.ts', 'utf8');

try {
  assert.ok(daemonContent.includes('hire_agent'), 'hire_agent tool is not defined in src/daemon.ts');
  console.log('✓ hire_agent tool is defined');
} catch (err) {
  console.error('✗ hire_agent tool is missing');
  process.exit(1);
}
