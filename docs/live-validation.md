# Live Provider Validation

This repo should support real provider checks without committing provider secrets.

## Principle

Real credentials are local runtime inputs, not test fixtures. Keep them in:

```text
.env.live
credentials/
```

Both are gitignored by the root `.gitignore`.

## Setup

Copy the template:

```bash
cp .env.live.example .env.live
mkdir -p credentials
```

Copy the OpenClaw web provider credentials into `credentials/`, then edit `.env.live`.

Recommended local filenames:

```text
credentials/openclaw-web-gsc.json
credentials/openclaw-web-google-ads.json
```

Do not use ad hoc shell exports when you want repeatable validation. Put stable local defaults in `.env.live`, then run commands with `set -a`.

```bash
set -a
source .env.live
set +a
```

## Google Search Console

Readiness:

```bash
bun run gsc doctor dataset readiness
```

Basic provider truth:

```bash
bun run gsc property dataset sites
bun run gsc search dataset analytics --start-date 2026-04-01 --end-date 2026-04-07 --dimensions "query,page" --row-limit 10
```

If `GSC_SITE_URL` is not set in `.env.live`, pass `--site-url` explicitly.

## Google Ads

Install the Python provider once:

```bash
bun run --filter @deniffer/google-ads-cli provider:install
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
