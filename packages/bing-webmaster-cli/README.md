# @deniffer/bing-webmaster-cli

Bing Webmaster raw-data CLI for product growth and SEO workflows.

```bash
bunx @deniffer/bing-webmaster-cli --schema
bunx @deniffer/bing-webmaster-cli site dataset sites
bunx @deniffer/bing-webmaster-cli traffic dataset rank --site-url https://example.com/
```

Credentials are loaded from CLI flags, process env, or product-growth profile env files:

```bash
BING_WEBMASTER_API_KEY=
BING_WEBMASTER_SITE_URL=https://example.com/
```

The CLI loads `.env.local` and `.env` from the invocation workspace, plus
`~/.config/product-growth-tools/profiles/<profile>/.env` when
`PRODUCT_GROWTH_PROFILE` is set.

This package is read-only. It does not submit URLs, submit sitemaps, verify
sites, mutate crawl settings, or own reports/storage/SEO recommendations.
