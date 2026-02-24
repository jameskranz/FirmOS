# Specification: Story-Driven Testing & Isolation

## Goals
-   Validate complex multi-agent and multi-tenant workflows.
-   Ensure the CLI is resilient and user-friendly during setup and failures.
-   Guarantee test isolation so that running the suite doesn't corrupt local state or Docker environments.

## Testing Strategy

### 1. Isolation Mechanism
-   **File System:** Use `node:os` `tmpdir()` to create unique project roots for every test run.
-   **RabbitMQ:** Use `PROJECT_ID` (UUID) to scope all queues. This allows tests to share a single RabbitMQ server without cross-talk.
-   **Docker:** 
    -   When testing container spawning, use a unique label: `firmos-test-id=<uuid>`.
    -   Implement a `TestJanitor` utility to prune any containers with this label after tests finish.
    -   Mock the Docker API where possible using `nock` or a similar tool to simulate various responses (success, out of memory, permission denied).

### 2. Usage Stories

#### Story A: Multi-Tenant project separation
-   **Setup:** Two projects (A and B) with unique UUIDs.
-   **Action:** Project A publishes a task.
-   **Assertion:** Only Project A's daemon receives it.

#### Story B: CLI "Cold Start" Onboarding
-   **Setup:** A completely empty directory.
-   **Action:** Run `firmos start`.
-   **Scenarios:**
    -   User says 'y': System initializes and starts TUI.
    -   User says 'n': System exits gracefully.

#### Story C: Resilient Connectivity (Infrastructure Down)
-   **Setup:** Set `RABBITMQ_URL` to a non-existent host.
-   **Action:** Run `firmos status`.
-   **Assertion:** Output contains the "💡 TIP: Is RabbitMQ running?" message.

#### Story D: Asynchronous CEO Approval (HITL)
-   **Setup:** A running daemon.
-   **Action:** Inject a task that triggers `submit_for_approval`.
-   **Assertion:** Message appears in `ceo_requests_{UUID}` and work pauses. Inject response -> work resumes.

## Tooling
-   **test-utils/story-harness.ts**: Shared utility for managing temp dirs and scoped brokers.
-   **test-utils/docker-mock.ts**: Optional mocking for Docker API calls.
