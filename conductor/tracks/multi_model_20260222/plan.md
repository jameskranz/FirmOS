# Implementation Plan: Multi-Model Orchestration

## Phase 1: Model Registry & Resolution
- [ ] Task: Create `company/models.json` to store role-to-model mappings.
- [ ] Task: Implement a model resolution utility in `src/utils/model-resolver.ts`.
    - [ ] Write tests for resolution hierarchy (Ticket Override > Registry > Default).
    - [ ] Implement the resolver class to pass tests.
- [ ] Task: Conductor - User Manual Verification 'Model Registry' (Protocol in workflow.md)

## Phase 2: Daemon Refactoring & Fallback
- [ ] Task: Update `src/daemon.ts` to use the dynamic model resolver.
- [ ] Task: Implement fallback logic in the daemon's micro-loop.
    - [ ] Write integration test that simulates a model failure (e.g. using a fake model name) and verifies fallback to Flash.
    - [ ] Implement the try-catch fallback logic in `startDaemon`.
- [ ] Task: Conductor - User Manual Verification 'Daemon Refactoring' (Protocol in workflow.md)

## Phase 3: Integration & Documentation
- [ ] Task: Update `tech-stack.md` to document the multi-model architecture and supported tiers.
- [ ] Task: Perform end-to-end validation with a multi-model chain (e.g. Architect on Pro, PM on Flash).
- [ ] Task: Conductor - User Manual Verification 'Integration & Documentation' (Protocol in workflow.md)
