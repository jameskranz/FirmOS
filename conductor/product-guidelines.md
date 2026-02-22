# FirmOS: Product Guidelines

## 1. Communication Architecture

### A. Micro-Loop Prose (Intra-Agent)
Agents must prioritize high-signal output.
- **Style:** Technical & Terse.
- **Guideline:** Avoid conversational filler, preambles, and postambles. Focus exclusively on the technical rationale and the execution of tool calls.
- **Goal:** Minimize token usage and maximize clarity for both the daemon and human observers.

### B. Macro-Loop Protocol (Inter-Agent)
Task routing between departments (Macro-loops) utilizes a JSON-wrapped Markdown approach.
- **Format:**
  ```json
  {
    "target": "corporate-role",
    "request": "Markdown-formatted task description"
  }
  ```
- **Guideline:** The `target` must map to an existing corporate role defined in `company/roles/`. The `request` should follow the upstream agent's required "OUTPUT FORMAT" and the downstream agent's "INPUT" schema.

## 2. Agent Identity & UX

### A. Naming Conventions
To maintain the "corporate organizational chart" metaphor, all agent identities must use corporate job titles.
- **Examples:** `hr-director`, `product-manager`, `backend-architect`, `frontend-developer`.
- **Guideline:** New roles must be created under `company/roles/` following this nomenclature.

### B. User Experience & Visibility
The FirmOS environment must provide high-fidelity visibility into agent autonomy while maintaining a high-level overview.
- **Verbose Tool Logs:** The orchestrator must log every tool call (`read_file`, `save_file`, `list_directory`) in real-time, including arguments and execution results.
- **Progress Summaries:** Alongside verbose logs, agents should provide concise progress summaries at the completion of significant milestones within their micro-loops.

## 3. Tool Usage & Constraints

### A. Native Function Calling
Agents interact with the filesystem exclusively through strict JSON schema function calls.
- **Constraint:** Agents must not attempt to use "pseudo-tools" or bash commands for filesystem operations; they must use the provided native tools.
- **Security:** Agents are restricted to relative paths within the project workspace.

### B. Execution Boundaries (Micro-Loop Hard-Caps)
To prevent runaway token consumption:
- **Max Loops:** Every micro-loop is hard-capped (e.g., `MAX_LOOPS = 5`).
- **Guideline:** If an agent cannot complete a task within the loop limit, it must report a status update and yield back to the Macro-loop for potential reassignment or human intervention.