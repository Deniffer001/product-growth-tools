---
type: Proposal
title: gkit Vertical-Slice Plan — Single TS Runtime, Grown Not Built
description: >
  gkit 的另一版 0→1 方案:锁死六条不变量(profile/effect/envelope/落盘/无全局 run/spend outcome),
  纯 Bun/TypeScript 单进程,纵切生长、逐包退役,内建 search 与 polyglot runtime 延后。
status: active
version: 0.4
timestamp: 2026-07-14T10:13:32+08:00
resource: ./2026-07-13-gkit-provider-native-agent-surface.md
---

# gkit Vertical-Slice Plan — Single TS Runtime, Grown Not Built

本方案是 [provider-native-agent-surface](./2026-07-13-gkit-provider-native-agent-surface.md) 的对案。终态愿景大部分一致(单 binary、profile 即 App context、effect 门控、provider 语义不丢失、shell 即 code mode);分歧在**路径与两处终态修正**:

1. **纵切生长**:抽象必须有两个真实实例才允许存在,不预先铺设五层 core;
2. **逐包退役**:每当新面覆盖旧 CLI 的真实用法就删那一个包,没有原子 cutover;
3. **内建 search 延后**:发现面从生成的 manifest + markdown 文档开始,agent 用 `rg` 检索;
4. **polyglot runtime 延后**:v1 优先用 REST in-process TypeScript——Google Ads 的 GAQL、field metadata 与 Keyword Planner 都先通过真实账号 spike 验证;只有 spike 通过后才锁定无 Python 的 v1 路径;
5. **不发 npm**:内部工具,`bun link` 分发;发布是分发决策,与架构无关。

**Goal:** 一个 `gkit` binary,让 agent 替任一 App 安全地(不泄密、不误花钱)、低 context 成本地调用增长数据 provider;工具跟随真实增长工作流每周演化。

**Tech Stack:** Bun、TypeScript、argc v7.5.0、Valibot、Ajv、Vitest。v1 暂定无 Python、无 subprocess 协议、无 npm 发布物;Google Ads runtime 结论以 Slice 1.5 gate 为准。

**argc 边界:** 2026-07-13 已核对并固定当时最新稳定版 v7.5.0。gkit 使用其 `c`/`group`/`generateSchema`/`selectSchema` 生成离线发现 schema;public argv dispatcher 仍由 gkit 持有,因为 v7 原生 runner 的 dotted command、`@run`、YAML/error/exit 行为不满足本方案锁定的 spaced command 与单 JSON envelope contract。升级 argc 时先跑 schema/process golden,不静默改变 public surface。

---

## 1. 问题定义与稀缺资源

唯一用户是一个有 shell 的 agent,替多个 App 回答增长问题。稀缺资源按真实代价排序:

1. **钱** — DataForSEO 按调用计费;误调用是不可逆损失;
2. **凭证** — secret 进入 argv/transcript/artifact 即永久暴露;
3. **context tokens** — provider API 面有数千 operation,不能全量进模型;
4. **回合数** — 每次失败重试都是真实延迟。

不在清单上的:人类交互易用性、多语言纯洁性、npm 分发、第三方 plugin。它们不产生本方案的任何需求。

## 2. 六条不变量

以下六条从第 1 节直接推出,是本方案唯一"先于实例"锁死的设计。其余一切抽象等真实重复出现后再提炼。

### 2.1 执行必须绑定一个 App profile

```text
gkit --profile <app> <provider> ...    # 或 GKIT_PROFILE=<app>,flag 优先
```

- 一次 invocation 只绑定一个 profile;不隐式 merge、不 fallback。
- Profile 保存非敏感 provider defaults 和 `env:` secret references,不存明文 secret。
- 外部 secret runner(Bitwarden/1Password → env)负责注入;gkit 不实现 vault client。
- 发现类命令(describe、docs)不加载 profile、不解析 secret、不访问网络。

Profile 文件:`$XDG_CONFIG_HOME/gkit/profiles/<name>.json`(未设置时 `~/.config/gkit/profiles/<name>.json`)。

```json
{
  "version": 1,
  "name": "app-a",
  "providers": {
    "dataforseo": {
      "config": {},
      "policy": { "maxSpendUsdPerCall": "0.50" },
      "secrets": {
        "login": "env:APP_A_DATAFORSEO_LOGIN",
        "password": "env:APP_A_DATAFORSEO_PASSWORD"
      }
    },
    "posthog": {
      "config": { "host": "https://us.posthog.com", "projectId": "12345" },
      "secrets": { "apiToken": "env:APP_A_POSTHOG_TOKEN" }
    },
    "gsc": {
      "config": { "siteUrl": "sc-domain:app-a.com" },
      "secrets": { "credentialsJson": "env:APP_A_GSC_CREDENTIALS_JSON" }
    },
    "google-ads": {
      "config": { "customerId": "1234567890", "loginCustomerId": "0987654321", "oauthClientId": "xxx.apps.googleusercontent.com" },
      "secrets": {
        "developerToken": "env:APP_A_GOOGLE_ADS_DEVELOPER_TOKEN",
        "oauthClientSecret": "env:APP_A_GOOGLE_ADS_OAUTH_CLIENT_SECRET",
        "refreshToken": "env:APP_A_GOOGLE_ADS_REFRESH_TOKEN"
      }
    }
  }
}
```

注意:示例覆盖第一个纵切 provider(DataForSEO)——第一次端到端跑通时它就是参考实现。

### 2.2 Effect 由人显式标注,门控在 handler 之前

```text
read          默认允许
spend         必须 --allow-spend,且有不超过 profile hard cap 的金额上界
write         必须 --allow-write
destructive   必须 --allow-write --allow-destructive
```

Effect 不可按 HTTP method 推断(GSC Search Analytics 是 POST+read;DataForSEO Live 是 POST+read+spend)。生成器只产出候选,发布前必须人工 review;无法确认 effect 的 capability 不进入 manifest。

- `--allow-spend` 只是本次 invocation 的确认,不能写入 profile 作为永久授权。
- 每个启用 `spend` 的 profile 必须配置 `maxSpendUsdPerCall`(十进制字符串),每次 invocation 还必须显式传 `--max-spend-usd <decimal>`;运行时全部转为整数 micros 比较,禁止浮点金额运算。
- executable manifest 必须带 reviewed cost model,能从输入计算保守上界,或把 provider 原生 hard ceiling 写入请求。`--max-spend-usd` 只是本次授权上限,不能替代 cost model。算不出上界、上界超过 invocation/profile 任一 cap、或输入无法约束时,均在 transport 前以 `EFFECT_NOT_ALLOWED` 拒绝。
- 两个 cap 是 client-side preflight,不是 provider escrow。若 provider 报告的实际 cost 超过 reviewed/authorized 上界,仍按真实金额 settle ledger,并在同一个 durable settlement event 标记 `policyBreach:true`,返回不可重试的 `SPEND_POLICY_BREACH`。同一 capability + cost-policy revision 的后续调用在 secret resolution 前阻断;只有新的 reviewed cost-policy revision 才解除,不提供静默/手工 bypass。
- v1 对 `spend` 调用不做自动 retry。`--allow-spend`、金额上界和 ledger 授权必须在每次真实 dispatch 前重新成立。
- 固定执行顺序:解析 manifest record → 校验不含 secret 的 input/profile config → effect/cost gate → 只解析当前 provider 所需 secret → durable authorization → lazy-load adapter → transport。gate 失败时 secret resolver、provider module 和 transport 的调用次数都必须是 0。
- `--dry-run` 在 effect/cost gate 后停止,输出 redacted request plan 与计算出的上界;不解析 secret、不写 authorized event、不加载 adapter、不访问网络。

### 2.3 统一 envelope 与闭合错误码

成功:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "profile": "app-a",
    "provider": "dataforseo",
    "capability": "dataforseo.backlinks.bulk_ranks.live",
    "effects": ["read", "spend"],
    "cost": { "amount": "0.020000", "currency": "USD" },
    "artifact": null,
    "attemptId": "01J...",
    "spendOutcome": "confirmed_charged",
    "providerRequestId": "provider-request-id"
  }
}
```

失败:

```json
{
  "ok": false,
  "error": {
    "code": "EFFECT_NOT_ALLOWED",
    "message": "This capability can spend provider credits.",
    "hint": "Review the request, then rerun with --allow-spend.",
    "retryable": false,
    "outcome": "not_dispatched",
    "details": null
  }
}
```

错误码是**闭合集合**,每个失败场景有唯一归属。`details` 只保留经过 allowlist 投影与 redaction 的 provider 字段(如 request ID、HTTP status、provider code),禁止塞入原始 response、headers、完整 URL 或 exception object:

```text
CAPABILITY_NOT_FOUND   describe/call 的 ID 不在 manifest
INVALID_INPUT          input 未过 schema 校验(网络调用前)
PROFILE_ERROR          profile 缺失 / name-file 不一致 / schema 不合法 / secret env 未注入
EFFECT_NOT_ALLOWED     缺少对应 --allow-* gate,或 spend cost bound/cap 不成立(transport 前)
AUTH_FAILED            provider 返回 401/403
RATE_LIMITED           provider 返回 429;是否可重试取决于 effect/idempotency
TIMEOUT                请求超时;retryable 取决于 dispatch 阶段与 effect/idempotency
NETWORK_ERROR          连接层失败;retryable 取决于是否已 dispatch
UNKNOWN_OUTCOME        请求已 dispatch,但无法确认 provider 是否完成;retryable: false
SPEND_POLICY_BREACH    provider 报告实际 cost 超过授权上界;outcome: confirmed,retryable: false
CANCELLED              第一次 SIGINT 在 dispatch 前或已安全确认取消;retryable: false
PROVIDER_ERROR         provider 业务错误;安全投影在 details
LOCAL_IO_ERROR         artifact/ledger 本地读写失败;outcome 取决于 dispatch 是否已发生
INTERNAL_ERROR         gkit 自身缺陷;附复现信息
```

失败 envelope 的 `outcome` 是闭合枚举:`not_dispatched | confirmed | unknown`。`confirmed` 只表示 provider outcome 已知(可能成功、业务失败或已产生 effect),具体 effect/cost 事实放在 meta/ledger。任何 effectful 请求一旦越过 dispatch 边界,timeout、断连、进程中断或响应解析失败都不得声称“未发生”;不能从 provider request ID/状态查询确认时返回 `UNKNOWN_OUTCOME`。对 `spend` 的 unknown outcome 必须先人工/程序化对账,不能建议盲重试。

所有 spend success/error/artifact receipt 都必须返回 `attemptId`、`spendOutcome` 与可得的 `providerRequestId`,使 shell 输出能和 ledger 唯一关联。provider outcome 已确认但 settlement append 失败时,返回 `LOCAL_IO_ERROR`、`outcome:"confirmed"`、`retryable:false`,并携带这些字段及已完成的 artifact receipt;不得建议重新调用 provider。

Provider 执行命令的 shell process contract 也从第一天固定:

- stdout 恰好一个 JSON envelope 加换行;human diagnostics 只进 stderr。`--help`、`--schema`、`describe`、`docs` 仍按各自发现 contract 输出。
- `ok:true` 退出 0;任一规范化 `ok:false`(包括 argv/input 错误)退出 1。第一次 SIGINT 进入 graceful cleanup:dispatch 前返回 `CANCELLED`,effectful dispatch 后不能确认则返回 `UNKNOWN_OUTCOME`,输出 envelope 后退出 130。第二次 SIGINT/SIGKILL 属于 one-envelope contract 的唯一例外,悬空 authorized event 仍可在下次读取时识别为 unknown。
- transport、artifact 和 ledger 的清理完成后才输出最终 envelope;不得先报成功再异步落盘。

### 2.4 大结果落盘,secret 永不进入输出

- 大结果通过 `--out <path>` 落盘;stdout 只返回 receipt(absolute canonical path、bytes、sha256、cost、attempt ID/outcome)。同目录创建 mode `0600` 的临时文件,并持有 per-destination lock 覆盖 existence check、写入、flush/fsync、sha256 与 atomic rename 全过程。默认 no-replace;无 `--force` 的并发 writer 恰好一个成功,其余返回 `LOCAL_IO_ERROR` 且不得改变成功文件;`--force` 也必须串行。任一步失败都删除临时文件并返回失败 envelope。
- 日志只写 stderr。
- stdout、stderr、error/details 与 receipt 经过已解析 secret 及其派生形式的 redaction(至少覆盖 Basic base64、OAuth access token 与 URL-encoded value);redaction 有独立测试,覆盖异常路径。
- provider artifact 是原始事实,只做 streaming secret scan,不执行文本替换。未命中时落盘 bytes 必须与规定的 provider serialization 完全一致;命中已知 secret/派生 secret 时 fail closed、删除临时文件,不产出部分 artifact。
- Secret value 不进入 argv、不进入完整打印的 URL/header。
- in-process v1 的信任边界是**仓库内置、first-party reviewed provider**。只有 trusted core config/profile layer 读取 `process.env`(`GKIT_PROFILE`、XDG 路径与当前 provider 的 secret refs);adapter 获得冻结后的最小 config/credential view,不得自行扫 env。出现第三方或不可信 provider 时,必须先引入进程隔离/权限边界,不能直接装进当前进程。

### 2.5 没有全局 `run(id, unknown)`,provider 语义原样保留

- GAQL、HogQL、operation ID + native JSON 是各 provider 的自然接口,不 normalize。
- 编排(循环、分页、join、跨 App 比较)由 shell/jq/TS script 完成;不做 REPL、不做通用 code runner。
- 跨 App 比较 = 显式执行两个 profile 后在 shell join,绝不在一次 invocation 内混合。

### 2.6 Spend outcome 与账本先于成功响应

- 每次 spend dispatch 必须有稳定 `attemptId`,并在 transport 前持久化 authorized event;没有 durable authorization record 就不发请求。
- 终态必须是 `confirmed_charged | confirmed_not_charged | unknown`;成功 envelope 只对应已确认业务结果,不把“收到 HTTP response”等同于“未扣费”或“已完成”。
- provider request/task ID 一旦可得立即写账;进程崩溃留下的 authorized-without-settlement 视为 `unknown`,由 `gkit ledger`/shell 对账。
- 同一 `provider + capability + inputSha256` 存在未结算/unknown attempt 时,后续相同请求在 secret resolution 前阻断;必须先用 provider evidence 完成显式 reconcile,不能靠再次传 `--allow-spend` 绕过。
- artifact 写失败不反转 provider 事实:若调用已确认扣费,账本仍记 `confirmed_charged`,CLI 返回 artifact failure 并在 meta/error 中给出 attempt ID。

## 3. 发现面:reviewed executable manifest 是单一事实源

Agent 已经有 `rg`。从 Slice 1 起先固定可执行数据流;Slice 2 再把它接到可重建的 upstream generation:

```text
Slice 1: reviewed executable manifest
           -> runtime routing + input validation + effect/cost gate + describe

Slice 2+: pinned local upstream snapshot + reviewed exposure/effect/cost policy
           -> reviewed executable manifest
           -> runtime routing + input validation + effect/cost gate
           -> describe + markdown docs
```

同一条 capability 在 runtime、effect gate、describe 和 docs 中只能来自同一条 reviewed manifest record,禁止再维护手写 registry/handler schema 作为第二事实源。产物:

```text
generated/<provider>/manifest.json     # 唯一可执行清单:id/schema/effects/cost model/adapter key/revision
generated/<provider>/inventory.json    # 可选全量 contract 索引;不可路由、不可执行
docs/providers/<provider>/<area>.md    # 只从 executable manifest 渲染;agent 用 rg 检索
```

命令面:

```bash
gkit --schema                          # root:providers + 顶层命令,目标 < 2,000 tokens
gkit describe --id <capability-id>     # 一次展开一个 capability 的完整 schema 与示例
gkit docs [--provider <p>]             # 打印文档目录路径,agent 自行 rg
```

规则:

- upstream snapshot 固定在仓库内并记录 source URL、revision、checksum。普通 build/`--check` 完全离线且可字节稳定重建;联网更新只能走显式 `refresh:<provider>` 命令并产生可 review diff。
- generator 的 reviewed policy 是**构建输入**,runtime 不读取它;runtime 只读取已提交的 executable manifest。未 reviewed/无法确定 effect 或 cost bound 的 operation 可以进入 inventory,不能进入 executable manifest。
- 每条 review approval 绑定 upstream source checksum;source 变化时旧 approval 自动失效,对应 capability 在重新 review 前从 executable manifest 隐藏。
- describe/docs 完全离线,不加载 profile。
- **不实现 `gkit search`**。扩张门槛:eval 中 agent 用 `rg` + describe 的两步发现成功率 < 90% 时,才评估内建 BM25 search。

## 4. Provider 映射(全部 in-process TypeScript)

| Provider | Contract 来源 | 执行面 | 认证 |
|---|---|---|---|
| DataForSEO | 官方 OpenAPI(pinned) | `api call --operation-id <id> --input @req.json` | basic auth(login/password) |
| GSC | Google Discovery | `search-analytics query` 等 resource/method | service account JSON |
| PostHog | Query API + OpenAPI reads | `query hogql --input @query.json` | personal API token |
| Google Ads | 官方 REST reference(`googleAds:search`、`googleAdsFields:search`、Keyword Plan services),固定 API major version | `query gaql`(默认显式分页)、`fields search/describe`、经保留决策的 Keyword Planner read | OAuth2 refresh token + developer token;access token 作为派生 secret |
| Bing Webmaster | 现有 JSON REST API contract,WSDL 仅在 REST 不覆盖时考虑 | provider method + native input | 现有 API key 走 `apikey` query parameter(完整 URL 永不打印);未来采用 OAuth 时才用 Bearer |

关于 Google Ads 的暂定决策:v1 的 bounded read surface 先走 REST;默认使用可控的 `googleAds:search` 分页,不以 `searchStream` 一次吞入任意大结果。此决定必须通过 Slice 1.5 的真实账号 spike,并覆盖 OAuth refresh、manager account header、field metadata、request ID/error projection、分页和当前 Keyword Planner 用法。若 spike 失败,在实现前修改本方案;不预留没有第二实现的 `ProviderRuntime` seam。未来若开放 mutate、REST 无法覆盖必需能力或引入不可信依赖,再设计 polyglot/isolated runtime。

## 5. Spend ledger

钱是第一稀缺资源,从纵切第一天起记账:

```text
$XDG_STATE_HOME/gkit/ledger.jsonl      # 未设置时 ~/.local/state/gkit/ledger.jsonl
```

账本是 append-only attempt event stream,不是“成功调用列表”:

```json
{"type":"authorized","eventId":"...","attemptId":"...","ts":"...","profile":"app-a","provider":"dataforseo","capability":"...","manifestRevision":"...","costPolicyRevision":"...","inputSha256":"...","maxCostMicros":50000,"acknowledgement":{"allowSpend":true,"invocationMaxCostMicros":50000},"currency":"USD"}
{"type":"settled","eventId":"...","attemptId":"...","ts":"...","outcome":"confirmed_charged","costMicros":20000,"providerRequestId":"...","policyBreach":false}
```

- `authorized` 必须在 transport 前 durable;`settled` 在确认 `confirmed_charged | confirmed_not_charged | unknown` 后追加。悬空 authorized 记录按 unknown 处理。
- 每行 canonical JSON 由单次 append 写入;每个 event 有唯一 `eventId`,读取时去重;使用 ledger 级锁防并发 writer 交错,flush/fsync 后才继续。测试必须包含多个独立进程并发写。
- cost 使用整数 micros;unknown 时允许 `costMicros:null`,但保留授权上界与 request/task ID。
- `gkit ledger` 打印文件路径、未结算/unknown 数量与 active policy breaches。`gkit ledger reconcile --attempt <id> --outcome confirmed_charged|confirmed_not_charged --evidence-ref <non-secret-ref> [--cost-usd <decimal>] [--provider-request-id <id>]` 根据 provider evidence 追加 manual settlement event,不改写历史。`confirmed_charged` 必须提供 evidence 支持的 `--cost-usd`;缺金额时保持 unknown,拒绝 settlement。manual settlement 必须读取原 authorized event 的 cap/cost-policy revision,重新计算并持久化 `policyBreach`,与自动 settlement 使用同一 quarantine 规则。明细和聚合仍交给 shell/jq。
- v1 不做跨日预算/告警,但 §2.2 的单次 hard cap、相同输入 unknown 阻断与 policy-breach quarantine 是上线前置条件。

## 6. 实施计划

### 过渡规则(适用于所有 slice)

- gkit 作为新 workspace package `packages/gkit` 加入,根 `package.json` 的 workspaces **保持不变**——旧 CLI 在被逐个退役前始终可用。
- 全局命令通过 `cd packages/gkit && bun link` 提供。
- **退役是逐包的**:先把旧 CLI 当前命令逐条标为 `replace | keep | drop`。`replace` 必须有行为 golden 与真实调用验证;`drop` 由唯一消费者显式确认。满足后才删除 package、更新根 scripts,单独 commit。无需兼容 alias 或弃用期,但不能靠“看起来相似”判定覆盖。
- 抽象规则:第二个 provider 也先直接实现和跑通,再把两个真实 diff 摊开。只有已经重复且变化方向一致的代码才提炼;“出现第二个消费者”是允许抽象的下限,不是强制创建 `ProviderModule` 的触发器。
- 每个 slice 的验证顺序固定为:offline tests/fixtures → `doctor`/`--dry-run` → sandbox 或无副作用 probe → 最小真实调用。付费 live call 永远在最后。

### 2026-07-14 implementation checkpoint

- Slice 0 已落地:10 条 eval answer key(4 explicit provider / 4 business goal / 2 negative),两个 Slice 1 executable 用例都固定 `describe/docs → --dry-run → live` 顺序。
- Slice 1 的 repository/offline 部分已落地:`packages/gkit` binary、profile/effect gate、reviewed manifest、DataForSEO bulk-ranks adapter、统一 envelope、secret-safe atomic artifact、authorized/settled ledger、manual reconciliation、doctor/docs/schema 与进程契约均已有测试。
- 离线验收:package typecheck、87 个 package tests、workspace typecheck/全量 tests、schema `< 2,000 bytes` 与 generated docs byte-stability。
- 真实 profile bridge 已完成:保留旧 `profiles/clonesite.ai/.env`,新增不含 secret 的 `clonesite.ai.json` 与 `clonesite.ai-sandbox.json` descriptor,权限均为 `0600`;两个 profile 的 `doctor` 均通过并明确返回 `networkProbe:"unknown"`,没有发网络请求。
- Production 单 target dry-run 使用精确 invocation cap `$0.024036`,前后均无 ledger 或 artifact 副作用。官方当前 Backlinks 价格仍为 `$0.024/request + $0.000036/row`,与 reviewed cost policy 一致。
- Sandbox 真实 gate 已通过且费用为 `$0`:DataForSEO sandbox 返回固定 dummy result,不会按任意请求 target 回显结果;第一次 `clonesite.ai` 输入因此被严格 result validator 以 `PROVIDER_ERROR` 拒绝,但仍安全落盘并结算为 `confirmed_not_charged`。随后使用 sandbox 固定的三个 dummy targets 完成 `ok:true` 验证。此 friction 记录在案,不据此放宽 production result contract。
- Production 最小 live call 已完成:`clonesite.ai` 返回 `rank=55`,attempt `d9fe47a2-eaf8-4a99-9e7b-dd6353f5f31e`,provider request `07140512-2032-0347-0000-2f0c9a4fb51f`,实际费用 `$0.024036`,artifact `557 bytes` / SHA-256 `f67981b9fdedf6adae0b7069a41e64a15b4817390739765b2cd361e168f53f01`。Ledger 按顺序持久化 `authorized(max=24036 micros) → settled(confirmed_charged,24036 micros)`,无 policy breach。
- Gate 后 ledger 共 3 个已结算 attempt(两次 sandbox、一次 production),`unresolved=0`,`activePolicyBreaches=0`;production artifact 与 ledger 的 resolved/Basic/URL-encoded secret 扫描均为阴性。
- Slice 1 剩余 gate 是随后一周真实使用并记录摩擦点;在它完成前不进入 Slice 1.5 或 Slice 2,也不删除旧 CLI。

### Slice 0: 先写 eval,不写代码

**Files:**

- Create: `packages/gkit/evals/tasks.jsonl` — 10 个真实 prompt(近期增长工作里实际问过的问题):4 个明确 provider、4 个只描述业务目标、2 个 unsupported/negative。每条 key 至少包含 provider、capability ID、effects、理想命令序列、期望 envelope/artifact/error 与对应旧 workflow 的 `replace | keep | drop`。
- Create: `packages/gkit/evals/README.md` — 评测方法:人工带 agent 跑,记录发现步数、首条可执行命令正确率与 observable behavior 是否一致。

**验收:** 10 个 prompt 都有可复查的答案 key;不只校验命令能 parse,还校验 provider request、effect/cost gate、output/error/exit/artifact 行为。写不出来的 prompt 说明设计有缺口,先改设计。

```bash
git add packages/gkit/evals
git commit -m "feat: seed gkit eval tasks"
```

### Slice 1: 纵切——DataForSEO 单 operation 端到端

目标:`gkit --profile app-a dataforseo api call --operation-id dataforseo.backlinks.bulk_ranks.live --input @req.json --allow-spend --max-spend-usd 0.05 --out r.json` 真实跑通,并当周投入使用。

**Files:**

- Create: `packages/gkit/package.json`(`"bin": {"gkit": "bin/gkit.js"}`,private)
- Create: `packages/gkit/bin/gkit.js`
- Create: `packages/gkit/src/cli.ts`
- Create: `packages/gkit/src/profile.ts` — 加载、校验、`env:` 解析,单文件
- Create: `packages/gkit/src/effects.ts` — gate 检查
- Create: `packages/gkit/src/envelope.ts` — 输出、错误码、redaction
- Create: `packages/gkit/src/ledger.ts`
- Create: `packages/gkit/src/manifest.ts` — versioned manifest schema + loader,不承担 provider 抽象
- Create: `packages/gkit/src/describe.ts` — 直接渲染同一 manifest record
- Create: `packages/gkit/generated/dataforseo/manifest.json` — 只含第一个 reviewed operation;从第一天就是 routing/schema/effects/cost/describe 的唯一事实源
- Create: `packages/gkit/src/providers/dataforseo.ts` — basic-auth transport + error projection,不另存 capability registry/schema
- Create: `packages/gkit/src/doctor.ts` — profile/secret/policy readiness;无安全无副作用 probe 时明确返回 `unknown`
- Create: `packages/gkit/src/*.test.ts`

**Required tests:**

```ts
it("requires --profile or GKIT_PROFILE for provider execution", ...);
it("prefers --profile over GKIT_PROFILE", ...);
it("fails with PROFILE_ERROR before any network call when secret env is missing", ...);
it("rejects a profile whose filename and name differ", ...);
it("blocks a spend operation without --allow-spend, before transport", ...);
it("does not resolve secrets or load the adapter when the effect gate fails", ...);
it("blocks a spend operation without a conservative cost bound or above the profile cap", ...);
it("writes durable authorized and settled ledger events around transport", ...);
it("settles the actual charge and returns SPEND_POLICY_BREACH when provider cost exceeds the bound", ...);
it("quarantines the breached cost-policy revision before secret resolution until a new reviewed revision", ...);
it("maps a post-dispatch timeout to UNKNOWN_OUTCOME and never auto-retries spend", ...);
it("treats an authorized record without settlement as unknown", ...);
it("blocks the same input hash until an explicit evidence-backed reconciliation", ...);
it("rejects charged reconciliation without cost and quarantines an over-cap manual settlement", ...);
it("returns attemptId, spendOutcome and providerRequestId in every spend envelope", ...);
it("returns non-retryable LOCAL_IO_ERROR with confirmed outcome when settlement append fails", ...);
it("keeps concurrent process ledger writes as valid complete JSON lines", ...);
it("redacts resolved and derived secrets from stdout, stderr, details and URLs", ...);
it("fails closed when an artifact contains a known secret", ...);
it("preserves artifact bytes exactly when the secret scan is clean", ...);
it("atomically writes --out, refuses overwrite by default, and prints only a receipt", ...);
it("lets exactly one no-force writer win without changing its bytes under contention", ...);
it("emits one envelope and exits 0/1/130 according to the public process contract", ...);
it("maps first SIGINT through cleanup and treats a second signal as the envelope exception", ...);
it("uses the same manifest record for route, validation, effect/cost gate and describe", ...);
```

**验证:**

```bash
bun test packages/gkit
bun run --cwd packages/gkit check-types
gkit --profile app-a dataforseo doctor
gkit --profile app-a dataforseo api call --operation-id ... --input @req.json --allow-spend --max-spend-usd 0.05 --dry-run
gkit --profile app-a dataforseo api call --operation-id ... --input @req.json --allow-spend --max-spend-usd 0.05 --out r.json
```

最后一条 live call 只有在 sandbox/fixture 通过后才执行,且必须是已核价的最小请求。

```bash
git add packages/gkit
git commit -m "feat: gkit vertical slice with dataforseo"
```

**Gate:** 本 slice 完成后,用它做一周真实增长工作,记录摩擦点,再进入 Slice 2。

### Slice 1.5: Google Ads REST feasibility spike,先验证再锁 runtime

这是一个 1–2 天、不可顺手抽象的 spike。只记录事实与决策,不删除旧包:

- 用真实 profile 完成 refresh token → access token;access token 立即注册为派生 secret。
- 调用 `customers:listAccessibleCustomers`、`googleAdsFields:search` 和一个小结果 GAQL;GAQL 默认走 `googleAds:search` 并显式翻页到终止,验证 `login-customer-id` manager 场景。
- 固定一个明确 API major version(禁止 `latest`/隐式默认),记录升级步骤:手工 bump → refresh snapshot → review manifest/docs diff → contract/live smoke。
- 捕获并安全投影 HTTP status、Google Ads error code、request ID;确认日志、错误、URL 与 fixture 均不含 developer/access/refresh token。
- 对现有 `google-ads-cli` 做命令级盘点,尤其验证 `keywordPlan dataset ideas` 和 `historicalMetrics` 的 REST 可覆盖性,并逐条写下 `replace | keep | drop`;没有结论前不得退役该包。
- 对大结果记录分页内存曲线与 artifact 行为;只有真实 bulk 用例证明需要时才增加 `searchStream`。

**Gate:** spike 结论必须是以下二选一并写入本文档修订版:(a) bounded read surface 可由 REST 完整承载,继续 Slice 4;(b) 有具体必需能力/可靠性缺口,先修改 runtime 决策。不能以“官方有 REST endpoint”代替真实验证。

### Slice 2: DataForSEO reviewed manifest + inventory/docs/describe → 按行为退役旧包

**Files:**

- Create: `packages/gkit/sources/dataforseo/**` — pinned local OpenAPI snapshot + source metadata/checksum
- Create: `packages/gkit/policy/dataforseo.reviewed.json` — 人工确认 exposure/effect/cost model,只作为 generator 输入
- Create: `packages/gkit/scripts/generate-dataforseo.ts` — 从 pinned snapshot + reviewed policy 生成 executable manifest/inventory/docs,`--check` 离线校验字节稳定
- Modify: `packages/gkit/generated/dataforseo/manifest.json` — 扩到已 review 的可执行面,不是“OpenAPI 全量即执行面”
- Create: `packages/gkit/generated/dataforseo/inventory.json`
- Create: `packages/gkit/docs/providers/dataforseo/*.md`
- Modify: `packages/gkit/src/describe.ts`
- Create: `packages/gkit/src/docs.ts`
- Modify: `src/providers/dataforseo.ts` — adapter 只按 manifest 的 adapter key dispatch;不读取 reviewed policy
- Delete: `packages/backlink-cli`、`packages/serp-snapshot-cli`、`packages/ai-optimization-cli`(三个包分别完成命令盘点、behavior golden 与最小真实验证后;不要求同一 commit 删除)
- Modify: 根 `package.json` scripts

**Contract:**

- `api call` 只接受 manifest 内的 operation ID;origin 固定,不接受任意 URL/header。
- 无法确认 exposure/effect/cost bound 的 operation 不进入 executable manifest(可留在 inventory,不可路由,不猜测)。
- runtime routing、input validation、effect/cost gate、describe 与 docs 对同一 manifest 做一致性 contract test;CI 禁止第二份可执行 registry。
- describe/docs 离线;root `--schema` < 2,000 tokens。

```bash
bun run --cwd packages/gkit generate:dataforseo -- --check
bun test packages/gkit
gkit describe --id dataforseo.backlinks.bulk_ranks.live
git commit -m "feat: generate reviewed dataforseo manifest and docs"
```

每个通过行为 gate 的旧包另行 retire,不与 generator commit 捆绑。

### Slice 3: 第二个 provider 先纵切,再按真实重复决定是否提炼

按当周真实需求选 GSC 或 PostHog。先沿 Slice 1 的 public contracts 直接接入并跑通;完成后比较两个 adapter 的真实 diff。只有重复代码已经稳定、且提炼能删除分支/重复时,才创建最小 interface。若没有足够重复,本 slice 完成时仍可以没有 `src/core/provider.ts`。

- Conditional create: `packages/gkit/src/core/provider.ts`(需要时才出现 `src/core/`;若创建,capability descriptor 直接引用 manifest record,不另设 schema/handler registry)
- Create: `packages/gkit/src/providers/<gsc|posthog>/**` + manifest generator + docs
- Delete: 对应旧 package(完成命令级 `replace | keep | drop` 与 behavior gate 后)
- `doctor` 约定:检查 profile section、secret 注入、可选无副作用 probe;无法安全 probe 时返回 `unknown`,不伪造 ready。

```bash
git commit -m "feat: add second gkit provider"
git commit -m "refactor: extract repeated provider seam"
git commit -m "refactor: retire <old package>"
```

第二条 refactor commit 仅在真实 diff 证明需要时存在。

### Slice 4: Productize 已验证的 Google Ads REST + Bing + 剩余 provider

- Google Ads:只有 Slice 1.5 gate 通过才实施。提供 `fields search/describe`、显式分页的 `query gaql`(`googleAds:search`)以及在盘点中标为 `replace` 的 Keyword Planner read;OAuth2 refresh-token flow 在 provider 内实现;不开放 mutate。`searchStream` 继续留在扩张门槛后。
- Bing:复用现有 `bing-webmaster-cli` 已验证的 JSON REST contract。API key 按 provider 要求放在 `apikey` query parameter,但 request builder 必须同时产生不含 key 的 `diagnosticUrl`;日志、错误、telemetry 只能使用后者。若未来显式切 OAuth,才改为 Bearer。
- PostHog/GSC 中未在 Slice 3 接入的那个。
- Delete: `packages/google-ads-cli`、`packages/bing-webmaster-cli`、`packages/gsc-cli`、`packages/posthog-cli`(各自完成命令盘点、behavior golden、真实 smoke 后逐个退役;Google Ads 的两条 Keyword Planner workflow 必须有显式结论)。

**Required tests(Google Ads):**

```ts
it("refreshes the OAuth token without logging its value", ...);
it("uses the pinned API major version and manager login header", ...);
it("maps a Google Ads REST error to an allowlisted, redacted details projection", ...);
it("paginates googleAds:search to completion without buffering past the artifact policy", ...);
it("preserves request ID while redacting developer, refresh and access tokens", ...);
it("covers every Google Ads workflow marked replace, including retained Keyword Planner reads", ...);
```

**Required tests(Bing):**

```ts
it("sends apikey as a query parameter but exposes only a key-free diagnosticUrl", ...);
it("redacts the encoded and decoded API key from every failure path", ...);
```

### Slice 5: 全量 eval + curated 晋升 + 清理

- 扩充 `evals/tasks.jsonl` 到 40 个(10 明确 provider / 15 业务目标 / 10 长尾 native / 5 negative),继续保留 observable behavior 与旧 workflow disposition key。
- 目标:provider top-1 ≥ 95%;两步内完成发现;首条可执行命令 ≥ 90%;negative precision ≥ 95%;所有 `replace` workflow 的 provider request/effect/output/error/exit/artifact golden 通过。
- Promotion rule:同一 native workflow 真实出现 ≥ 3 次且 curated contract 能显著降低失败/context/调用次数,才进入该 provider 的 `curated/`。
- **显式决策 `page-extract-cli` 与 `sitemap-watch-cli` 的归宿**(它们不属于任何 provider):独立保留、废弃、或以本地工具形态并入——三选一,写入本文档的修订版,不允许被清理动作静默删除。
- 输出最终 migration matrix:每个旧 command 都有 `replace | keep | drop`、证据与目标 capability;不存在仅凭 package 名称完成的退役。
- 收尾:若全部旧包退役完成,可选择把 `packages/gkit` 提升为仓库根(纯外观,不改变行为);重写 README 与 CI。

```bash
rg -n "@deniffer/.*-cli|product-growth-tools|PRODUCT_GROWTH_PROFILE" . --glob '!docs/plans/**'
bun test && bun run check-types
git commit -m "feat: evaluated curated commands and final cleanup"
```

上述 `rg` 只允许命中 migration matrix 中已显式决定保留的包。

## 7. 扩张门槛(触发条件成立前不做)

| 延后项 | 触发条件 |
|---|---|
| 内建 `gkit search` | eval 中 rg+describe 两步发现成功率 < 90% |
| Python/polyglot/isolated runtime | Slice 1.5 证明 REST 不能可靠覆盖必需能力、开放 Google Ads mutate,或引入不可信 provider/dependency |
| npm 发布 | gkit 需要分发到本 workspace 之外 |
| sandboxed `gkit exec` / code runner | 出现真实 shell-less host |
| write/destructive capability | 逐 provider 有真实用例,随附 dry-run、idempotency/unknown-outcome 与 audit contract |
| 统一 async job subsystem | 多 provider async task 需要统一监控的真实场景 |
| external plugin protocol | 第三方需要独立发布 provider;必须同时定义隔离与 credential boundary |

## 8. Review gates

请判断六个根决策:

1. v1 暂定 Bun/TypeScript 单进程;Google Ads REST 必须先通过真实账号 spike,失败就修改 runtime 决策,而不是保护既定结论。
2. reviewed executable manifest 是 runtime/validation/effect-cost gate/describe/docs 的单一事实源;inventory 不可执行;内建 search 继续由 eval 触发。
3. 纵切生长:第二个 provider 也先直接实现;只有真实 diff 证明重复稳定时才提炼,不以数量机械触发 `ProviderModule`。
4. 逐包退役替代原子 cutover;每个旧 command 必须有 `replace | keep | drop` 与行为证据,包括 Keyword Planner、`page-extract`、`sitemap-watch`。
5. Profile/effect/envelope/atomic artifact/无全局 run/spend outcome 六条不变量从第一天锁死(见 §2),shell exit 与 secret-safe details 属于 public contract。
6. 不发 npm;spend 从 Slice 1 就有双 cap、无自动 retry、authorized/settled ledger 与 unknown reconciliation。

## References

- [对案:provider-native-agent-surface](./2026-07-13-gkit-provider-native-agent-surface.md)
- [Google Ads REST interface overview](https://developers.google.com/google-ads/api/rest/overview)
- [Google Ads Search & SearchStream over REST](https://developers.google.com/google-ads/api/rest/common/search)
- [Google Ads REST authentication](https://developers.google.com/google-ads/api/rest/auth)
- [Google Ads: Generate keyword ideas](https://developers.google.com/google-ads/api/docs/keyword-planning/generate-keyword-ideas)
- [DataForSEO OpenAPI](https://github.com/dataforseo/OpenApiDocumentation)
- [DataForSEO API sandbox](https://docs.dataforseo.com/v3/appendix/sandbox/)
- [argc v7.5.0 release](https://github.com/ethan-huo/argc/releases/tag/v7.5.0)
- [Bing Webmaster API protocols](https://learn.microsoft.com/en-us/bingwebmaster/api-protocols)
- [Bing Webmaster API access methods](https://learn.microsoft.com/en-us/bingwebmaster/getting-access)
- [GSC Discovery document](https://searchconsole.googleapis.com/$discovery/rest?version=v1)
- [PostHog Query API](https://posthog.com/docs/api/queries)
- [Anthropic: Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Cloudflare: Code Mode MCP](https://blog.cloudflare.com/code-mode-mcp/)
