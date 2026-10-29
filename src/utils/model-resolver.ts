import type { BaseStateManager } from '../state/base.js';

export class ModelResolver {
    private defaultModel = 'gemini-2.5-flash';
    private stateManager?: BaseStateManager;

    constructor(stateManager?: BaseStateManager) {
        this.stateManager = stateManager;
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

        // 3. Database Resolution (Primary)
        if (this.stateManager) {
            try {
                const roleData = await this.stateManager.roles.get(role);
                // Try family if specific role not found
                let tier = roleData?.modelTier;
                if (!tier && role.includes('/')) {
                    const family = role.split('/')[0];
                    const familyRole = await this.stateManager.roles.get(family);
                    tier = familyRole?.modelTier;
                }

                if (tier) {
                    const model = await this.stateManager.roles.getTier(tier);
                    if (model) return model;
                    return tier; // If tier is actually a model name
                }
            } catch (err: any) {
                console.error(`DB Model Resolution failed for ${role}:`, err.message);
            }
        }

        // 4. Default Fallback
        return this.defaultModel;
    }
}
