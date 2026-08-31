---
type: ADR
status: accepted
---

# Use OKF Markdown for the first Growth Documents

The first Growth Documents are ordinary OKF Markdown files and their file contents are authoritative. External Agents use normal filesystem and document tools to find, read, and edit them; gkit does not introduce a document database, private document format, or revision service for the initial asynchronous collaboration slice. This supersedes ADR-0020's SQLite-first direction because Product Workspace continuity no longer depends on a Project Store.
