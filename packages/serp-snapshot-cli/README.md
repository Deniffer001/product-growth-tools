# @deniffer/serp-snapshot-cli

Google SERP snapshot CLI for SEO and GEO workflows.

```bash
bunx @deniffer/serp-snapshot-cli --schema
bunx @deniffer/serp-snapshot-cli doctor dataset readiness
bunx @deniffer/serp-snapshot-cli query dataset results --query "typeless alternative for mac" --country US --language en --device desktop --os macos
```

## Credentials

The first provider is DataForSEO:

```bash
SERP_PROVIDER=dataforseo
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...
SERP_DEFAULT_COUNTRY=US
SERP_DEFAULT_LANGUAGE=en
```

The CLI loads the same product-growth profile env files as `gsc-cli` and
`google-ads-cli`.

## Boundary

`serp-snapshot` only returns current provider-adjacent SERP facts. Higher-level
agents own keyword prioritization, page strategy, reporting, and outcome joins.
