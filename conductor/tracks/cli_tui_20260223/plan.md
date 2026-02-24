# Implementation Plan: FirmOS CLI & TUI

## Phase 1: CLI Infrastructure
- [ ] Task: Setup CLI Entry Point and Command Parsing
    - [ ] Create `src/cli/index.ts` as the main entry point.
    - [ ] Install and configure `commander` for command parsing.
    - [ ] Implement `firmos --help` and basic command stubs.
- [ ] Task: Implement `firmos status` Command
    - [ ] Create utility to check RabbitMQ connectivity.
    - [ ] Create utility to check Orchestrator daemon health.
    - [ ] Implement formatted output for the `status` command.
- [ ] Task: Implement `firmos -m` Dispatcher
    - [ ] Implement logic to publish a task message to the RabbitMQ `intake` queue.
    - [ ] Add confirmation log when task is dispatched.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: CLI Infrastructure' (Protocol in workflow.md)

## Phase 2: TUI Foundation (Blessed)
- [ ] Task: Setup Blessed TUI Boilerplate
    - [ ] Install `blessed` and `blessed-contrib`.
    - [ ] Create `src/cli/tui/screen.ts` to initialize the Blessed screen.
- [ ] Task: Design TUI Layout
    - [ ] Implement Grid-based layout with panels for Logs (top-left), Agents (top-right), Queue (bottom-left), and Sidebar (bottom-right).
    - [ ] Add basic keyboard navigation (e.g., Tab to switch focus, 'q' to quit).
- [ ] Task: Implement Scrollable Log Panel
    - [ ] Create a log widget that supports scrolling and colored output.
    - [ ] Setup a simple event emitter to push mock logs to the panel.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: TUI Foundation' (Protocol in workflow.md)

## Phase 3: Orchestrator & TUI Integration
- [ ] Task: Expose Orchestrator State via Event Bus
    - [ ] Modify `src/daemon.ts` or create a monitoring service to emit events (agent_started, agent_finished, tool_called, log_message).
- [ ] Task: Connect TUI to Real-time Events
    - [ ] Update the Log Panel to subscribe to Orchestrator log events.
    - [ ] Update the Active Agents List to dynamically update based on agent events.
- [ ] Task: Integrate Queue Monitor
    - [ ] Implement a RabbitMQ management API client or direct queue polling to fetch message counts.
    - [ ] Update the Queue Monitor panel in the TUI with live data.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Orchestrator & TUI Integration' (Protocol in workflow.md)

## Phase 4: HITL Sidebar & Interaction
- [ ] Task: Implement Non-blocking Sidebar for Requests
    - [ ] Create a sidebar widget that lists pending `request-hire` or `submit-for-approval` tasks.
    - [ ] Add visual notification when a new request arrives.
- [ ] Task: Implement Approval/Rejection Workflow
    - [ ] Create a modal or focused view when a sidebar item is selected.
    - [ ] Implement the logic to publish the user's decision back to the relevant agent's response queue.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: HITL Sidebar & Interaction' (Protocol in workflow.md)

## Phase 5: Final Packaging & `firmos start`
- [ ] Task: Implement `firmos start` Integration
    - [ ] Combine the Orchestrator daemon launch with the TUI initialization.
    - [ ] Ensure logs from the daemon are correctly piped to the TUI.
- [ ] Task: Configure `package.json` for CLI Usage
    - [ ] Add the `bin` field to `package.json`.
    - [ ] Verify `npm link` allows local execution of the `firmos` command.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Packaging' (Protocol in workflow.md)
