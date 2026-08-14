---
type: ADR
status: accepted
---

# Version and strictly validate non-secret Operation Events

Every Operation Event has an exact versioned envelope containing `schemaVersion`, unique `eventId`, runtime-generated `operationId`, `eventType`, RFC 3339 `occurredAt`, and a strictly validated payload. Unknown versions or keys fail closed; Journal order, not identifiers or timestamps, determines execution fact order. Initial intent events retain only non-sensitive selectors and input-source references, while validated input digests, resolved capability, and effects appear at the Provider Attempt checkpoint.

Raw or unvalidated input, credentials, authorization material, unresolved provider details, and provider bytes never enter the Journal, Project Activity, or Project Memory; provider Evidence is published through the secret-scanning artifact module, persisted errors use stable codes with redacted messages, and Workspace records reference Evidence through non-secret identity and provenance.
