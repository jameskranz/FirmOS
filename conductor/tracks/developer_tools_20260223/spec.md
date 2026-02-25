# Specification: Developer Shell Tools

## Overview
To achieve true autonomy, developer agents must be able to verify their work. This track introduces a `run_shell_command` tool that allows agents to execute arbitrary commands in the project environment.

## Requirements
-   **Execution Context:** Commands MUST always execute relative to the project's `WORKSPACE_ROOT`.
-   **Security:**
    *   Mandatory timeout (default 60s) to prevent hanging the swarm.
    *   Isolation is provided by the containerized worker environment (Docker).
-   **Feedback:**
    *   Capture and return both `stdout` and `stderr` to the agent.
    *   Report the exit code.
-   **Guidance:** Instruct agents to use this tool for:
    *   Running tests (`npm test`, `pytest`).
    *   Building code (`npm run build`).
    *   Dependency management (`npm install`).
    *   Linting and formatting.

## Implementation Details
-   Use Node.js `child_process.exec`.
-   Return a structured string or JSON containing the output and status.
