# Specification: TUI Task Dispatch

## Overview
Currently, users must use a separate terminal to dispatch tasks via `firmos -m`. This track adds a native input mechanism to the TUI, allowing users to issue commands directly.

## User Experience
- **Trigger:** User presses `i` (input) or `d` (dispatch) while focused on any panel.
- **Interface:** A command bar or modal appears at the bottom of the screen.
- **Input:** User types their prompt (e.g., "Build a snake game").
- **Submission:** User presses `Enter`.
- **Feedback:**
    - The input clears.
    - A log message confirms "Task dispatched: [prompt]".
    - The task appears in the "Queue Depth" monitor.

## Technical Implementation
- **Layout:** Update `src/cli/tui/layout.ts` to include a `blessed.textbox` or `blessed.form` at the bottom.
- **Event Handling:** In `src/cli/tui/screen.ts`, listen for the trigger key.
- **Logic:** On submit, publish a message to the `task_routing` queue using the same `amqp` connection logic as the CLI.

## Constraints
- Must respect the current `PROJECT_ID` (from `.firmosrc` or env).
- Must not block the main event loop (TUI responsiveness).
