---
type: ADR
status: accepted
---

# Ingest Source Facts deterministically and associate Projects explicitly

Fact Connectors asynchronously verify, normalize, and deduplicate external deliveries into immutable Product-scoped Source Facts; mutable current projections are derived separately, and ordinary fact ingestion does not require an Agent run. A GitHub pull request becomes associated with a Growth Project only through an explicit Project label, while unlabeled repository activity remains Product context rather than being guessed into a Project. We chose this over Agent-authored upserts because reliable synchronization must not depend on probabilistic interpretation, and over automatic semantic association because a plausible but wrong Project link would corrupt durable context.
