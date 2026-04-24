---
name: gsc-cli
description: Read Google Search Console provider truth through a schema-first JSON CLI.
---

## When to use

Use `gsc` for raw Google Search Console facts: accessible properties, submitted sitemaps, URL inspection, and Search Analytics rows.

Do not use this CLI for SEO recommendations, attribution conclusions, paid-search classification, or product decisions. Keep those in the agent workflow above the provider read layer.

## First command

Run readiness before provider reads:

```bash
gsc doctor dataset readiness
```

## Install this skill

When this CLI is already available but the current project has not registered its skill, install the bundled skill into the project's `.agents/skills` root:

```bash
gsc skill install
```

Use `gsc skill install --global` only when the user explicitly wants a user-wide skill install.

## Discover commands

Use schema discovery instead of guessing command shapes:

```bash
gsc --schema
gsc --schema=.search.dataset.analytics
gsc --schema=.skill.install
```

## Common reads

```bash
gsc property dataset sites
gsc sitemap dataset sitemaps --site-url sc-domain:example.com
gsc sitemap entity sitemap --site-url sc-domain:example.com --feedpath https://example.com/sitemap.xml
gsc inspection entity url --site-url sc-domain:example.com --inspection-url https://example.com/docs/seo
gsc search dataset analytics --site-url sc-domain:example.com --start-date 2026-03-01 --end-date 2026-03-31
```

## Output contract

Default output is JSON. Treat `--pretty` as human-only rendering.

Successful provider reads return `ok: true` with raw provider-shaped `data`. Errors return `ok: false` with a stable `error.code`, `error.message`, and optional `error.hint`.

## Failure handling

If credentials or provider access fail, run:

```bash
gsc doctor dataset readiness
```

If `provider_auth` appears, verify the service account has Search Console access and that the Search Console API is enabled.

If provider truth is unavailable, report it as unavailable. Do not infer GSC facts from another source.
