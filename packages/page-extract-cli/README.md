# @deniffer/page-extract-cli

Page fetch and content extraction CLI for SEO and GEO workflows.

```bash
bunx @deniffer/page-extract-cli --schema
bunx @deniffer/page-extract-cli page entity extract --url https://example.com/blog/seo
bunx @deniffer/page-extract-cli page entity extract --url https://example.com/blog/seo --screenshot --screenshot-output ./artifacts/example.png
```

## Boundary

This package exposes normalized page extraction artifacts as JSON. It uses
`ctx` as the first execution provider, but keeps the output contract owned by
`page-extract` so higher-level SEO, pSEO, and GEO workflows can diff and join
page evidence without depending on raw `ctx` output.

The CLI is provider-adjacent and raw-data-first. It does not own reports,
storage, or content strategy decisions.
