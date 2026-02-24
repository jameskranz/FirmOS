# Specification: TUI Control (Pause/Purge)

## Operational Controls

### 1. Pause / Resume
-   **Hotkey:** `p`
-   **Behavior:**
    -   Toggles a global `isPaused` flag in the daemon.
    -   When `true`, the RabbitMQ consumer stops picking up new tasks from the queue.
    -   Active tasks are allowed to finish their current iteration but will not start new ones if they check the flag.
-   **Visual Feedback:** A status indicator in the TUI (e.g., "STATUS: RUNNING" vs "STATUS: PAUSED").

### 2. Safe Purge (Destructive)
-   **Hotkey:** `x` (twice)
-   **Mechanism:**
    -   **First press:** Displays a warning message in the TUI: "⚠️ PRESS 'x' AGAIN TO PURGE ALL QUEUES".
    -   **Second press (within 3 seconds):** Triggers the `purge_queue` logic for the current project.
    -   **Timeout:** If the second press doesn't happen within 3s, the warning clears and nothing happens.
-   **Action:** Deletes all messages from `task_routing_{UUID}` and `external_requests_{UUID}`.

## Technical Implementation
-   **Event Bus:** Add `PAUSE`, `RESUME`, and `PURGE` events.
-   **Daemon:** Update `startDaemon` to listen for these events and manage the `isPaused` state.
-   **TUI:** 
    -   Update `layout.ts` to include a "Status" label.
    -   Update `screen.ts` to handle the hotkeys and confirmation timer.
