-- Migration: 002 Project Scoping and CEO Memory
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Workflows: Add project_id and update Primary Key
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS project_id TEXT DEFAULT 'default';
-- Dropping PK requires identifying the constraint name. In 001 it was implicit 'workflows_pkey'.
ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_pkey;
ALTER TABLE workflows ADD PRIMARY KEY (project_id, feature_id);

-- 2. Tickets: Add project_id
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS project_id TEXT DEFAULT 'default';

-- 3. Roles: Add project_id and update Primary Key
ALTER TABLE roles ADD COLUMN IF NOT EXISTS project_id TEXT DEFAULT 'default';
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE roles ADD PRIMARY KEY (project_id, role_name);

-- 4. CEO Interactions Table
CREATE TABLE IF NOT EXISTS ceo_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    original_prompt TEXT NOT NULL,
    ceo_response TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
