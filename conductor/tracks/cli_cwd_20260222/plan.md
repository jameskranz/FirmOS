# Implementation Plan: Portable CLI & CWD Context

## Phase 1: Context Resolution Infrastructure
- [x] Task: Create `src/utils/path-resolver.ts` to manage `PROJECT_ROOT`. [289ba74]
    - [x] Implement logic to detect `conductor/` or `.firmosrc` in `process.cwd()`.
    - [x] Export a `getProjectRoot()` function.
- [x] Task: Refactor `src/daemon.ts` to initialize and use the path resolver. [7cb0faf]
    - [x] Replace `__dirname` relative pathing with `getProjectRoot()`.
    - [x] Implement `initializeProjectContext()` flow (Git check, `.firmosrc` creation).
    - [x] Add startup validation (exit if not in a valid project and user declines setup).
- [x] Task: Update `package.json` to expose the CLI binary. [7cb0faf]
    - [x] Add `"bin": { "firmos": "./dist/src/daemon.js" }`.
    - [x] Add shebang to `src/daemon.ts` (and ensure it persists in build).
- [ ] Task: Conductor - User Manual Verification 'Context Resolution' (Protocol in workflow.md)

## Phase 2: Tool Refactoring
- [x] Task: Refactor File System Tools to use `getProjectRoot()`. [7cb0faf]
    - [x] `SaveFileTool`, `ReadFileTool`, `ListDirectoryTool`, `ReplaceInFileTool`.
- [x] Task: Refactor Role & State Tools to use `getProjectRoot()`. [7cb0faf]
    - [x] `HireAgentTool`, `ListRolesTool`, `ModelResolver`.
    - [x] `JsonStateManager` (ensure it accepts absolute paths or uses the resolver).
    - [x] `ReviewArtifactTool`, `SubmitReviewResultTool`.
- [x] Task: Verify `WorkbookTools` uses the dynamic root. [7cb0faf]
- [ ] Task: Conductor - User Manual Verification 'Tool Refactoring' (Protocol in workflow.md)

## Phase 3: Validation & Cleanup
- [ ] Task: Perform "Link" Validation.
    - [ ] Run `npm link`.
    - [ ] Navigate to a test directory (copy of a project structure).
    - [ ] Run `firmos` and verify it loads the local project's roles/state.
- [ ] Task: Conductor - User Manual Verification 'Global CLI Validation' (Protocol in workflow.md)
