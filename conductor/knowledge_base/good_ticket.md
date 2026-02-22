# Knowledge Base: Good Work Requests (Tickets)

This document tracks effective patterns for manual work requests (tickets) sent to the FirmOS orchestrator.

## 1. Macro-Loop JSON Schema

All manual work requests must follow the project's 'Macro-Loop Protocol' format:

```json
{
  "role": "corporate-role",
  "prompt": "Markdown-formatted task description"
}
```

### Critical Implementation Learnings:
- **Field Names**: Ensure you use `"role"` (not `"target"`) and `"prompt"` (not `"request"`) to match the daemon's expected payload.
- **JSON Escaping**: When manually drafting JSON tickets with multi-line prompts, you MUST escape newlines (`\n`) and double quotes correctly. Failure to do so will cause RabbitMQ publishing errors.
- **Micro-Loop Support**: Agents are now capable of multi-turn interactions. Prompts can be complex, and agents will use tools to self-correct if a step fails.

## 2. Effective Tool Patterns

### A. The Workbook Pattern (Preferred)
Instead of asking an agent to edit a large file like `prd.md` directly, use the specialized workbook tools. This provides a durable history of the iteration and prevents "overwriting" bugs.

1. **Initialization**: `initialize_feature_work(featureName: "My Feature")`
2. **Iteration**: `add_feature_note(featureName: "My Feature", noteTitle: "...", content: "...")`
3. **Observation**: `read_feature_work(featureName: "My Feature")`

### B. The Handoff Pattern
Use the `publish_message` tool to move work between agents.
- **Example**: PM drafts a workbook -> PM uses `publish_message` to alert the Architect -> Architect reviews and adds notes.

## 3. Examples

### A. Hiring Ticket (HR Director)
```json
{
  "role": "hr-director",
  "prompt": "HIRE TASK: You must hire a 'qa-engineer'. Use the hire_agent tool. \n\nROLE DETAILS: ... \n\nINSTRUCTION: Output the full Markdown SLA using the hire_agent tool. Do not output conversational text."
}
```

### B. Feature Workbook Start (Product Manager)
```json
{
  "role": "product-manager",
  "prompt": "WORK TASK: Start a new feature iteration for 'Cross-Agent Memory'. \n\nINSTRUCTION: \n1. Use 'initialize_feature_work'. \n2. Use 'add_feature_note' for the initial draft. \n3. Use 'publish_message' to hand off to 'senior-systems-architect'."
}
```
