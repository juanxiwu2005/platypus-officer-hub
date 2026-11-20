# Onboarding and responsibility-matching rollback handoff

2026-11-16 (America/Phoenix) · Codex · User requested main onboarding first, then reading existing proposals before discussing new UI from references/sketches.

## Results

- Target remains `claude/fervent-thompson-e2j5u2`, draft PR #14; `main@b9e7a02` unchanged/unmerged.
- Rollback commit `4abc510`; complete original matching implementation remains in ancestor `5e301d9`. Additive rollback, no history rewriting.
- `src/onboarding/` restored to main's Name → Constitution → Goals → Team → First event → Reminders → Confirm → Invite. Only Confirm save boundary differs: record completion, clear draft, leave only after saving succeeds. Copy/layout/flow/organization chart restored to main; FB-2/3 style overrides removed.
- Constitution upload, AI role/duty-text extraction, manual editing retain main behavior. New standalone responsibility settings, qualification/availability, default/backup UI, actual-task matching adapters withdrawn; task form uses original owner selection.
- Old `/#/matching` redirects to Settings; no responsibility entry in Team/Settings, no new configuration section in task details; old enabled flags cannot route new tasks through withdrawn matching.
- Reminder center, FB-6 date calibration, event/task creation, unrelated features retained. No real AI calls, new UI, or RACI/later work.

Proposal for user review: [responsibility-matching strategy](MATCHING_STRATEGY_FOR_REVIEW.md). Await user review/references/sketches, then confirm interactions before implementation.

## Archive protection

UI rollback does not lower schema: outer version stays **23**; reading 22 backs up original first, with failed backup pausing writes. Version 23 does not rebuild graphs; preserves tasks, owners, statuses, matching records, unknown nested fields.

`matching`, `matchingContext`, task `matching`, workspace identity, old mode flags remain inactive archive fields. Creation/claiming uses original logic without old qualification parsing or matching receipts. Full export retains these fields. Stage-2 standalone local draft keys and already-written private server archives were not deleted; old settings editor is unavailable after rollback.

On explicit new-club creation or restoring another business archive, Provider first backs up the complete current snapshot including matching. Backup/main-write failure keeps draft, does not report success, and stays on page. New clubs do not inherit old matching identity. Cross-tab overwrite protection remains.

Before reviving matching, explicitly reconcile teams, tasks, historical receipts. Ordinary operations during rollback do not maintain the old matching graph; old records cannot auto-enable as currently confirmed configuration.

## Checks and evidence

| Check | Result |
| --- | --- |
| Compared with main | Entire onboarding directory and OrgChart differ only by Confirm save logic, 2 added/2 removed; source screens/copy/steps/styles restored |
| Related unit/component | 10 files, **117 passed**, including 8 dedicated cases for 23 archives, unknown-field export/restore, old mode not blocking tasks, backup failure, cross-tab guards |
| First browser group | 120 cases, 114 passed/6 failed; new tests omitted main's required Mission and restored tests still expected Today home heading. After supplying real inputs and matching retained Reminders home without weakening assertions, all 6 reruns passed |
| Additional browser group | 132 cases, 126 passed/2 skipped/4 failed; workflow fixture incorrectly removed retained FB-6 timing. Restoring original FB-6 fixture fixed 2 cases across devices; remaining 2 word budgets below |
| Core rollback browser cases | Desktop/mobile **6 passed**: main Constitution/Goals/Team steps reachable, old responsibility URL/entries withdrawn, old flags do not change owner selection, historical tasks claimable and archive survives refresh |
| UI | Main Team page visually inspected in desktop/mobile screenshots; existing onboarding accessibility/overflow checks included in relevant regressions |
| Static checks | Lint, production build (frontend types included), Netlify types passed; maximum entry about 533.84 kB, below existing 550,000 bytes |
| Global word budget | `PW_CHROMIUM=/usr/bin/chromium WORDS_PORT=4377 npm run words`: all 9 pages passed |

**Retained check difference:** user requested main screens/copy with current date calibration. Spring dinner example on restored First event has **64 words**, exceeding main's 60-word test limit; desktop/mobile cases still fail. No higher limit, deleted assertions, or test-driven redesign of the requested restored UI. Leave this word-budget difference for the next interface discussion; do not call all checks green.

Main's original test that standard-flow buffer never changes any date also conflicts with retained FB-6 rules. Unit tests retain FB-6 checks: deadlines may only move earlier, not later, subject to ASU constraints. No date-algorithm changes.

No repeat of full `npm run check` or 1158-case full browser suite. No real AIR, Safari/iOS, cross-device, real multi-user testing.

Logs: `/tmp/matching-rollback-unit.log`, `/tmp/matching-rollback-browser.log`, `/tmp/matching-rollback-followup.log`, `/tmp/matching-rollback-buffer-final.log`, `/tmp/matching-rollback-build.log`, `/tmp/matching-rollback-lint.log`, `/tmp/matching-rollback-words.log`. Screenshots `/tmp/matching-rollback-{desktop,mobile}-team.png`.

## Acceptance entry points

<https://deploy-preview-14--platypus-officer-hub.netlify.app/#/welcome/test/president>: view main onboarding; Test preserves original test mode without starting a study session. Only explicit Start workspace creates a test club under existing rules.

<https://deploy-preview-14--platypus-officer-hub.netlify.app/#/matching>: must redirect to Settings, with no access to withdrawn responsibility settings.

Await user proposal review/references; do not automatically restore the three-stage implementation or prematurely design/build its successor. **Local backup needs synchronization.**
