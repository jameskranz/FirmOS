import fs from 'node:fs/promises';
import path from 'node:path';
import { IReviewRepository, ArtifactReview } from '../base.js';
import { randomUUID } from 'node:crypto';

export class JsonReviewRepository implements IReviewRepository {
    constructor(private filePath: string) {}

    private async read(): Promise<ArtifactReview[]> {
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(content);
        } catch (error: any) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }

    private async write(data: ArtifactReview[]): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }

    async record(featureId: string, artifactType: string, contentSnapshot: string, reviewerRole: string, status: 'approved' | 'revisions_needed', note?: string): Promise<void> {
        const reviews = await this.read();
        const versions = reviews.filter(r => r.featureId === featureId && r.artifactType === artifactType);
        const nextVersion = versions.length + 1;

        reviews.push({
            id: randomUUID(),
            projectId: 'default',
            featureId,
            artifactType,
            versionNumber: nextVersion,
            contentSnapshot,
            reviewerRole,
            status,
            note,
            timestamp: new Date().toISOString()
        });
        await this.write(reviews);
    }

    async list(featureId: string): Promise<ArtifactReview[]> {
        const reviews = await this.read();
        return reviews.filter(r => r.featureId === featureId);
    }

    async getLatestApproved(featureId: string, artifactType: string): Promise<string | null> {
        const reviews = await this.read();
        const approved = reviews
            .filter(r => r.featureId === featureId && r.artifactType === artifactType && r.status === 'approved')
            .sort((a, b) => b.versionNumber - a.versionNumber);
        
        return approved.length > 0 ? approved[0].contentSnapshot : null;
    }
}
