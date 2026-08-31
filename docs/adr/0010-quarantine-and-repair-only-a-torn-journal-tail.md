---
type: ADR
status: accepted
---

# Quarantine and repair only a torn Journal tail

Under the exclusive Journal writer lock, the Growth Capability Runtime may recover an incomplete final JSONL fragment by preserving its exact bytes in a recovery sidecar and truncating only that fragment before the next append. The Agent Projection exposes this as Journal Health beside the requested Operation Projection rather than changing the Operation, its linked Project Activity, or Project Memory. A complete invalid event, interior corruption, or illegal event order blocks Journal reads and writes instead of being guessed or discarded, so Workspace-level projections cannot silently inherit invented execution facts.
