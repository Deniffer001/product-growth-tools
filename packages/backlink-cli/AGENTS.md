# backlink-cli/

## Shape

- `index.ts`: argc-powered backlink CLI entry point.
- `schema.ts`: schema-first command contract and global flags.
- `provider.ts`: DataForSEO Backlinks API adapter plus normalization.
- `handlers/`: command handlers for readiness, domain reads, and page reads.
- `lib/`: validation, errors, and profile env loading helpers.

## Boundary

- Keep this package provider-only and JSON-first.
- Do not add SEO scoring, authority scoring, link-building recommendations, storage, or reports.
- Backlink data is time-sensitive; every provider read must include `capturedAt`.

## Command Surface

- `doctor dataset readiness`
- `domain dataset summary`
- `domain dataset referringDomains`
- `domain dataset anchors`
- `page dataset summary`
- `page dataset backlinks`
- `page dataset anchors`
