import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetRoles() {
    const rolesDir = path.join(__dirname, '..', 'company', 'roles');
    const modelsFile = path.join(__dirname, '..', 'company', 'role-models.json');
    const registryFile = path.join(__dirname, '..', 'company', 'role-registry.json');
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

        // Reset role-registry.json to baseline
        const baselineRegistry = {
            "hr/director": {
                "description": "Chief Prompt Engineer and agent architect. Responsible for designing and 'hiring' new agents.",
                "slaPath": "company/roles/hr/director.md",
                "modelTier": "MAX"
            },
            "hr/recruiter": {
                "description": "Identifies team gaps and defines role requirements based on project needs. Tasks the HR Director to initiate hiring.",
                "slaPath": "company/roles/hr/recruiter.md",
                "modelTier": "MEDIUM"
            },
            "intake/consultant": {
                "description": "Primary intake for external requests and triage. Analyzes client requests and routes work to appropriate agents or initiates recruitment.",
                "slaPath": "company/roles/intake/consultant.md",
                "modelTier": "MEDIUM"
            }
        };
        await fs.writeFile(registryFile, JSON.stringify(baselineRegistry, null, 2));
        console.log('✅ Role-registry reset to baseline.');

        console.log(`✅ Roles directory reset to core hierarchical roles.`);
    } catch (error: any) {
        console.error('❌ Failed to reset roles:', error.message);
        process.exit(1);
    }
}

resetRoles();
