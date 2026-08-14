---
type: ADR
status: superseded by ADR-0022
---

# Start the Project Store as local SQLite

The first authoritative Project Store is one local SQLite database owned by the Growth Workspace. Agent Projections and a future Gesso host must use the same Workspace module rather than create separate project stores; remote, replicated, or multi-writer storage waits for a demonstrated cross-machine continuity requirement. We chose this over JSONL because Project facts need indexed relationships and derived views, and over a cloud database because the first product has one operator and does not yet earn hosted identity, synchronization, or tenancy complexity.
