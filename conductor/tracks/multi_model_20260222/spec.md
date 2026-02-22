# Track Specification: Multi-Model Orchestration

## 1. Overview
This track enables FirmOS to orchestrate tasks across different Google Gemini models based on task complexity and role requirements. It allows for cost optimization and performance tuning by matching "heavy" reasoning tasks with more capable models (Pro) and "light" tasks with faster models (Flash).

## 2. Functional Requirements
- **Central Model Configuration**: A central registry mapping agent roles to their designated Gemini models.
- **Support for Multiple Model Tiers**:
    - Gemini 2.5 Flash
    - Gemini 2.5 Pro
    - Gemini 3 Flash
    - Gemini 3 Pro
- **Model Fallback Mechanism**: If a non-default model request fails, the system should automatically fall back to the default 'Gemini 2.5 Flash' model to ensure task completion.
- **Manual Ticket Overrides**: Manual JSON tickets can include a `model` field to override the default role mapping for specific high-priority or complex iterations.

## 3. Technical Requirements
- **Model Registry**: Implement a utility or configuration file to manage role-to-model mappings.
- **Daemon Refactoring**: Update `src/daemon.ts` to resolve the model name from the hierarchy: (Override in ticket > Central Mapping > Default).
- **Fallback Logic**: Implement error handling to catch model initialization or generation failures and attempt execution with the fallback model.

## 4. Acceptance Criteria
- The daemon logs the specific model name being used for each task.
- Tickets with a `model` field successfully override default mappings.
- Roles mapped to specific models correctly trigger those models.
- Failures in non-default models trigger a graceful fallback to `gemini-2.5-flash`.

## 5. Out of Scope
- Dynamic model selection based on automated "complexity" analysis of the prompt.
- Supporting non-Gemini models.
