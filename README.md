# Vera Officer Hub (prototype)

Front-end prototype for an ASU Barrett honors thesis on a low-cost, AI-assisted operations tool for student organizations (Phase 3).

- `index.html` — the whole app (HTML, CSS, JS in one file). Rule engine and Gmail/Calendar links are real; AI output and data storage are simulated.
- `netlify.toml` — Netlify settings. Every push to `main` redeploys the site.

**Data:** the organization, people, emails, budget and "officer reports" in the demo are fictional. No research data (survey responses, interview material) is stored in this repository.

**Backend plan:** static site on Netlify + Netlify Functions at `/api/*` that call ASU's AIR models (OpenAI-compatible). API keys live only in Netlify environment variables, never in this repository. See the "How it works" page in the app.

---

**中文说明：** 这是论文 Phase 3 原型的前端代码。以后改代码只需要告诉 Claude 改什么：Claude 修改 GitHub 上的代码后，Netlify 会自动重新部署。仓库里没有任何研究数据，也不存放 API key。
