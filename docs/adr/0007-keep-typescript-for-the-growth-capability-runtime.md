---
type: ADR
status: accepted
---

# Keep TypeScript for the Growth Capability Runtime

The Growth Capability Runtime remains a TypeScript module inside the headless Growth Workspace while adopting the event ordering, durable provider checkpoint, projection reducer, and recovery semantics proven on branch `prototype/rust-operation-runtime` at commit `9a75124`. The prototype showed that the reliability came from architecture rather than Rust; the existing TypeScript code already has the required durable-file, artifact, cancellation, validation, and adapter primitives, while a Rust core would add native distribution and cross-process integration costs without increasing leverage for Agent Projections, Workspace modules, or Provider Modules.

This decision does not require every future Workspace module or polyglot Provider Module to use TypeScript. Revisit the runtime language only if the TypeScript tracer bullet exposes a concrete failure the architecture itself cannot remove.
