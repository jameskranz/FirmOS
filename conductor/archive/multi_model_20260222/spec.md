# Track Specification: Multi-Model Orchestration

## 1. Overview
This track enables FirmOS to orchestrate tasks across different Google Gemini models based on task complexity and role requirements. It allows for cost optimization and performance tuning by matching "heavy" reasoning tasks with more capable models (Pro) and "light" tasks with faster models (Flash).

## 2. Functional Requirements
- **Hierarchical Model Configuration**: A central registry mapping agent roles and specific tasks to their designated Gemini models. Supports:
    - `<role_family>/<task>` -> specific model
    - `<role_family>` -> default model for family
    - `default` -> global default fallback
- **Dynamic Task-Based SLA Loading**: The daemon resolves system instructions from `company/roles/<role_family>/<task>.md` if available, falling back to `company/roles/<role>.md`.
- **Support for Multiple Model Tiers**:
    - Gemini 2.5 Flash / Pro
    - Gemini 3 Flash / Pro
- **Model Fallback Mechanism**: If a non-default model request fails, the system should automatically fall back to the default 'Gemini 2.5 Flash' model.
- **Dynamic Registry Updates**: The `hire_agent` tool can optionally specify a model, updating the registry automatically.
- **Manual Ticket Overrides**: Manual JSON tickets can include a `model` field to override all mappings.

## 3. Technical Requirements
- **Model Registry**: Update `company/models.json` and `ModelResolver` to support hierarchical lookups.
- **SLA Resolution**: Update `src/daemon.ts` to support the `<role_family>/<task>` pathing for system instructions.
- **Hiring Integration**: Update `src/tools/hire-agent.ts` to manage `company/models.json` entries.
- **Fallback Logic**: Robust error handling in the daemon micro-loop for model initialization and runtime failures.

## 4. Acceptance Criteria
- The daemon logs the specific model name being used for each task.
- Tickets with a `model` field successfully override default mappings.
- Roles mapped to specific models correctly trigger those models.
- Failures in non-default models trigger a graceful fallback to `gemini-2.5-flash`.

## 5. Out of Scope
- Dynamic model selection based on automated "complexity" analysis of the prompt.
- Supporting non-Gemini models.
