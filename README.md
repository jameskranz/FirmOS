# FirmOS: The AI Software Development Life Cycle (SDLC)

FirmOS is an autonomous software engineering organization in a box. It uses a swarm of specialized AI agents to plan, design, implement, and review software projects.

## Prerequisites

To run FirmOS, you need the following installed on your machine:

1.  **Node.js (v20+)**: The runtime for the CLI and Orchestrator.
2.  **Docker & Docker Compose**: Used to run the message broker (RabbitMQ) and database (PostgreSQL).
3.  **Git**: For version control and repository management.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/jameskranz/FirmOS.git
    cd FirmOS
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment:
    Copy the example environment file and add your API keys:
    ```bash
    cp .env.example .env
    # Edit .env and set GEMINI_API_KEY
    ```

4.  Start Infrastructure:
    Use Docker Compose to spin up the required services:
    ```bash
    docker-compose up -d rabbitmq postgres
    ```

## Usage

### 1. Link the CLI
To make the `firmos` command available globally (or just use `npm start`):
```bash
npm link
```

### 2. Start the Orchestrator
Launch the daemon and the Terminal User Interface (TUI):
```bash
firmos start
```

### 3. Check Status
Verify connectivity to RabbitMQ and the Orchestrator:
```bash
firmos status
```

### 4. Dispatch a Task
Send a request to the intake queue:
```bash
firmos -m "Build a simple Todo App using React and TypeScript."
```

### 5. Dynamic Scaling (DevOps)
You can spawn dedicated workers for specific repositories. This creates an isolated container that clones the repo and works exclusively on it.

**Command:**
```bash
firmos -m "Provision a worker for https://github.com/example/repo.git"
```
*Note: The `devops/manager` agent will handle this request and use the Docker API to spin up a new `firmos-runner` container pinned to that repo.*

**Verify:**
```bash
docker ps
# You should see a new container with label type=firmos-worker
```

## Architecture

FirmOS uses a micro-agent architecture:
*   **Orchestrator**: The central daemon that manages the agent loop.
*   **Roles**:
    *   `hr/director`: Chief Prompt Engineer & Organizational Architect.
    *   `devops/manager`: Infrastructure Manager (Docker/Scaling).
    *   `ceo`: Human-In-The-Loop (HITL) interface.
*   **RabbitMQ**: Message broker for asynchronous agent communication.
*   **PostgreSQL**: Persistent state storage for long-running workflows.
*   **Gemini Models**: The intelligence backend for all agents.

## Troubleshooting

*   **Connection Refused**: Ensure Docker containers are running (`docker ps`).
*   **API Errors**: Verify your `GEMINI_API_KEY` in `.env`.
