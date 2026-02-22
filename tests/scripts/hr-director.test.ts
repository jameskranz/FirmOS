import fs from 'node:fs';
import assert from 'node:assert';

console.log('Running hr-director.test.ts');

const hrContent = fs.readFileSync('./company/roles/hr-director.md', 'utf8');

try {
  assert.ok(hrContent.includes('hire_agent'), 'hr-director SLA does not mention hire_agent tool');
  console.log('✓ hr-director SLA is updated');
} catch (err) {
  console.error('✗ hr-director SLA is missing instructions');
  process.exit(1);
}
