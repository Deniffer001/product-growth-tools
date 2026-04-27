# @deniffer/backlink-cli

DataForSEO backlink raw-data CLI for product growth and SEO workflows.

```bash
bunx @deniffer/backlink-cli --schema
bunx @deniffer/backlink-cli doctor dataset readiness
bunx @deniffer/backlink-cli domain dataset summary --target openclawai.io
bunx @deniffer/backlink-cli domain dataset referringDomains --target openclawai.io --limit 20
bunx @deniffer/backlink-cli page dataset backlinks --target https://openclawai.io/
```

## Credentials

The first provider is DataForSEO:

```bash
BACKLINK_PROVIDER=dataforseo
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...
```

The CLI loads the same product-growth profile env files as `gsc-cli`,
`google-ads-cli`, and `serp-snapshot-cli`.

## Boundary

`backlink` only returns provider backlink facts. Higher-level agents own SEO
prioritization, authority interpretation, link-building strategy, reporting,
and joins with SERP, page, GSC, Ads, or PostHog data.
