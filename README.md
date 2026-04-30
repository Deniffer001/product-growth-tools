# product-growth-tools

Public CLI tools for product growth, SEO, paid search, and competitor discovery workflows.

## Packages

- `@deniffer/gsc-cli` - Google Search Console raw-data CLI.
- `@deniffer/google-ads-cli` - Google Ads raw-data CLI.
- `@deniffer/backlink-cli` - DataForSEO backlink raw-data CLI.
- `@deniffer/page-extract-cli` - Page fetch and content extraction CLI.
- `@deniffer/posthog-cli` - PostHog product analytics raw-data CLI.
- `@deniffer/serp-snapshot-cli` - Google SERP snapshot CLI.
- `@deniffer/sitemap-watch-cli` - Competitor sitemap snapshot CLI.

## Install

```bash
bun add -d @deniffer/gsc-cli
bun add -d @deniffer/google-ads-cli
bun add -d @deniffer/backlink-cli
bun add -d @deniffer/page-extract-cli
bun add -d @deniffer/posthog-cli
bun add -d @deniffer/serp-snapshot-cli
bun add -d @deniffer/sitemap-watch-cli
```

## Run

```bash
bunx @deniffer/gsc-cli --schema
bunx @deniffer/google-ads-cli --schema
bunx @deniffer/backlink-cli --schema
bunx @deniffer/page-extract-cli --schema
bunx @deniffer/posthog-cli --schema
bunx @deniffer/serp-snapshot-cli --schema
bunx @deniffer/sitemap-watch-cli --schema
```

## PostHog

`@deniffer/posthog-cli` is a provider-only product analytics CLI for agent workflows. It returns JSON and leaves reports, storage, and product decisions to the consuming Growth repo or workflow layer.

```bash
bunx @deniffer/posthog-cli doctor dataset readiness
bunx @deniffer/posthog-cli project dataset event-definitions
bunx @deniffer/posthog-cli query action run --request ./request.json --out ./artifacts/posthog-query
bunx @deniffer/posthog-cli event dataset map --window 3d --limit 500
bunx @deniffer/posthog-cli event dataset counts --window 3d --limit 200
bunx @deniffer/posthog-cli funnel analyze --window 3d --events auth.signup,onboarding.started,purchase.completed
bunx @deniffer/posthog-cli audit dataset instrumentation --window 3d --events auth.signup,purchase.completed
```

With a product-growth profile, funnel presets can live in `~/.config/product-growth-tools/profiles/<business>/posthog.funnels.json`:

```bash
PRODUCT_GROWTH_PROFILE=openclaw-web bunx @deniffer/posthog-cli profile validate
PRODUCT_GROWTH_PROFILE=openclaw-web bunx @deniffer/posthog-cli funnel analyze --window 3d --preset signup_to_paid
PRODUCT_GROWTH_PROFILE=openclaw-web bunx @deniffer/posthog-cli audit dataset instrumentation --window 3d --preset signup_to_paid
```

Use `--from YYYY-MM-DD --to YYYY-MM-DD` instead of `--window` for calendar-range reads.

## Live Validation

Real provider credentials must stay local and gitignored. Use
[docs/live-validation.md](docs/live-validation.md) and `profile.env.example` to
copy an existing app's provider credentials into a business profile.

## Boundary

These CLIs expose provider or provider-adjacent data as JSON. They should stay raw-data-first and avoid owning reports, storage, or product decisions.

Provider CLIs may write reproducible raw artifact directories for upper-layer systems to attach, but they must not write Growth OS ledgers, findings, recommendations, reports, or product decisions.
