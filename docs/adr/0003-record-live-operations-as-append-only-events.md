---
type: ADR
status: accepted
---

# Record live Growth Operations as append-only events

The Operation Journal begins a Growth Operation after an Agent Projection has syntactically recognized a provider execution request and before dereferencing or semantically validating its input, App Profile, capability, or effects. Unrecognized projection syntax, discovery, doctor, and dry-run activity are not Growth Operations and stay outside the Journal. The initial event records only non-sensitive selectors, input references, and an input digest when one can be computed safely; immutable Operation Events continue through settlement or reconciliation so execution history cannot be rewritten by Project Activity, Project Memory, or a later Agent.
