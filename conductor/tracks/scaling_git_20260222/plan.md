# Implementation Plan: Horizontal Scaling & Git-Based Multi-Tenancy

## Phase 1: Shared State (PostgreSQL)
- [ ] Task: Set up PostgreSQL database and define schema for `workflows`, `tickets`, and `roles`.
- [ ] Task: Implement `PostgresStateManager` in `src/state/postgres.ts` conforming to `BaseStateManager`.
- [ ] Task: Implement unit tests for `PostgresStateManager` ensuring concurrent safe updates.
- [ ] Task: Update project configuration to support switching between JSON and Postgres state.
- [ ] Task: Conductor - User Manual Verification 'Postgres State' (Protocol in workflow.md)

## Phase 2: Git Task Isolation
- [ ] Task: Create `src/utils/git-client.ts` with wrappers for `branch`, `commit`, `push`, and `merge`.
- [ ] Task: Implement unit tests for Git utilities using a temporary test repo.
- [ ] Task: Update the `Runner` logic to create a branch per task and push changes upon completion.
- [ ] Task: Conductor - User Manual Verification 'Git Isolation' (Protocol in workflow.md)

## Phase 3: Daemon Refactoring (Runner/Coordinator)
- [ ] Task: Separate `src/daemon.ts` into `src/runner.ts` (worker) and `src/coordinator.ts` (orchestrator).
- [ ] Task: Update `Runner` to fetch SLAs from the DB and execute in isolation.
- [ ] Task: Update `Coordinator` to handle RabbitMQ triage and merge monitoring.
- [ ] Task: Conductor - User Manual Verification 'Daemon Refactoring' (Protocol in workflow.md)

## Phase 4: Gatekeeper Role
- [ ] Task: Define the SLA for `system/gatekeeper` role.
- [ ] Task: Implement Gatekeeper logic: monitor `Pending Merge` tickets -> review code -> merge branch.
- [ ] Task: Add conflict resolution workflow (Gatekeeper tasks an Architect on conflict).
- [ ] Task: Conductor - User Manual Verification 'Gatekeeper Role' (Protocol in workflow.md)

## Phase 5: End-to-End Scaling Validation
- [ ] Task: Perform "Parallel Execution" test: Start two runners and dispatch two conflicting tasks.
- [ ] Task: Verify Postgres state consistency and Git branch merging flow.
- [ ] Task: Conductor - User Manual Verification 'Horizontal Scaling' (Protocol in workflow.md)