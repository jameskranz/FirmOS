# Track Specification: Upgrade to TypeScript

## 1. Goal
Transition the FirmOS project from JavaScript to TypeScript to enhance type safety, developer experience, and code maintainability for the multi-agent orchestrator.

## 2. Requirements
- Implement TypeScript (`tsc`) and `ts-node` for the development environment.
- Convert all core files (`src/daemon.js`, `src/publish.js`) to `.ts`.
- Integrate necessary types for `@google/generative-ai`, `amqplib`, and `node`.
- Maintain ESM compatibility.
- Incorporate TypeScript code style guidelines into the Conductor configuration.

## 3. Technical Constraints
- Must use `type: module` for compatibility with the existing project structure.
- Target Node.js v20+ features.
- Ensure RabbitMQ communication remains functional with typed interfaces.

## 4. Acceptance Criteria
- Full project builds without TypeScript errors.
- Unit tests pass for the converted files.
- Orchestrator daemon successfully executes an agent's micro-loop.
- TypeScript code style guide is present in `conductor/code_styleguides/`.
