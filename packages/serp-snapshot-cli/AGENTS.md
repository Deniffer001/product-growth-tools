# serp-snapshot-cli/

## Shape

- `index.ts`: argc-powered SERP snapshot CLI entry point.
- `schema.ts`: schema-first command contract and global flags.
- `provider.ts`: DataForSEO Google Organic SERP adapter plus normalization.
- `handlers/`: command handlers for `doctor`, single query, and batch reads.
- `lib/`: validation, errors, profile env loading, and schema selector helpers.

## Boundary

- Keep this package provider-only and JSON-first.
- Do not add storage, SEO scoring, keyword recommendations, or report synthesis.
- SERP data is time-sensitive; every snapshot must include `capturedAt`.

## Command Surface

- `doctor dataset readiness`
- `query dataset results`
- `batch dataset results`
