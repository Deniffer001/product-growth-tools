---
type: ADR
status: accepted
---

# Separate Project Activity from Growth Operations

Growth Project history records attributed Objectives, Hypotheses, Evidence, Insights, Decisions, Growth Actions, and Playbook Run outcomes as Project Activity, while the Operation Journal records provider execution facts. A Project Activity may reference many Growth Operations, and one Operation may supply Evidence to a larger investigation, but Provider Modules cannot directly update Project Stage or author Insights and Decisions. We chose this separation so business history explains why the project advanced without polluting Project Memory with low-level calls or allowing provider responses to masquerade as conclusions.
