import type { Pool } from 'pg';
import { IReviewRepository, ArtifactReview } from '../base.js';

export class PostgresReviewRepository implements IReviewRepository {
    constructor(private pool: Pool, private projectId: string) {}

    async record(featureId: string, artifactType: string, contentSnapshot: string, reviewerRole: string, status: string, note?: string): Promise<void> {
        const res = await this.pool.query('SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM artifact_reviews WHERE project_id = $1 AND feature_id = $2 AND artifact_type = $3', [this.projectId, featureId, artifactType]);
        const nextVersion = res.rows[0].next_version;

        await this.pool.query(
            'INSERT INTO artifact_reviews (project_id, feature_id, artifact_type, version_number, content_snapshot, reviewer_role, status, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [this.projectId, featureId, artifactType, nextVersion, contentSnapshot, reviewerRole, status, note]
        );
    }

    async list(featureId: string): Promise<ArtifactReview[]> {
        const res = await this.pool.query('SELECT * FROM artifact_reviews WHERE project_id = $1 AND feature_id = $2 ORDER BY version_number ASC', [this.projectId, featureId]);
        return res.rows.map((row: any) => ({
            id: row.id,
            projectId: row.project_id,
            featureId: row.feature_id,
            artifactType: row.artifact_type,
            versionNumber: row.version_number,
            contentSnapshot: row.content_snapshot,
            reviewerRole: row.reviewer_role,
            status: row.status,
            note: row.note,
            timestamp: row.timestamp.toISOString()
        }));
    }

    async getLatestApproved(featureId: string, artifactType: string): Promise<string | null> {
        const res = await this.pool.query('SELECT content_snapshot FROM artifact_reviews WHERE project_id = $1 AND feature_id = $2 AND artifact_type = $3 AND status = $4 ORDER BY version_number DESC LIMIT 1', [this.projectId, featureId, artifactType, 'approved']);
        if (res.rowCount === 0) return null;
        return res.rows[0].content_snapshot;
    }
}
