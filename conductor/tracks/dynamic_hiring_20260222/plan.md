# Implementation Plan: Dynamic Hiring & Task Evolution

## Phase 1: Infrastructure & Discovery Tools
- [ ] Task: Implement `ListRolesTool` in `src/tools/list-roles.ts`.
    - [ ] Create unit tests for hierarchical role discovery.
    - [ ] Implement tool to list roles, tasks, and model tiers.
- [ ] Task: Update the daemon (`src/daemon.ts`) to listen to an `external_requests` queue.
    - [ ] Add RabbitMQ connection/channel for the new queue.
    - [ ] Create an integration test verifying external message consumption.
- [ ] Task: Conductor - User Manual Verification 'Infrastructure & Discovery Tools' (Protocol in workflow.md)

## Phase 2: Recruitment & Hiring Chain
- [ ] Task: Define the "Intake Consultant" SLA and bootstrap it.
    - [ ] Role should map `external_requests` to internal tasks or recruitment needs.
- [ ] Task: Define the "Recruiter" (Light) agent SLA.
    - [ ] Recruiter should use `list_roles` to find gaps.
    - [ ] Recruiter should handoff to HR Director for high-fidelity SLA creation.
- [ ] Task: Update the "HR Director" SLA to be explicitly "tasked" by the Recruiter.
- [ ] Task: Conductor - User Manual Verification 'Recruitment & Hiring Chain' (Protocol in workflow.md)

## Phase 3: Dynamic Onboarding Flow & Validation
- [ ] Task: Reset role environment to baseline (HR Director + Intake Consultant only).
- [ ] Task: Perform end-to-end validation of the "Request to App" flow.
    - [ ] External request: "Build a roadmap app".
    - [ ] Verify `intake-consultant` triggers `recruiter`.
    - [ ] Verify `recruiter` triggers `hr-director` to hire `product/define`.
    - [ ] Verify `product/define` starts the feature workbook.
- [ ] Task: Conductor - User Manual Verification 'Dynamic Onboarding Flow & Validation' (Protocol in workflow.md)
