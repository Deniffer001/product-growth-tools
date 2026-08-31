---
type: ADR
status: accepted
---

# Keep the first Operation Event vocabulary minimal and ordered

The first runtime tracer bullet uses only `operation_started`, `operation_not_dispatched`, `provider_attempt_started`, `artifact_recorded`, `operation_succeeded`, `operation_failed`, and `provider_outcome_unknown`. One Growth Operation crosses the Provider Module seam at most once; module-internal transport retries remain provider semantics, and a caller retry creates another Operation. The reducer rejects histories that do not start exactly once, cross the seam more than once, record runtime non-dispatch after the checkpoint, record provider outcomes before it, succeed without prior provider-response Evidence, or append execution events after a settled outcome. Journal order is authoritative and timestamps are descriptive only; complete invalid JSON, duplicate event identity, unknown schema versions, and illegal ordering block reads and writes rather than producing a best-effort projection.

Project events such as Hypotheses, Insights, Decisions, Growth Actions, and Playbook Runs do not enter this vocabulary; they belong to Project Activity and link to Operations or Evidence by identity.
