import { PostgresStateManager } from '../src/state/postgres.js';
import { getProjectRoot, validateProjectRoot } from '../src/utils/path-resolver.js';
import dotenv from 'dotenv';

dotenv.config();

async function purge() {
    const projectId = process.argv[2];
    if (!projectId) {
        console.error("Usage: npx tsx scripts/purge-project.ts <PROJECT_ID>");
        process.exit(1);
    }

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL not set.");
        process.exit(1);
    }

    console.log(`🧹 Purging data for project: ${projectId}...`);
    const state = new PostgresStateManager(projectId, process.env.DATABASE_URL);
    
    try {
        await state.purgeProjectData();
        console.log(`✅ Project '${projectId}' cleaned up successfully.`);
    } catch (err: any) {
        console.error(`❌ Cleanup failed: ${err.message}`);
    } finally {
        await state.disconnect();
    }
}

purge();
