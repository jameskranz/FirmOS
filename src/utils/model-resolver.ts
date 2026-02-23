import fs from 'node:fs/promises';

export class ModelResolver {
    private filePath: string;
    private defaultModel = 'gemini-2.5-flash';

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    async resolve(role: string, overrideModel?: string): Promise<string> {
        // 1. Ticket Override
        if (overrideModel) {
            return overrideModel;
        }

        // 2. Registry Mapping
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            const mappings = JSON.parse(content);

            // Hierarchical Lookup:
            // a. Specific mapping (e.g., 'architect/design')
            if (mappings[role]) {
                return mappings[role];
            }

            // b. Family mapping (e.g., 'architect' for 'architect/review')
            if (role.includes('/')) {
                const family = role.split('/')[0];
                if (mappings[family]) {
                    return mappings[family];
                }
            }

            // c. Global default
            if (mappings['default']) {
                return mappings['default'];
            }
        } catch (error: any) {
            // If file missing or invalid, fall through to default
        }

        // 3. Default Fallback
        return this.defaultModel;
    }
}
