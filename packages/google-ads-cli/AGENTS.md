# google-ads-cli/
> L2 | 父级: ../../AGENTS.md

成员清单
index.ts: argc-powered Google Ads CLI entry point
schema.ts: schema-first Google Ads CLI contract and global flags
client.ts: env loading, auth resolution, and typed Google Ads client factory
services.ts: lazy service container for Google Ads client and output
output.ts: JSON-first output helpers with optional pretty rendering
tsconfig.json: package-local TypeScript settings for Bun and Vitest
requirements.txt: pinned Python provider dependencies
schema.test.ts: CLI schema discovery coverage
client.test.ts: auth and default resolution coverage
reporting.test.ts: GAQL builder coverage for first-class datasets
output.test.ts: output error-contract coverage for JSON and pretty modes
provider/
  google_ads_provider.py: Python official SDK bridge for service-account reads
handlers/
  ad-group.ts: ad-group performance dataset handler with stable GAQL shape
  customer.ts: accessible-customer dataset handler for raw account inventory
  campaign.ts: campaign performance dataset handler with stable GAQL shape
  doctor.ts: readiness dataset handler for local runtime and credential diagnostics
  keyword.ts: keyword performance dataset handler with stable GAQL shape
  query.ts: raw GAQL dataset handler for provider passthrough reads
  search-term.ts: search-term performance dataset handler with stable GAQL shape
lib/
  command-support.ts: shared command wrapper for stable error rendering
  errors.ts: shared machine-classified CLI error contract and helpers
  input-validation.ts: shared input validators and normalizers for provider calls
  reporting.ts: shared GAQL builders for stable reporting datasets
  schema-selector.ts: local schema selector compatibility layer for focused schema discovery

运行约定
- provider-only: 只暴露 Google Ads 官方只读数据，不在此处增加存储、报表、归因解释或业务决策
- 输出契约: 默认 JSON，`--pretty` 只做人类可读渲染，不改变数据语义
- 本地环境: 调用目录的 `.env.local` / `.env`
- Python provider: 优先使用包内 `.venv/bin/python3`，也可通过 `GOOGLE_ADS_PROVIDER_PYTHON_BIN` 指向外部 Python runtime
- 必需环境变量: `GOOGLE_ADS_DEVELOPER_TOKEN` + (`GOOGLE_ADS_JSON_KEY_FILE_PATH` 或 `GOOGLE_APPLICATION_CREDENTIALS` 或 `GOOGLE_ADS_SERVICE_ACCOUNT_JSON`)
- 可选默认值: `GOOGLE_ADS_CUSTOMER_ID`、`GOOGLE_ADS_LOGIN_CUSTOMER_ID`、`GOOGLE_ADS_LINKED_CUSTOMER_ID`
- Command surface: `doctor dataset readiness`, `customer dataset accounts`, `campaign dataset performance`, `adGroup dataset performance`, `keyword dataset performance`, `searchTerm dataset performance`, `query dataset gaql`

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
