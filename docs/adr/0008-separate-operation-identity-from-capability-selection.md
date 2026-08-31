---
type: ADR
status: accepted
---

# Separate Growth Operation identity from Capability selection

Every accepted Live Operation Intent receives a runtime-generated, single-use Operation ID, while a separate Capability ID selects what the Provider Module will execute. Project Activities, Playbook Runs, Growth Actions, and provider request IDs remain separate identities and may reference the Operation without becoming it. The current CLI replaces capability selection through `--operation-id` with `--capability-id`; runtime-owned identity gives every execution one authoritative history and prevents business-level Workspace objects from being overloaded with provider lifecycle semantics.
