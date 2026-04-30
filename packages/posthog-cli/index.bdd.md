# posthog-cli 可复现查询执行 - BDD 规格

> Agent 需要把一次 PostHog provider read 变成可复现、可审计的原始证据目录，供上层 Growth OS attach 到 route/run/decision ledger；CLI 本身不生成业务洞察、报告或决策。
> 状态：**草稿 - 待确认**

## 范围边界

**包含：**
- 面向 Agent 的 PostHog 查询执行 artifact primitive
- request schema 校验
- 按 active product-growth profile 读取 provider 配置
- 执行只读 PostHog provider query
- 保存 request、command、stdout、stderr、raw result、normalized result 与 manifest
- 生成 provider/profile/cli_version/hash/status 等可审计元数据

**不包含：**
- OpenClaw route、run、decision 或 finding ledger
- finding、insight、recommendation、decision_rule 或业务报告
- 跨 provider join、ClickHouse projection、Growth OS inbox 或 human review
- PostHog 写入操作
- secret manager 的具体实现或真实凭证持久化

## 前提假设

- 新增最小命令面为：`query action run --request <request.json> --out <output-dir>`。
- 现有 `query dataset results` 继续负责 stdout JSON provider read；artifact action 只是把同一类 provider read 固化为目录。
- `PRODUCT_GROWTH_PROFILE` 仍由现有 profile runtime 加载；request 里的 `profile` 只能作为期望校验，不负责切换凭证。
- request 中只允许 generic metadata；Growth OS 的 route/run/decision 字段由 Growth OS ledger attach，不进入 provider CLI contract。

---

## 功能 1：执行可审计的 PostHog 查询

> Agent 需要把一次 PostHog query read 变成可复用证据目录，而不是只拿到一次性 stdout。

**场景 1.1：合法 request 生成完整 artifact 目录**
Given Agent 已提供合法的 PostHog 查询 request
  And active product-growth profile 可以访问 PostHog
When Agent 执行 `query action run`
Then 输出目录中包含 `request.json`、`command.json`、`stdout.txt`、`stderr.txt`、`raw-result.json`、`result.json` 与 `manifest.json`
  And `manifest.json` 标明 provider、operation、profile、cli_version、executed_at 与 status
  And `manifest.json` 包含 request_hash、query_hash 与 result_hash
  And stdout 中保留机器可读的 provider read envelope

**场景 1.2：request profile 与 active profile 不一致时停止执行**
Given Agent 的 request 声明了一个 profile
  And 当前 active product-growth profile 是另一个 profile
When Agent 执行 `query action run`
Then CLI 返回输入错误
  And manifest 标记为 failed
  And 不发起 PostHog provider query

**场景 1.3：provider 失败时仍保留失败 artifact**
Given Agent 的 request 合法
  And PostHog provider 返回认证、限流、网络或 provider 错误
When Agent 执行 `query action run`
Then 输出目录中仍包含 request、command、stderr、result 与 manifest
  And manifest 标记为 failed
  And 错误对象保留机器可区分的 code、message 与可选 hint
  And 上层 Agent 不需要把 provider 失败解释成业务没有数据

---

## 功能 2：保持 raw-data-only 边界

> Provider CLI 只负责 provider read 和证据保全，不吸收 Growth OS 的业务推理职责。

**场景 2.1：request 不接受 Growth OS 业务字段**
Given request 中包含 route_id、run_id、decision_id、finding_id、insight_summary、recommended_action 或 decision_rule
When Agent 执行 `query action run`
Then CLI 返回输入错误
  And manifest 标记为 failed
  And 不发起 PostHog provider query

**场景 2.2：generic metadata 不影响 provider query hash**
Given 两个 request 的 provider、operation、profile 与 input 完全相同
  And 它们只是在 generic metadata 上不同
When Agent 分别执行 `query action run`
Then 两次执行的 query_hash 相同
  And request_hash 可以不同
  And CLI 不解释 metadata 的业务含义

**场景 2.3：artifact 不生成业务 insight 或 report**
Given PostHog query 成功返回数据
When Agent 查看输出目录
Then artifact 中只包含 provider query 输入、原始结果、归一化结果、命令与 manifest
  And 不出现 finding、recommendation、decision_rule 或人类报告文件

---

## 功能 3：输出可被上层 ledger attach

> Growth OS 需要引用 provider artifact，而不是让 provider CLI 直接写 Growth OS ledger。

**场景 3.1：manifest 提供稳定 artifact refs**
Given Agent 已完成一次 artifact run
When Growth OS 读取 `manifest.json`
Then Growth OS 可以从 manifest 找到 request、command、stdout、stderr、raw-result 与 result 的相对路径
  And Growth OS 可以用 hash 校验证据没有漂移
  And Growth OS 自己负责把该目录 attach 到 route/run/decision ledger

**场景 3.2：CLI 不写 Growth OS ledger**
Given Agent 执行 `query action run`
When 命令完成
Then CLI 只写指定 output-dir 下的 provider artifact
  And 不创建 OpenClaw route manifest、decision context、analysis output、ClickHouse projection 或 inbox item
