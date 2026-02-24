# Specification: CEO Memory & DB Scoping

## 1. CEO Memory (HITL Logging & Summarization)

### Direct Log
-   Every message received from the `ceo` role (human response) must be appended to a database table `ceo_interactions`.
-   Fields: `id`, `project_id`, `original_prompt`, `ceo_response`, `timestamp`.

### Summary Artifact (`company/work/ceo-directives.md`)
-   A new system process (or agent) should maintain an "up-to-date picture" of the CEO's mandates.
-   When a CEO response is received, the system should trigger a "Directive Update" task.
-   This task uses an LLM to read the current `ceo-directives.md` and the new interaction, and produce an updated version of the file.
-   Conflict resolution focus: If the CEO says "Actually, use Python instead of Node," the directives should reflect the latest intent.

## 2. Project-Scoped Database

### Schema Changes
-   Add `project_id` column to `workflows`, `tickets`, and `roles`.
-   Update Primary Keys where necessary (e.g., `roles` might need `(project_id, role_name)` composite PK if we want per-project roles).
-   Create `ceo_interactions` table.

### Code Changes
-   Update `BaseStateManager` and `PostgresStateManager` to require `project_id` for all operations.
-   Update `daemon.ts` to pass the `PROJECT_ID` resolved from `.firmosrc` to the state manager.
-   Ensure `HireAgentTool` and other tools pass the correct `PROJECT_ID`.

## 3. TODOs
-   [ ] Implement smarter CEO conflict resolution (confirmation loop).
