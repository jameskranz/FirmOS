# Track Specification: Portable CLI & CWD Context

## 1. Overview
This track transforms FirmOS from a repository-bound script into a portable CLI tool that can be executed from any directory. It enables users to run FirmOS commands (e.g., `firmos start`, `conductor:implement`) within any valid project folder, using the Current Working Directory (CWD) as the context root rather than the hardcoded `__dirname` of the FirmOS source.

## 2. Functional Requirements

### 2.1. CWD-Based Context Resolution
- **Dynamic Root:** The system MUST use `process.cwd()` as the base for all project-relative operations (e.g., finding `company/roles`, reading `workflows.json`, locating `conductor/` config).
- **Validation:** Upon startup, the system MUST verify that the CWD contains a valid FirmOS project structure (specifically looking for a `conductor/` directory or a `.firmosrc` file).
    - If valid: Proceed with CWD as `PROJECT_ROOT`.
    - If invalid: Exit with a clear error message: "FirmOS context not found. Please run this command from the root of a FirmOS project."

### 2.2. Global CLI Support
- **Binary Export:** Configure `package.json` to export a `bin` entry (e.g., `firmos`).
- **Shebang:** Ensure the entry point (e.g., `dist/src/daemon.js` or a new CLI wrapper) has the `#!/usr/bin/env node` shebang.
- **NPM Link:** Support `npm link` or `npm install -g` usage, allowing the user to type `firmos` anywhere.

### 2.3. Path Refactoring
- Refactor all internal tools (e.g., `SaveFileTool`, `ListRolesTool`, `ModelResolver`) to stop using `path.resolve(__dirname, '..', '..')` and start using a globally available `getProjectRoot()` function or a singleton configuration object initialized with `process.cwd()`.

## 3. Technical Requirements
- Create a `src/utils/path-resolver.ts` module to handle `PROJECT_ROOT` determination.
- Update `src/daemon.ts` to initialize the path resolver.
- Refactor all tools in `src/tools/` to use the path resolver.
- Update `package.json` with `bin` configuration.
- Ensure `role-registry.json` and `role-models.json` resolution honors the CWD.

## 4. Acceptance Criteria
- User can `npm install -g .` (or link) the FirmOS repo.
- User can `cd /path/to/another/firmos/project` and run `firmos`.
- The daemon correctly finds `company/roles` and `conductor/` files in the target project, NOT the global installation directory.
- Running `firmos` in a non-project directory results in a helpful error.

## 5. Out of Scope
- Creating new projects (`firmos init`) is out of scope for this track (focus is on running existing ones).
- Multi-project workspaces (monorepos) support is out of scope.