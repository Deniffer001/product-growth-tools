---
type: ADR
status: accepted
---

# Replace the first Agent Projection without a compatibility layer

The CLI is the first Agent Projection of the headless Growth Workspace and may be redesigned rather than preserve historical command shapes. gkit currently has one direct consumer, so each new tracer-bullet surface will be proven with behavioural evidence before an atomic hard cut removes the old surface, aliases, and implementations. The PostHog tracer bullet replaces `posthog api call --operation-id posthog.query.run` with the provider-owned `posthog query hogql` command and does not retain an alias; long-lived dual interfaces would obscure which Workspace contract Agents should learn.
