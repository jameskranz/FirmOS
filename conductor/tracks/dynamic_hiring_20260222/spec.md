# Track Specification: Dynamic Hiring & Task Evolution

## 1. Overview
This track implements an autonomous "recruitment and onboarding" system for FirmOS. It allows the system to receive high-level "external" requests (e.g., "Build me a task tracker app") and dynamically hire the necessary roles and tasks to fulfill that request. This mimics the growth of a company from a single intake point to a specialized team.

## 2. Functional Requirements
- **External Request Queue**: A new RabbitMQ queue (`external_requests`) dedicated to receiving unstructured, plain-text requests from "clients" or "owners".
- **Intake Consultant Role**: A new agent responsible for processing `external_requests`. It analyzes the request and determines the next step (e.g., "Handoff to Product Manager" or "Trigger Recruitment").
- **Recruiter Agent (Light)**: A cost-efficient agent that identifies the *need* for a new role/task and defines its high-level requirements.
- **HR Director (Powerful)**: The existing HR Director will be tasked by the Recruiter to generate the final, high-fidelity SLA and perform the actual `hire_agent` tool call.
- **Role Listing Tool (`list_roles`)**: A new tool that allows agents to inspect the current organizational chart, including:
    - Role Families
    - Specific Tasks (e.g., `architect/review`)
    - Assigned Model Tiers
- **Dynamic Onboarding Flow**:
    - **Intake** -> **Recruiter** (if role missing) -> **HR Director** (hiring) -> **Target Role** (execution).
    - Example: Request "New App" -> Recruiter hires `product/define` -> `product/define` initializes work -> `product/define` then triggers the need for an `architect/review`.

## 3. Technical Requirements
- **Queue Implementation**: Update the daemon to listen to both `task_routing` (internal) and `external_requests` (external).
- **Tool Development**: Implement the `list_roles` tool in `src/tools/list-roles.ts`. It should read from `company/roles/` and `company/role-models.json`.
- **Role Re-structuring**: The initial bootstrap should only require the `hr-director` and the `intake-consultant`. All other roles should be "hired" on-demand.
- **Model Mapping**: Use the `LOW` or `MEDIUM` tier for the Recruiter and the `MAX` tier for the HR Director.

## 4. Acceptance Criteria
- A message sent to `external_requests` successfully triggers the hiring of a `product/define` role.
- The `list_roles` tool returns accurate information about existing roles, tasks, and tiers.
- The HR Director is only invoked when a formal SLA needs to be written (preserving `MAX` tier tokens).
- The system can "boot up" from just an Intake Consultant and an HR Director and build a team to handle a project request.

## 5. Out of Scope
- Dynamic decommissioning of roles (firing).
- Automated complexity-based pricing/cost estimation for the external user.
