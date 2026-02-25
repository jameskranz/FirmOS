-- FirmOS Centralized State Schema (PostgreSQL)

-- 1. Workflows
CREATE TABLE IF NOT EXISTS workflows (
    feature_id TEXT PRIMARY KEY,
    feature_name TEXT NOT NULL,
    current_agent TEXT NOT NULL,
    status TEXT NOT NULL,
    workbook_path TEXT NOT NULL,
    repository_url TEXT, -- Centralized repo for this feature
    approvals JSONB DEFAULT '{}',
    history JSONB DEFAULT '[]',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY,
    parent_id UUID REFERENCES tickets(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    repository_url TEXT, -- Task-specific repo (defaults to feature repo)
    status TEXT NOT NULL,
    assigned_role TEXT,
    output_artifact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Roles
CREATE TABLE IF NOT EXISTS roles (
    role_name TEXT PRIMARY KEY,
    description TEXT,
    sla_content TEXT NOT NULL,
    model_tier TEXT DEFAULT 'MEDIUM',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
