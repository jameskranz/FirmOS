import fs from 'node:fs/promises';
import path from 'node:path';
import { IRoleRepository, Role } from '../base.js';

export class JsonRoleRepository implements IRoleRepository {
    private cache: { roles: Record<string, Role>, tiers: Record<string, string> } | null = null;

    constructor(private filePath: string) {}

    private async read(): Promise<{ roles: Record<string, Role>, tiers: Record<string, string> }> {
        if (this.cache) return this.cache;
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            this.cache = JSON.parse(content);
            return this.cache!;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                this.cache = { roles: {}, tiers: {} };
                return this.cache!;
            }
            throw error;
        }
    }

    private async write(data: { roles: Record<string, Role>, tiers: Record<string, string> }): Promise<void> {
        this.cache = data;
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }

    async upsert(role: Omit<Role, 'updatedAt'>): Promise<void> {
        const data = await this.read();
        data.roles[role.roleName] = {
            ...role,
            updatedAt: new Date().toISOString()
        };
        await this.write(data);
    }

    async get(roleName: string): Promise<Role | null> {
        const data = await this.read();
        const role = data.roles[roleName] || null;
        return role;
    }

    async list(): Promise<Role[]> {
        const data = await this.read();
        return Object.values(data.roles);
    }

    async upsertTier(tierName: string, modelName: string): Promise<void> {
        const data = await this.read();
        data.tiers[tierName] = modelName;
        await this.write(data);
    }

    async getTier(tierName: string): Promise<string | null> {
        const data = await this.read();
        return data.tiers[tierName] || null;
    }

    async listTiers(): Promise<Record<string, string>> {
        const data = await this.read();
        return data.tiers;
    }
}
