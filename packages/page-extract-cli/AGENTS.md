# page-extract-cli/

Agent-facing page fetch and content extraction CLI for SEO and GEO workflows.

## Files

- `index.ts`: argc-powered CLI entry point
- `schema.ts`: schema-first command contract and global flags
- `provider.ts`: ctx provider adapter and normalized artifact builder
- `handlers/page.ts`: page extraction handler
- `context.ts`: CLI runtime context for output mode and ctx binary selection
- `output.ts`: JSON-first output boundary
- `lib/input-validation.ts`: URL/provider validation
- `lib/errors.ts`: stable error normalization

## Boundary

- Keep `ctx` behind `provider.ts`; do not leak raw ctx output as the durable
  contract.
- Keep this package raw-data-first. Reports, strategy, scoring, storage, and
  page recommendations belong above this CLI.
- Screenshot capture is optional. Do not make screenshots a required part of
  extraction because ctx rendering credentials and browser rendering may be
  environment-specific.

## Command Surface

- `page entity extract`
