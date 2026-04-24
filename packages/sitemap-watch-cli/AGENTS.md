# sitemap-watch-cli/
> L2 | 父级: ../../AGENTS.md

成员清单
index.ts: argc-powered competitor sitemap snapshot CLI entry point
index.bdd.md: competitor sitemap snapshot CLI 的行为规格，定义 registry 读取、snapshot 输出、分类规则、错误边界与职责边界
schema.ts: schema-first sitemap-watch command contract and global flags
context.ts: CLI runtime context for output-mode selection
provider.ts: registry parsing, sitemap fetching, recursive expansion, and snapshot normalization
services.ts: lazy runtime service container for provider and output
output.ts: JSON-first output helpers with optional pretty rendering
examples/
  registry.example.json: OpenClaw 的 competitor registry 示例，当前已纳入 `myclaw.ai`
  myclaw.registry.json: 当前 Phase 1 的单竞品标准 registry，默认只跟踪 `myclaw.ai`
schema.test.ts: CLI schema discovery coverage
output.test.ts: output error-contract coverage for JSON and pretty modes
provider.test.ts: registry filtering, recursive sitemap expansion, and fail-closed snapshot coverage
handlers/
  registry.ts: registry dataset handler for active competitor inventory
  snapshot.ts: snapshot dataset and entity handlers for normalized current sitemap reads
lib/
  command-support.ts: shared command wrapper for stable error rendering
  errors.ts: shared machine-classified error contract and helpers
  errors.test.ts: error normalization coverage
  input-validation.ts: shared validators for registry paths, URLs, and timestamps
  input-validation.test.ts: registry path resolution and scalar validation coverage

运行约定
- provider-adjacent: 只暴露 competitor sitemap 当前快照，不在此处增加历史存储、diff、insight、routing 或执行动作
- 输出契约: 默认 JSON，`--pretty` 只做人类可读渲染，不改变数据语义
- 分类策略: Phase 1 只允许确定性规则分类，优先依赖 path、slug 与 registry 中的规则，不把 LLM 推理放进主链路
- 失败策略: 针对单次 snapshot 请求，任一目标 sitemap 抓取或解析失败时整批失败，不混入部分成功结果

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
