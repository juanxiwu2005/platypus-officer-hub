# Step Up (v1. 0) - Point

Write to Juanxi. Only after you explicitly say "approved" in the conversation will you enter step 4. Step 1–3 can be done now, without prejudice to the line.

> Claude has no access to Netlify previews and official stations from cloudy environments. 401: Access to protection), so... **The next one. 1–3I didn't personally verify it.**I need you to make sure.

## 1. Netlify Environmental Variables (in every range of 3)

1. Open https://app.netlify.com and point to station `platypus-officer-hub`.
2. Left point **Sit communication**  →  **Environment benefits**.
3. Find `AI_API_KEY`, click on the **options on its right. Edit**.
4. See **Scopes/Values**: Production, Deploy Previews, Branch depoys all have value (which can be the same key). Unlimited scope **Add a different value for each deploy context**.
5. Looking for `AI_PRESET`:
   - There's no such thing as the ASU AIR.
   - It exists and it's `asu_air` that can be retained.
   - `deepseek`  →  **delete** (Options  → Delete). DeepSeek has been removed from the code and will allow AI to refuse work directly.
6. If there's an old key for DeepSeek `DEEPSEEK`And delete it.
7. Find `ORG_SETUP_ENABLED`: **must not exist, or not `true`**. (IRB requires the server to keep no information. If it's `true`, delete.
8. The environmental variables will become effective only if the changes are completed and redeployment takes place. **The official station and the preview station are to be repeated separately.**：
   - Official station: **Depoys  →  Trigger deploy  →  Deploysite**. (This will only rebuild `main` and not change the content of the official station. ）
   - Preview station (with step 2): also on page **Deploys**, find the most recent one in the list **Deploy Preview #8**, point it in and point **Retry** at the upper right corner (elect *Retry with latest branch committee*).
     The preview station is still using the old variable if only the Trigger deploy is marked.

## 2. A small AI smoke test with field data (prevator)

Open preview: https://deploy-preview-8--platypus-officer-hub.netlify.app (use your Netlify account if you want to log in).

Use field data only. Do not enter a live name or research information. Try three things in Ask:

1. Ask a rule, for example: `Can we order food from an outside caterer?`... should give an answer with source.
2. Say: `Create an executable task: print flyers, owner Alex`  →  There should be a mission form, not an activity.
3. `Plan a new event called Spring Mixer` should appear in the activity form.

All three times, a reasonable response was granted. **it's just 3 calls, not much.**

The assessment of the **40 rules (`docs/AI_TESTS.md`) would be more expensive. It's up to you to run. When you say "run", I'll prepare the order.** doesn't write "live AI access" until it runs.

## 3. Validity of flow limits before access to protection can be secured

The site now has Netlify access protection (and I can't get anywhere else). Online to target organization before it is turned off, but before it is turned off, confirm that the limit flow is working:

- Stream limit rule: 60 per minute, 600 per hour for each IP; All stations per hour 3000Second.
- It's **, and it's** for every function case. So it's "stopping misuse," not an exact count.
- Confirm method (**does not cost AI**): with `/api/preflight`, it only runs local rules checks and does not call AI but shares the same limit stream with Ask.
  1. Opens the preview station https://deploy-preview-8--platypus-officer-hub.netlify.app with Chrome and stops on the Today page after login.
  2. Press **F12** (Mac is **Implementation + Comand + J**), **Console** above the point.
  3. Stick this whole line in and press the car back:

     `for (let i = 1; i <= 70; i++) { const r = await fetch('/api/preflight', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); console.log(i, r.status) }`

  4. `200`, **to 61 should start appearing around `429`**. Seeing `429` indicates that the flow is limited at work.
  5. If... 70Not once. `429`: It may be that the request is divided into different server examples.  Try the same line again. Still no, send me the screenshot, **not to turn off**.
  - Do not use continuous updates of pages or serial issuances of Ask to measure: refreshing pages without a limit flow, consecutive circulation of Ask will be wasted at the AI level.
- After seeing 429, then go to **City, Access & Security, Access** and turn off protection (only when you're sure you want to be public).

## 4. Mege after you say "approved"

I'll: merge `integration/v1.0` to `main` to play `v1.0` tags and wait for Netlify to be deployed. And then you confirm:

1. Open https://platypus-officer-hub.netlify.app to access the Today page.
2. Open https://platypus-officer-hub.netlify.app/api/health, you should see that the provider is **ASU AIR** (not deepseek), and there is no relevant content stored at org.
3. Do three more things at the official station on step 2.

The problem is the fallback: Netlify  →  **Deploys** select the last green deployment < **Public deploy**.

## 5. Erge can close PR and delete branch after

Close the PR and delete the branch (AGENTS.md § 8.2). **I won't delete it for you.**

| PR | Processing |
| --- | --- |
| #8 | Automatically complete after metge |
| #7（Night Mode + N1–N6） | The contents are already in v1. 0 and can be closed |
| #6（M2a/M2b） | The contents are already in v1. 0 and can be closed |
| #5、#4、#3、#2 | Old preview/assembly can be closed |

Recommendations **After the official station has been in operation for a few days, it's okay.**Turn off the PR and delete branches: The closed PPR preview site is gone, and the deleted branch is difficult to retrieve.

When all of these branches are closed, they may be deleted: `feat/ai-night-mode`, `feat/m2b-ai-intake`, `feat/organization-setup-ai`, `feat/ai-native-phase1`, `integration/dp3-dp4-merge`, `integration/v1.1-fix`, `integration/v1.0` and `v1`. Keep `main`.

## 6. What to do later (v1. 5)

See line S9 and `docs/M4_ONBOARDING_PLAN.md` in the `docs/PROGRESS.md` handoff log.
