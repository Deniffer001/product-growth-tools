---
type: ADR
status: accepted
---

# Use closed Operation States and require Evidence for success

An Operation Projection is one of `received`, `not_dispatched`, `succeeded`, `failed`, or `unknown`, represented as a closed variant rather than independent status flags. `succeeded` requires provider success and the required Evidence or artifact receipt to be durable; provider success followed by Evidence publication failure is `failed` with `providerOutcome: confirmed_success`, so neither an Agent nor a Growth Skill can infer that retry is safe. A Provider Attempt without a durable result is `unknown`, while an Operation that has not crossed that checkpoint remains `received` until an explicit non-dispatched outcome is recorded.

These execution states remain distinct from Project Stage, Playbook Run progress, Growth Action outcome, and any interpretation recorded as an Insight.
