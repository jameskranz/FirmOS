import fs from 'node:fs';
import assert from 'node:assert';

console.log('Running config.test.js');

try {
  const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));
  assert.strictEqual(tsconfig.compilerOptions.module, 'NodeNext');
  assert.strictEqual(tsconfig.compilerOptions.target, 'ESNext');
  console.log('✓ tsconfig.json is valid');
} catch (err) {
  console.error('✗ tsconfig.json is invalid or missing');
  process.exit(1);
}
