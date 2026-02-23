import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetRoles() {
    const rolesDir = path.join(__dirname, '..', 'company', 'roles');
    const modelsFile = path.join(__dirname, '..', 'company', 'role-models.json');
    const keepFile = 'hr-director.md';

    try {
        const entries = await fs.readdir(rolesDir, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.name !== keepFile) {
                const entryPath = path.join(rolesDir, entry.name);
                if (entry.isDirectory()) {
                    await fs.rm(entryPath, { recursive: true, force: true });
                } else {
                    await fs.unlink(entryPath);
                }
                console.log(`🗑️  Deleted: ${entry.name}`);
            }
        }

        // Reset role-models.json to baseline
        const baselineModels = {
            "hr-director": "MAX",
            "default": "MEDIUM"
        };
        await fs.writeFile(modelsFile, JSON.stringify(baselineModels, null, 2));
        console.log('✅ Role-models registry reset to baseline.');

        console.log('✅ Roles directory reset to hr-director only.');
    } catch (error: any) {
        console.error('❌ Failed to reset roles:', error.message);
        process.exit(1);
    }
}

resetRoles();
