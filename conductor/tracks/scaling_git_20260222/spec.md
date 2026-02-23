# Track Specification: Horizontal Scaling & Git-Based Multi-Tenancy

## 1. Overview
This track evolves FirmOS into a horizontally scalable system where multiple Runner processes can execute tasks concurrently. It introduces a decentralized filesystem model using Git branches for task isolation and a centralized PostgreSQL database for shared state management.

## 2. Functional Requirements

### 2.1. Multi-Runner Daemon
- **Competing Consumers:** Update the daemon to support multiple instances consuming from the same RabbitMQ queues (`task_routing`, `external_requests`).
- **Generic Runners:** Runners are identical and can assume any role by fetching the required SLA dynamically.

### 2.2. Git-Based Task Isolation
- **Branching Workflow:** Every task received by a Runner MUST start by creating a new Git branch derived from `main` (branch name: `task/<ticketId>`).
- **Local Artifacts:** All filesystem tool calls (`save_file`, `replace_in_file`) operate on the Runner's local branch.
- **Push & Notify:** Upon task completion, the Runner pushes its branch to the remote repository and updates the ticket status to `Pending Merge`.

### 2.3. Centralized State (PostgreSQL)
- **Shared Database:** Replace `workflows.json`, `tickets.json`, and `role-registry.json` with a PostgreSQL database.
- **Concurrent Access:** Ensure row-level locking or robust transaction management for ticket updates.

### 2.4. Gatekeeper Role
- **Merge Orchestration:** Introduce a new system role (`system/gatekeeper`) responsible for:
    - Detecting pushed task branches.
    - Reviewing changes (automated or agent-driven).
    - Merging branches into `main`.
    - Handling merge conflicts by tasking a human or an architect.

## 3. Technical Requirements
- Implement `PostgresStateManager` in `src/state/postgres.ts`.
- Refactor `src/daemon.ts` into a `Coordinator` (for merges/triage) and a `Runner` (for task execution).
- Implement Git utility wrappers for branching, pushing, and merging.
- Add database schema migrations for Workflows, Tickets, and Roles.

## 4. Acceptance Criteria
- Two independent Runner processes can pick up different tickets simultaneously.
- Both Runners successfully create and push Git branches without interfering with each other.
- The centralized PostgreSQL database accurately reflects the state of all tickets across all runners.
- The Gatekeeper successfully merges a completed task branch into `main`.

## 5. Out of Scope
- Dynamic container orchestration (e.g., Kubernetes/Docker scaling).
- Real-time file syncing between runners (VCS-only).
- High availability for the PostgreSQL/RabbitMQ infrastructure itself.