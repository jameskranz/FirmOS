# Track Specification: Horizontal Scaling & Git-Based Multi-Tenancy

## 1. Overview
This track evolves FirmOS into a horizontally scalable, multi-tenant system. It introduces a separation between the **FirmOS Engine** (containerized daemon/runners) and the **Target Project** (the external repository being worked on). Runners will dynamically clone a target repository, switch to a task-specific Git branch, and execute the agent loop using the target directory as their workspace context.

## 2. Functional Requirements

### 2.1. Containerized Runner Engine
- **Infrastructure:** Use Docker to spin up independent Runner instances.
- **Dynamic Initialization:** When a Runner receives a task, it must be provided with a `repositoryUrl` and `branchName`. 
- **Workspace Setup:** The Runner performs a `git clone` of the target repository into a temporary `/workspace` directory inside its container.

### 2.2. Isolated Execution (Portable Context)
- **CWD Execution:** The Runner invokes the FirmOS agent loop against the `/workspace` (Target Project) directory.
- **Tool Isolation:** All filesystem tools (`save_file`, `read_file`, etc.) are relative to the target project root within the container.
- **Git Push Workflow:** Upon task completion, the Runner commits and pushes the changes from the `/workspace` back to the target's remote origin.

### 2.3. Shared State (PostgreSQL)
- **Centralized Tracking:** A shared PostgreSQL database tracks all active tasks, branch names, and target repo metadata across the entire swarm.
- **Ticket Mapping:** Tickets in the DB are linked to specific Git branches in the target repositories.

### 2.4. Orchestration & Merging
- **Coordinator:** A central process manages the high-level SDLC state.
- **Merge Requests:** Completion of a task triggers a "Ready for Merge" state in the database. Integration into the target project's `main` branch is handled via a Gatekeeper process (or manual trigger).

## 3. Technical Requirements
- **Docker Compose:** Setup including RabbitMQ, PostgreSQL, and a scalable `runner` service.
- **Git Client Utility:** Robust wrapper for `clone`, `branch`, `commit`, `push`.
- **CLI Portability:** Ensure the FirmOS engine can be pointed at an arbitrary directory (from Phase 1/2 of previous tracks).
- **Postgres State Manager:** Implementation of `PostgresStateManager` for distributed persistence.

## 4. Acceptance Criteria
- `docker-compose up --scale runner=2` starts two engines ready for work.
- A task published to RabbitMQ containing a GitHub/GitLab URL is successfully picked up by a runner.
- The runner clones the external repo, makes changes, and pushes a new branch.
- The changes are visible in the external repo and the state is tracked in the central Postgres DB.

## 5. Out of Scope
- Auto-provisioning of Git servers.
- Complex multi-repo dependency management.
- Container image registry management.