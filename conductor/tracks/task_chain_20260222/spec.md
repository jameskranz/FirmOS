# Track Specification: Task Chaining & Hierarchical Planning

## 1. Overview
This track introduces a formal, hierarchical task management system to FirmOS. It moves away from flat "handoffs" to a structured "Ticket" system where work is broken down, assigned, and tracked by dedicated management roles. This ensures that high-level external requests are systematically decomposed into executed work items, preventing scope creep and ensuring architectural integrity.

## 2. Functional Requirements

### 2.1. Ticket Schema & State
- **New `Ticket` Schema:** Introduce a formal `Ticket` object in `src/state/base.ts`.
    - Fields: `id` (UUID), `parentId` (nullable UUID), `title`, `description`, `status` (Open, In Progress, Blocked, Done), `assignedRole`, `outputArtifact` (optional).
- **State Management:** Update `JsonStateManager` to support creating, updating, and querying hierarchical tickets.

### 2.2. New Roles
- **`planning/manager` (TPM):**
    - **Responsibility:** Receives raw external requests from `intake/consultant`.
    - **Action:** Breaks down the request into high-level "Feature Tickets" (e.g., "Define PRD", "Create Design").
    - **Evaluation:** Monitors the status of these tickets. When a dependency (e.g., PRD) is done, they create/dispatch the next ticket (e.g., Design).
- **`engineering/lead`:**
    - **Responsibility:** Receives a "Technical Implementation" ticket.
    - **Action:** Breaks it down into granular "Task Tickets" (e.g., "Scaffold DB", "Implement Auth API").
    - **Evaluation:** Reviews code/artifacts against the ticket requirements before marking the parent ticket as done.

### 2.3. Tooling
- **`dispatch_ticket(title, description, assignedRole, parentId?)`:** A new tool for managers to create and assign work.
- **`update_ticket(ticketId, status, outputArtifact?)`:** A tool for workers to mark progress.
- **`list_tickets(parentId?)`:** A tool to view the state of work.
- **Deprecation:** `publish_message` is explicitly restricted to unstructured communication (chat/alerts) and MUST NOT be used for work assignment.

### 2.4. Workflow Logic
- **Evaluation Loop:** The "Manager" roles (`planning/manager`, `engineering/lead`) are responsible for the "Evaluation Process". They periodically check the state of their child tickets to determine the next action (create new sibling, mark parent done, etc.).

## 3. Technical Requirements
- Update `src/state` to handle the `Ticket` graph.
- Implement `src/tools/ticket-tools.ts` (dispatch, update, list).
- Create SLAs for `planning/manager` and `engineering/lead`.
- Update `intake/consultant` to route to `planning/manager`.
- Update `hr/director` to hire these new roles.

## 4. Acceptance Criteria
- An external request "Build a Todo App" flows: Intake -> TPM -> Product Ticket -> Eng Lead -> Tech Tickets.
- `publish_message` is NOT used for assigning the work.
- A hierarchy of tickets is visible in the state file.
- Work is only marked "Done" when the parent Manager role evaluates it.

## 5. Out of Scope
- Automated daemon-driven evaluation (logic resides in the Manager agents).
- Complex dependency graphs (DAGs); strict Tree structure is sufficient.