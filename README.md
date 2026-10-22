# Platypus Officer Hub (prototype)

**Live site:** https://platypus-officer-hub.netlify.app (auto-deploys from `main` via Netlify)

Front-end prototype for an ASU Barrett honors thesis on a low-cost, AI-assisted operations tool for student organizations (Phase 3).

- `public/index.html` — the whole app (HTML, CSS, JS in one file). Rule engine and Gmail/Calendar links are real; AI is live when the server has an AI key (see docs/AI_SETUP.md), otherwise simulated. Data storage is still in-memory.
- `netlify/functions/` — server endpoints (`/api/*`) that call the AI provider. `netlify/lib/ai.mts` is the provider adapter.
- `docs/AI_SETUP.md` — how to turn on DeepSeek and how to switch provider later (environment variables only).
- `netlify.toml` — Netlify settings. Every push to `main` redeploys the site.

**Data:** the organization, people, emails, budget and "officer reports" in the demo are fictional. No research data (survey responses, interview material) is stored in this repository.

**Backend plan:** static site on Netlify + Netlify Functions at `/api/*` that call ASU's AIR models (OpenAI-compatible). API keys live only in Netlify environment variables, never in this repository. See the "How it works" page in the app.

---

**中文说明：** 这是论文 Phase 3 原型的前端代码。以后改代码只需要告诉 Claude 改什么：Claude 修改 GitHub 上的代码后，Netlify 会自动重新部署。仓库里没有任何研究数据，也不存放 API key。
