import fs from 'node:fs';
import assert from 'node:assert';

console.log('Running state-integration.test.ts');

const daemonContent = fs.readFileSync('./src/daemon.ts', 'utf8');

try {
  assert.ok(daemonContent.includes('StateManager'), 'daemon.ts should import or use StateManager');
  console.log('✓ StateManager integration detected');
} catch (err: any) {
  console.error('✗ StateManager integration missing:', err.message);
  process.exit(1);
}
