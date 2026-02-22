import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert';
// @ts-ignore
import { ReplaceInFileTool } from '../../src/tools/replace-in-file.ts';
// @ts-ignore
import { SaveFileTool } from '../../src/tools/save-file.ts';
// @ts-ignore
import { HireAgentTool } from '../../src/tools/hire-agent.ts';

async function testReplaceTool() {
    console.log('--- Testing ReplaceInFileTool ---');
    const testFile = 'test-replace.txt';
    const initialContent = 'Line 1\nLine 2\nLine 3';
    await fs.writeFile(testFile, initialContent);
    const tool = new ReplaceInFileTool();
    try {
        await tool.execute({
            relativePath: testFile,
            oldText: 'Line 2',
            newText: 'Updated Line 2'
        });
        const updated = await fs.readFile(testFile, 'utf8');
        assert.strictEqual(updated, 'Line 1\nUpdated Line 2\nLine 3');
        console.log('✓ success case passed');
    } finally {
        await fs.unlink(testFile);
    }
}

async function testSaveTool() {
    console.log('--- Testing SaveFileTool ---');
    const testFile = 'test-dir/test-save.txt';
    const content = 'New Content';
    const tool = new SaveFileTool();
    try {
        await tool.execute({
            relativePath: testFile,
            content: content
        });
        const saved = await fs.readFile(testFile, 'utf8');
        assert.strictEqual(saved, content);
        console.log('✓ success case passed');
    } finally {
        await fs.unlink(testFile);
        await fs.rmdir('test-dir');
    }
}

async function testHireTool() {
    console.log('--- Testing HireAgentTool ---');
    const roleName = 'test-agent';
    const sla = '# Test SLA';
    const tool = new HireAgentTool();
    const expectedPath = path.join('company', 'roles', 'test-agent.md');
    try {
        await tool.execute({
            roleName: roleName,
            slaContent: sla
        });
        const hired = await fs.readFile(expectedPath, 'utf8');
        assert.strictEqual(hired, sla);
        console.log('✓ success case passed');
    } finally {
        await fs.unlink(expectedPath);
    }
}

async function runAll() {
    await testReplaceTool();
    await testSaveTool();
    await testHireTool();
    console.log('\n⭐ All tool tests passed!');
}

runAll().catch(err => {
    console.error(err);
    process.exit(1);
});
