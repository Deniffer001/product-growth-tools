---
type: ADR
status: accepted
---

# Keep SOP orchestration in External Agent Skills

Growth Skills guide an External Agent through a growth SOP by reading Project Context, selecting and composing Growth Capabilities, interpreting Evidence, and proposing attributed Project Activity. gkit does not embed an LLM planner or let Skills bypass App Profile scope, provider execution, authorization, or Evidence rules; the Agent host may change without changing Workspace facts. This keeps non-deterministic reasoning outside the deterministic Capability Runtime while allowing provider integrations and SOPs to evolve independently.
