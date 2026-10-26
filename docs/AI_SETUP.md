> **2026-10-26 最新：** 已切换 ASU AIR；默认 `muse-glimmer-30b`，GLM 仅主动深度检查（路由 v2）。此前 Gemma/GLM 自动按阶段的 v1 已被用户的速度要求替代。新设置使用后台任务与数据归档，见 [交接](organization/HANDOFF.md)、[数据基础](organization/DATA_FOUNDATION.md)。不再发起额外真实 AI 测试。

# AI setup — how Platypus talks to an AI provider

**Short version:** the website never holds an API key. It calls its own server endpoints (`/api/*`, Netlify Functions), and only those talk to the AI provider. Which provider answers is decided by environment variables in Netlify. Changing provider = change the variables + redeploy. No code changes.

```
Browser (index.html)  →  /api/ask, /api/parse-brief, /api/plan/draft, /api/replies/classify   (Netlify Functions)
                                     ↓  netlify/lib/ai.mts  (one adapter, reads AI_* variables)
                          DeepSeek  |  ASU AIR  |  OpenAI  |  Anthropic  |  any OpenAI-compatible API
```

## 1. Turn on DeepSeek (about 3 minutes)

1. Netlify → **platypus-officer-hub** → **Project configuration** → **Environment variables** → **Add a variable**.
2. Add these three (scope: all, or at least **Functions**):

| Key | Value | Secret? |
|---|---|---|
| `AI_PRESET` | `deepseek` | no |
| `AI_MODEL` | `deepseek-chat` | no |
| `AI_API_KEY` | your DeepSeek key | **yes** — tick "Contains secret values" |

3. **Deploys** → **Trigger deploy** → **Deploy project** (variables apply only to new deploys).
4. Open the site. The yellow strip at the top changes from "AI answers are simulated" to "AI answers come live from DeepSeek (deepseek-chat)". You can also open `/api/health`.

## 2. Switch provider later

| Provider | `AI_PRESET` | `AI_MODEL` | `AI_API_KEY` | Notes |
|---|---|---|---|---|
| DeepSeek | `deepseek` | `deepseek-chat` | DeepSeek key | Default. Data goes to DeepSeek's servers. |
| ASU AIR | `asu_air` | model id from Voyager (`GET /v1/models`) | AIR key from voyager.rc.asu.edu | Free; data stays on ASU hardware. Planned for Phase 3. |
| OpenAI | `openai` | e.g. a current GPT model id | OpenAI key | Paid. |
| Anthropic | `anthropic` | e.g. a current Claude model id | Anthropic key | Paid. |
| Any other OpenAI-compatible API (Qwen, Groq, Together, …) | `openai` | its model id | its key | Also set `AI_BASE_URL` to its address. |

If a provider rejects JSON mode, add `AI_JSON_MODE=none`.

## 3. What each endpoint does

| Endpoint | Used by | What the AI is allowed to do |
|---|---|---|
| `GET /api/health` | page load | nothing — reports whether AI is configured (never the key) |
| `POST /api/parse-brief` | Plan an event → "Read my sentence" | turn one sentence into brief fields |
| `POST /api/plan/draft` | Plan an event → "Draft the plan" | suggest up to 3 extra team steps; **dates are set by the rule engine** |
| `POST /api/ask` | Ask Platypus | answer only from the rule book with [Rxx] citations; otherwise refuse |
| `POST /api/replies/classify` | Tasks → "Read reply" | label a reply done / waiting / help / other |

If AI is not configured, or a call fails, the page falls back to its simulated answers, so a demo never breaks.

## 4. Research note (IRB)

Prompts sent to DeepSeek, OpenAI or Anthropic leave ASU. Use only the fictional demo data with those providers. For Phase 3 sessions with real participants, use the provider named in the approved IRB modification (planned: ASU AIR), or add the provider to the modification first.

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
