import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetWork() {
    const workDir = path.join(__dirname, '..', 'company', 'work');

    try {
        if (!(await fs.stat(workDir).catch(() => null))) {
            console.log('✅ Work directory does not exist, nothing to reset.');
            return;
        }

        const files = await fs.readdir(workDir);
        
        for (const file of files) {
            const filePath = path.join(workDir, file);
            if ((await fs.stat(filePath)).isDirectory()) {
                await fs.rm(filePath, { recursive: true });
            } else {
                await fs.unlink(filePath);
            }
            console.log(`🗑️  Deleted: ${file}`);
        }
        console.log('✅ Work directory reset.');
    } catch (error: any) {
        console.error('❌ Failed to reset work:', error.message);
        process.exit(1);
    }
}

resetWork();
