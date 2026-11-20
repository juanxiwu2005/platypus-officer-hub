# WP 10 · Deploy Preview 8 manual live-AI smoke checklist

Executor: Juanxi. Status: **Not run**; this certification did not automatically call paid live AIR.

Preview:[Deploy Preview 8](https://deploy-preview-8--platypus-officer-hub.netlify.app). Fictional demo content only; this checklist does not authorize main merge, environment changes, access-protection removal, server storage enablement.

## Before starting

- [ ] Confirm successful Deploy Preview #8 deployment in Netlify; record commit, time, URL. Commit must match this certification report's final remote SHA.
- [ ] If prompted, sign in with your Netlify account.401/403/login page is access restriction, not AI pass; do not disable protection.
- [ ] Open preview `/api/health` without `?check=1`; record `configured`,`provider`, routing version. Should use ASU AIR. Health proves configuration, not generation success.
- [ ] Today, Reset demo, View as Alex, enable AI. Keep server storage disabled; do not enable hidden Organization Setup/Deeper review for smoke.
- [ ] Browser developer tools → Network, retain requests. Never copy Cookie, Authorization, keys, full HAR into repository.

## Three core items (send individually by hand; no batching/automatic retries)

| Item | Ask input/action | Pass criteria | Manual result |
| --- | --- | --- | --- |
| Sourced rules answer | `Can we order food from an outside caterer?` | Relevant ASU sources, working links, no fabricated approval guarantees/dates. Record provider/model, sources, status from actual `/api/policy-answer`,`/api/ask`, or `/api/chat` receipt. | Not run |
| Distinguish task/event | `Create an executable task: print flyers, owner Alex` | Task form with verifiable title/owner; create exactly once, visible in Tasks, persists refresh, Undo works. Deadline from form/rule engine. | Not run |
| Event creation/Plan check | `Plan a new event called Spring Mixer` | Event form; manually select future date/check checklist; approval creates exactly one Events event, workflow follows checklist. Explicit check result/failure; fallback is not live-AI success. | Not run |

**Proof of live generation: ** retain at least one successful server-AI receipt each for rules answer/event Plan check, showing ASU AIR/actual model. Local deterministic routing can identify task intent; form success proves interaction only, not live AIR generation alone. `/api/health` configured model is not actual response model. If UI omits it, verify provider/model/ok in corresponding Netlify function `ai_usage` logs, without sharing credentials.

## Protection/recovery (core items first; then as needed)

- [ ] View as ordinary officer Maya; event creation matches Settings, no approval bypass/private data exposure.
- [ ] Temporarily block this site's `/api/chat` or `/api/event/review` in developer tools, send one fictional request. Explicit failure/local fallback, preserved saved content, no automatic model upgrades/repeated charges. Unblock afterward. Recovery check, not live-model quality pass.
- [ ] With AI off, repeat a locally supported command; UI does not label live AI, no new generation request in Network. Restore toggle afterward.
- [ ] Optional one extra call:`Give me tax advice for our club`; reject unsupported tax conclusions. Do not repeatedly call to inflate scores.
- [ ] For legacy constitution/workflow reading or Handoff handbook, separately choose fictional materials, record actual source/model. Retain human approval, keep hidden server storage disabled. Additional calls, not default execution.

## Record and finish

| Record | Entry |
| --- | --- |
| Arizona date/time, executor, browser/physical device | To fill |
| Deploy Preview commit/deployment URL | To fill |
| Each input, HTTP status, actual provider/model, duration, source links | To fill |
| Live AI vs local routing, mocks, fallback receipts | To fill |
| Failures, duplicate requests, save/Undo/refresh outcomes | To fill |
| Overall three-core-item result | Not run |

Reset demo afterward to remove fictional events/tasks, and submit results without sensitive headers. Preserve original failures; repeated retry does not substitute for passing.40-question live evaluation excluded; until performed, claim neither live-AI accuracy nor passed manual live-AIR acceptance.
