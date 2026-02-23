# Implementation Plan: Dynamic Hiring & Task Evolution

## Phase 1: Infrastructure & Discovery Tools [checkpoint: d2590e4]
- [x] Task: Implement `ListRolesTool` in `src/tools/list-roles.ts`. 7e0ec9c
    - [x] Create unit tests for hierarchical role discovery.
    - [x] Implement tool to list roles, tasks, and model tiers.
- [x] Task: Update the daemon (`src/daemon.ts`) to listen to an `external_requests` queue. 9d7c8c6
    - [x] Add RabbitMQ connection/channel for the new queue.
    - [x] Create an integration test verifying external message consumption.
- [x] Task: Conductor - User Manual Verification 'Infrastructure & Discovery Tools' (Protocol in workflow.md) d2590e4

## Phase 2: Recruitment & Hiring Chain [checkpoint: 6ffba85]
- [x] Task: Define the "Intake Consultant" SLA and bootstrap it. 26fcd0a
    - [x] Role should map `external_requests` to internal tasks or recruitment needs.
- [x] Task: Define the "Recruiter" (Light) agent SLA. ebbf0e8
    - [x] Recruiter should use `list_roles` to find gaps.
    - [x] Recruiter should handoff to HR Director for high-fidelity SLA creation.
- [x] Task: Update the "HR Director" SLA to be explicitly "tasked" by the Recruiter. 45e6797
- [x] Task: Conductor - User Manual Verification 'Recruitment & Hiring Chain' (Protocol in workflow.md) 6ffba85

## Phase 3: Dynamic Onboarding Flow & Validation
- [x] Task: Reset role environment to baseline (HR Director + Intake Consultant only). ee78194
- [x] Task: Perform end-to-end validation of the "Request to App" flow. 8e73b94
    - [x] External request: "Build a roadmap app".
    - [x] Verify `intake-consultant` triggers `recruiter`.
    - [x] Verify `recruiter` triggers `hr-director` to hire `product/define`.
    - [x] Verify `product/define` starts the feature workbook.
- [x] Task: Conductor - User Manual Verification 'Dynamic Onboarding Flow & Validation' (Protocol in workflow.md) 83ca0d8

## Phase 4: Strategic Role Management & Tool Guidance
- [x] Task: Implement centralized `role-registry.json` with descriptions. 16befa6
- [x] Task: Implement mandatory `guidance` property for all tools in `BaseTool`. 15313 (build)
- [x] Task: Update HR Director with SDLC Primer and strategic hiring logic. 6c15a2a
- [x] Task: Finalize hierarchical core role organization (`hr/director`, `hr/recruiter`, `intake/consultant`). d9e086b
- [~] Task: Conductor - User Manual Verification 'Strategic Role Management' (Protocol in workflow.md)

## Phase: Review Fixes
- [x] Task: Apply review suggestions b28f6d8
