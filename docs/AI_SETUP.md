# AI setup: how Platypus calls AI

> Since October 27, 2026 (M1, Juanxi's decision), product AI calls use ASU AIR with task-based model routing. DeepSeek was removed on October 29 with approval. Sections 1–4 describe the current setup for this branch; the historical section records earlier behavior.

The browser never receives the API key. It calls this site's `/api/*` Netlify Functions, and those server functions call AIR. Keys and AI settings live only in Netlify environment variables.

```text
Browser → /api/chat · /api/ask · /api/command · /api/nudge/draft · /api/handbook/draft
        → netlify/lib/ai.mts (provider adapter; reads AI_* variables)
        → src/organization/modelPolicy.ts (task routing v3)
        → ASU AIR: https://openai.rc.asu.edu/v1
```

## 1. Environment variables

Set these under Netlify → Project configuration → Environment variables. Configuration instructions do not authorize changing production or deploying it.

| Variable | Expected setting | Meaning |
| --- | --- | --- |
| `AI_API_KEY` | AIR key, marked “Contains secret values” | The only required value; server-only. |
| `AI_PRESET` | Unset, or `asu_air` | AIR is the default. Do not switch providers without approval; see section 3. |
| `AI_MODEL` | Unset | AIR routing chooses by task; this value is used when routing is disabled. |
| `AI_MODEL_ROUTING` | Unset, enabled | `off` makes all tasks use `AI_MODEL`; an explicit operator fallback. |
| `AI_TIMEOUT_MS` | Unset, 25000 | Default for calls without their own timeout, including background work; synchronous calls use `AI_SYNC_BUDGET_MS`. |
| `AI_SYNC_BUDGET_MS` | Unset, 26000 | Whole synchronous call budget, including a second format-fallback or truncation request, clamped to 10000–55000 ms. Constitution/workflow calls use one second less. Health reports `syncBudgetMs`; browsers wait this budget plus 4 seconds, or 30 seconds if unavailable, without automatic retry. Ask offers Stop; reminders offer Skip AI line. |
| `AI_LIMIT_PROBE` | Unset | Only `on` enables `/api/limit-probe`; otherwise it returns 404. Remove after measurement. |
| `AI_MIN_OUTPUT_TOKENS` | Unset, 1024 | AIR request output allowance is at least this value, clamped to 256–4096. See the bounded retry rule below. |
| `ORG_SETUP_ENABLED` | Unset | Optional server storage remains hidden; see section 4. |

**Synchronous budget:** November 7 production logs showed Netlify terminating a 55-second `/api/chat` request after 31.2 seconds (approximately 30 seconds), with 504/502 and no usage line. Later Netlify documentation describes 60 seconds. Keep the default 26-second budget until the actual environment is measured. Timeout returns clean 504 JSON and a labelled local fallback. Configuration changes require authorization.

### Measure the actual Netlify limit (FB-1, once after an approved deployment)

`/api/limit-probe` only waits and returns `{ "waited": NN }`; it calls no AI and stores nothing.

1. With deployment authorization, set `AI_LIMIT_PROBE=on` and redeploy.
2. Open the site's `/api/limit-probe?s=25`, then 35, 45, and 55. JSON means that wait succeeded; 502/504 or an error page means it exceeded the limit. Refine between the last success and first failure if necessary; the maximum probe is 58 seconds.
3. The original guidance says leave 8–10 seconds of headroom for cold start and other function work; its recorded examples are to keep 26000/unset for a 30-second limit, or use 50000 for a 60-second limit. The 30-second example leaves only 4 seconds, so resolve this discrepancy and measure before changing the budget. The maximum setting is 55000.
4. Remove `AI_LIMIT_PROBE`, redeploy, and confirm health reports the intended `syncBudgetMs` and the probe returns 404 again.
5. Record actual observations and settings in `docs/PROGRESS.md` for the coordinating session.

**Output allowance and bounded retry, FB-1, November 15:** on November 12, two live `/api/nudge/draft` calls had only 120 output tokens and were truncated within 4 seconds with “output limit”; the reminder's AI sentence failed every time. The allowance is a maximum, not a requested response length: endpoint checks, including the reminder's 10-word sentence limit, remain. If `finish_reason` is `length` or `max_tokens` and the endpoint cannot retain a complete usable part, retry once with twice the allowance, up to 4096, only with at least 5 seconds remaining. Each call has at most 2 provider requests total, shared between format fallback and truncation retry. Juanxi explicitly approved this exception to the no-automatic-paid-retry rule on November 14.

After an authorized change, use Deploys → Trigger deploy → Deploy project. New values apply to new deployments. `/api/health` reports the provider, expected to be `ASU AIR`, and routing version; it never returns a key.

## 2. Endpoint and model routing

Routing version: `air-task-routing-v3`.

| Endpoint | Use | `task` | Model |
| --- | --- | --- | --- |
| `POST /api/chat` | Main application right-side Ask rail | `chat` | Muse, `muse-glimmer-30b` |
| `POST /api/ask` | Rules questions | `ask` | Muse |
| `POST /api/command` | Validated natural-language changes | `command` | Muse |
| `POST /api/nudge/draft` | One sentence in a reminder draft | `nudge_draft` | Muse |
| `POST /api/handbook/draft` | Select sources for a role handbook | `handbook_draft` | Muse |
| `/api/setup/constitution` | Read roles, reporting lines, and duties after Continue in setup step 1; no server storage | `constitution_read` | Muse. Send structure and duties requests sequentially; AIR processes one at a time, so parallel requests queue. Each must return within `AI_SYNC_BUDGET_MS` minus 1 second (25 seconds by default); duties batches contain at most 6 items. Gemma took 56 seconds on a real constitution and is not used here. |
| `/api/setup/workflow` | In setup step 5, compare planning notes/files with the standard workflow; propose edits/conflicts and assign roles by duties; no server storage | `workflow_read` | Muse. Send `changes` and `owners` requests sequentially, each within `AI_SYNC_BUDGET_MS` minus 1 second (25 seconds by default). |
| `/api/org/ai` | Longer structured Organization Setup tasks; currently hidden | `setup.*` | Gemma, `gemma4-31b-it` |
| Same endpoint, explicit Deeper review | User-requested stronger review | `setup.*` with deep mode | GLM, `glm-5-3` |

Gemma handles longer structured setup; Muse handles short conversation/editing; GLM is used only for an explicit Deeper review request. There is no automatic upgrade. Only the server selects a model by task; the browser cannot name one.

This division was a DP3 design choice, not a verified performance ranking. Juanxi reported fast responses, but do not claim “proven fastest” without a formal measurement. If configuration or a request fails, the main application labels its keyword/local fallback explicitly rather than presenting it as live AI.

## 3. Other providers, unused

| Provider | Configuration | Status |
| --- | --- | --- |
| DeepSeek | Removed | Since October 29, `AI_PRESET=deepseek` is rejected before attaching credentials or making requests; the application uses local replies. An operator should remove any obsolete DeepSeek key from Netlify. |
| OpenAI / Anthropic / compatible APIs | `AI_PRESET=openai` or `anthropic`, plus `AI_MODEL`; compatible endpoints also need `AI_BASE_URL` | Inactive presets remain in code. Research builds do not select them. Data would leave ASU; use requires Juanxi's approval. |

To restore the approved provider after an authorized fallback, unset `AI_PRESET` or restore `asu_air`, then redeploy with approval.

## 4. Optional server storage: `ORG_SETUP_ENABLED`

Juanxi's October 27 decision was to hide, rather than delete, the Organization Setup/Activity Workspace server storage introduced by DP3. It uses Netlify Blobs. By default:

1. The main application has no entry. Hidden builds show only local `/phase1/` examples and `setup-legacy`, without online setup/workspaces.
2. `/api/org/setup`, `/api/org/archive`, `/api/org/ai`, `/api/org/ai-run`, `/api/workspace`, `/api/workspace/assistant`, and `/api/workspace/assistant-run` return 404 without executing storage code. The session/archive behavior of `/api/health?check=1` is also disabled.
3. Code and tests remain. An authorized `ORG_SETUP_ENABLED=true` change and redeploy restore the feature; the interface reads the flag at build time.

Only the exact string `true` enables it; `1`, `TRUE`, and `yes` do not.

## Usage logs (S2, completed in M1)

Each AI call writes one `ai_usage` line to Netlify Logs with task, provider, requested/returned model, route version, input/output tokens, `finishReason`, response-header latency `headersMs`, total duration, and success/failure code. Since FB-1 it also records `maxTokens` for the last request, `reasoningTokens` only when supplied in `usage.completion_tokens_details.reasoning_tokens`, and `retry: "output_limit"` only after a truncation retry. Reasoning usage can help determine whether reasoning consumed the output allowance.

Do not log keys, prompts, user content, or model responses in these operational usage lines. The separately documented private workspace archive has its own scoped storage behavior.

## Research configuration

Juanxi confirmed AIR's data handling on October 27. Research builds do not select the inactive external presets; DeepSeek has been removed. A health response proves configuration/routing, not successful live authentication or answer quality.

---

# Historical reference before October 27, 2026

These entries preserve earlier decisions and do not override the current sections above.

**October 26, v3:** a small number of fictional-data live smoke calls were allowed to diagnose JSON errors, not a full live evaluation. New setup used four server-side task prompts, native schema, and streaming metrics; system prompts stayed out of the UI. Archive raw JSON before parsing; do not apply truncated/empty output. See [v3 changelog](organization/V3_CHANGELOG.md).

**October 26 update:** ASU AIR used Muse by default and GLM only for requested deep review, routing v2. This replaced v1's automatic Gemma/GLM stage routing to meet speed requirements. Setup used background jobs and archives; see [handoff](organization/HANDOFF.md) and [data foundation](organization/DATA_FOUNDATION.md). Stop additional live AI tests.

## 5. WP2 endpoints, October 22

- `POST /api/command` accepts `sentence` and minimal event/node/officer ID/display-name context. Common explicit patterns parse locally; others use `chatJSON()`. It returns `ops`, `source`, and `model`. Both server and browser whitelist operations and discard dates. A person confirms the date of a new event in the change card.
- `POST /api/nudge/draft` accepts the node title, three engine-calculated dates, actual downstream steps, and reminder window. AI rewrites only a meaning sentence of at most 10 words; code builds five sections and checks forbidden wording and the 100-word limit. The browser rebuilds against current state before opening the draft, avoiding stale dates.
- No new secrets/provider configuration is required. Disabled AI or endpoint failure is labelled local fallback.
- `parse-brief` retains compatibility while discarding AI dates; files in `public/legacy/` were unchanged by WP2.
- Fixed-command and mocked-provider checks passed. Freeform live AIR quality still required deployed validation; older references to DeepSeek are obsolete. See `WP2_ACCEPTANCE.md`.

## Organization Setup and AIR, October 26 snapshot

Netlify retains its server-side AIR key. The snapshot used `AI_PRESET=asu_air`, `AI_MODEL=muse-glimmer-30b`, and gateway `https://openai.rc.asu.edu/v1`. Changing only a key does not change the provider endpoint.

Routing v2 used Muse for default interaction and GLM for explicit deep review, with automatic slow reasoning disabled. Model selection, requested/returned variants, timing, prompt/route versions, and full input/output were archived in the private workspace. `AI_MODEL_ROUTING=off` explicitly selected a single model. See [prompt/model notes](organization/PROMPTS.md) for candidates, tradeoffs, and the limits of untested changes.

Background `/api/org/ai-run` performs generation; `/api/org/ai` queues jobs/reads results, avoiding the observed roughly 30-second synchronous hosting limit. `/api/org/archive` saves originals, operations, conversation, and AI archives without a model call. Data foundation comes before AI; failures are not disguised as success with mock output. Existing business pages retain their own behavior.

Official references: [ASU LLM API](https://docs.rc.asu.edu/ai/api/), [chat completions](https://docs.rc.asu.edu/ai/api/chat/), and [Netlify Background Functions](https://docs.netlify.com/build/functions/background-functions/).

Juanxi requested no additional live AI tests; he performs hands-on acceptance. Required offline checks and GitHub CI consume no model quota.
