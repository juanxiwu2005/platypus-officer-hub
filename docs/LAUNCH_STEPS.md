# Launch steps (v1.0) — Where to click

For Juanxi. Step 4 begins only after you explicitly say "approve the merge" in the conversation. Steps 1–3 can be done now without affecting production.

> I (Claude) cannot access the Netlify preview or production site from the cloud environment (401: access protection), so **I have not personally verified steps 1–3 below**; you need to click through and confirm them.

## 1. Netlify environment variables (required in all 3 contexts)

1. Open https://app.netlify.com and select `platypus-officer-hub`.
2. On the left, select **Site configuration** → **Environment variables**.
3. Find `AI_API_KEY`, then select **Options → Edit** on its right.
4. Check **Scopes / Values**: Production, Deploy Previews, and Branch deploys must all have values (they may use the same key). For any missing context, use **Add a different value for each deploy context**.
5. Find `AI_PRESET`:
   - Absent → Fine; ASU AIR is the default.
   - Present and `asu_air` → Keep it.
   - Present and `deepseek` → **Delete it** (Options → Delete). DeepSeek has been removed from the code; leaving this value causes the AI to refuse to work.
6. Also delete any old DeepSeek keys (variable names containing `DEEPSEEK`).
7. Find `ORG_SETUP_ENABLED`: **it must be absent or not `true`**. (IRB requires no materials to be stored on the server.) If `true`, delete it.
8. Redeploy after changes for the environment variables to take effect. **Redeploy production and the preview separately**:
   - Production: **Deploys → Trigger deploy → Deploy site**. (This only rebuilds `main`; it does not change production site content.)
   - Preview (needed in step 2): on **Deploys**, find the latest **Deploy Preview #8**, open it, and select **Retry** at the upper right (*Retry with latest branch commit*).
     Clicking only Trigger deploy leaves the preview using the old variables.

## 2. Run a small AI smoke test with fictional data (preview)

Open the preview: https://deploy-preview-8--platypus-officer-hub.netlify.app (sign into your Netlify account if prompted).

Use only fictional data; enter no real names or research materials. Try these three things in Ask, in order:

1. Ask a rule question, such as `Can we order food from an outside caterer?` → It should give an answer with sources.
2. Say `Create an executable task: print flyers, owner Alex` → It should show a task form rather than an event.
3. Say `Plan a new event called Spring Mixer` → It should show an event form.

If all three receive reasonable responses, this passes. **These are only 3 calls and use little quota.**

**The 40-question rules evaluation (`docs/AI_TESTS.md`) uses more quota. You decide whether to run it; I will prepare commands only after you say "run it."** Until it runs, the documentation will not claim "live AI acceptance passed."

## 3. Confirm rate limiting works before disabling access protection

The site currently has Netlify access protection (so outsiders and I cannot open it). It must be disabled before public student-organization use, but first confirm rate limiting works:

- Limits: 60 requests per IP per minute, 600 per hour; 3000 requests site-wide per hour.
- Counts are **separate for each function instance** (held in memory), so this "deters abuse" rather than providing precise accounting.
- How to verify (**uses no AI quota**): use `/api/preflight`, which runs only local rule checks and makes no AI call, but shares Ask's rate limiting.
  1. Open the preview in Chrome at https://deploy-preview-8--platypus-officer-hub.netlify.app, sign in, and stay on Today.
  2. Press **F12** (on Mac, **Option + Command + J**) and select **Console** at the top.
  3. Paste this entire line and press Enter:

     `for (let i = 1; i <= 70; i++) { const r = await fetch('/api/preflight', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); console.log(i, r.status) }`

  4. It initially prints `200` on successive lines; **`429` should start appearing around request 61**. Seeing `429` confirms rate limiting is working.
  5. If none of the 70 requests returns `429`, requests may have been distributed across different server instances (the separate counting described above). Paste the same line once more; if it still does not happen, send me a screenshot and **leave access protection enabled for now**.
  - Do not test by repeatedly refreshing or sending Ask messages: refreshes bypass rate limiting, while repeated Ask messages waste AI quota.
- After seeing 429, go to **Site configuration → Access & security → Visitor access** and disable protection (only when you are sure you want the site public).

## 4. After merging (only after you say "approve the merge")

I will merge `integration/v1.0` into `main` → tag `v1.0` → wait for Netlify deployment. Then confirm:

1. https://platypus-officer-hub.netlify.app opens Today.
2. https://platypus-officer-hub.netlify.app/api/health shows provider **ASU AIR** (not deepseek) and no org-storage-related content.
3. Repeat the three actions in step 2 on production.

If something goes wrong, roll back: Netlify → **Deploys** → select the previous green deployment → **Publish deploy**.

## 5. PRs that can be closed and branches that can be deleted after merging

Close PRs before deleting branches (AGENTS.md §8.2). **I will not delete them for you.**

| PR | Action |
| --- | --- |
| #8 | Completed automatically on merge |
| #7 (Night Mode + N1–N6) | Contents are in v1.0; can be closed |
| #6 (M2a/M2b) | Contents are in v1.0; can be closed |
| #5, #4, #3, #2 | Old previews/integration; can be closed |

Recommend **waiting until production has run stably for a few days and is confirmed healthy** before closing PRs and deleting branches: closed PRs lose their preview URLs, and deleted branches are harder to recover.

After all PRs are closed, these branches can be deleted: `feat/ai-night-mode`, `feat/m2b-ai-intake`, `feat/organization-setup-ai`, `feat/ai-native-phase1`, `integration/dp3-dp4-merge`, `integration/v1.1-fix`, `integration/v1.0`, `v1`. Keep `main`.

## 6. Later work (v1.5)

See the S9 row in the handoff entries in `docs/PROGRESS.md` and `docs/M4_ONBOARDING_PLAN.md`.
