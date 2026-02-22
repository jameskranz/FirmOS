import fs from 'node:fs';
import assert from 'node:assert';

console.log('Running senior-systems-architect.test.ts');

const architectContent = fs.readFileSync('./company/roles/senior-systems-architect.md', 'utf8');

try {
  assert.ok(architectContent.includes('review') || architectContent.includes('feedback'), 'architect SLA does not mention review or feedback');
  console.log('✓ senior-systems-architect SLA is verified');
} catch (err) {
  console.error('✗ senior-systems-architect SLA is missing instructions');
  process.exit(1);
}
