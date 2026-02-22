import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetRoles() {
    const rolesDir = path.join(__dirname, '..', 'company', 'roles');
    const keepFile = 'hr-director.md';

    try {
        const files = await fs.readdir(rolesDir);
        
        for (const file of files) {
            if (file !== keepFile) {
                const filePath = path.join(rolesDir, file);
                await fs.unlink(filePath);
                console.log(`🗑️  Deleted: ${file}`);
            }
        }
        console.log('✅ Roles directory reset to hr-director only.');
    } catch (error: any) {
        console.error('❌ Failed to reset roles:', error.message);
        process.exit(1);
    }
}

resetRoles();
