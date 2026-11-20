# WP3 tasks and officer experience: acceptance and handoff

October 22, 2026 · ChatGPT · Status: awaiting Juanxi's acceptance

## Completed

1. **Tasks page:** defaults to My tasks, with team scope, a five-column board, or Gantt timeline. Details show Why, three dates, upstream/downstream dependencies, and material links. The president/VP can open a reminder draft from a task.
2. **Claim handshake:** the proposed owner must select “I've got it” to take responsibility. Current officers may claim unowned tasks. Nobody may claim or report on behalf of an already designated owner. After 48 hours unclaimed, the task appears in risks and the president's private inbox.
3. **Four statuses:** Done, Waiting on…, Need help, Need more time. Waiting requires a named person; help routes to consulted people and the president. Completion stops the current follow-up and records contribution; repeated clicks do not add points again.
4. **Draft-backed extensions:** require a valid http/https current-draft link and a later date. Requesting does not move the due date. Only the president/VP may approve or reject. Approval sends the change through the rule engine; official school deadlines stay fixed and violations remain red. Completion/reassignment cancels old requests. Expired requests cannot be approved; they may be rejected and submitted again.
5. **Officer mobile page:** `/#/officer?token=…` shows only the linked task, without sidebars/admin controls. HMAC-SHA256 signs links with a runtime-generated browser-local demo key, binding task, owner, owner version, and expiry. A successful claim/report consumes the link. Tampering, replay, expiry, reassignment, or Reset demo invalidates it. Merely opening the page changes no state, so message previews cannot trigger updates.
6. **Private follow-up and demo clock:** Demo clock advances 1, 3, or 10 days. Days 3/5 simulate reminders to the owner; day 7 prompts private president outreach with a 24-hour response deadline; day 8 proposes a temporary owner, requiring approval and a new claim; day 10 proposes a recovery timeline and creates a review task due within seven days. Recovery timelines still require approval.
7. **RACI notifications:** notify downstream owners that they can start only when all prerequisites are complete. Waiting/extensions notify downstream owners of changes; help notifies consulted people/president; extensions notify approvers/president; other informed roles receive their routed notices. Inboxes show only the current role's notices. Escalations are president/VP-only.

## Fixed ten-day example

The seed adds fictional **Confirm the workshop checklist**, owned by Jordan. The demo starts on 2026-10-22, also its latest start.

| Stage | Date | Recipient | Expected behavior |
| --- | --- | --- | --- |
| Day 3 | 10/25 | Jordan | Private simulated reminder |
| Day 5 | 10/27 | Jordan | Second simulated reminder |
| Day 7 | 10/29 | Alex / VP | Private-outreach suggestion; 24-hour response deadline on 10/30 |
| Day 8 | 10/30 | Alex / VP | Temporary-owner suggestion; no reassignment before approval |
| Day 10 | 11/1 | Alex and temporary owner, or current owner if none designated | Recovery-timeline proposal and review task |

The engine sets the review deadline to 11/6: seven calendar days after 11/1 falls on a weekend, so it moves to the prior workday. AI supplies no date. Ten +1 day advances and one +10 days advance should create identical records; further advances do not duplicate a stage.

Follow-up starts from the latest owner reply/assignment. For claimed/unclaimed work whose latest start is still in the future, silence stages wait for the work window to open. The 48-hour claim check independently starts at assignment. A reply closes the current round; later silence may start another. All rounds and manual reminders share the caps: three per task and six per person over the latest seven days. Simulated reminders also use WP2's five sections, forbidden-language checks, and 100-word limit.

## Juanxi's five-step acceptance

Preview: https://deploy-preview-1--platypus-officer-hub.netlify.app/#/tasks (Netlify login still required).

1. **Claim/status:** Reset demo → View as Jordan → Tasks → Available to claim → “Publish the event and open RSVPs…” → I've got it. It should become Claimed with four status controls. Waiting on… requires a person; Need help shows Stuck; Done removes reporting controls. Refresh preserves state.
2. **Extension:** Reset demo → View as Maya → Networking Night's “Submit the USG food request”, or `/#/tasks?node=e-night%3Ausg`. Need more time cannot submit without a draft link. Enter `https://example.org/current-draft` and 2026-11-06, then submit. Switch to Alex and approve in Private follow-up & approvals. Club deadline becomes 11/6; official deadline remains 11/4, so the risk stays red.
3. **Ten-day advance:** Reset demo → Alex → Tasks → Demo clock → +10 days. Follow-up walkthrough defaults to the sample checklist and shows Day 3/5/7/8/10 with recipients. Temporary-owner and recovery-timeline proposals have separate approval controls. Maya must not see these private escalations.
4. **Mobile page:** Reset demo → Today → first risk's Draft reminder → a status entrypoint. The linked task-only page must not update merely by opening. Need help/Done saves; the consumed link then shows “Update saved” and cannot submit again. Generate and test the link within the same phone browser.
5. **Views/notices:** List / Board / Gantt show the same tasks. Switch View as to inspect each person's Your private updates. Completing a prerequisite notifies a downstream owner only once all prerequisites are complete.

## Verification

- Local `npm run check`: build succeeded; **all 146 unit and 62 browser tests passed**.
- Retains WP2's 120 unit and 50 browser cases, adjusting only schema-version checks and assertions that previously said WP3 was unimplemented.
- New coverage includes claiming permissions, statuses, draft/date validation, approval/rejection/expiry, reassignment, contribution deduplication, ten-day stages/recipients, daily-versus-jump equivalence, combined reminder caps, RACI, signed-link tampering/expiry/replay/reset, and actual desktop/mobile interactions.
- Actual mobile layout was inspected. No real email, text, or WhatsApp was sent.

## Current boundaries

- **Single-use links are same-browser demos.** Data and the signing key exist only in that browser. A computer-generated link copied to another phone is rejected because its state/key are absent. The UI explains this. Real cross-device login, signature verification, and synchronization require v1.5 server storage/authentication; this demo signature is not a real-data security boundary.
- **Simulated reminders are not external automatic sends.** Days 3/5 appear in fictional officers' private inboxes. External delivery still requires a person to open/send a draft. The clock advances days, not hours; manual drafts still show morning/evening preferences and 8:00–22:00 guidance.
- **No live AI-provider measurement.** Status/signature/follow-up behavior is deterministic and needs no AI. WP2's provider-validation limits remain.
- **Schema 2 → 3:** older browser demos restore seed data. Reset demo clears state, requests, notices, follow-ups, links, and rotates the demo key.
- **Contribution:** light/medium/heavy scores 1/2/3, plus 1 when on time, once only. New records retain actual completion dates; older examples retain update dates. Today shows the scoring basis. Monthly export remains v1.5.
- GitHub `v1` is canonical. `/private/tmp/platypus-officer-hub-wp3` is a verified snapshot with independent local history; do not push it over the remote branch. No research materials/provider keys are in code.

## WP4 starting points

- Status/approval: `src/data/taskWorkflow.ts`, store `claimTask` / `replyTask` / `reviewExtension`.
- Follow-up: `src/engine/followup.ts`; recovery-date calculations remain in `schedule.ts`. Keep configured thresholds ordered and consistent with tests.
- Private notices/stages: `notifications`, `silenceCases`, `protocolLog`. UI filtering is not server authorization; real identity comes in v1.5.
- Mobile links: `src/lib/officerLinks.ts`; `NudgeComposer` creates them, `Officer.tsx` verifies/renders them. Never send `demoLinkKey` to AI.
- Task components: `TaskDetail`, `TaskActions`, `PrivateInbox`, `FollowupPanel`. WP4 may reuse person/role mappings and update selectors.
- Change organization settings only, not the ASU R01–R16 rules verified in this package; formal policy rechecking remains WP6.
