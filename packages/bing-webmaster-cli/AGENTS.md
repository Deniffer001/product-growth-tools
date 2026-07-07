# bing-webmaster-cli/
> L2 | parent: ../../AGENTS.md

Inventory
index.ts: argc-powered Bing Webmaster CLI entry point
schema.ts: schema-first Bing Webmaster command contract and global flags
context.ts: env loading and typed runtime context
client.ts: Bing Webmaster JSON/HTTP transport and typed client factory
services.ts: lazy service container for Bing client and output
output.ts: JSON-first output helpers with optional pretty rendering
handlers/
  doctor.ts: local runtime and provider readiness diagnostics
  site.ts: user site dataset handlers
  traffic.ts: rank, query, page, and query-page traffic read handlers
  crawl.ts: crawl stats, crawl issues, and crawl settings read handlers
  link.ts: inbound link count and detail read handlers
  sitemap.ts: feed/sitemap read handlers
  url.ts: URL index and traffic read handlers
lib/
  argc-compat.ts: compatibility boundary for older agent command shapes
  command-support.ts: shared command wrapper for stable error rendering
  errors.ts: machine-classified provider error contract
  input-validation.ts: shared scalar input validators
  product-growth-runtime/profile.ts: profile-first env loading runtime

Conventions
- provider-only: expose Bing Webmaster read-only data without storage, sync, reports, or SEO interpretation.
- output contract: default JSON, `--pretty` only adds human-readable rendering.
- credentials: API keys live in local env/profile files; never commit credentials.
- mutation boundary: do not add Submit*, Add*, Remove*, VerifySite, SaveCrawlSettings, or FetchUrl commands in this package without an explicit scope change.

[PROTOCOL]: Update this header when package structure changes.
