---
type: ADR
status: accepted
---

# Retries create new Operations and do not reconcile history

Every retry creates a new runtime-generated Operation ID and may reference the prior operation through `retryOfOperationId`; it never appends execution events to, reuses, or replaces the prior identity. An unknown Operation changes only through an evidence-backed reconciliation event about that same Provider Attempt, and a later successful retry is not such Evidence. A Project Activity may explain why an Agent retried and a Growth Action may reference both Operations, but neither may rewrite their histories. The first PostHog tracer bullet permits unknown outcomes to remain unresolved and does not add a manual reconciliation command.
