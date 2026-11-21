# Reminder-plan preparation and Stage 1 handoff

2026-11-16 (America/Phoenix). Branch `feat/reminder-plan-v2`, starting from responsibility-matching Stage 2 delivery `dbfc47d`; integrated source branch `e370361`'s v23 compatible-read baseline. This task did not update the matching source branch.

## Completed

Preparation defined the [full implementation plan](REMINDER_IMPLEMENTATION_PLAN.md) and [frozen contract](REMINDER_STAGE1_CONTRACT.md). Two packages completed in separate worktrees, lead integrated real reducer, independent Review checked. Stages 2/3 still await approval.

| Scope | Actual Stage 1 delivery |
| --- | --- |
| Rules/AI | New facts, dates, recipients, triggers all rules; 0 live AI calls; greeting/thanks email formatting in Stage 2 |
| Dates | Data highlights one task due date; latest start triggers only; existing dates determine overdue days, never model computation |
| Requirements | Actual event/headcount/steps/human why/dependencies produce clear requirements; unknown count never becomes 40 |
| Processing entry | At most one known applicable link per item; information/routing pages labeled, never represented as final forms |
| Waiting on | Independent candidates for explicit current members; automatic mode persists simulated sends, review modes await review |
| Identity/responsibility | Original owner unchanged, helper cannot complete original task; no pretend delivery for former/self/unclear recipients or invalid email |
| History | Persist recipient, original owner/assignment version, planned date, actual record date, task/event snapshots; completion/mode changes do not delete |
| Compatibility | Optional versioned runtime explicitly enabled; old v22 not rewritten automatically; historical recipients not guessed; damaged records retained without execution |

## Actual scenarios to inspect

[Offline scenario output](REMINDER_STAGE1_SCENARIOS.json) uses the real `reducer`/rule engine with fictional Speaker Night (40 people), containing computed results rather than a handwritten result table.

| Scenario | Actual result |
| --- | --- |
| First start-date reminder | Rules return start candidate/explanation; review mode has no send record |
| Jordan selects Waiting on Sam | Sam receives independent follow-up; Jordan remains owner |
| Automatic mode repeats identical wait | One request and one corresponding simulated send |
| Change wait to Maya | Sam request closes; pending candidate targets Maya |
| Wait text without explicit recipient | `unresolved_waiting`; no guessed email/send record |
| Complete task | Candidates clear; historical sends preserved |

Real reducer regressions also cover same-day Working updates, presidential title edits, rescheduling closes old timers, reassignment/return to original owner, correct legacy-send accounting, actual token actor, reopening, new organizations not inheriting reminders, unknown/damaged runtime disabled.

## Independent-review findings fixed

1. Activation inherited old open silenceCase records, potentially producing legacy escalation before the new start date. Explicit activation now closes old cases, preserves history, and starts subsequent timing from current date.
2. Automatic email might miss email validation when WhatsApp is preferred. auto_email now always requires valid email regardless of channel preference.
3. Damaged array entries in v1 runtime could crash reads. Validate each record, preserve values and disable, without masking errors through reset.

Independent helper follow-up has its own actual-recipient three-message allowance, without consuming the owner's ordinary allowance; six per seven days and same-task/day deduplication remain universal.

## Verification and acceptance limits

Final related checks: `npm test -- src/reminders src/test/workflow.test.ts src/test/nudges.test.ts src/test/reminderQueue.test.ts src/test/store.test.tsx src/test/officerLinks.test.ts src/test/handoffReview.test.ts src/test/fb-04-taskDue.test.ts src/matching/compatibilityReader.test.ts --maxWorkers=2`:13 files, 202 passed; 102 new-module, 99 original-path, 1 source-branch v23 compatibility case. Lint, frontend/backend types, production build passed.

Initially running build alongside multi-worker tests timed out one old 5-second `reminderQueue` forecast test; limiting workers to 2 made all pass, without assertion/timeout changes. New-organization fixture invite code initially failed existing validation; corrected to valid UUID, preserving validation.

No page changes, full-site Playwright, live AIR, external email, or physical-device testing in this stage. Entry exceeded budget by 493 bytes; deduplicated templates/shortened explanations without relaxing limits. Final build with 40-character `COMMIT_REF=bbce88b039e208bccac36aef52036ae01ebd676f`, `BRANCH=feat/reminder-plan-v2`, `CONTEXT=deploy-preview`: `/assets/index-Db_Ate9l.js` **549,819/550,000 bytes**. Later UI work must watch entry headroom and prioritize lazy loading.

Independent Review's final code `bbce88b` has no open blockers; all three original counterexamples passed unchanged. Full independent new-module checks:102 product tests +3 temporary counterexamples (105); final copy/compatibility increment rechecked with 58 passing tests. Temporary tests/dependency links removed. Only delivery docs changed afterward, no runtime code.

Old pages still do not enable the runtime by default. Legacy NudgeComposer may still call AI; do not claim the entire product stopped using AI. New email, reusable links, four status buttons, Details come later; real backend/cross-device integration is item 6. Helpers currently require explicit current Person members; external approvers/CRM recipients have no explicit input yet.

Stage 2 must additionally record final rendered email body, actual destination/channel, task access entry; current candidates/delivery records are not complete deliverable emails.

No main merge or production release. Local backup synchronization is needed (repository docs only this round).
