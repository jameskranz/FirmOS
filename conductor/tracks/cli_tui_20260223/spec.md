# Track Specification: FirmOS CLI & TUI

## Overview
This track introduces a command-line interface (CLI) and a Terminal User Interface (TUI) for interacting with FirmOS. Currently, FirmOS operates primarily as a background daemon. This addition will provide users with a centralized tool to start the system, issue tasks, monitor agent activity, and handle human-in-the-loop (HITL) requests in real-time.

## Functional Requirements
- **CLI Entry Point:** Provide a `firmos` command available in the terminal.
- **Core Commands:**
    - `firmos start`: Initializes the orchestrator daemon and connects to infrastructure (RabbitMQ).
    - `firmos -m "<prompt>"`: Dispatches a new task to the system via the message broker.
    - `firmos status`: Displays the current health and connectivity status of the FirmOS components.
- **TUI (Terminal User Interface):**
    - **Live Logs:** A scrollable view of real-time logs from the orchestrator and individual agents.
    - **Queue Monitor:** Visual status of RabbitMQ queues (e.g., pending messages, active tasks).
    - **Active Agents List:** A list of currently running agents, their roles, and their current state.
    - **Request/Approval Panel:** A dedicated interface for reviewing and approving/rejecting HITL requests.
- **External Request Handling:**
    - Implement a **Non-blocking Sidebar** in the TUI where pending requests are queued.
    - Users can navigate to the sidebar to interact with specific requests without interrupting the log flow.

## Non-Functional Requirements
- **Performance:** The TUI must remain responsive even under high log volume.
- **Library:** Use `blessed` (and potentially `blessed-contrib`) for TUI rendering to align with the Node.js tech stack.
- **Consistency:** CLI output should follow project styling (likely using `chalk` or similar).

## Acceptance Criteria
- [ ] Running `firmos start` successfully launches the orchestrator and TUI.
- [ ] Issuing `firmos -m "..."` results in a message appearing in the RabbitMQ queue and visibility in the TUI.
- [ ] Agent tool calls and status updates are visible in the "Live Logs" and "Active Agents" TUI panels.
- [ ] A pending HITL request appears in the TUI sidebar and can be approved/rejected by the user.
- [ ] The `firmos` command is globally or locally executable via `npm link` or similar.

## Out of Scope
- Remote TUI access (TUI is local-only for now).
- Complex log filtering or search (basic scrolling only).
- Multi-user TUI sessions.
