import assert from 'node:assert';
import { PostgresStateManager } from '../../src/state/postgres.js';
import dotenv from 'dotenv';
dotenv.config();

async function testPostgresState() {
    console.log('Running postgres.test.ts');

    const projectId = 'test-project-' + Math.random().toString(36).substring(7);
    const manager = new PostgresStateManager(projectId);
    
    try {
        await manager.initializeSchema();

        const featureId = 'test-pg-feature-' + Date.now();
        
        // 1. Initialize Workflow
        await manager.workflows.initialize({
            featureId,
            featureName: 'PG Test Feature',
            currentAgent: 'tester',
            status: 'drafting',
            workbookPath: 'test.md',
            approvals: {}
        });
        console.log('✓ Initialize Workflow passed');

        // 2. Update Workflow
        await manager.workflows.update(featureId, {
            status: 'reviewing',
            currentAgent: 'architect'
        }, {
            timestamp: new Date().toISOString(),
            fromAgent: 'tester',
            toAgent: 'architect',
            action: 'submit',
            note: 'Initial draft'
        });
        
        const workflow = await manager.workflows.get(featureId);
        assert.ok(workflow);
        assert.strictEqual(workflow.status, 'reviewing');
        assert.strictEqual(workflow.history.length, 1);
        console.log('✓ Update Workflow passed');

        // 3. Tickets
        const ticketId = await manager.tickets.create({
            title: 'PG Ticket',
            description: 'Database test',
            requirements: 'SQL',
            repositoryUrl: 'https://github.com/test/repo',
            parentId: null
        });
        assert.ok(ticketId);

        const ticket = await manager.tickets.get(ticketId);
        assert.ok(ticket);
        assert.strictEqual(ticket.repositoryUrl, 'https://github.com/test/repo');
        console.log('✓ Create & Get Ticket passed');

        // 4. Roles & Tiers
        await manager.roles.upsert({
            roleName: 'architect/design',
            description: 'Test Architect',
            slaContent: '# Architect SLA',
            modelTier: 'HIGH'
        });
        
        const role = await manager.roles.get('architect/design');
        assert.ok(role);
        assert.strictEqual(role.description, 'Test Architect');
        console.log('✓ Upsert & Get Role passed');

        await manager.roles.upsertTier('HIGH', 'gemini-pro');
        const tierModel = await manager.roles.getTier('HIGH');
        assert.strictEqual(tierModel, 'gemini-pro');
        console.log('✓ Upsert & Get Tier passed');

        // 5. Directives & History
        await manager.directives.upsert('architect/design', 'Always follow security standards', 'ceo', 'Security priority');
        const directive = await manager.directives.get('architect/design');
        assert.strictEqual(directive, 'Always follow security standards');
        
        const history = await manager.directives.listHistory('architect/design');
        assert.ok(history.length >= 1);
        assert.strictEqual(history[0].reason, 'Security priority');
        console.log('✓ Directives & History passed');

        // 6. Artifact Reviews
        await manager.reviews.record(featureId, 'prd', '# Content V1', 'architect', 'approved', 'Good job');
        const reviews = await manager.reviews.list(featureId);
        assert.ok(reviews.length >= 1);
        assert.strictEqual(reviews[0].artifactType, 'prd');
        assert.strictEqual(reviews[0].contentSnapshot, '# Content V1');
        
        const latestApproved = await manager.reviews.getLatestApproved(featureId, 'prd');
        assert.strictEqual(latestApproved, '# Content V1');
        console.log('✓ Artifact Reviews passed');

        // 7. Cleanup
        await manager.purgeProjectData();
        const purgedRole = await manager.roles.get('architect/design');
        assert.strictEqual(purgedRole, null);
        console.log('✓ Purge Data passed');

    } catch (err) {
        console.error('✗ Postgres state test failed:', err);
        process.exit(1);
    } finally {
        await manager.disconnect();
    }
}

testPostgresState().catch(err => {
    console.error(err);
    process.exit(1);
});
