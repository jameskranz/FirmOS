# Track Specification: PRD Iteration and Hiring Loop

## 1. Overview
This track aims to establish a functional iteration loop for the FirmOS Product Requirements Document (PRD) using the orchestrator. It introduces a 'hiring' mechanism for new roles and a multi-stage review process, while maintaining a knowledge base of effective work request patterns for future automation.

## 2. Functional Requirements
- **Tool-Wrapped Hiring:** Implement or extend tools to allow agents (specifically the 'hr-director') to 'hire' new roles by creating Markdown SLAs in `company/roles/`.
- **PRD Review Loop:**
    - **Stage 1 (Drafting):** The 'Product Manager' agent drafts or updates the PRD based on manual work requests.
    - **Stage 2 (Technical Review):** A technical role (e.g., 'Senior Systems Architect') reviews the PRD for feasibility and technical alignment.
- **Manual Ticket Interaction:** Work requests (hiring tickets and PRD updates) will be manually written in the JSON format intended for RabbitMQ production use to simulate the final 'Macro-loop' behavior.
- **Knowledge Base:** Create and maintain `conductor/knowledge_base/good_ticket.md` to document successful work request structures and feedback.

## 3. Technical Requirements
- Extend the `src/daemon.ts` or tool definitions to formally support the 'hiring' flow.
- Ensure the `scripts/publish.ts` can be used to send these manual JSON tickets to the `task_routing` queue.
- Define the schema for the manual work requests to match the project's 'Macro-Loop Protocol'.

## 4. Acceptance Criteria
- A new role can be 'hired' using a manual JSON ticket and the `hr-director` agent.
- A PRD can be updated by the 'Product Manager' through a manual work request.
- A 'Technical Review' can be performed on the PRD by a technical agent.
- The `conductor/knowledge_base/good_ticket.md` file exists and contains initial observations.

## 5. Out of Scope
- Fully automated ticket generation (this phase is manual simulation).
- Integration of a frontend for ticket submission.
