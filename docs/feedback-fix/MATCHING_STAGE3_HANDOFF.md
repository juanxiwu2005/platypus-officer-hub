# Duty matching stage 3 handoff

> **The user requested rollback of this delivery.** Current preview restores main onboarding and removes duty setup/business integration; this page is a historical record of original commit `5e301d9`. Current entry, data protection, and checks: [rollback handoff](MATCHING_ROLLBACK_HANDOFF.md); original strategy: [proposal](MATCHING_STRATEGY_FOR_REVIEW.md). Do not use the Enable responsibility matching acceptance flow below for the current preview.

2026-11-16 (America/Phoenix) · Codex lead + independent Workflow / Integration / Review worktree agents.

Juanxi explicitly authorized “continue stage 3.” Stage 2 baseline `dbfc47d`, target still `claude/fervent-thompson-e2j5u2`, Draft PR #14; no `main` merge. This round completes business integration across three task-matching stages, awaiting user acceptance; RACI, reminder plans, email, email entry links, background sending, and newcomer onboarding were not started.

## What users can do now

Preview: <https://deploy-preview-14--platypus-officer-hub.netlify.app/#/matching>.

1. As president/VP, Team or Settings → **Set up responsibilities**. Existing organizations first choose **Enable responsibility matching**; this changes no existing tasks, members, or roles.
2. Upload a fictional constitution or paste text into the actual organization duty library, explicitly request an AI draft, and review each source; alternatively **New responsibility**, enter boundaries, deliverables, required qualifications, then confirm.
3. Link existing roles/members through role-duty bubbles and member exceptions, enter actual availability/qualifications; set **Default person**/**Backup** per duty. Duties grant neither platform administration nor school approval authority.
4. **Workflow links**: choose workflow, select/confirm organizational duties per step; split composite work or explicitly define coordination. All 46 standard steps have review entries; none silently confirmed to a fixed role initially.
5. Tasks → **+ New task**, select duty/person; or Events → **+ New event**, confirm actual assignees in the event-request review card. Qualified/available defaults preselected; backups require explicit choice; missing duties, unknown qualifications, or unavailable candidates remain unassigned.
6. Tasks assigned to others are **Not claimed**, accepted by the recipient via **I've got it**. Task Details **Responsibility & assignment** explicitly adds links/reconfirms assignment; old tasks receive no fabricated historical acknowledgments.

Existing stage 2 previews can **Import this preview**: must belong to current organization with valid references; cannot overwrite a nonempty library or import example fictional task acknowledgments. `?example=1`'s 12-person example remains isolated practice, not the current team.

Library header supports full business backup export, explicit restore, pause/resume matching. Back up current data before restoring. **Pause responsibility matching** retains library/tasks/history; save/upgrade-backup failures are explained and originals retained. If another tab saved, this page pauses writes; download its copy then reload.

## Connected architecture

| Item | Result |
| --- | --- |
| Sole business source | `DemoState.matching` stores duties, relations, step requirements, rules, immutable acknowledgments; `matchingContext` stores source review, qualifications/availability, import origins, task-specific manual exceptions. Names/current holders read original people/roles |
| Actual creation entries | Event review, Tasks, Ask task form, event add-step, first organization setup, auxiliary task creation share one adapter; new mode no longer guesses assignees from nine functions |
| Multiple people per duty | Deduplicated candidates; default/sole qualified candidate preselected, backup awaits choice, multiple without default await selection; confirmation creates one task/one actual assignee |
| Manual exception | Explicit **Assign manually for this task** required to bypass this task's duty qualifications; gap separately recorded, no permanent duty/qualification granted |
| History protection | Enable/import/configuration changes do not rewrite existing nodes; reassigning legacy unlinked tasks does not infer duties from current templates; existing tasks retain workflow identity |
| Claiming/reassignment | Claim button, underlying claim, Board drag check qualifications; reassignment reuses transfer core including ownerVersion; old signed links do not revive upon assigning back |
| Workflow extension | Standard/custom workflows distinguished by workflowId + stepId, sharing organization duties; [46-step table](MATCHING_STEP_COVERAGE.md) marks 37 draft, 9 needs_split |
| Persistence | Outer 22→23 upgrades after original backup, preserving old tasks; enabled mode writes only business source. Confirmation actions show success only after save; failed writes/existing cross-tab conflicts pause without overwriting another page |

Original date engine, conditional steps, dependencies, budget, and role permissions retained. To keep original entry budget 550,000 bytes, split store-independent matching-core and Zod validation; no new dependencies/raised threshold.

## Worktree delivery/review

- Lead: frozen contract `0755270`, integration `89c9418`, bundle split `8335cc7`, data/claim protection `5aee6e6`, cross-tab protection `f5a0c4b`, form/valid-conflict assertions `26af354`, preserve old-setup draft on failure `62ed759`; final code/test candidate `8b9633d`.
- Workflow: initial `79a16b6`, historical workflow-identity fix `08b788d`; 33 adapter tests passed; commits retained in integration.
- Integration: independent creation/migration/recovery/browser tests through actual reducer/web entries; final browser package `3d9c87b`; no initialization-helper shortcut for actual enabling.
- Independent Review: full runtime review `89c9418`, rechecked/passed `f5a0c4b`. Fixed old-node unintended edits, bad-config crashes, reassigned old links, claiming bypass, retrospective identity, template crossover, upgrade pause, cross-tab overwrite. Independent dual-Provider experiment confirms old page rejects after external write. Later narrow review passed form/valid-action assertions and old `/setup` save-boundary fixes; added IndexedDB draft refresh/recovery browser assertions as suggested.

## Verification record

Full `npm run check` ran: lint/production build passed; unit stage **1553 passed/5 timed out (111 files, 1558 cases)**, stopping the command; browser/word checks ran separately. All 5 were 5-second timeouts; assertions/timeout limits unchanged.

Engine 51 and uiLog 21 passed all 72 on lower-concurrency rerun; all 18 MatchingSetupView cases passed alone. Remaining calibration full day-by-day enumeration also yields **39 passed/1 timeout** on stage 2 baseline `dbfc47d` with the same command, about 19.59 seconds vs current 19.54 seconds alone; no functional assertion difference from new matching. This does not justify claiming all gates green.

Final `npm run build` (frontend types included) and `npm run typecheck:netlify` passed; largest entry **524.04 kB < 550,000 bytes**. `PW_CHROMIUM=/usr/bin/chromium WORDS_PORT=4357 npm run words` passed all pages; new Settings entry initially exceeded by 3 words, shortened to 150/150 without increasing limit. Netlify Deploy Preview for `26af354` success; environment proxy returns 403 to preview-domain CONNECT, so local browser tests are not claimed as live clicks. GitHub returned no PR workflow run for that commit.

Full browser run on production build `26af354`: **1158 cases: 1038 passed/107 skipped/13 failed (22.9 minutes)**. Failures addressed individually, no deleted assertions, raised quality limits, or skips counted as passes:

- 7 menu/toast/workflow motion-sampling cases passed targeted low-concurrency reruns.
- 4 failures came from tests clearing main storage after Provider mount, triggering new cross-tab protection: `rehearsal`, `dx-18-empty`, `dx-25-done` cleanup moved before first document load; Rules additionally waits for actual list rendering. Original task counts, full participant flow, empty-result recovery assertions retained; final rechecks passed. Task-count case separately passed baseline `dbfc47d`, not mislabeled a preexisting failure.
- 2 confirmation-page word overages: shortened new toggle to **Responsibility matching**; desktop/mobile light/dark retained original 40-word budget and accessibility passage, including replacement warning on repeated organization creation.
- Added old `/setup` save-failure regression: block only main-save writes, verify unchanged raw/URL/event name/confirmation, refresh, Restore it, verify original club name. Both desktop/mobile passed; requiring successful save before clearing draft/leaving did not weaken old business validation.

All post-fix targeted checks passed; 1158 whole-site cases were not rerun, and separate reruns are not presented as one green full run. Full `npm run check` remains non-green due to existing calibration timeout. Full raw artifacts: `/tmp/matching-s3-full-results-26af354`; logs `/tmp/matching-s3-final-check.log`, `/tmp/matching-s3-full-e2e-final.log`, `/tmp/matching-s3-final-rerun.log`, `/tmp/matching-s3-confirm-and-count.log`, `/tmp/matching-s3-count-final.log`.

Completed targeted verification:

- Final creation/persistence/recovery, adapter, onboarding argument protection, Store regressions: **6 files 104 passed** (`npm test -- src/matching/stage3Creation.test.ts src/matching/stage3Persistence.test.ts src/matching/stage3RecoveryUI.test.tsx src/matching/adapters/adapters.test.tsx src/test/onboardingInvite.test.ts src/test/store.test.tsx --maxWorkers=2`). Cross-tab cases first prove commands otherwise valid, so rejection is not invalid-command behavior.
- 33 adapter tests passed; regressions for claiming, old signed links, standard/custom workflows, 12-person custom roles, entire old-node object retention, export/restore.
- Final business browser 9 desktop +9 mobile =18 passed; all `/api/**` mocked. Actual library/new-task/task-detail screens: 6 Axe scans across desktop/mobile, 0 critical/serious, no horizontal overflow. Screenshots `/tmp/matching-s3-{desktop,mobile}-{live-library,new-task,task-detail}.png` visually inspected by lead; new-task layout adjusted accordingly.
- **0 real AI calls**; no real Blob/AIR connectivity or real-user-data tests.

## Remaining limits

1. Main business remains browser-local storage, without real organizational accounts, cross-device synchronization, or server atomic transactions; cross-tab checks reject completed external writes, not a promise of atomic CAS for simultaneous writes.
2. Main business has one custom `org.eventWorkflow` plus standard template; custom workflows remain constrained by required ASU steps. Tested standard workflow and custom workflow retaining policy skeleton plus specialist steps, not arbitrary template management/freeform generation. Core supports different workflowId; future multiple templates need stable template IDs/selection, sharing library/resolver. One-sentence generation can output reviewable steps through the same duty/assignment interfaces.
3. No automatic proof of semantically disjoint duties or complete policy coverage. All 46 standard steps have unresolved markers; full extraction audit of policies/general work functions remains incomplete.
4. External-system accounts/professional qualifications are human-confirmed; unknown remains unknown. Old `Role.holderId`/`Person.roleId` still support permissions/handoff; multiple duty candidates do not mean a complete multiple-role appointment system was rebuilt.
5. Safari/iOS, actual power-loss recovery, real-AI output quality, private Blob connectivity untested; local Chromium simulations do not certify them.

## Rollback/next

Prefer **Pause responsibility matching** in UI. Code rollback must preserve compatibility-read baseline **`e370361`**, which reads 23 and retains matching/unknown fields; do not return directly to 22-only code. Do not lower version, clear saves, or Reset demo. [Compatibility/migration/recovery](MATCHING_COMPATIBILITY.md).

Await Juanxi's preview review/changes. No main-merge approval or automatic progression into RACI/later five items. **Local backup needs synchronization.**
