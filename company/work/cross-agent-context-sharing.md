# Feature Workbook: Cross-Agent Context Sharing

Created: 2026-02-23T00:19:54.495Z

---

## Initial Draft
**Timestamp:** 2026-02-23T00:19:55.402Z

Propose a shared JSON file in 'company/state/context.json' where agents can write high-level summaries of their progress for other agents to read.

---

## Architectural Review Feedback and Revised Approach
**Timestamp:** 2026-02-23T00:20:10.540Z

## Architectural Review Feedback and Revised Approach

**Date:** 2024-02-23

### Summary of Architectural Feedback

The Senior Systems Architect has strongly advised against the initial proposal of using a shared JSON file (`company/state/context.json`) for cross-agent context sharing. The key issues identified include:
*   **Concurrency and Data Integrity:** High risk of race conditions, data corruption, and partial writes without robust locking mechanisms.
*   **Scalability Bottleneck:** Severe I/O contention and performance degradation as the number of agents and update frequency increase.
*   **Lack of Granularity and Structure:** Unstructured data and inefficient access requiring parsing of the entire file for relevant information.
*   **Inefficient Change Notification:** Reliance on continuous polling, which is resource-intensive and introduces latency.
*   **Security:** No inherent mechanisms for access control or segregation of sensitive context.

### Revised Approach: Leveraging Existing Message Queue Infrastructure

Based on the architect's recommendations, the revised approach will focus on utilizing the existing RabbitMQ message queue system for cross-agent context sharing. This aligns with the `publish_message` tool already available to agents and offers significant advantages:

1.  **Event-Driven Context Sharing:** Agents will publish specific context updates as messages to dedicated topics or queues. Other agents can subscribe to these topics/queues to receive real-time updates.
2.  **Decoupling:** Agents are decoupled, enhancing system resilience and scalability.
3.  **Reliability:** Message queues provide robust guarantees for message delivery and persistence.
4.  **Scalability:** Designed to handle high-throughput, asynchronous communication efficiently.
5.  **Granularity:** Allows for sharing granular, specific pieces of context rather than large, undifferentiated summaries.

### Next Steps

The next iteration of this feature will involve defining the message formats and topics/queues for different types of context updates, ensuring clear guidelines for agents on how to publish and subscribe to relevant information.

---
