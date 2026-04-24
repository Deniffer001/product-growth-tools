# google-ads-cli - BDD 规格

> Agent 需要从 Google Ads 读取原始投放事实，用于上层增长分析和预算判断，但 CLI 本身不生成归因结论、报告或投放动作。
> 状态：**草稿 - 待确认**

## 范围边界

**包含：**
- 面向 Agent 的命令发现与 schema selector
- 业务 profile 与本地/云端凭证加载
- Python provider runtime readiness 诊断
- Google Ads customer、campaign、ad group、keyword、keyword planner、search term 与只读 GAQL 读取
- JSON-first 输出与稳定错误响应

**不包含：**
- 投放策略建议、预算调整、negative keyword 写入或账户变更
- 跨 provider 归因结论
- Google Ads 数据持久化
- 报告生成或 insight/action 路由
- 云端 secret manager 的具体实现

## 前提假设

- 默认命令面为：`doctor dataset readiness`、`customer dataset accounts`、`campaign dataset performance`、`adGroup dataset performance`、`keyword dataset performance`、`keywordPlan dataset ideas`、`keywordPlan dataset historicalMetrics`、`searchTerm dataset performance`、`query dataset gaql`。
- CLI 默认输出 JSON；`--pretty` 只用于人类检查，不改变数据语义。
- 业务 profile 是 provider 凭证的长期归属边界。
- 所有 Google Ads provider 调用都是只读读取。
- `loginCustomerId` 和 `linkedCustomerId` 是可选上下文，只有账户结构要求时才成为阻断项。

---

## 功能 1：Agent 发现命令与输入契约

> Agent 需要先确认可用数据面和每个命令的输入要求，再发起 provider 读取。

**场景 1.1：Agent 查看命令概要**
Given Agent 尚不了解 Google Ads CLI 的命令面
When Agent 请求 schema 概要
Then Agent 看到 customer、campaign、ad group、keyword、keyword planner、search term、GAQL 与 doctor 命令
  And Agent 不需要从 README 猜测命令路径

**场景 1.2：Agent 查看单个 performance 数据集输入**
Given Agent 要读取 campaign performance
When Agent 请求该命令的 schema selector
Then Agent 看到 customer、日期范围和 limit 输入
  And customer 可以来自业务 profile 默认值，也可以由本次命令显式指定

**场景 1.3：Agent 使用只读 GAQL**
Given Agent 需要读取 CLI 未封装的一组字段
When Agent 提供只读 GAQL 查询
Then CLI 将查询发送给 Google Ads provider
  And 返回 provider-native rows
  And CLI 不把 GAQL 结果转换成业务建议

---

## 功能 2：按业务 profile 读取凭证与账户上下文

> Agent 需要按业务 profile 使用 Google Ads 凭证，避免不同业务账户串用。

**场景 2.1：repo 只声明业务 profile**
Given 当前 repo 的 ignored 本地配置只声明了业务 profile
  And 该 profile 目录中保存了 Google Ads provider 配置
When Agent 执行任意 Google Ads provider 命令
Then CLI 先读取业务 profile
  And profile 中的相对凭证路径按 profile 目录解析
  And profile 中的默认 customer 用于没有显式 customer 的读取

**场景 2.2：显式 customer 覆盖 profile 默认 customer**
Given 当前业务 profile 已配置默认 customer
When Agent 在单次命令中显式指定另一个 customer
Then 本次读取使用显式 customer
  And profile 默认 customer 不被永久修改

**场景 2.3：可选 MCC 配置缺失时不阻断普通读取**
Given 当前业务 profile 已配置必要 Google Ads 凭证和默认 customer
  And 没有配置 login customer
When Agent 执行不需要 MCC 上下文的 readiness 或普通读取
Then readiness 可以带 warning 通过
  And 普通读取可以继续执行

---

## 功能 3：readiness 诊断

> Agent 需要先确认本地 provider runtime、凭证和账户上下文可用，再读取真实投放数据。

**场景 3.1：runtime、凭证与默认账户都可用**
Given 当前业务 profile 已配置 Google Ads 凭证、developer token 和默认 customer
  And Python provider runtime 可运行
When Agent 执行 readiness 检查
Then Agent 收到 ready=true
  And 结果包含 active profile 的名称、目录与 env 文件状态
  And 结果显示 Python runtime、provider script、developer token、凭证和默认 customer 均可用

**场景 3.2：Python provider dependency 缺失**
Given 当前业务 profile 已配置 Google Ads 凭证
  And Python provider runtime 无法导入 Google Ads SDK
When Agent 执行真实 provider 读取
Then Agent 收到 provider runtime 失败诊断
  And 诊断提示需要安装 Python provider dependencies
  And 不把 runtime 失败解释为 Google Ads 无数据

**场景 3.3：缺少 developer token**
Given 当前业务 profile 已配置 service account 和 customer
  And 没有配置 developer token
When Agent 执行 readiness 检查
Then Agent 收到 ready=false
  And 诊断明确指出缺少 developer token
  And 不发起真实 Google Ads 查询

---

## 功能 4：读取 Google Ads 原始事实

> Agent 需要读取 provider-native 投放事实，供上层系统组合和解释。

**场景 4.1：读取可访问 customer**
Given 当前业务 profile 的 Google Ads 凭证可用
When Agent 请求可访问 customer 列表
Then Agent 收到可访问的 customer resource
  And 每个对象包含稳定的 customer id 和 resource name

**场景 4.2：读取 campaign performance**
Given 当前业务 profile 已配置默认 customer
  And Agent 提供合法日期范围
When Agent 请求 campaign performance
Then Agent 收到按 provider 查询返回的 campaign rows
  And 结果保留请求参数、GAQL 查询和原始指标
  And CLI 不生成投放建议或预算动作

**场景 4.3：读取 keyword 与 search term performance**
Given 当前业务 profile 已配置默认 customer
  And Agent 提供合法日期范围
When Agent 请求 keyword 或 search term performance
Then Agent 收到对应 provider rows
  And 结果保留 campaign、ad group、关键词或搜索词上下文
  And CLI 不自动判定 negative keyword、品牌词泄漏或归因结论

**场景 4.4：读取 Keyword Planner 原始数据**
Given 当前业务 profile 已配置默认 customer
  And Agent 提供关键词或页面 URL seed
When Agent 请求 keyword planner ideas 或 historical metrics
Then Agent 收到 Keyword Planner provider rows
  And 结果保留请求 seed、地域、语言和网络参数
  And CLI 不把 keyword idea 转化为投放建议或内容计划

---

## 功能 5：输出与错误边界

> Agent 需要用稳定结构判断成功、失败和恢复路径。

**场景 5.1：默认输出可被机器读取**
Given Agent 执行任意 Google Ads 命令
When 命令成功
Then 输出包含 `ok: true`
  And provider truth 位于 `data`
  And 不需要解析人类文本才能获得结果

**场景 5.2：provider 错误保留可恢复信息**
Given Google Ads provider 返回权限、配置、限流或查询错误
When 命令失败
Then 输出包含稳定错误 code、message 和可选 hint
  And Agent 可以区分输入错误、provider auth、provider rate limit 与 provider failure

**场景 5.3：只读边界不被突破**
Given Agent 使用 Google Ads CLI
When Agent 请求任意已暴露命令
Then 命令只读取 provider truth
  And 不修改 campaign、ad group、keyword、预算或账户配置
  And 不把查询结果直接转化为业务动作
