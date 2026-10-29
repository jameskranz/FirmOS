import assert from 'node:assert';
import { ListRolesTool } from '../../src/tools/list-roles.ts';
import { BaseStateManager } from '../../src/state/base.ts';

class MockRoleRepository {
    private roles: any[] = [];
    async list() { return this.roles; }
    async upsert(role: any) { this.roles.push(role); }
}

class MockStateManager {
    public roles = new MockRoleRepository();
}

async function testListRoles() {
    console.log('Running list-roles.test.ts');

    const state = new MockStateManager() as any;
    (global as any).firmOsStateManager = state;

    await state.roles.upsert({
        roleName: 'hr/director',
        description: 'Chief Organizational Architect',
        modelTier: 'MAX'
    });

    await state.roles.upsert({
        roleName: 'devops/manager',
        description: 'Infrastructure Manager',
        modelTier: 'HIGH'
    });

    try {
        const tool = new ListRolesTool();
        const result = await tool.execute({});
        
        console.log(`Tool Result:\n${result}`);

        assert.ok(result.includes('hr/director'), 'Should list hr/director');
        assert.ok(result.includes('devops/manager'), 'Should list devops/manager');
        assert.ok(result.includes('MAX'), 'Should include tier MAX');
        assert.ok(result.includes('Infrastructure Manager'), 'Should include description');

        console.log('✓ ListRoles tool test passed');

    } catch (err: any) {
        console.error('✗ ListRoles test failed:', err.message);
        process.exit(1);
    } finally {
        delete (global as any).firmOsStateManager;
    }
}

testListRoles().catch(err => {
    console.error(err);
    process.exit(1);
});
