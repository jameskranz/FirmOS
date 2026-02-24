# Implementation Plan: CEO Memory & DB Scoping

## Phase 1: Database Migration
- [x] Task: Create `src/state/migrations/002_project_scoping.sql`.
    - [x] Add `project_id` column to `workflows`, `tickets`, `roles`.
    - [x] Create `ceo_interactions` table.
- [x] Task: Update `PostgresStateManager` to handle project scoping.
    - [x] Add `projectId` to constructor or method arguments.
    - [x] Update all queries to filter/insert with `project_id`.
- [x] Task: Update `BaseStateManager` and `JsonStateManager` interfaces for consistency.
- [x] Task: Add `manager_role` column and implement hierarchy (Migration 003).

## Phase 2: CEO Memory Implementation
- [x] Task: Update `daemon.ts` to log CEO interactions to DB.
    - [x] Inject `stateManager.logCeoInteraction` into the `ceo_response` event listener.
- [x] Task: Implement `DirectiveUpdater` utility.
    - [x] Use LLM to summarize/resolve conflicts in CEO feedback.
    - [x] Update `company/work/directives/ceo.md`.
- [x] Task: Update `hr/director` and senior roles to read `company/work/directives/ceo.md` during discovery.
- [x] Task: Implement Hierarchical Context Injection in `daemon.ts`.

## Phase 3: Validation & Cleanup
- [x] Task: Verify Project Scoping with Story Test.
- [x] Task: Verify CEO Memory update flow.
- [x] Task: Give agents `update_directives` tool for subordinates.
