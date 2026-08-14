# gkit

gkit is a headless, agent-native Growth Workspace where External Agents continue
durable growth work for a Product across sessions and Agent hosts.

Only language required by the current product boundary appears here. Earlier
ADRs preserve accepted constraints for deferred designs; their larger taxonomies
are not part of the first vertical slice.

## Workspace

**Product（产品）**:
The durable business subject being grown and the continuity root of one Growth
Workspace.
_Avoid_: Growth Project, repository, App Profile

**Growth Workspace（增长工作空间）**:
The portable Product workspace in which External Agents find prior work, use
bounded growth capabilities, and leave durable work for later Agents. Its first
physical form is a directory identified by `GROWTH.md`.
_Avoid_: Agent session, provider CLI, autonomous Growth Agent

**App Profile Selector（应用配置选择器）**:
The non-secret App Profile name declared by a Growth Workspace so a host can
bind provider execution to exactly one Product identity. It names host-local
configuration but contains no credential, path, or provider mapping.
_Avoid_: Product, profile map, secret reference

**Growth Document（增长文档）**:
An addressable OKF Markdown file whose contents preserve growth work across Agent
sessions and hosts. It may hold an investigation, plan, analysis, strategy, or
handoff without requiring a separate native object type.
_Avoid_: chat summary, database record, fixed Investigation type

**Growth Project（增长项目）**:
Optional organization for a bounded initiative inside a Growth Workspace. It is
not required for work to belong to the Product or survive Agent sessions.
_Avoid_: Workspace root, App Profile, Agent session

**External Agent（外部 Agent）**:
The reasoning actor that discovers and edits Growth Documents, selects and
composes Growth Capabilities, interprets evidence, and chooses next steps.
_Avoid_: built-in gkit planner, Provider Module

**Growth Skill（增长技能）**:
An Agent-consumed procedure for performing repeatable growth work with Growth
Documents and Growth Capabilities. It owns neither credentials nor provider
execution.
_Avoid_: Growth Capability, workflow engine, provider integration

## Evidence and execution

**Evidence（增长证据）**:
A durable, attributable observation whose source can be inspected. Evidence may
support an Agent's interpretation, but it is not itself a conclusion.
_Avoid_: Insight, unsupported claim, success message

**Growth Capability（增长能力）**:
A bounded provider or deterministic operation with one growth-domain intent and
an independently inspectable result.
_Avoid_: provider endpoint, Growth Skill, business goal

**Growth Capability Runtime（增长能力运行时）**:
The deterministic execution module used by External Agents. It owns discovery,
profile scope, policy, dispatch, cost, artifacts, and explicit uncertain outcomes,
but not goals or interpretation.
_Avoid_: complete Growth Workspace, autonomous Agent, generic integration layer

**Growth Operation（增长操作）**:
One execution of a Growth Capability whose scope, dispatch, outcome, cost, and
resulting evidence can be audited.
_Avoid_: Growth Project, business experiment, provider endpoint

**Provider Module**:
A purpose-built implementation of one provider's native capabilities behind the
runtime seam.
_Avoid_: plugin framework, Growth Skill, universal connector
