# Implementation Plan: Database Migration Tracking

## Phase 1: Migration Preparation
- [ ] Task: Rename existing migrations to new format.
    - [ ] `001_initial_schema.sql` -> `20260222_001_initial_schema.sql`
    - [ ] `002_project_scoping.sql` -> `20260223_001_project_scoping.sql`
    - [ ] `003_role_hierarchy.sql` -> `20260223_002_role_hierarchy.sql`

## Phase 2: Migration Manager Implementation
- [ ] Task: Create `src/state/migration-manager.ts`.
    - [ ] Implement `initialize()` (creates `migrations` table).
    - [ ] Implement `applyPending()` (scans, filters, applies).
- [ ] Task: Refactor `PostgresStateManager.initializeSchema()` to call `MigrationManager`.

## Phase 3: Validation
- [ ] Task: Verify with `firmos reset`.
    - [ ] Ensure `migrations` table is populated.
    - [ ] Ensure re-running `reset` doesn't fail (idempotency).
