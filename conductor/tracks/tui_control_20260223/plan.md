# Implementation Plan: TUI Control

## Phase 1: Infrastructure & Events
- [x] Task: Update `src/utils/event-bus.ts` with new control events.
- [x] Task: Update `src/daemon.ts` to implement `isPaused` logic.
    - [x] Block task consumption when paused.
    - [x] Add listener for `purge` to clear queues.

## Phase 2: TUI Layout & Feedback
- [x] Task: Update `src/cli/tui/layout.ts` to add a Status Indicator.
    - [x] Add a small text widget for "STATUS: RUNNING/PAUSED".
- [x] Task: Update `src/cli/tui/screen.ts` for Control Logic.
    - [x] Implement `p` hotkey for toggle.
    - [x] Implement `x` double-press confirmation for purge.

## Phase 3: Validation
- [ ] Task: Verify end-to-end.
    - [ ] Start work -> Press `p` -> Verify logs stop after current task.
    - [ ] Press `x` once -> Verify warning.
    - [ ] Press `x` again -> Verify queue count drops to 0.
