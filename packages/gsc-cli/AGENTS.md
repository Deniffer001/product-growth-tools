# gsc-cli/
> L2 | 父级: ../../AGENTS.md

成员清单
index.ts: argc-powered Google Search Console CLI entry point
schema.ts: schema-first GSC command contract and global flags
client.ts: env loading, auth resolution, and typed GSC client factory
services.ts: lazy service container for GSC client and output
output.ts: JSON-first output helpers with optional pretty rendering
schema.test.ts: CLI schema discovery coverage
skill-drift.test.ts: agent skill examples against live schema discovery coverage
skill-install.test.ts: self-install bootstrap coverage for `.agents/skills`
client.test.ts: auth and default resolution coverage
output.test.ts: output error-contract coverage for JSON and pretty modes
lib/errors.test.ts: provider error classification coverage
lib/input-validation.test.ts: shared input validation coverage
handlers/
  doctor.ts: local runtime and provider readiness diagnostics for agent startup checks
  inspection.ts: URL inspection entity handler for raw inspection reads
  property.ts: property dataset handlers for accessible site inventory
  sitemap.ts: sitemap dataset and entity handlers for raw sitemap reads
  search.ts: search analytics dataset handler for raw Search Console reads
  skill.ts: bundled skill path, print, and install helpers for downstream agent registration
lib/
  command-support.ts: shared command wrapper for stable error rendering
  errors.ts: shared machine-classified CLI error contract and helpers
  input-validation.ts: shared input validators and normalizers for provider calls
  schema-selector.ts: local schema selector compatibility layer for focused schema discovery
  search-analytics.ts: request parsing and filter normalization helpers
skills/
  gsc-cli/SKILL.md: agent-facing usage protocol for safe GSC provider reads

运行约定
- provider-only: 只暴露 GSC 官方只读数据，不在此处增加存储、同步、报表或 SEO 解释层
- skill self-install: `gsc skill install` 只把包内 skill 复制到 `.agents/skills/product-growth-tools/<skill>`，不替代完整 skill manager
- 输出契约: 默认 JSON，`--pretty` 只做人类可读渲染，不改变数据语义
- 本地凭证: 服务账号 JSON 放在 `credentials/*.json`，保持 gitignored
- 本地环境: 调用目录的 `.env.local` / `.env` 可设置 `GOOGLE_APPLICATION_CREDENTIALS`、`GSC_CREDENTIALS_FILE` 或 `GSC_SERVICE_ACCOUNT_JSON`

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
