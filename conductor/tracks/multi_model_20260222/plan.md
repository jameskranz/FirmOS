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
- [x] Task: Perform end-to-end validation with a multi-model chain. b25f490
- [x] Task: Conductor - User Manual Verification 'Integration & Documentation' (Protocol in workflow.md) b25f490

## Phase 4: Hierarchical Mapping & Dynamic Hiring
- [x] Task: Refactor `ModelResolver` to support hierarchical lookups (`role/task` > `role` > `default`). 22e0c21
- [x] Task: Update `src/daemon.ts` to support loading SLAs from `company/roles/<role_family>/<task>.md`. 25555bd
- [x] Task: Update `HireAgentTool` to accept an optional `model` and update `company/models.json`. 19df5d6
- [x] Task: Update existing roles to use the new `company/roles/<family>/<task>.md` structure where applicable.
- [x] Task: Verify that HR Director correctly hires hierarchical roles via `scripts/tickets/hiring-hierarchical.json`. [checkpoint: 38c7f92]
- [x] Task: Update `tech-stack.md` to document the new hierarchical model mapping and tier-based resolution. [checkpoint: 34d1b72]

## Phase 5: Loop Resilience & Monitoring
- [x] Task: Implement `system/loop-monitor` logic to detect repetitive tool calls or lack of progress. 38c7f92
- [x] Task: Refactor `src/daemon.ts` to use a `LOW` tier model for loop monitoring and dynamic limit extension. 38c7f92
- [x] Task: Conductor - User Manual Verification 'Loop Resilience' (Protocol in workflow.md) [checkpoint: d1e3f8b]

## Finalize Track
- [x] Task: Conductor - User Manual Verification 'Hierarchical & Dynamic Models' (Protocol in workflow.md) [checkpoint: d1e3f8b]

