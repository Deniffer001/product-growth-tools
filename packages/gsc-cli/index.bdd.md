# gsc-cli - BDD 规格

> Agent 需要从 Google Search Console 读取原始搜索事实，用于上层产品增长、SEO 与归因分析，但 CLI 本身不生成业务洞察。
> 状态：**草稿 - 待确认**

## 范围边界

**包含：**
- 面向 Agent 的命令发现与 schema selector
- 业务 profile 与本地/云端凭证加载
- readiness 诊断
- Search Console property、sitemap、URL inspection、Search Analytics 原始读取
- skill 自安装，帮助下游 repo 注册调用协议
- JSON-first 输出与稳定错误响应

**不包含：**
- SEO 建议、报告、归因结论或产品决策
- Search Console 数据持久化
- Google Ads、PostHog、Stripe 等其他 provider 的数据合并
- provider 写入操作
- 云端 secret manager 的具体实现

## 前提假设

- 默认命令面为：`skill path`、`skill print`、`skill install`、`doctor dataset readiness`、`property dataset sites`、`sitemap dataset sitemaps`、`sitemap entity sitemap`、`inspection entity url`、`search dataset analytics`。
- CLI 默认输出 JSON；`--pretty` 只用于人类检查，不改变数据语义。
- 业务 profile 是 provider 凭证的长期归属边界，repo-local `.env.live` 不作为默认路径。
- 所有 provider 读取都是只读操作。

---

## 功能 1：Agent 发现命令与调用协议

> Agent 需要先知道命令树和输入形态，再决定调用哪个 provider read。

**场景 1.1：Agent 查看完整命令概要**
Given Agent 尚不了解当前 CLI 的命令面
When Agent 请求 schema 概要
Then Agent 看到按业务域分组的命令树
  And 概要中包含 readiness、property、sitemap、inspection、search 与 skill 命令
  And Agent 不需要从 README 猜测命令路径

**场景 1.2：Agent 精确查看单个命令的输入**
Given Agent 已知道要读取 Search Analytics
When Agent 请求该命令的 schema selector
Then Agent 看到该命令需要的日期、维度、过滤与分页输入
  And 可选字段和必填字段能够被区分

**场景 1.3：下游 repo 安装 CLI skill**
Given 下游 repo 已能运行 `gsc`
  And 下游 repo 还没有注册 GSC CLI 的调用协议
When Agent 请求安装 bundled skill
Then 当前 repo 的 `.agents/skills/gkit/gsc-cli` 下出现 skill 文件
  And 已存在同名 skill 时不会静默覆盖，除非 Agent 明确要求覆盖
  And 安装行为不需要完整 skill manager 参与

---

## 功能 2：按业务 profile 读取凭证

> Agent 需要按业务归属读取凭证，避免不同业务和不同 CLI 之间串用 secret。

**场景 2.1：repo 只声明业务 profile**
Given 当前 repo 的 ignored 本地配置只声明了业务 profile
  And 该 profile 目录中保存了 GSC provider 配置
When Agent 执行任意 GSC provider 命令
Then CLI 先读取业务 profile
  And profile 中的相对凭证路径按 profile 目录解析
  And repo fallback 配置不会覆盖 profile 中的 provider 凭证

**场景 2.2：显式环境变量优先于 profile**
Given 运行环境已经显式注入 GSC 凭证
  And 当前 repo 也声明了业务 profile
When Agent 执行 GSC provider 命令
Then CLI 使用显式注入的凭证
  And 不用 profile 中的同名配置覆盖显式环境变量

**场景 2.3：没有业务 profile 且没有显式凭证**
Given 运行环境没有声明业务 profile
  And 也没有显式注入 GSC 凭证
When Agent 执行 readiness 检查
Then Agent 收到未 ready 的诊断
  And 诊断显示没有 active profile
  And 不发起真实 provider 读取

---

## 功能 3：readiness 诊断

> Agent 需要先确认当前 profile 与 provider 权限可用，再扩大读取范围。

**场景 3.1：profile 和 provider 都可用**
Given 当前业务 profile 已配置 GSC 凭证和默认 property
  And 该凭证可以访问 Search Console
When Agent 执行 readiness 检查
Then Agent 收到 ready=true
  And 结果包含 active profile 的名称、目录与 env 文件状态
  And 结果显示凭证文件可读、默认 property 已配置、provider 可访问

**场景 3.2：凭证文件不存在**
Given 当前业务 profile 指向一个不存在的凭证文件
When Agent 执行 readiness 检查
Then Agent 收到 ready=false
  And 诊断明确指出凭证文件不可读
  And 不尝试用其他业务 profile 的凭证兜底

**场景 3.3：凭证无权访问目标 property**
Given 当前业务 profile 的凭证存在
  And 该凭证无权访问目标 property
When Agent 执行真实读取
Then Agent 收到 provider 权限不足的错误
  And 该错误能够与“查询结果为空”区分开

---

## 功能 4：读取 Search Console 原始事实

> Agent 需要拿到 provider-native 的原始事实，供上层系统组合和解释。

**场景 4.1：读取可访问 property 列表**
Given 当前业务 profile 的 GSC 凭证可用
When Agent 请求 property 列表
Then Agent 收到可访问的 Search Console property
  And 每个 property 包含稳定的站点标识与权限级别

**场景 4.2：读取 Search Analytics 行**
Given 当前业务 profile 已配置默认 property
  And Agent 提供合法日期范围
When Agent 请求 Search Analytics 数据
Then Agent 收到 provider 返回的搜索行
  And 结果保留请求参数、维度、聚合类型与原始指标
  And CLI 不把搜索行解释成 SEO 建议或产品动作

**场景 4.3：读取 sitemap 与 URL inspection**
Given 当前业务 profile 的 GSC 凭证可用
When Agent 请求 sitemap 或 URL inspection
Then Agent 收到对应 provider 对象
  And 结果只表达 Search Console provider truth
  And 不混入其他 provider 或缓存推断

---

## 功能 5：输出与错误边界

> Agent 需要用稳定结构判断成功、失败和恢复路径。

**场景 5.1：默认输出可被机器读取**
Given Agent 执行任意 GSC 命令
When 命令成功
Then 输出包含 `ok: true`
  And provider truth 位于 `data`
  And 不需要解析人类文本才能获得结果

**场景 5.2：pretty 输出只服务人类检查**
Given Agent 或操作者显式请求 pretty 输出
When 命令完成
Then 输出可以更适合人类阅读
  And 数据语义与默认 JSON 输出保持一致

**场景 5.3：输入错误与 provider 错误可区分**
Given Agent 提供非法输入或 provider 返回失败
When 命令失败
Then 输出包含稳定错误 code 和 message
  And 输入错误、权限不足、provider 限流、provider 故障可以被区分
  And Agent 不把 provider 不可用推断为业务没有数据
