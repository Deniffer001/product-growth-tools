---
type: ADR
status: accepted
---

# Store the Operation Journal as private locked JSONL

The local Operation Journal lives at `$XDG_STATE_HOME/gkit/operations.jsonl`, or `~/.local/state/gkit/operations.jsonl` when the XDG root is unset, under a `0700` directory with `0600` Journal, lock, and recovery files. Reads and appends use the same short-lived exclusive ownership-token lock; each canonical JSON line is fully written and file-synced, with the parent directory synced when storage is created. A stale lock is quarantined only when its recorded PID is definitively absent, while a live or uncertain owner blocks access.

JSONL is an initial implementation choice for local runtime facts, not the storage model for the entire Growth Workspace or a requirement that Project Activity and Project Memory share the same file.
