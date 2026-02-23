# Initial Concept
let's setup FirmOS

# FirmOS: Product Definition

## Vision
FirmOS is an autonomous, multi-agent AI development environment modeled after a corporate organizational chart. It replaces monolithic AI interactions with a decentralized, asynchronous, and message-driven ecosystem of specialized, ephemeral agents to manage the full software development lifecycle (SDLC).

## Target Audience
- **Solo Developers:** A powerful local-first companion for individual project management and execution.
- **Dev Teams:** A collaborative environment for orchestrating complex, multi-stage workflows across specialized AI personas.
- **Enterprise SDLC:** A scalable automation engine for large-scale software engineering operations.

## Value Proposition
- **Macro/Micro-Loop Efficiency:** Decouples high-level task handoffs (Macro-loops via RabbitMQ) from autonomous intra-task execution (Micro-loops via Native Tool Calling), ensuring cost control and operational focus.
- **Auditable & Asynchronous Orchestration:** Every agent action is tracked via a message broker, providing a transparent and durable audit trail of the entire development process.
- **Specialized Agent SLAs:** Agents are defined by strict Markdown-based Service Level Agreements (SLAs), ensuring predictable data input/output and clear functional boundaries.
- **Hierarchical Model Intelligence:** Dynamically resolves Gemini model tiers (MAX, HIGH, MEDIUM, LOW) based on role seniority and task complexity, optimizing for both reasoning depth and operational cost.
- **Autonomous Loop Resilience:** Integrated loop monitoring identifies stalled processes and dynamically extends execution limits for complex, progressing tasks.

## Core Features & Roadmap
- **Native Toolchain:** Agents interact with the filesystem via JSON-schema function calls (`save_file`, `read_file`, `list_directory`).
- **Orchestrator Daemon:** A central engine managing RabbitMQ connections, agent initialization, and tool execution.
- **Roadmap Priorities:**
    - **HITL Gates:** Human approval checkpoints for critical tool calls and task handoffs.
    - **Long-term Memory:** Persistent project context and per-agent memory.
    - **Queue Expansion:** Multi-queue handling for distinct "departments" (e.g., HR, Engineering).
    - **Horizontal Swarm:** Scaling to massive, hierarchical agent structures.

## Technical Foundation
- **Asynchronous Communication:** RabbitMQ (amqplib) manages the Macro-workflow.
- **Core Engine:** Node.js (ESM) daemon orchestrating Gemini-based chat sessions.
- **Decoupled Identity:** Agent personas are stored as standalone Markdown files, separate from the core orchestrator logic.
