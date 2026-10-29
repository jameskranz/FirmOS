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

### B. Roadmap App
*   **Description:** A user-friendly web application designed to visualize and manage the product roadmap, providing a centralized platform for product managers, stakeholders, and development teams to understand strategic direction, track progress, and collaborate on initiatives.
*   **Security Considerations:**
    *   **Authentication & Authorization:** Implement strong password policies, MFA, RBAC with least privilege, robust session management, and protection against brute-force attacks.
    *   **Data Handling:** Encrypt sensitive data at rest and in transit. Classify data, validate all user inputs to prevent injection attacks, and implement comprehensive logging for auditability.
    *   **Input Validation & Output Encoding:** Strict server-side and client-side validation, context-aware output encoding to prevent XSS, and Content Security Policy (CSP).
    *   **API Security:** Implement rate limiting, secure API gateways, robust authentication/authorization for all endpoints, and non-verbose error handling.
    *   **Deployment & Infrastructure:** Adhere to cloud security shared responsibility model, implement network segmentation, regular patching, security audits, and secure configuration management.
    *   **Compliance:** Identify and adhere to relevant regulatory and industry compliance requirements (e.g., GDPR, SOC2).
    *   **Reporting & Export:** Enforce strict authorization for data export and sanitize exported content.
    *   **Dependency Security:** Regular scanning and updating of all third-party dependencies.
    *   **General Practices:** Integrate security by design, conduct formal threat modeling, incorporate security testing (SAST, DAST, pen testing), establish vulnerability management, and develop an incident response plan.
*   **Architectural Considerations (Feedback Incorporated):**
    *   **Database Scalability:** Detail specific scaling strategy (vertical/horizontal, sharding, replicas) for chosen database (e.g., PostgreSQL, MongoDB), considering projected load and data growth.
    *   **API Design:** Define API paradigm (RESTful, GraphQL, gRPC), embedding security best practices (rate limiting, auth, input validation) from inception. Detail external integration mechanisms (OAuth, secure credential management).
    *   **Real-time Capabilities:** Incorporate technologies like WebSockets or SSE for real-time updates for collaborative features (comments, live updates) to ensure data consistency.
    *   **Reporting & Export:** Implement asynchronous processing (message queues, worker processes) for computationally intensive report generation and data export to maintain application responsiveness.
    *   **Granular Authorization:** Define authorization matrix for object-level permissions, beyond purely role-based, to meet future business needs.
    *   **Observability & Monitoring:** Design and implement a robust logging and monitoring framework (application, security, performance, infrastructure metrics) from the outset, specifying tools (e.g., ELK, Prometheus/Grafana).
    *   **Extensibility:** Ensure data model and API are flexible and extensible to accommodate future enhancements (e.g., advanced dependency tracking, analytics integration) without major refactoring; consider event-driven architecture.
*   **Status:** Architectural Review Complete - Incorporating feedback into definition.

### C. Cross-Agent Context Sharing
*   **Description:** This feature enables the seamless sharing of context and data between different AI agents within the FirmOS ecosystem, improving collaboration and reducing redundant processing.
*   **Status:** Initial Requirements Drafted - Awaiting Architectural Review.



1. **Verify the Engine:** Run the daemon locally and use the HR Director to hire the `backend-architect.md` using the `save_file` tool.
2. **Test File Reading:** Create a dummy project spec (`docs/raw-idea.txt`). Issue a ticket to the Architect to `read_file` on the raw idea, and `save_file` an architecture document.
3. **Departmental Multi-Queue:** Transition to distinct queues to handle multiple distinct queues (e.g., `hr_queue`, `engineering_queue`) instead of a single `task_routing` queue, allowing for true asynchronous department handoffs.
