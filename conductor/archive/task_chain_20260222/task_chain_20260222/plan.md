# Implementation Plan: Task Chaining & Hierarchical Planning

## Phase 1: Core Infrastructure (Tickets)
- [x] Task: Update `src/state/base.ts` and `src/state/json.ts` to include the `Ticket` schema and CRUD operations.
    - [x] Define `Ticket` interface.
    - [x] Implement `createTicket`, `updateTicket`, `getTicket`, `listTickets`.
- [x] Task: Implement `src/tools/ticket-tools.ts`.
    - [x] Implement `DispatchTicketTool`.
    - [x] Implement `UpdateTicketTool`.
    - [x] Implement `ListTicketsTool`.
- [x] Task: Register new tools in `src/tools/index.ts`.
- [x] Task: Conductor - User Manual Verification 'Core Infrastructure' (Protocol in workflow.md)

## Phase 2: Role Definition & Management
- [x] Task: Create SLA for `planning/manager` (TPM).
    - [x] Define responsibility: External Request -> Feature Breakdown.
    - [x] Define tool usage: `dispatch_ticket` for creating work, `list_tickets` for monitoring.
    - [x] *Note: SLA created dynamically by HR Director based on updated Primer.*
- [x] Task: Create SLA for `engineering/lead`.
    - [x] Define responsibility: Feature -> Task Breakdown.
    - [x] Define tool usage: `dispatch_ticket` for sub-tasks.
    - [x] *Note: SLA created dynamically by HR Director based on updated Primer.*
- [x] Task: Update `hr/director` to hire these new roles and enforce the "Ticket" workflow in their prompts.
- [x] Task: Conductor - User Manual Verification 'Role Definition' (Protocol in workflow.md)

## Phase 3: Workflow Integration & Validation
- [x] Task: Update `intake/consultant` to route new requests to `planning/manager` instead of `hr/recruiter` (or via ticket).
- [x] Task: Update `hr/recruiter` to be compatible with the new flow (optional, or deprecate if TPM handles this).
- [x] Task: Perform End-to-End Validation.
    - [x] Flow: Request -> Intake -> TPM -> Dispatch 'Define PRD' -> Product Agent -> Update Ticket -> TPM -> Dispatch 'Tech Design' -> Eng Lead.
- [x] Task: Conductor - User Manual Verification 'Workflow Integration' (Protocol in workflow.md)