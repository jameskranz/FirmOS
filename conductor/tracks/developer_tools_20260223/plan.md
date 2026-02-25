# Implementation Plan: Developer Shell Tools

## Phase 1: Tool Implementation
- [ ] Task: Create `src/tools/run-shell-command.ts`.
    - [ ] Implement `execute()` using `child_process.exec`.
    - [ ] Add timeout and `cwd` logic.
- [ ] Task: Register the tool in `src/tools/index.ts`.

## Phase 2: Agent Empowerment
- [ ] Task: Update `hr/director.md` to include `run_shell_command` in the developer role templates.
    - [ ] Advise the director to instruct developers to **always verify code via tests** before marking a ticket as 'Done'.

## Phase 3: Validation
- [ ] Task: Verify with a story test or manual TUI command.
    - [ ] Run `npm --version` or `ls -la` via the tool.
