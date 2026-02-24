# Implementation Plan: Horizontal Scaling & Git-Based Multi-Tenancy

## Phase 1: Shared Infrastructure & State (Docker & Postgres)
- [x] Task: Set up `docker-compose.yml` for PostgreSQL and RabbitMQ.
- [x] Task: Implement `PostgresStateManager` in `src/state/postgres.ts` conforming to `BaseStateManager`.
    - [x] Design schema for multi-tenant task tracking (link tickets to repo URLs).
- [x] Task: Implement unit tests for `PostgresStateManager`.
- [x] Task: Conductor - User Manual Verification 'Shared State' (Protocol in workflow.md)

## Phase 2: Git Workspace Management
- [x] Task: Create `src/utils/git-client.ts` with wrappers for `clone`, `checkout`, `commit`, and `push`.
- [x] Task: Implement "Target Workspace" logic in filesystem tools.
    - [x] Ensure tools like `save_file` can be redirected to a specified target directory.
- [x] Task: Implement unit tests for Git and Workspace utilities.
- [x] Task: Conductor - User Manual Verification 'Git Workspace' (Protocol in workflow.md)

## Phase 3: Dynamic Runner Containerization
- [x] Task: Create a `Dockerfile` for the FirmOS Runner engine.
- [x] Task: Update the `Runner` process to accept `repositoryUrl` in task payloads.
    - [x] Automate: Receive Task -> Clone Target Repo -> Switch to Branch -> Execute Agent Loop.
- [x] Task: Implement container entrypoint logic for environment setup.
- [x] Task: Conductor - User Manual Verification 'Dynamic Runner' (Protocol in workflow.md)

## Phase 4: Scaling & Multi-Tenant Validation
- [x] Task: Start multiple runners and dispatch tasks for **two different** target repositories.
- [x] Task: Verify that both runners execute concurrently and push changes back to their respective origins.
- [x] Task: Verify central PostgreSQL state consistency.
- [x] Task: Conductor - User Manual Verification 'Horizontal Scaling' (Protocol in workflow.md)
