-- Migration: 004 Directives Table
-- Note: Sequence updated to avoid conflict with existing 003

CREATE TABLE IF NOT EXISTS directives (
    project_id TEXT NOT NULL,
    role_name TEXT NOT NULL, -- The 'boss' who issued the mandates
    content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, role_name)
);

-- Seed initial directives from ceo if needed
-- This will be handled by the application logic during init
