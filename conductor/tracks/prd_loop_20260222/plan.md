# Implementation Plan: PRD Iteration and Hiring Loop

## Phase 1: Infrastructure and Knowledge Base [checkpoint: c23ea98]
- [x] Task: Create `conductor/knowledge_base/` directory and `good_ticket.md`. 2405f44
    - [x] Initialize `good_ticket.md` with the current 'Macro-Loop' JSON schema examples.
- [x] Task: Implement/Refine 'hiring' tool logic in `src/daemon.ts`. 8c465af
    - [x] Write failing test for the `save_file` tool variant specifically for hiring (e.g., path restriction).
    - [x] Update `src/daemon.ts` to support explicit 'hiring' signals or role creation logic if needed.
- [x] Task: Create `scripts/reset-roles.ts` utility.
- [x] Task: Conductor - User Manual Verification 'Infrastructure and Knowledge Base' (Protocol in workflow.md) c23ea98

## Phase 2: Agent Role Refinement
- [x] Task: Update `company/roles/hr-director.md` to explicitly handle 'hiring' requests using the tool. 67a8299
    - [x] Verify agent behavior with a mock hiring ticket.
- [ ] Task: Update/Verify roles (PM, Architect) via Phase 3 loop validation.
- [x] Task: Conductor - User Manual Verification 'Agent Role Refinement' (Protocol in workflow.md) d3388c3

## Phase 3: Loop Validation (Manual Simulation)
- [~] Task: Execute a 'hiring' loop to update 'product-manager' capabilities.
    - [ ] Manually draft hiring JSON ticket for PM.
    - [ ] Publish via `npm run publish` and verify role update.
- [ ] Task: Execute a 'hiring' loop to update 'senior-systems-architect' capabilities.
    - [ ] Manually draft hiring JSON ticket for Architect.
    - [ ] Publish and verify role update.
- [ ] Task: Execute a 'PRD Drafting' loop.
    - [ ] Manually draft PRD update JSON ticket.
    - [ ] Publish and verify `prd.md` updates.
- [ ] Task: Execute a 'Technical Review' loop.
    - [ ] Manually draft review JSON ticket.
    - [ ] Publish and verify review feedback.
- [ ] Task: Conductor - User Manual Verification 'Loop Validation' (Protocol in workflow.md)
