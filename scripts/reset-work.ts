import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetWork() {
    const workDir = path.join(__dirname, '..', 'company', 'work');
    const stateFile = path.join(__dirname, '..', 'company', 'state', 'workflows.json');

    try {
        // 1. Clear feature workbooks
        if (await fs.stat(workDir).catch(() => null)) {
            const files = await fs.readdir(workDir);
            for (const file of files) {
                const filePath = path.join(workDir, file);
                if ((await fs.stat(filePath)).isDirectory()) {
                    await fs.rm(filePath, { recursive: true });
                } else {
                    await fs.unlink(filePath);
                }
                console.log(`🗑️  Deleted workbook: ${file}`);
            }
            console.log('✅ Work directory reset.');
        }

        // 2. Clear workflow state
        if (await fs.stat(stateFile).catch(() => null)) {
            await fs.writeFile(stateFile, '{}');
            console.log('🗑️  Cleared: workflows.json');
        }
        
    } catch (error: any) {
        console.error('❌ Failed to reset work:', error.message);
        process.exit(1);
    }
}

resetWork();
