---
type: ADR
status: accepted
---

# Use host document tools instead of gkit CRUD

External Agents discover and read `GROWTH.md` and Growth Documents through the host-provided `ctx` CLI, and create or edit OKF Markdown through Agent skills plus the host's file tools. Both the local and future Gesso hosts must supply these document capabilities; gkit will not add mandatory Workspace or Document CRUD commands. This keeps one portable document contract without duplicating host infrastructure or coupling Growth Documents to the gkit CLI.
