# Implementation Plan: PRD Iteration and Hiring Loop

## Phase 1: Infrastructure and Knowledge Base [checkpoint: c23ea98]
- [x] Task: Create `conductor/knowledge_base/` directory and `good_ticket.md`. 2405f44
    - [x] Initialize `good_ticket.md` with the current 'Macro-Loop' JSON schema examples.
- [x] Task: Implement/Refine 'hiring' tool logic in `src/daemon.ts`. 8c465af
    - [x] Write failing test for the `save_file` tool variant specifically for hiring (e.g., path restriction).
    - [x] Update `src/daemon.ts` to support explicit 'hiring' signals or role creation logic if needed.
- [x] Task: Implement dynamic tool capability injection in `src/daemon.ts`. 7f3ac37
    - [x] Create helper to generate Markdown documentation from `firmOsTools`.
    - [x] Update daemon to prepend this documentation to all system instructions.
- [x] Task: Implement `replace_in_file` tool in `src/daemon.ts`. 7f3ac37
- [x] Task: Create `scripts/reset-roles.ts` utility.
- [x] Task: Create `scripts/purge-queue.ts` utility.
- [x] Task: Conductor - User Manual Verification 'Infrastructure and Knowledge Base' (Protocol in workflow.md) c23ea98

## Phase 2: Agent Role Refinement
- [x] Task: Update `company/roles/hr-director.md` to explicitly handle 'hiring' requests using the tool. 67a8299
    - [x] Verify agent behavior with a mock hiring ticket.
- [ ] Task: Update/Verify roles (PM, Architect) via Phase 3 loop validation.
- [x] Task: Conductor - User Manual Verification 'Agent Role Refinement' (Protocol in workflow.md) d3388c3

## Phase 3: Loop Validation (Manual Simulation)
- [x] Task: Execute a 'hiring' loop to update 'product-manager' capabilities. 7f3ac37
    - [x] Manually draft hiring JSON ticket for PM.
    - [x] Publish via `npm run publish` and verify role update.
- [x] Task: Execute a 'hiring' loop to update 'senior-systems-architect' capabilities. 544166c
    - [x] Manually draft hiring JSON ticket for Architect.
    - [x] Publish and verify role update.
- [x] Task: Execute a 'PRD Drafting' loop. 5393c0e
    - [x] Manually draft PRD update JSON ticket.
    - [x] Publish and verify `prd.md` updates.
    - [x] Verify micro-loop self-correction/multi-turn logic.
- [x] Task: Execute a 'Technical Review' loop. 5393c0e
    - [x] Manually draft review JSON ticket.
    - [x] Publish and verify review feedback.
- [x] Task: Conductor - User Manual Verification 'Loop Validation' (Protocol in workflow.md) 5393c0e

## Phase 4: Feature Workbooks and Handoffs
- [x] Task: Implement Workbook Abstraction Tools (`initialize_feature_work`, `read_feature_work`, `add_feature_note`). 7f3ac37
- [x] Task: Re-hire PM and Architect with specialized workbook knowledge. 5393c0e
- [x] Task: Execute a multi-agent 'Abstracted Workbook' loop. 5393c0e
    - [x] PM initializes workbook and adds draft note.
    - [x] PM hands off to Architect via `publish_message`.
    - [x] Architect reads workbook and adds feedback note. 5144fa5
- [x] Task: Conductor - User Manual Verification 'Abstracted Workbooks' (Protocol in workflow.md) 5144fa5
