import assert from 'node:assert';
import { ModelResolver } from '../../src/utils/model-resolver.js';
import { BaseStateManager, type IRoleRepository, type IWorkflowRepository, type ITicketRepository, type IDirectiveRepository, type IReviewRepository, type IProjectConfigRepository, type ICeoMemoryRepository } from '../../src/state/base.js';

class MockRoleRepository implements IRoleRepository {
    public roles: Record<string, any> = {};
    public tiers: Record<string, string> = {};

    async upsert(role: any) { this.roles[role.roleName] = role; }
    async get(roleName: string) { return this.roles[roleName] || null; }
    async list() { return Object.values(this.roles) as any; }
    async upsertTier(tier: string, model: string) { this.tiers[tier] = model; }
    async getTier(tier: string) { return this.tiers[tier] || null; }
    async listTiers() { return this.tiers; }
}

class MockStateManager extends BaseStateManager {
    public roles: IRoleRepository;
    public workflows = {} as IWorkflowRepository;
    public tickets = {} as ITicketRepository;
    public directives = {} as IDirectiveRepository;
    public reviews = {} as IReviewRepository;
    public config = {} as IProjectConfigRepository;
    public ceoMemory = {} as ICeoMemoryRepository;

    constructor() {
        super('test');
        this.roles = new MockRoleRepository();
    }

    async purgeProjectData() {}
}

async function testModelResolver() {
    console.log('Running model-resolver.test.ts');

    // ISOLATE ENVIRONMENT
    const originalOverride = process.env.FIRM_OS_MODEL_OVERRIDE;
    delete process.env.FIRM_OS_MODEL_OVERRIDE;

    try {
        const state = new MockStateManager();
        const resolver = new ModelResolver(state);

        // 1. Setup Mock Data
        await state.roles.upsertTier('HIGH', 'gemini-pro-2.0');
        await state.roles.upsert({
            roleName: 'architect/design',
            modelTier: 'HIGH'
        } as any);

        // 2. Test Ticket Override
        const model1 = await resolver.resolve('architect/design', 'gemini-flash-exp');
        assert.strictEqual(model1, 'gemini-flash-exp');
        console.log('✓ Ticket override passed');

        // 3. Test Database Resolution
        const model2 = await resolver.resolve('architect/design');
        assert.strictEqual(model2, 'gemini-pro-2.0');
        console.log('✓ Database resolution passed');

        // 4. Test Family Fallback
        await state.roles.upsert({
            roleName: 'architect',
            modelTier: 'MAX'
        } as any);
        await state.roles.upsertTier('MAX', 'gemini-ultra');
        
        const model3 = await resolver.resolve('architect/review');
        assert.strictEqual(model3, 'gemini-ultra');
        console.log('✓ Family fallback passed');

        // 5. Test Default Fallback
        const model4 = await resolver.resolve('unknown-role');
        assert.strictEqual(model4, 'gemini-2.5-flash');
        console.log('✓ Default fallback passed');

        // 6. Test Environment Override (Specific to this test)
        process.env.FIRM_OS_MODEL_OVERRIDE = 'env-forced-model';
        const model5 = await resolver.resolve('architect/design');
        assert.strictEqual(model5, 'env-forced-model');
        console.log('✓ Environment override passed');

    } finally {
        // RESTORE ENVIRONMENT
        if (originalOverride) {
            process.env.FIRM_OS_MODEL_OVERRIDE = originalOverride;
        } else {
            delete process.env.FIRM_OS_MODEL_OVERRIDE;
        }
    }
}

testModelResolver().catch(err => {
    console.error('✗ ModelResolver test failed:', err.message);
    process.exit(1);
});
