# Implementation Plan: FirmOS CLI & TUI

## Phase 1: CLI Infrastructure
- [x] Task: Setup CLI Entry Point and Command Parsing
    - [x] Create `src/cli/index.ts` as the main entry point.
    - [x] Install and configure `commander` for command parsing.
    - [x] Implement `firmos --help` and basic command stubs.
- [x] Task: Implement `firmos status` Command
    - [x] Create utility to check RabbitMQ connectivity.
    - [x] Create utility to check Orchestrator daemon health.
    - [x] Implement formatted output for the `status` command.
- [x] Task: Implement `firmos -m` Dispatcher
    - [x] Implement logic to publish a task message to the RabbitMQ `intake` queue.
    - [x] Add confirmation log when task is dispatched.
- [x] Task: Conductor - User Manual Verification 'Phase 1: CLI Infrastructure' (Protocol in workflow.md)

## Phase 2: TUI Foundation (Blessed)
- [x] Task: Setup Blessed TUI Boilerplate
    - [x] Install `blessed` and `blessed-contrib`.
    - [x] Create `src/cli/tui/screen.ts` to initialize the Blessed screen.
- [x] Task: Design TUI Layout
    - [x] Implement Grid-based layout with panels for Logs (top-left), Agents (top-right), Queue (bottom-left), and Sidebar (bottom-right).
    - [x] Add basic keyboard navigation (e.g., Tab to switch focus, 'q' to quit).
- [x] Task: Implement Scrollable Log Panel
    - [x] Create a log widget that supports scrolling and colored output.
    - [x] Setup a simple event emitter to push mock logs to the panel.
- [x] Task: Conductor - User Manual Verification 'Phase 2: TUI Foundation' (Protocol in workflow.md)

## Phase 3: Orchestrator & TUI Integration
- [x] Task: Expose Orchestrator State via Event Bus
    - [x] Modify `src/daemon.ts` or create a monitoring service to emit events (agent_started, agent_finished, tool_called, log_message).
- [x] Task: Connect TUI to Real-time Events
    - [x] Update the Log Panel to subscribe to Orchestrator log events.
    - [x] Update the Active Agents List to dynamically update based on agent events.
- [x] Task: Integrate Queue Monitor
    - [x] Implement a RabbitMQ management API client or direct queue polling to fetch message counts.
    - [x] Update the Queue Monitor panel in the TUI with live data.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Orchestrator & TUI Integration' (Protocol in workflow.md)

## Phase 4: CEO Inbox & HITL Interaction
- [x] Task: Implement CEO Inbox Sidebar
    - [x] Create a sidebar widget that monitors the `ceo_requests` RabbitMQ queue.
    - [x] List pending messages addressed to the `ceo` (FYIs, reviews, approvals).
    - [x] Add visual notification (e.g., color change, badge) for new messages.
- [x] Task: Implement CEO Message Interaction View
    - [x] Create a dedicated view/modal for reading the full prompt from a selected CEO message.
    - [x] Implement an input field for the human user to provide a response.
- [x] Task: Implement Response Dispatcher
    - [x] Logic to publish the human's response back to the `task_routing` queue (or a dedicated feedback queue) with the appropriate role context to resume the agent's loop.
- [x] Task: Conductor - User Manual Verification 'Phase 4: CEO Inbox & HITL Interaction' (Protocol in workflow.md)

## Phase 5: Final Packaging & `firmos start`
- [x] Task: Implement `firmos start` Integration
    - [x] Combine the Orchestrator daemon launch with the TUI initialization.
    - [x] Ensure logs from the daemon are correctly piped to the TUI.
- [x] Task: Configure `package.json` for CLI Usage
    - [x] Add the `bin` field to `package.json`.
    - [x] Verify `npm link` allows local execution of the `firmos` command.
- [x] Task: Conductor - User Manual Verification 'Phase 5: Final Packaging' (Protocol in workflow.md)
