import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust root detection:
// 1. If we are in dist/src/utils, root is three levels up
// 2. If we are in src/utils, root is two levels up
const PROJECT_ROOT = __dirname.includes(path.join('dist', 'src'))
    ? path.resolve(__dirname, '..', '..', '..')
    : path.resolve(__dirname, '..', '..');

export class ModelResolver {
    private rolesPath: string;
    private tiersPath: string;
    private defaultModel = 'gemini-2.5-flash';

    constructor(rolesPath?: string, tiersPath?: string) {
        this.rolesPath = rolesPath || path.join(PROJECT_ROOT, 'company', 'role-models.json');
        this.tiersPath = tiersPath || path.join(PROJECT_ROOT, 'company', 'model-tiers.json');
    }

    async resolve(role: string, overrideModel?: string): Promise<string> {
        // 1. Ticket Override
        if (overrideModel) {
            return overrideModel;
        }

        // 2. Global Development Override
        if (process.env.FIRM_OS_MODEL_OVERRIDE) {
            return process.env.FIRM_OS_MODEL_OVERRIDE;
        }

        // 3. Registry Mapping
        try {
            const rolesContent = await fs.readFile(this.rolesPath, 'utf8');
            const roleMappings = JSON.parse(rolesContent);

            let resolvedTierOrModel: string | undefined;

            // Hierarchical Role Lookup:
            // a. Specific mapping (e.g., 'architect/review')
            if (roleMappings[role]) {
                resolvedTierOrModel = roleMappings[role];
            }
            // b. Family mapping (e.g., 'architect' for 'architect/review')
            else if (role.includes('/')) {
                const family = role.split('/')[0];
                if (roleMappings[family]) {
                    resolvedTierOrModel = roleMappings[family];
                }
            }
            // c. Global default
            if (!resolvedTierOrModel && roleMappings['default']) {
                resolvedTierOrModel = roleMappings['default'];
            }

            if (resolvedTierOrModel) {
                // Tier Resolution (e.g., "HIGH" -> "gemini-2.0-pro")
                try {
                    const tiersContent = await fs.readFile(this.tiersPath, 'utf8');
                    const tiers = JSON.parse(tiersContent);
                    if (tiers[resolvedTierOrModel]) {
                        return tiers[resolvedTierOrModel];
                    }
                } catch (e) {
                    // If tiers file missing or invalid, use resolvedValue as is
                }
                return resolvedTierOrModel;
            }
        } catch (error: any) {
            // If roles file missing or invalid, fall through to default
        }

        // 3. Default Fallback
        return this.defaultModel;
    }
}
