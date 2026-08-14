---
type: ADR
status: accepted
---

# Do not infer live execution in Operation Projections

An Operation Projection reports only facts derivable from durable Operation Events and does not claim that a provider attempt is `running` from local process state, elapsed time, a PID, a lock, an Agent session, or Project Activity. A `provider_attempt_started` checkpoint without a durable outcome exposes provider outcome as unknown whether the original process is still executing or has exited. Accurate asynchronous status would require explicit lease or heartbeat facts and must not be inferred by a future Workspace or Memory projection.
