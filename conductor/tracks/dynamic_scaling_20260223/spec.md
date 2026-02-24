# Track Specification: Dynamic Worker Scaling

## Overview
This track introduces the ability for FirmOS to dynamically scale its worker pool by spawning new Docker containers on demand. This moves the system from a static "Worker Pool" (defined in `docker-compose.yml`) to a **Dynamic Provisioning** model where agents can request more compute resources based on workload or project isolation requirements.

## Core Architecture: The Manager-Worker Pattern

### 1. The Manager (Orchestrator)
The current `firmos start` process acts as the **Manager**. It holds the "Consciousness" of the swarm.
- **Responsibility:** Monitor the `task_routing` queue and decide when to spawn new workers.
- **Capabilities:**
    - `provision_worker(repoUrl, taskFilter)`: A new tool that talks to the Docker Daemon.
    - `list_workers()`: See active containers and their CPU/Memory usage.
    - `kill_worker(containerId)`: Terminate idle or stuck workers.

### 2. The Worker (Runner)
The `firmos-runner` image (defined in `Dockerfile`) acts as the **Worker**.
- **Responsibility:** Execute tasks from RabbitMQ.
- **Isolation:** Each worker is a "Disposable Workspace". It clones *one* repository and works on *one* project context until terminated.
- **Startup Logic:**
    - Reads `AUTOCLONE_REPO` env var -> Clones the repo.
    - Reads `TASK_FILTER` env var -> Only consumes messages matching this tag (e.g., specific `repo_id`).

## Technical Implementation

### Docker Socket Integration
The Manager needs access to the host's Docker daemon to spawn sibling containers.
- **Mount:** `/var/run/docker.sock:/var/run/docker.sock` (Standard Docker-in-Docker pattern, or distinct siblings).
- **Library:** Use `dockerode` or direct HTTP calls via `curl` (unix socket) to control containers.

### Routing Logic
We need to update `src/daemon.ts` and the `PublishMessageTool` to support **Affinity Routing**.
- **Tagged Messages:** Messages in RabbitMQ will have a header `x-repo-url`.
- **Worker Subscription:**
    - **Generic Workers:** Listen to `task_routing` (wildcard).
    - **Dedicated Workers:** Listen to `task_routing` but *only* process messages where `header.x-repo-url == self.repoUrl`.

## Acceptance Criteria
- [ ] A new `InfrastructureManager` class in `src/utils/` that wraps Docker API calls.
- [ ] A `devops/manager` role capable of calling `provision_worker`.
- [ ] The `firmos-runner` image updated to support `AUTOCLONE_REPO`.
- [ ] End-to-End test:
    1.  Manager receives a task for a *new* repo.
    2.  Manager spawns a new Docker container.
    3.  New container starts, clones repo, and processes the task.
