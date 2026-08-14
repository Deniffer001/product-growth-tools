---
type: ADR
status: accepted
---

# Use an Operation Journal for runtime facts, not Workspace memory

Every Growth Operation is recorded in one local durable Operation Journal that links its App Profile, capability, effects, provider attempt, outcome, cost, and Evidence. The Journal is the Growth Capability Runtime's execution fact source; Growth Project history records separate attributed Project Activities that may reference Operations and Evidence, while Project Memory is derived from those business facts. We chose this over a stateless CLI because Agents must recover and verify prior operations, and reject treating the Journal as the entire Workspace model because low-level provider calls cannot explain why a Growth Project advanced.
