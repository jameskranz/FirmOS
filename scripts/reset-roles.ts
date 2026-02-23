import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetRoles() {
    const rolesDir = path.join(__dirname, '..', 'company', 'roles');
    const modelsFile = path.join(__dirname, '..', 'company', 'role-models.json');
    const keepPaths = [
        path.join('hr', 'director.md'),
        path.join('hr', 'recruiter.md'),
        path.join('intake', 'consultant.md')
    ];

    async function cleanDir(dir: string, relativePath: string = '') {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const entryRelativePath = path.join(relativePath, entry.name);
            const entryFullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await cleanDir(entryFullPath, entryRelativePath);
                // After cleaning contents, remove the directory if it's empty and not a core family
                const remaining = await fs.readdir(entryFullPath);
                if (remaining.length === 0) {
                    await fs.rmdir(entryFullPath);
                    console.log(`🗑️  Deleted empty directory: ${entryRelativePath}`);
                }
            } else {
                if (!keepPaths.includes(entryRelativePath)) {
                    await fs.unlink(entryFullPath);
                    console.log(`🗑️  Deleted: ${entryRelativePath}`);
                }
            }
        }
    }

    try {
        await cleanDir(rolesDir);

        // Reset role-models.json to baseline
        const baselineModels = {
            "hr/director": "MAX",
            "hr/recruiter": "MEDIUM",
            "intake/consultant": "MEDIUM",
            "default": "MEDIUM"
        };
        await fs.writeFile(modelsFile, JSON.stringify(baselineModels, null, 2));
        console.log('✅ Role-models registry reset to baseline.');

        console.log(`✅ Roles directory reset to core hierarchical roles.`);
    } catch (error: any) {
        console.error('❌ Failed to reset roles:', error.message);
        process.exit(1);
    }
}

resetRoles();
