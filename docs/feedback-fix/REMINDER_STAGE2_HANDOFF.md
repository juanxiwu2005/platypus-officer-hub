# Reminder stage two: rule emails and standalone task page handoff

2026-11-16 (America/Phoenix). Juanxi explicitly requested “continue stage 2.” Branch `feat/reminder-plan-v2`, existing [PR #15](https://github.com/juanxiwu2005/platypus-officer-hub/pull/15), base `claude/fervent-thompson-e2j5u2`; merged `26af354`, synchronized through `5e301d9`, retaining actual matching/claim rules/v23 save protection. Only PROGRESS documentation conflicts resolved, preserving both deliveries.

## Results

| Requirement | Delivered |
| --- | --- |
| Rules first, no AI wait | Single-reminder editor entirely rules, no AI requests even with global AI enabled; greeting, date explanation, requirements, importance, collaboration, thanks from rules/saved facts |
| Event before item | Subject fixed `event · specific task`, Club work for standalone |
| One main deadline | Task due emphasized; start only natural trigger explanation (“today is planned start”); due/overdue phrased from current records, not asserting real-world noncompletion |
| Requirements/meaning | Manual Task instructions/Completion criteria/Why it matters first, then actual attendance/steps/dependencies; no fabricated 40 attendees; maintain fields in Details Edit |
| Concise email | ~100 English words maximum, greeting/requirements/importance/collaboration/thanks; body validated for one Open task link, no four-status link list/raw materials URLs |
| Open current task only | New `/#/officer?access=…` shows event/task, one deadline, requirements, criteria, importance, one applicable real action entry, status actions |
| Ongoing updates | Same link Working on it→refresh→Done, viewable after completion; unclaimed tasks require I've got it, no bypass of matching qualifications; Working is not extension request |
| Waiting on help | Choose current member/help needed; new runtime creates independent follow-up. Recipient only Acknowledge/Update provided, no original-owner/status change; external dependencies save explanation, no guessed email |
| Prevent mistakes/false success | Reassignment, ownership-version change, departure, expiry, tampering invalidate access; finance controls cannot directly Done; failed save retains input/retry, no old-record inference of new success |
| Traceability | Rule-email snapshot revalidated against current recipient/mode/requirements/grant; no fabricated old bodies/recipients; action summaries omit tokens/signatures/full email |

New email/task page lazy-loaded; old `?token=` one-use entry compatible. New grants remain current-browser local demos, not server login/cross-device capability.

## Acceptance

After preview publication, open owned unfinished task from Tasks, Details→Remind. Check event/task subject order, Task due, requirements/thanks, then sole Open task link; Working on it, refresh, Done. Preview correction (2026-11-16, America/Phoenix): previously inferred PR #15 URL actually shows Site not found; no valid online preview now; latest entry/deploy obstacles: [stage 3 handoff](REMINDER_STAGE3_HANDOFF.md#acceptance).

For requirement comparison, edit Task instructions/Completion criteria/Why it matters in original Details, save/reopen reminder; body/page read latest facts. Action button may be school application entry; if only landing page known, state scope rather than pretending it is authenticated form.

Complete new-plan Waiting candidates/independent email require explicitly enabled runtime; ordinary legacy saves retain compatibility plan. Browser acceptance uses actual persisted runtime fixture for follow-ups, verifies waiting recipient and no original-status edit. Unified enable entry/single/batch/automatic demos/Details reordering are stage 3.

## Independent review/fixes

Mail/Page developed in separate worktrees; lead exclusively owns shared types/grants/store/snapshots/route bridge/instructions editing/integration. Independent Review checks candidate, original owners fix counterexamples.

1. Corrupt runtime missing waitingRequests broke ordinary owner status saves. Structure validated before read; normal updates independent of corrupt waiting records, original fields retained.
2. Same-day identical old email could falsely count as new save success. Confirmation checks current action/new records, not matching body alone.
3. Resaving existing Waiting on could replace help text with name, closing/recreating request. Prefill saved text; unchanged save creates no follow-up.

Added protection for corrupt null/0/false/empty-string saves: no overwrite-enabling or legacy-send fallback; ordinary owners still update without clearing corrupt field. Focus test waits actual useEffect focus, retaining same assertion/timeout.

## Checks

Final runtime candidate `e91346484c785f5667a59cb79effae37db3d70a9` passed independent Review; only docs afterward.

- 330 unit/component cases across 20 files passed. Command: `npm test -- src/reminders src/matching/stage3Creation.test.ts src/matching/stage3Persistence.test.ts src/matching/stage3RecoveryUI.test.tsx src/test/workflow.test.ts src/test/nudges.test.ts src/test/reminderQueue.test.ts src/test/store.test.tsx src/test/officerLinks.test.ts src/test/handoffReview.test.ts src/test/fb-04-taskDue.test.ts src/test/fb-04-taskDetail.test.tsx --maxWorkers=1`.
- 6 compatibility specs desktop/mobile67 passed, 1 mobile-only skipped desktop: tasks/today/fb-01-ai-wait/fb-08-reminder-centre/research-log/reminder-stage2. Latest merge reran 8 email/task-page +2 entry-size cases, 10 passed.
- New coverage: sole email link/no AI; same link Working/refresh/Done/completed read-only; Waiting/Stuck persistence; tamper/reassignment revocation; actual waiting-email recipient/help-only response. Both-device WCAG/overflow checks, screenshots inspected.
- lint, frontend/backend types, production build, whole-site word budgets, targeted stylelint passed. Built with 40-character `COMMIT_REF=e91346484c785f5667a59cb79effae37db3d70a9`, `BRANCH=feat/reminder-plan-v2`, `CONTEXT=deploy-preview`; entry `/assets/index-DV95VBqu.js` **545,608/550,000 bytes**, threshold unchanged.
- All 3 unchanged independent counterexamples now green; final 26 page +3 counterexamples =29 rechecks passed; temporary tests/dependency links removed.

During parallel browser-build/word checks, one existing reminderQueue case hit original 5-second timeout; 329 others passed. After browser finished, all 330 passed single-worker rerun; no timeout/assertion changes. Earlier Waiting selector changed to combobox role, same action/status assertions; final focus waits useEffect, no focus assertion removed.

No full-site Playwright, real AIR, external delivery, real Safari/iOS checks. Online preview blocked by environment proxy 403; local production/screenshots do not verify live deployment. User selects external-draft destination; saved snapshot does not verify address/delivery.

## Subsequent scope

Stage 3 still requires approval: three-part Details, unified Reminder Center single/batch/automatic, new-runtime default enabling/settings migration display. Legacy saves' automatic/batch paths not upgraded to full rule-mail snapshots by stage 2; single-mail delivery is not complete backend integration.

Real scheduled sending/server-shared data/cross-device identity/delivery failures remain sixth of six items.0 real AI/external emails, no main merge/formal release/handoff changes. Local backup needs synchronization.
