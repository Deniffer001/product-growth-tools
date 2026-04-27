# Live Provider Validation

This repo should support real provider checks without committing provider secrets.

## Principle

Real credentials are local runtime inputs, not test fixtures. Keep them in a business profile:

```text
~/.config/product-growth-tools/profiles/<business>/.env
~/.config/product-growth-tools/profiles/<business>/credentials/
```

Repo-local `.env.live` is allowed only as a temporary compatibility profile and is gitignored.

## Setup

Create a business profile:

```bash
mkdir -p ~/.config/product-growth-tools/profiles/openclaw-web/credentials
cp profile.env.example ~/.config/product-growth-tools/profiles/openclaw-web/.env
```

Copy the OpenClaw web provider credentials into the profile credentials directory, then edit the profile `.env`.

Recommended profile filenames:

```text
~/.config/product-growth-tools/profiles/openclaw-web/credentials/gsc.json
~/.config/product-growth-tools/profiles/openclaw-web/credentials/google-ads.json
```

Set the profile name when running provider reads:

```bash
export PRODUCT_GROWTH_PROFILE=openclaw-web
```

For a repo checkout that should default to one business, put only the selector in ignored `.env.local`:

```bash
PRODUCT_GROWTH_PROFILE=openclaw-web
```

The CLI first reads `PRODUCT_GROWTH_PROFILE` / `PRODUCT_GROWTH_PROFILE_ROOT` from repo-local `.env.local` / `.env`, then loads `~/.config/product-growth-tools/profiles/$PRODUCT_GROWTH_PROFILE/.env`, then loads repo-local `.env.local` / `.env` as fallback values. Existing process env values always win.

For tests or custom layouts, override the profile root:

```bash
export PRODUCT_GROWTH_PROFILE_ROOT=/path/to/product-growth-profiles
```

## Google Search Console

Readiness:

```bash
bun run gsc doctor dataset readiness
```

Basic provider truth:

```bash
bun run gsc property dataset sites
bun run gsc search dataset analytics --start-date 2026-04-01 --end-date 2026-04-07 --dimensions "query,page" --rowLimit 10
```

If `GSC_SITE_URL` is not set in the active profile, pass `--site-url` explicitly.

## Google Ads

Install the Python provider once:

```bash
bun run google-ads provider action install
```

Readiness:

```bash
bun run google-ads doctor dataset readiness
```

Basic provider truth:

```bash
bun run google-ads customer dataset accounts
bun run google-ads campaign dataset performance --start-date 2026-04-01 --end-date 2026-04-07 --limit 10
bun run google-ads searchTerm dataset performance --start-date 2026-04-01 --end-date 2026-04-07 --limit 10
```

Set `GOOGLE_ADS_LOGIN_CUSTOMER_ID` only when the account actually needs MCC routing. A missing login customer should be treated as a warning unless the provider call proves it is required.

## SERP Snapshot

Set `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` in the active profile.

Readiness:

```bash
bun run serp-snapshot doctor dataset readiness
```

Basic provider truth:

```bash
bun run serp-snapshot query dataset results --query "typeless alternative for mac" --country US --language en --device desktop --os macos --depth 20
```

## Backlink

Set `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` in the active profile.
Backlinks API access also requires an active DataForSEO Backlinks subscription.

Readiness:

```bash
bun run backlink doctor dataset readiness
```

Basic provider truth:

```bash
bun run backlink domain dataset summary --target openclawai.io
bun run backlink domain dataset referringDomains --target openclawai.io --limit 20
bun run backlink page dataset backlinks --target https://openclawai.io/ --limit 20
```

## Sitemap Watch

This CLI does not need provider credentials. Use a local registry file.

```bash
bun run sitemap-watch registry dataset competitors --registry-file packages/sitemap-watch-cli/examples/myclaw.registry.json
bun run sitemap-watch snapshot dataset pages --registry-file packages/sitemap-watch-cli/examples/myclaw.registry.json --competitor myclaw
```

## Validation Order

1. Run all `--schema` checks first.
2. Run `doctor dataset readiness` for credentialed CLIs.
3. Run one low-volume read per provider.
4. Only then run broader live reads.

Never infer unavailable provider truth from another provider. If a live check fails, preserve the provider error and fix the readiness issue first.
