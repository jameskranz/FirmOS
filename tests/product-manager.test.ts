import fs from 'node:fs';
import assert from 'node:assert';

console.log('Running product-manager.test.ts');

const pmContent = fs.readFileSync('./company/roles/product-manager.md', 'utf8');

try {
  assert.ok(pmContent.includes('save_file'), 'product-manager SLA does not mention save_file tool');
  assert.ok(pmContent.includes('prd.md'), 'product-manager SLA does not mention prd.md');
  console.log('✓ product-manager SLA is verified');
} catch (err) {
  console.error('✗ product-manager SLA is missing instructions');
  process.exit(1);
}
