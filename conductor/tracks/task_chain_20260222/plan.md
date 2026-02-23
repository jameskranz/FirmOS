# Implementation Plan: Task Chaining & Hierarchical Planning

## Phase 1: Core Infrastructure (Tickets)
- [ ] Task: Update `src/state/base.ts` and `src/state/json.ts` to include the `Ticket` schema and CRUD operations.
    - [ ] Define `Ticket` interface.
    - [ ] Implement `createTicket`, `updateTicket`, `getTicket`, `listTickets`.
- [ ] Task: Implement `src/tools/ticket-tools.ts`.
    - [ ] Implement `DispatchTicketTool`.
    - [ ] Implement `UpdateTicketTool`.
    - [ ] Implement `ListTicketsTool`.
- [ ] Task: Register new tools in `src/tools/index.ts`.
- [ ] Task: Conductor - User Manual Verification 'Core Infrastructure' (Protocol in workflow.md)

## Phase 2: Role Definition & Management
- [ ] Task: Create SLA for `planning/manager` (TPM).
    - [ ] Define responsibility: External Request -> Feature Breakdown.
    - [ ] Define tool usage: `dispatch_ticket` for creating work, `list_tickets` for monitoring.
- [ ] Task: Create SLA for `engineering/lead`.
    - [ ] Define responsibility: Feature -> Task Breakdown.
    - [ ] Define tool usage: `dispatch_ticket` for sub-tasks.
- [ ] Task: Update `hr/director` to hire these new roles and enforce the "Ticket" workflow in their prompts.
- [ ] Task: Conductor - User Manual Verification 'Role Definition' (Protocol in workflow.md)

## Phase 3: Workflow Integration & Validation
- [ ] Task: Update `intake/consultant` to route new requests to `planning/manager` instead of `hr/recruiter` (or via ticket).
- [ ] Task: Update `hr/recruiter` to be compatible with the new flow (optional, or deprecate if TPM handles this).
- [ ] Task: Perform End-to-End Validation.
    - [ ] Flow: Request -> Intake -> TPM -> Dispatch 'Define PRD' -> Product Agent -> Update Ticket -> TPM -> Dispatch 'Tech Design' -> Eng Lead.
- [ ] Task: Conductor - User Manual Verification 'Workflow Integration' (Protocol in workflow.md)