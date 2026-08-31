---
type: ADR
status: accepted
---

# Declare one App Profile selector in GROWTH.md

A Growth Workspace declares one non-secret `app_profile` selector in
`GROWTH.md`, and an External Agent passes that selector explicitly to gkit for
provider readiness and execution. The host owns the matching profile document
and secrets; neither gkit nor the Agent scans available profiles or guesses from
the Product name. This keeps the Workspace portable while making cold-start
execution deterministic and fail-closed.
