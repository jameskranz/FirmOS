-- Migration: 007 System Audit Logs
-- Tracks high-level system events like seeding, configuration changes, and organizational shifts.

CREATE TABLE IF NOT EXISTS system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'SEEDING', 'MIGRATION', 'CONFIG_CHANGE'
    event_name TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
