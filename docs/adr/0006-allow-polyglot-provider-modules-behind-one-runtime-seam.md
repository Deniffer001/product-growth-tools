---
type: ADR
status: accepted
---

# Allow polyglot Provider Modules behind one runtime seam

The Growth Capability Runtime defines one provider execution seam while allowing Provider Modules to run either in-process or through a controlled subprocess adapter. The seam standardizes cancellation, timeout, credential exposure, dispatch outcome, artifacts, and Operation Events, but leaves provider APIs, SDKs, pagination, and language choices inside each module. Provider Modules return Evidence to the Workspace through this seam and never own Project Activity or Project Memory.

This avoids coupling the runtime language decision to a simultaneous rewrite of every provider, avoids permanently forcing all providers through process startup when an in-process adapter earns its place, and keeps provider variation local without coupling the Workspace model to a language or SDK.
