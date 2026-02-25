# Implementation Plan: PRD Seeding & Bootstrap

## Phase 1: Seeding Logic
- [x] Task: Update `src/daemon.ts` to detect seed PRDs.
    - [x] Check `PRD_SEED_PATH` and `initial-prd.md`.
    - [x] Load and validate content.
- [x] Task: Implement `BOOTSTRAP_SEED` event listener.
    - [x] Create `company/work/seed-prd.md`.
    - [x] Log discovery.

## Phase 2: Auto-Dispatch
- [x] Task: Update `initializeProjectContext` to call bootstrap.
- [x] Task: Automatically dispatch the initial task to `intake/consultant` using the seed content.
- [x] Task: Implement TUI hotkey 'b' for manual bootstrap.

## Phase 3: Validation
- [x] Task: Verified with manual test in fresh directory.
- [x] Task: Verified TUI hotkey triggers dispatch.
