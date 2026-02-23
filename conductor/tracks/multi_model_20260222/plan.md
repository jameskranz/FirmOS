# Implementation Plan: Multi-Model Orchestration

## Phase 1: Model Registry & Resolution [checkpoint: 98dae17]
- [x] Task: Create `company/models.json` to store role-to-model mappings. d072416
- [x] Task: Implement a model resolution utility in `src/utils/model-resolver.ts`. d76eb20
    - [x] Write tests for resolution hierarchy (Ticket Override > Registry > Default).
    - [x] Implement the resolver class to pass tests.
- [x] Task: Conductor - User Manual Verification 'Model Registry' (Protocol in workflow.md) 98dae17

## Phase 2: Daemon Refactoring & Fallback [checkpoint: b25f490]
- [x] Task: Update `src/daemon.ts` to use the dynamic model resolver. b25f490
- [x] Task: Implement fallback logic in the daemon's micro-loop. b25f490
    - [x] Write integration test that simulates a model failure (e.g. using a fake model name) and verifies fallback to Flash.
    - [x] Implement the try-catch fallback logic in `startDaemon`.
- [x] Task: Conductor - User Manual Verification 'Daemon Refactoring' (Protocol in workflow.md) b25f490

## Phase 3: Integration & Documentation
- [x] Task: Update `tech-stack.md` to document the multi-model architecture and supported tiers. d61a326
- [ ] Task: Perform end-to-end validation with a multi-model chain (e.g. Architect on Pro, PM on Flash).
- [ ] Task: Conductor - User Manual Verification 'Integration & Documentation' (Protocol in workflow.md)
