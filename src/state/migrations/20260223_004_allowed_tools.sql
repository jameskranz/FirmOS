-- Migration: 005 Allowed Tools
ALTER TABLE roles ADD COLUMN IF NOT EXISTS allowed_tools JSONB;
