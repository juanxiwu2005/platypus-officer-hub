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
