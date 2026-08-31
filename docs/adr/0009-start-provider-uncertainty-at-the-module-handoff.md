---
type: ADR
status: accepted
---

# Start provider uncertainty at the Provider Module handoff

The Growth Capability Runtime durably records `provider_attempt_started` after all local preparation and immediately before calling the Provider Module. This checkpoint means execution ownership crossed the runtime seam, not that a network request is confirmed; after it exists, only an explicit Provider Module result may establish `not_dispatched`, while interruption or loss of the result projects to `unknown`. Cancellation before the checkpoint records `not_dispatched`; cancellation after it is forwarded to the Provider Module, whose explicit result wins, and otherwise remains `unknown` even after a hard exit.

Neither a Growth Skill, Project Activity, Project Memory, nor a later Agent may reinterpret that uncertainty, because business context and a runtime AbortSignal cannot prove what an in-process or subprocess Provider Module did after accepting control.
