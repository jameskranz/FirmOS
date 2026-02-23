# Implementation Plan: Portable CLI & CWD Context

## Phase 1: Context Resolution Infrastructure
- [ ] Task: Create `src/utils/path-resolver.ts` to manage `PROJECT_ROOT`.
    - [ ] Implement logic to detect `conductor/` or `.firmosrc` in `process.cwd()`.
    - [ ] Export a `getProjectRoot()` function.
- [ ] Task: Refactor `src/daemon.ts` to initialize and use the path resolver.
    - [ ] Replace `__dirname` relative pathing with `getProjectRoot()`.
    - [ ] Add startup validation (exit if not in a valid project).
- [ ] Task: Update `package.json` to expose the CLI binary.
    - [ ] Add `"bin": { "firmos": "./dist/src/daemon.js" }`.
    - [ ] Add shebang to `src/daemon.ts` (and ensure it persists in build).
- [ ] Task: Conductor - User Manual Verification 'Context Resolution' (Protocol in workflow.md)

## Phase 2: Tool Refactoring
- [ ] Task: Refactor File System Tools to use `getProjectRoot()`.
    - [ ] `SaveFileTool`, `ReadFileTool`, `ListDirectoryTool`, `ReplaceInFileTool`.
- [ ] Task: Refactor Role & State Tools to use `getProjectRoot()`.
    - [ ] `HireAgentTool`, `ListRolesTool`, `ModelResolver`.
    - [ ] `JsonStateManager` (ensure it accepts absolute paths or uses the resolver).
    - [ ] `ReviewArtifactTool`, `SubmitReviewResultTool`.
- [ ] Task: Verify `WorkbookTools` uses the dynamic root.
- [ ] Task: Conductor - User Manual Verification 'Tool Refactoring' (Protocol in workflow.md)

## Phase 3: Validation & Cleanup
- [ ] Task: Perform "Link" Validation.
    - [ ] Run `npm link`.
    - [ ] Navigate to a test directory (copy of a project structure).
    - [ ] Run `firmos` and verify it loads the local project's roles/state.
- [ ] Task: Conductor - User Manual Verification 'Global CLI Validation' (Protocol in workflow.md)