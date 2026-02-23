# FirmOS: Technology Stack

## Core Language & Runtime
- **TypeScript:** The primary language for the FirmOS orchestrator.
- **Node.js:** The execution environment for the orchestrator.
- **ES Modules (ESM):** Modern module system (`type: module` in `package.json`).

## AI & Orchestration
- **Google Gemini SDK (`@google/generative-ai`):** The core intelligence engine with full TypeScript support.
- **Multi-Model Orchestration:** Supports multiple Gemini model tiers (Flash, Pro) dynamically resolved per agent role.
    - **Default Tier:** Gemini 2.5 Flash for high-speed, cost-efficient processing.
    - **Advanced Tier:** Gemini 2.5 Pro / Gemini 3 Pro for complex reasoning and architectural design.
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