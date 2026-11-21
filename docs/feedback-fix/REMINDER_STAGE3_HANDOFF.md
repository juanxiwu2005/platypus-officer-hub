# Reminder stage 3 handoff: Details, reminder center, unified rule-based emails

2026-11-16 (America/Phoenix). Juanxi explicitly requested "continue stage 3". Continued from `feat/reminder-plan-v2@17b3e3c`, retaining matching source `5e301d9`; reused [PR #15](https://github.com/juanxiwu2005/platypus-officer-hub/pull/15). Technical implementation and independent review complete, delivered for acceptance; preexisting full-gate timeouts are listed separately below.

**Current delivery follows [preview 14 integration handoff](REMINDER_PREVIEW14_INTEGRATION.md).** User subsequently specified existing PR #14. Preserve `57c7e55`'s responsibility-matching withdrawal/main onboarding; do not restore original matching UI/business integration. Three-stage results below remain original development-branch verification records.

## Actual results

| Scope | Implemented behavior |
| --- | --- |
| Three-section Details | Event→task→owner/status→one Task due; requirements/completion criteria/importance, one applicable action destination/status controls; reminder target/reason/review or automatic-demo method/collapsed history. Official risks retained; private planned start visible only under original permissions |
| Four statuses | Done, Working on it, Stuck, Waiting on; extension separate. Waiting requires current member/specific assistance, identical resave creates no new request; external dependencies do not imply email. Save failure preserves input, success requires actual write |
| Single/batch/automatic | Same rule-based mail, signed task entry, snapshot validation. Batch/automatic prepare asynchronously, then recheck latest status/target/owner version/mode/date/limits per candidate; count only fully persisted items, never old identical records as current success |
| Automatic demo | Authorized by organization settings; handles current candidates while page open, including complete follow-ups to explicit waiting targets after ordinary member actions; no leadership impersonation, actor system:reminders. Failures stop/retry; StrictMode repeats do not duplicate |
| Five-section center | Needs your OK / This week / Sent / Replies / No reply yet derive from actual plans/persistent records; removed virtual would-sends. Actual recipient snapshots survive reassignment/task deletion; same-day replies use sequence; leader title edits are not member replies |
| Compatibility | New organizations default runtime v2; old no-runtime/v1 saves explicitly enable/upgrade. Preserve mode/custom task cap/old member-leadership follow-up settings; unknown/corrupt runtime neither resets, executes, nor falls back to old sending |
| Old history | Unproven nudge/protocol recipients retained as unknown, never guessed as current owner. Future reminders require leader's explicit current-assignment review; no backfilled body/recipient; review is not owner reply |
| Recovery/conflicts | Retry browser saving after temporary failure, then retry pending form/enable/approval; recovery checks actual storage, pauses on another tab's newer data without overwrite. Automatic preparation/Settings also have explicit retry |

Rules remain start date, task due, overdue day 3; start uses existing latestStart, never silently fixed to minus 3 calendar days. Existing setting allows 1–3 per task/owner term/recipient; 6 per person per rolling 7 days; same task/recipient deduplicated daily, late opening handles only most relevant candidate. Working retains due checks; Waiting/Stuck pause ordinary chasing; Done ends candidates, retains history. Official-date algorithms/policies unchanged.

Counts use new records proving recipient/term; unknown old history is not guessed into anyone's count, and future reminders require explicit review. Both review-then-platform-send and automatic modes require valid email at candidate stage even with WhatsApp preference; manual sending still permits other channels.

## Acceptance

**Preview entry update (2026-11-16, America/Phoenix):** user specified [preview 14](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/). Netlify autodeploy connection confirmed by preparation commit `d47fb5f` success/bot deployment record; final commit/deploy verification in [preview 14 integration](REMINDER_PREVIEW14_INTEGRATION.md). Previously inferred PR #15 URL showed Site not found; no longer delivered and user need not create another site.

In an available preview, open reminder center:

1. Existing demo save: **Enable updated reminders** first. Preserve prior mode/settings; Earlier reminder retains originals; future reminders only after explicit target review.
2. Task name opens Details; check event/task/single Task due/requirements/importance. Reminder plan states who, why active/paused, required reviewer. Action explanations distinguish official entry from specific application, inventing no direct forms.
3. `I review, then I send`: human confirms draft; `I review, Platypus sends`: individual or Approve all; `Send automatically`: persistent Automatic demo record. Sent → Recorded email shows complete historical text; refresh creates no duplicate.
4. Task page/Details: Working on it, Waiting on, Done; verify after refresh. Waiting requires target/explanation; recipient entry only Acknowledge/Update provided, never original-task completion. Unclaimed/finance/reassignment invalidation/permission constraints remain.
5. Settings marks old member Reminder 1/2 days Legacy, retained but uneditable under v2; leadership uses original values. Show new-rule summary/actual task cap. Existing calculation-explanation toggle remains; off means explanation absent from DOM.

Local-data links remain limited to creating browser; external-draft user chooses demo email destination; site does not verify delivery. Automatic demo runs only while app open, promising no scheduled sending while closed.

## Data, files, ownership

Runtime remains under same business key; outer schema v23/export formatVersion unchanged. Runtime v2 adds mailRequiredAfter: older history may lack body, new deliveries afterward require full rule-based email. Reads old v1; old code must not execute v2 as v1. No automatic snapshot/signed-entry backfill.

Lead owns store/version, delivery/batch, permissions/automatic hook, Settings, compatibility/integration; Details/Actions and Centre developed in separate worktrees, independently reviewed. [Stage 3 contract](REMINDER_STAGE3_CONTRACT.md). After UI development, two agents divided new e2e/old browser compatibility without editing each other's files.

`src/lib/reminderQueue.ts` retains historical FB-8 projected exports/old tests; current product imports none of it. Today/Details read `src/reminders/centre.ts`. Old helper would-records are not actual new sends.

## Verification

Final runtime `8b591e14ab48a8a4d39156524821cfd819a2c72a`, independent Review approved, no open product blockers; later changes documentation only.

| Browser group (desktop/mobile) | Final result |
| --- | --- |
| New stage 3 actual enable/Details/batch/automatic Waiting/write retry, Axe/overflow/title geometry/screenshots | 8 passed |
| Reminder center/stage 2 task-entry compatibility | 27 passed, 1 existing mobile-only case skipped on desktop |
| Tasks/Today/AI wait/study export/entry size | 46 passed; 4 initial failures from old labels/explicit-enable prerequisite, corrected expectations and reran original actions on both devices successfully |
| Old Details/calculation toggle/study events/press motion/forecast hover | 35 passed, 3 existing mobile mouse exclusions |
| Original onboarding/new-org sample/full rehearsal/keyboard | 16 passed |
| Final ordinary-member calculation explanation/original toggle/entry budget | 6 passed, 4 overlap above, 2 new |
| Entry budget after final email-validation incremental build | 2 passed, overlap above |

Deduplicated: 134 passed, 4 preexisting exclusions. Batched with targeted reruns, not full-site Playwright; do not present as one full gate. Actual desktop/mobile screenshots inspected; temporary inputs entirely fictional.

Full `npm test -- --maxWorkers=2`: 126 files, 1809 tests, **1807 passed, 2 existing 5-second timeouts**. Single-worker MatchingSetupView/calibration rerun: 58 tests, 57 passed/1 timeout; all 18 Matching passed, daily calibration enumeration still timed out. Same enumeration timed out at matching stage-2 baseline; see [MATCHING_STAGE3_HANDOFF](MATCHING_STAGE3_HANDOFF.md). No date-engine/assertion/5-second-limit changes; full check not claimed green. Final ordinary-member explanation target 13 and email-rule/real Provider/centre/Today targets 4 files/98 all passed, including new regressions.

Lint, frontend/backend types, production build, new CSS, all page word counts passed. Build with 40-character `COMMIT_REF=8b591e14ab48a8a4d39156524821cfd819a2c72a`, `BRANCH=feat/reminder-plan-v2`, `CONTEXT=deploy-preview`: entry `/assets/index-DdCS42CM.js` **539,919 / 550,000 bytes**, limit unchanged. Homepage 92/200 visible, total 92/500; Settings 150/150. New explanation fits through removal of repetition, not hidden text. TaskDetail lazy-loaded by Rail; homepage interactions retained.

Independent checks cover one StrictMode record, cross-tab write during signing, save failure/retry, old/corrupt runtime not auto-enabled, no stale emails when date/requirements/email/member/permissions change during preparation, and no leftover old grants. Extra checks fixed old .card header override, missing member calculation explanation, missing-email blocking in platform review queue; each has targeted regression or desktop/mobile checks.

No real AI, external email, or physical Safari/iOS verification. Local production builds/screenshots are not online verification; latest preview investigation in "Acceptance" above.

## Known boundaries

New backend service, shared server data, cross-device identity, real scheduled delivery, failures/bounces, external-contact routing remain future work; only local rule demo/full records delivered. No expanded RACI/newcomer onboarding/organization handoff. No real AI/external email/main merge/production release. Local backup sync required.
