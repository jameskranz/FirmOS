# Knowledge Base: Good Work Requests (Tickets)

This document tracks effective patterns for manual work requests (tickets) sent to the FirmOS orchestrator.

## 1. Macro-Loop JSON Schema

All manual work requests must follow the project's 'Macro-Loop Protocol' format:

```json
{
  "target": "corporate-role",
  "request": "Markdown-formatted task description"
}
```

### Fields:
- **target**: Must map to an existing corporate role defined in `company/roles/` (e.g., `hr-director`, `product-manager`).
- **request**: A detailed, Markdown-formatted description of the task.

## 2. Examples

### A. Hiring Ticket
```json
{
  "target": "hr-director",
  "request": "Please hire a 'Lead DevOps Engineer' for our swarm. They are responsible for CI/CD pipelines and infrastructure as code. Output their system prompt SLA in Markdown."
}
```

### B. PRD Update Ticket
```json
{
  "target": "product-manager",
  "request": "Update the PRD to include a section on 'Cross-Agent Memory'. Detail how agents should share context via a central JSON file."
}
```
