---
type: ADR
status: accepted
---

# Share one Workspace and Runtime behind purpose-built Agent Projections

The CLI is the first projection of the shared Growth Workspace and Growth Capability Runtime; a future MCP or human interface may adapt the same modules but may not reimplement Project, policy, or provider rules. Capability discovery and operation inspection are shared, while execution remains purpose-built around each provider's native domain instead of a public `run(id, unknown)` interface. Provider execution returns a compact Operation Projection; `operations get`, `operations events`, and bounded `operations list` expose inspection and crash recovery, while immutable Operation Events remain a diagnostic surface rather than the default result.

Execution exits zero only for `succeeded`, one for other durable outcomes, and 130 after a gracefully recorded interruption; inspection exits zero whenever the requested durable facts were read successfully, regardless of Operation State. Stdout contains one structured Agent Projection and diagnostics remain on stderr. This preserves one business model across headless surfaces without flattening provider semantics or creating parallel implementations.
