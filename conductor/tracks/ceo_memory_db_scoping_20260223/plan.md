# Implementation Plan: CEO Memory & DB Scoping

## Phase 1: Database Migration
- [x] Task: Create `src/state/migrations/002_project_scoping.sql`.
- [x] Task: Update `PostgresStateManager` to handle project scoping.
- [x] Task: Update `BaseStateManager` and `JsonStateManager` interfaces for consistency.
- [x] Task: Add `manager_role` column and implement hierarchy (Migration 003).
- [x] Task: Create `directives` table for centralized mandates (Migration 004).

## Phase 2: CEO Memory Implementation
- [x] Task: Update `daemon.ts` to log CEO interactions to DB.
- [x] Task: Implement `DirectiveUpdater` utility with DB persistence.
- [x] Task: Update `hr/director` and senior roles to discover mandates.
- [x] Task: Implement Hierarchical Context Injection in `daemon.ts` using DB lookups.

## Phase 3: Validation & Cleanup
- [x] Task: Verify Project Scoping with Story Test.
- [x] Task: Verify CEO Memory update flow.
- [x] Task: Give agents `update_directives` tool for subordinates.
