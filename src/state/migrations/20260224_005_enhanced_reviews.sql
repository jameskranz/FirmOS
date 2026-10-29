-- Migration: 005 Enhanced Reviews and Model Config
-- This migration adds support for tracking artifact versions, structured reviews, and tier-to-model mapping.

-- 1. Tier-to-Model Mapping
CREATE TABLE IF NOT EXISTS model_tiers (
    project_id TEXT NOT NULL,
    tier_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    PRIMARY KEY (project_id, tier_name)
);

-- 2. Role-to-Model/Tier Mapping (Extending roles table if not already sufficient)
-- Current roles table has model_tier, which is good.

-- 3. Artifact Reviews and Versioning
CREATE TABLE IF NOT EXISTS artifact_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    feature_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL, -- 'workbook', 'prd', 'design', 'test-plan'
    version_number INTEGER NOT NULL,
    content_snapshot TEXT NOT NULL,
    reviewer_role TEXT NOT NULL,
    status TEXT NOT NULL, -- 'approved', 'revisions_needed'
    note TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id, feature_id) REFERENCES workflows(project_id, feature_id)
);

-- 4. Global Project Configuration
CREATE TABLE IF NOT EXISTS project_config (
    project_id TEXT NOT NULL,
    config_key TEXT NOT NULL,
    config_value TEXT NOT NULL,
    PRIMARY KEY (project_id, config_key)
);
