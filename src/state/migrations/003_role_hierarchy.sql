-- Migration: 003 Role Hierarchy

-- 1. Add manager_role to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS manager_role TEXT;

-- 2. Set default managers for permanent roles
UPDATE roles SET manager_role = 'ceo' WHERE role_name IN ('hr/director', 'devops/manager', 'intake/consultant');
