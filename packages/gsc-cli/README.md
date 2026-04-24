# @deniffer/gsc-cli

Google Search Console raw-data CLI for product growth and SEO workflows.

```bash
bunx @deniffer/gsc-cli --schema
bunx @deniffer/gsc-cli search dataset analytics --site-url sc-domain:example.com --start-date 2026-03-01 --end-date 2026-03-31
```

Credentials are loaded from CLI flags or local environment files. Do not commit credentials.

Credential resolution:

```bash
GSC_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
GSC_CREDENTIALS_FILE=./credentials/gsc.json
GOOGLE_APPLICATION_CREDENTIALS=./credentials/gsc.json
GSC_SITE_URL=sc-domain:example.com
```

The CLI loads `.env.local` and `.env` from the directory where it is invoked.
