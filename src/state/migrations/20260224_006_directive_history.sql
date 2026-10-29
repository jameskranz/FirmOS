-- Migration: 006 Directive History
-- Tracks the evolution of agent instructions without polluting the Git repo.

CREATE TABLE IF NOT EXISTS directive_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    role_name TEXT NOT NULL,
    content TEXT NOT NULL,
    reason TEXT,
    updated_by TEXT NOT NULL, -- The role that issued the update (e.g., 'ceo')
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
