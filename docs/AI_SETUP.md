# AI 设置：Platypus 怎么调用 AI

> **2026-10-27 起（M1，Juanxi 决定）：所有 AI 调用都走 ASU AIR，只在模型上做选择。本项目不再使用 DeepSeek。** 下面第 1–4 节是现在的做法；第 5 节以后是历史记录，和本节冲突时以本节为准。

**一句话：** 网页从来不拿 API key。网页只调用本站自己的 `/api/*`（Netlify Functions），只有这些服务器函数去调 AIR。key 和所有 AI 设置都只在 Netlify 的环境变量里。

```
浏览器  →  /api/chat · /api/ask · /api/command · /api/nudge/draft · /api/handbook/draft
                 ↓  netlify/lib/ai.mts（唯一的适配器，读 AI_* 变量）
                 ↓  按任务选模型：src/organization/modelPolicy.ts（routing v3）
           ASU AIR  https://openai.rc.asu.edu/v1
```

## 1. 环境变量（Netlify → Project configuration → Environment variables）

| 变量 | 现在应该是 | 说明 |
| --- | --- | --- |
| `AI_API_KEY` | AIR 的 key（勾选 “Contains secret values”） | **唯一必填。** 只在服务器上，不会发到浏览器 |
| `AI_PRESET` | 不填，或 `asu_air` | 不填就是 AIR（默认）。只有紧急回退时才改，见第 3 节 |
| `AI_MODEL` | 不填 | AIR 下由路由按任务选模型；只有关掉路由时才用 |
| `AI_MODEL_ROUTING` | 不填（= 开） | 设 `off` = 所有任务都用 `AI_MODEL` 一个模型（运营方回退开关） |
| `AI_TIMEOUT_MS` | 不填（25000） | 单次请求超时 |
| `ORG_SETUP_ENABLED` | **不填** | 服务器存储开关，见第 4 节。不填 = 隐藏 |

改完变量要 **Deploys → Trigger deploy → Deploy project**，新变量只对新部署生效。`/api/health` 会显示当前供应商（应为 `ASU AIR`）和路由版本，从不显示 key。

## 2. 每个接口用哪个模型（routing v3，`air-task-routing-v3`）

| 接口 | 谁在用 | `task` | 模型 |
| --- | --- | --- | --- |
| `POST /api/chat` | 右栏 Ask（主应用唯一 AI 入口） | `chat` | Muse（`muse-glimmer-30b`） |
| `POST /api/ask` | Rules 页问规则 | `ask` | Muse |
| `POST /api/command` | 一句话改数据（变更单） | `command` | Muse |
| `POST /api/nudge/draft` | 提醒草稿里的一句话 | `nudge_draft` | Muse |
| `POST /api/handbook/draft` | Handoff 岗位手册选来源 | `handbook_draft` | Muse |
| `/api/org/ai`（Organization Setup，目前隐藏） | 章程、职责、流程等较长的结构化设置 | `setup.*` | Gemma（`gemma4-31b-it`） |
| 同上，用户主动点 Deeper review | | `setup.*` + deep | GLM（`glm-5-3`） |

规则：Gemma 负责较长的结构化设置任务；Muse 负责短对话和编辑；GLM 只在用户主动要求 Deeper review 时用，不会自动升级。浏览器不能指定模型，模型只由服务器按 `task` 选。

⚠️ 这套分工是 DP3 的设计选择。DP3 自己的记录写着“选型不是已证明的性能排名”。Juanxi 的实际使用感受是返回快，但**不要在论文或文档里写成“已验证最快”**，除非之后有正式测量。

AI 没配好或调用失败时，主应用会明确显示本地回退（关键词模式），不会把回退标成真实 AI。

## 3. 紧急回退（只在 AIR 不可用时）

| 回退到 | 设置 | 说明 |
| --- | --- | --- |
| DeepSeek | `AI_PRESET=deepseek`，`AI_API_KEY`=DeepSeek key | **不再是默认，也不是计划内的选项。** 数据会离开 ASU，只能配虚构数据，且要先得到 Juanxi 同意。回退时不走 AIR 路由，固定 `deepseek-chat` |
| OpenAI / Anthropic / 其他兼容接口 | `AI_PRESET=openai` 或 `anthropic`，并填 `AI_MODEL`（其他兼容接口再填 `AI_BASE_URL`） | 同上，需 Juanxi 同意 |

回退结束后把 `AI_PRESET` 删掉（或改回 `asu_air`）并重新部署。

## 4. 服务器存储开关 `ORG_SETUP_ENABLED`（2026-10-27，Juanxi：不删，隐藏）

DP3 带来的 Organization Setup 和 Activity workspace 会把数据存在服务器上（Netlify Blobs）。现在默认**隐藏**，三件事同时成立：

1. **界面走不到：** 主应用没有任何入口；`/#/phase1/` 在隐藏的构建里只显示本地示例和本地设置（`setup-legacy`），不会显示在线设置、在线工作区。
2. **服务器直接拒绝：** `/api/org/setup`、`/api/org/archive`、`/api/org/ai`、`/api/org/ai-run`、`/api/workspace`、`/api/workspace/assistant`、`/api/workspace/assistant-run` 在开关没开时一律返回 404，**一行存储代码都不执行**；`/api/health?check=1`（它会打开设置会话并存档）也不执行。
3. **代码和测试都在：** 设 `ORG_SETUP_ENABLED=true` 并重新部署就全部回来（页面在构建时读这个变量，所以必须重新部署）。

只认完全等于 `true`；`1`、`TRUE`、`yes` 都算没开。

## 用量日志（S2，M1 补全）

每次 AI 调用在 Netlify → Logs 留一行 `ai_usage`：`task`、供应商、请求的模型和实际返回的模型、路由版本、输入/输出 token、结束原因（`finishReason`）、首包时间（`headersMs`）、总耗时、成功或失败代码。**不记 key、提示词、用户内容或 AI 回复。**

## 研究说明

AIR 的数据处理已由 Juanxi 确认（2026-10-27），这里不再重复。DeepSeek 等外部供应商只在第 3 节的紧急回退里出现，且只能处理虚构数据。

---

# 历史记录（2026-10-27 之前，仅供查阅）

> **2026-10-26 v3：** 允许少量虚构数据真实冒烟以排查 JSON 错误；不用完整真实评估。新设置使用服务端四任务 prompt、原生 schema 和流式指标，前端不展示系统 prompt。JSON 原始输出先归档再解析，截断/空输出不应用变更。详见 [v3 记录](organization/V3_CHANGELOG.md)。

> **2026-10-26 最新：** 已切换 ASU AIR；默认 `muse-glimmer-30b`，GLM 仅主动深度检查（路由 v2）。此前 Gemma/GLM 自动按阶段的 v1 已被用户的速度要求替代。新设置使用后台任务与数据归档，见 [交接](organization/HANDOFF.md)、[数据基础](organization/DATA_FOUNDATION.md)。不再发起额外真实 AI 测试。


## 5. WP2 接口（2026-10-22）

- `POST /api/command`：输入 `sentence` 和最小上下文（活动、节点、干部的 ID 和显示名称）。明确匹配的常见句式由程序解析，其他句式交给同一个 `chatJSON()` 适配器。返回 `ops`、`source` 和 `model`；服务器与浏览器都做白名单过滤，丢弃任何日期字段。新活动的日期需要人在变更单中确认。
- `POST /api/nudge/draft`：输入当前节点的标题、规则算好的三个日期、真实下游步骤和提醒时段。AI 只改写最多 10 词的意义句；程序生成完整五段草稿，检查禁用说法和 100 词上限。浏览器在打开草稿前按最新状态再生成一次，防止旧日期生效。
- 不增加密钥或新供应商配置，继续使用上面的 `AI_*` 环境变量。AI 关闭或接口失败会明确显示本地演示回退；不会把回退标成实时 AI。
- `parse-brief` 保留兼容接口，但现在也丢弃 AI 日期；`public/legacy/` 文件没有改动。
- 固定命令测试和供应商模拟测试已通过，真实 DeepSeek/AIR 自由表达质量仍需在部署环境分别验证。详情见 `WP2_ACCEPTANCE.md`。



## Organization Setup 与 AIR（2026-10-26 当前）

Netlify 保留现有 AIR key（只在服务端）。`AI_PRESET=asu_air`，`AI_MODEL=muse-glimmer-30b`；默认网关 `https://openai.rc.asu.edu/v1`。只换 key、不换供应商参数会继续请求旧地址。

当前 `air-task-routing-v2`：Muse 负责默认交互，GLM 仅用户主动深度检查；关闭自动慢推理。模型、请求/返回变体、耗时、prompt/路由版本与完整输入输出存入私有工作区档案。`AI_MODEL_ROUTING=off` 是运营方明确回退单模型的开关。候选/权衡及当前未经新一轮真实测试的边界见 [Prompt/模型说明](organization/PROMPTS.md)。

后台 `/api/org/ai-run` 执行生成，`/api/org/ai` 排队/读取结果，避免托管环境实际约 30 秒的同步上限。新 `/api/org/archive` 保存原件、操作与对话/AI档案，不请求模型；数据基础先于 AI。没有失败时伪装成功的模拟兜底。原业务页仍保留其原行为。

官方依据：[ASU LLM API](https://docs.rc.asu.edu/ai/api/)、[Chat completions](https://docs.rc.asu.edu/ai/api/chat/)、[Netlify Background Functions](https://docs.netlify.com/build/functions/background-functions/)。/api/health 只报告配置与路由，不证明真实认证或模型质量。

Juanxi 已要求停止新增真实 AI 测试；当前由他实操验收。必要离线检查及 GitHub CI 不使用模型额度。
