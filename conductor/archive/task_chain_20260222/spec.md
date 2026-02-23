# Track Specification: Automated Task Chains and Feedback Loops

## 1. Overview
This track introduces "Automated Task Chains" to FirmOS, enabling agents to formally hand off work to one another through intent-based tools. The primary goal is to automate the feedback loop between the Product Manager (PRD drafting) and the Senior Systems Architect (Technical Review), ensuring that each step in the feature lifecycle is tracked and routed correctly.

## 2. Functional Requirements
- **Intent-Based Handoff Tools:** Implement specialized tools to replace the generic `publish_message`:
    - `submit_for_review`: Used by the PM to request an architectural review of a feature workbook.
    - `submit_feedback`: Used by the Architect to return technical feedback to the PM.
    - `submit_for_approval`: Used by the PM to signal that a feature is ready for final human review.
- **Automated Routing Engine:** The daemon must intercept these intent-based tool calls and automatically publish the next message to the appropriate departmental queue with the necessary context (Feature Name, Workbook Path).
- **External State Management:** Implement a central store to track the lifecycle of active feature iterations.
    - **State Store:** A JSON-based manager (`company/state/workflows.json`) that records the current status, history of handoffs, and active agent for each feature.
    - **Abstraction:** The state manager must be abstract to allow for a future transition to a database (SQL/NoSQL) without changing agent SLAs.
- **Human-in-the-loop Gate:** The workflow will automatically yield to a "Human Approval" state when `submit_for_approval` is called, requiring manual intervention before finalizing the task.

## 3. Technical Requirements
- **WorkflowStateManager:** Create a class to handle reading/writing workflow states with an interface-driven approach.
- **Daemon Refactoring:** Update the tool execution engine in `src/daemon.ts` to recognize these specialized handoff tools and perform the corresponding RabbitMQ publishing and state updates.
- **Metadata schema:** Define a structured JSON schema for `workflows.json` to include `featureId`, `featureName`, `currentAgent`, `status`, `history`, and `workbookPath`.

## 4. Acceptance Criteria
- A feature iteration can be initialized and then successfully moved through a chain: PM -> Architect -> PM.
- The `workflows.json` file accurately reflects the status and history of the handoff at each step.
- The daemon correctly identifies the target role and queue based on the intent tool used.
- The loop pauses and signals the need for "Final Approval" once the PM submits the work.

## 5. Out of Scope
- Fully automated conflict resolution between agents.
- Real-time dashboard for workflow visualization.
