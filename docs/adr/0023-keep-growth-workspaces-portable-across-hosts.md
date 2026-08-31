---
type: ADR
status: accepted
---

# Keep Growth Workspaces portable across hosts

gkit owns the logical Growth Workspace for a Product, while the environment that stores and exposes it is a host. The first physical form is a portable directory of authoritative OKF Markdown Growth Documents and referenced artifacts that can stand alone or live inside an existing workspace; local filesystems and a future Gesso environment are hosts rather than dependencies of the Growth domain. We chose this boundary so gkit is not coupled to the current celados workspace, Lore, `ctx`, or Gesso infrastructure, while preserving one product model across local and managed execution.
