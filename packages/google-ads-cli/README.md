# @deniffer/google-ads-cli

Google Ads raw-data CLI for product growth and paid search workflows.

```bash
bunx @deniffer/google-ads-cli --schema
bunx @deniffer/google-ads-cli doctor dataset readiness --pretty
```

Install the Python provider dependencies before live Google Ads queries:

```bash
bunx @deniffer/google-ads-cli provider action install
```

If you are developing inside this repository, the package script delegates to
the same public command:

```bash
bun run provider:install
```

Credentials are loaded from CLI flags or local environment files. Do not commit credentials.

Credential resolution:

```bash
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
GOOGLE_ADS_JSON_KEY_FILE_PATH=./credentials/google-ads.json
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-ads.json
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_LOGIN_CUSTOMER_ID=1234567890
GOOGLE_ADS_PROVIDER_PYTHON_BIN=/path/to/python3
```

The CLI loads `.env.local` and `.env` from the directory where it is invoked.
By default the installer creates a package-managed `.venv` and `doctor dataset
readiness` checks that the Google Ads Python SDK is importable. Set
`GOOGLE_ADS_PROVIDER_PYTHON_BIN` only when you want to use an external Python
environment instead of the managed one.
