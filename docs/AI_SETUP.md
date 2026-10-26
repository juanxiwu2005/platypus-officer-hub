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



## Organization Setup 与 AIR（2026-10-25）

新 `/api/org/ai` 没有模拟回答兜底。换 key 时同时设置 `AI_PRESET=asu_air`、`AI_MODEL=<Voyager 模型 ID>`；地址默认 `https://openai.rc.asu.edu/v1`。只换 key 会继续请求旧供应商。初次排查可用 ASU 官方支持的 `auto`，可复现实验应固定模型。`AI_REASONING_EFFORT` 可配置，AIR 默认 `none` 避免短结构化输出预算被思考耗尽。修改环境变量后重新部署。

官方依据：[LLM API](https://docs.rc.asu.edu/ai/api/) 与 [Chat completions](https://docs.rc.asu.edu/ai/api/chat/)。Netlify /api/health 的 configured 只表示参数齐全，不能证明认证成功；须实际调用并核对页面供应商/模型。未读或输出 key。
