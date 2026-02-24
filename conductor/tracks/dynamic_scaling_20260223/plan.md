# Implementation Plan: Dynamic Worker Scaling

## Phase 1: Infrastructure Primitives
- [x] Task: Create `InfrastructureManager` in `src/utils/infrastructure-manager.ts`.
    - [x] Install `dockerode` (or use `axios` for socket communication).
    - [x] Implement `listContainers()`, `spawnContainer()`, `terminateContainer()`.
    - [x] Test connectivity to `/var/run/docker.sock` from the dev environment.

## Phase 2: Agent Tools
- [x] Task: Create `ProvisionWorkerTool` in `src/tools/provision-worker.ts`.
    - [x] Wrap `InfrastructureManager.spawnContainer`.
    - [x] Define inputs: `repoUrl`, `cpuShares`, `memoryLimit`.
- [x] Task: Create `ListWorkersTool` in `src/tools/list-workers.ts`.
    - [x] Return JSON list of active containers and their resource usage.
- [x] Task: Create `TerminateWorkerTool` in `src/tools/terminate-worker.ts`.

## Phase 3: Runner Updates
- [x] Task: Enhance `src/daemon.ts` (Runner Logic).
    - [x] Add support for `AUTOCLONE_REPO` environment variable.
    - [x] Update `amqpChannel.consume` to filter messages based on `TASK_FILTER` or `REPO_TAG`.
- [x] Task: Update `Dockerfile` and `docker-compose.yml`.
    - [x] Ensure the Manager (Orchestrator) has the Docker socket mounted.
    - [x] Optimize the image for faster startup (layer caching).

## Phase 4: Integration & Validation
- [x] Task: End-to-End Test (Manual Verification).
    - [x] Start the Manager via `firmos start`.
    - [x] Use `firmos -m "Provision a worker for https://github.com/example/repo.git"` to trigger the DevOps agent.
    - [x] Verify a new container appears in `docker ps`.
    - [x] Verify the new container pulls tasks for that repo.
- [x] Task: Conductor - User Manual Verification (Protocol in workflow.md).
