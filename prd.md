# FirmOS: Architecture & Product Requirements Document

## 1. Executive Summary
FirmOS is an autonomous, multi-agent AI development environment modeled after a corporate organizational chart. Instead of a single monolithic prompt, FirmOS utilizes specialized, ephemeral AI agents (defined by Markdown system prompts) that communicate asynchronously via a message broker (RabbitMQ). Agents operate using "Native Tool Calling" to read, write, and explore the local filesystem to complete complex software development lifecycles (SDLC).

## 2. Core Architectural Concepts

### A. The 'Shared Brain' Directory Structure
Agent identities (System Prompts) are decoupled from target projects. FirmOS acts as the universal engine.

```
* FirmOS/ (The Orchestrator)
  * .env (Contains GEMINI_API_KEY)
  * package.json (amqplib, @google/generative-ai, dotenv)
  * src/
    * daemon.js (The core engine / message consumer)
    * publish.js (Ticket creator)
  * scripts/tickets/ (JSON task payloads)
  * company/roles/ (Nested Agent Personas)
    * hr/hr-director.md
    * product/product-manager.md
    * engineering/backend-architect.md
    * engineering/frontend-developer.md
```

### B. Macro-Loops vs. Micro-Loops
The fundamental execution model relies on two distinct loops to balance autonomy with cost-control.

1. **Macro-Loops (Inter-Agent Handoffs):** Managed by RabbitMQ. A ticket represents a massive unit of work (e.g., "Draft System Architecture"). When an agent finishes a macro-task, the Daemon acks the message and publishes the next phase to the next department's queue.
2. **Micro-Loops (Intra-Agent Tool Use):** Managed by the Daemon's `while` loop. While processing a single queue ticket, an agent can take multiple autonomous actions (e.g., Read a file -> Analyze -> Read another file -> Save a file). The Daemon intercepts these tool calls, executes the Node.js `fs` commands, and feeds the results back into the same chat session. Micro-loops are hard-capped (e.g., MAX_LOOPS = 5) to prevent runaway token burn.

## 3. The Toolchain (Native Function Calling)
Agents interact with the environment exclusively through strict JSON schema function calls injected into the Gemini API context. Currently Implemented Tools:

- **`save_file`**: Writes string content to a specified relative path. (Creates directories if they don't exist).
- **`read_file`**: Returns the text content of a specified relative path.
- **`list_directory`**: Returns an array of files and folders at a specified relative path.

## 4. The Orchestrator Daemon (src/daemon.ts)
The heart of FirmOS. Its responsibilities are:

1. Connect to RabbitMQ (`task_routing` and `error_tasks` queues).
2. Consume a JSON ticket `{ "role": "hr-director", "prompt": "..." }`.
3. Read the corresponding Markdown system prompt from `company/roles/`.
4. Initialize a `gemini-3-flash-preview` Chat Session with the `firmOsTools` array.
5. Send the prompt and enter the **Micro-Loop Engine**.
6. Execute requested `functionCalls` (fs.readFile, fs.writeFile, etc.) and return the data to the model.
7. Terminate the loop when the model outputs raw text instead of a tool call, or hits `MAX_LOOPS`.
8. `ack` the message on success, or route to `error_tasks` on fatal failure (404, 401, missing files).

## 5. Agent Prompts (The SLAs)
Every agent in `company/roles/` MUST adhere to a strict structure. They are essentially Service Level Agreements (SLAs) dictating data in/data out. Required Sections in every Markdown Role:

- **ROLE:** Title and core purpose.
- **CONTEXT:** Functional position in the macro-workflow.
- **CAPABILITIES:** Explicitly mention Native Tool Calling (`save_file`, `read_file`, etc.).
- **INPUT:** The exact format/schema expected from the upstream agent.
- **OUTPUT FORMAT:** Strict rules on how to format the tool arguments or final output.
- **CONSTRAINTS:** Strict prohibitions (e.g., "Do not write backend code", "Do not loop endlessly").

## 6. Development Roadmap (Next Steps for CLI)

## 7. Proposed Features

### A. Handoff Test
*   **Description:** A foundational feature to test the end-to-end workflow of feature definition and architectural handoff within the FirmOS environment. This verifies the Product Manager's ability to initialize a feature, add content, and submit for review.
*   **Status:** Pending Architectural Review - Awaiting detailed review of the updated feature workbook.



1. **Verify the Engine:** Run the daemon locally and use the HR Director to hire the `backend-architect.md` using the `save_file` tool.
2. **Test File Reading:** Create a dummy project spec (`docs/raw-idea.txt`). Issue a ticket to the Architect to `read_file` on the raw idea, and `save_file` an architecture document.
3. **Departmental Multi-Queue:** Transition to distinct queues to handle multiple distinct queues (e.g., `hr_queue`, `engineering_queue`) instead of a single `task_routing` queue, allowing for true asynchronous department handoffs.
