# FirmOS: Technology Stack

## Core Language & Runtime
- **JavaScript (Node.js):** The primary runtime for the FirmOS orchestrator.
- **ES Modules (ESM):** Modern module system (`type: module` in `package.json`).

## AI & Orchestration
- **Google Gemini SDK (`@google/generative-ai`):** The core intelligence engine for all agent personas.
- **Gemini 2.0 Flash (Preview):** The default model for high-speed, cost-efficient reasoning.
- **Native Tool Calling:** Leverages Gemini's function-calling capabilities for direct environment interaction.

## Communication & Messaging
- **RabbitMQ:** The asynchronous backbone for "Macro-loop" task routing and inter-departmental handoffs.
- **amqplib:** The official Node.js client for RabbitMQ.

## Environment & Configuration
- **dotenv:** Managing API keys (`GEMINI_API_KEY`) and infrastructure connection strings.
- **Markdown-based SLAs:** Agent definitions and system prompts are stored as structured Markdown files in `company/roles/`.

## Storage & Environment Interaction
- **Local Filesystem:** Agents interact directly with the local codebase and project files through native FS-wrapped tools.