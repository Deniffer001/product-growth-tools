# product-growth-tools

Public CLI tools for product growth, SEO, paid search, and competitor discovery workflows.

## Packages

- `@deniffer/gsc-cli` - Google Search Console raw-data CLI.
- `@deniffer/google-ads-cli` - Google Ads raw-data CLI.
- `@deniffer/sitemap-watch-cli` - Competitor sitemap snapshot CLI.

## Install

```bash
bun add -d @deniffer/gsc-cli
bun add -d @deniffer/google-ads-cli
bun add -d @deniffer/sitemap-watch-cli
```

## Run

```bash
bunx @deniffer/gsc-cli --schema
bunx @deniffer/google-ads-cli --schema
bunx @deniffer/sitemap-watch-cli --schema
```

## Live Validation

Real provider credentials must stay local and gitignored. Use
[docs/live-validation.md](docs/live-validation.md) and `.env.live.example` to
copy an existing app's provider credentials into a local live profile.

## Boundary

These CLIs expose provider or provider-adjacent data as JSON. They should stay raw-data-first and avoid owning reports, storage, or product decisions.
