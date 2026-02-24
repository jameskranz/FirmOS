# Implementation Plan: TUI Dispatch

## Phase 1: TUI Command Bar
- [x] Task: Update `src/cli/tui/layout.ts` to add a bottom input widget.
    - [x] Create a `blessed.textbox` or `blessed.form` at the bottom of the screen.
    - [x] Set properties for focus styling (e.g., border color).
- [x] Task: Update `src/cli/tui/screen.ts` for keyboard shortcuts.
    - [x] Listen for `i` (input) or `d` (dispatch) to focus the input widget.
    - [x] Handle `Enter` to submit the input.
    - [x] Handle `Escape` to cancel input.

## Phase 2: Logic Integration
- [x] Task: Implement message publishing from the TUI.
    - [x] Reuse or import RabbitMQ connection logic.
    - [x] On submit, publish a message to `task_routing_{PROJECT_ID}`.
    - [x] Use `eventBus` to log confirmation to the TUI.

## Phase 3: Validation
- [x] Task: Verify end-to-end functionality.
    - [x] Start `firmos start`.
    - [x] Press `i` to activate the command bar.
    - [x] Type "Build a snake game" and press Enter.
    - [x] Verify the task appears in the "Active Agents" list (as agents pick it up).
    - [x] Verify the command bar clears and logs the dispatch.
