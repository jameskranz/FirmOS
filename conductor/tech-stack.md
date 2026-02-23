# FirmOS: Technology Stack

## Core Language & Runtime
- **TypeScript:** The primary language for the FirmOS orchestrator.
- **Node.js:** The execution environment for the orchestrator.
- **ES Modules (ESM):** Modern module system (`type: module` in `package.json`).

## AI & Orchestration
- **Google Gemini SDK (`@google/generative-ai`):** The core intelligence engine with full TypeScript support.
- **Hierarchical Multi-Model Orchestration:** Supports dynamic Gemini model tiers (MAX, HIGH, MEDIUM, LOW) resolved per agent role and task.
    - **Tier Mapping (`model-tiers.json`):** Decouples abstract effort levels from specific model versions (e.g., `MAX -> gemini-3-pro-preview`).
    - **Role Mapping (`role-models.json`):** Maps roles or specific tasks to tiers (e.g., `architect/review -> HIGH`).
    - **SLA Resolution:** Supports hierarchical pathing (`company/roles/<family>/<task>.md`) falling back to base family SLAs.
    - **Development Override:** Global `FIRM_OS_MODEL_OVERRIDE` environment variable for cost-controlled local development.
- **Automated Fallback:** Built-in resilience that automatically downgrades to the default Flash model if a specialized model request fails.
- **Native Tool Calling:** Leverages Gemini's function-calling capabilities for direct environment interaction.

## Communication & Messaging
- **RabbitMQ:** The asynchronous backbone for "Macro-loop" task routing and inter-departmental handoffs.
- **amqplib:** The official Node.js client for RabbitMQ.

## Environment & Configuration
- **dotenv:** Managing API keys (`GEMINI_API_KEY`) and infrastructure connection strings.
- **Markdown-based SLAs:** Agent definitions and system prompts are stored as structured Markdown files in `company/roles/`.

## Storage & Environment Interaction
- **Local Filesystem:** Agents interact directly with the local codebase and project files through native FS-wrapped tools.