# Implementation Plan: Automated Task Chains and Feedback Loops

## Phase 1: State Management Infrastructure [checkpoint: 339efa1]
- [x] Task: Create `src/state/` directory and implement `BaseStateManager` abstract class. eb62062
- [x] Task: Implement `JsonStateManager` for file-based state tracking in `company/state/workflows.json`. ba166a7
    - [x] Write unit tests for state initialization, updates, and retrieval.
    - [x] Implement the class logic to pass tests.
- [x] Task: Conductor - User Manual Verification 'State Management Infrastructure' (Protocol in workflow.md) 339efa1

## Phase 2: Intent-Based Handoff Tools
- [ ] Task: Implement `submit_for_review.ts` tool.
- [ ] Task: Implement `submit_feedback.ts` tool.
- [ ] Task: Implement `submit_for_approval.ts` tool.
- [ ] Task: Register new tools in `src/tools/index.ts`.
    - [ ] Write unit tests for tool definitions and schema validation.
    - [ ] Ensure tools return meaningful handoff success messages.
- [ ] Task: Conductor - User Manual Verification 'Intent-Based Tools' (Protocol in workflow.md)

## Phase 3: Daemon Orchestration & Routing
- [ ] Task: Refactor `src/daemon.ts` to integrate the `StateManager`.
- [ ] Task: Update the tool execution loop to handle handoff tools.
    - [ ] Logic: Tool execution -> State update -> RabbitMQ publish to next agent.
- [ ] Task: Implement "Human Gate" logic for `submit_for_approval`.
    - [ ] Write integration tests for automated routing between mock agents.
- [ ] Task: Conductor - User Manual Verification 'Daemon Orchestration' (Protocol in workflow.md)

## Phase 4: Role SLA Updates
- [ ] Task: Use the 'hiring' loop to update `product-manager.md` with handoff tools.
- [ ] Task: Use the 'hiring' loop to update `senior-systems-architect.md` with feedback tools.
- [ ] Task: Verify that agents use the new tools correctly in their micro-loops.
- [ ] Task: Conductor - User Manual Verification 'Role SLA Updates' (Protocol in workflow.md)

## Phase 5: Loop Validation
- [ ] Task: Execute an end-to-end automated chain: PM (Draft) -> Architect (Review) -> PM (Revision) -> Human (Approval).
    - [ ] Use `scripts/inspect-queue.ts` to verify correct message routing.
    - [ ] Verify `workflows.json` state transitions.
- [ ] Task: Conductor - User Manual Verification 'End-to-End Loop Validation' (Protocol in workflow.md)
