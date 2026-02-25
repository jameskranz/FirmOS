# Specification: PRD Seeding & Bootstrap

## Seeding Sources
The system will check for an initial PRD in the following order:
1.  **`PRD_SEED_CONTENT` Environment Variable:** Direct Markdown content.
2.  **`PRD_SEED_PATH` Environment Variable:** Path to a local Markdown file.
3.  **Local File:** `initial-prd.md` in the current working directory.

## Bootstrap Logic
When a seeding source is found during `initializeProjectContext`:
1.  **Read Content:** Load the Markdown from the source.
2.  **Create Artifact:** Save the content to `company/work/initial-seed-prd.md`.
3.  **Emit Log:** Notify the user that a seed PRD was detected.
4.  **Auto-Dispatch:**
    -   Generate a Project Dispatch message using the seed content as the prompt.
    -   Publish this message to the `task_routing` queue, targeting `intake/consultant` or `hr/director`.

## User Experience
-   **Silent Bootstrap:** If a seed is present, the system can automatically bypass some of the initial setup questions or pre-fill the "First Task" dispatch.
-   **Traceability:** The `initial-seed-prd.md` artifact remains in the project as a historical record of the bootstrap.
