# Reminder Center F + emails grouped by person: delivery/acceptance (2026-11-19, Claude lead + Engine/UI/Review/Tests agents)

Contract: `REMINDER_DIGEST_CONTRACT.md`; review: `REMINDER_CENTRE_REVIEW_2026-11-19.md`.

## Changes

- **Grouping (Engine):** same person's same-day reminders =one email (`src/reminders/digest.ts`, `mail.ts` `buildReminderDigestMail`/`checkReminderDigestMail`). Maximum 8 tasks (`DIGEST_TASK_CAP`), overflow in tomorrow's email. Each task retains own link, single-mail snapshot, delivery record (same `digestId`); entire group recorded atomically or not at all (store `recordReminderDigests`). `runtime.digests` stores actual full email.
- **Caps per email (B1 fixed):**2/person/day, 6/week (critical-email reservations) count emails; seed send-all records 3 emails / all 5 tasks (formerly 4 records).
- **UI (F):** header `Review N emails · M tasks · K sent today` +progress; vertical person list (task per row +reason pill +"Also has N other open tasks"); right-rail `DigestPanel` actual outgoing email, by mode: Platypus =Skip/Send & next/Send all; self =Open Gmail draft→I sent this email; automatic read-only. All person's unfinished tasks below. Fix first only fixable issues; one-row history, History opens rail. Removed duplicate This week list (B3).
- **Post-review fixes (`128c184`):** overflow after 8 deferred to tomorrow rather than second email today; mail-cap-blocked tasks excluded from Fix first, shown atop as "N tasks wait for the next email"; previews reprepare on title/date/recipient changes and refresh after record failure; switching person clears notices; double-click cannot approve next email.
- **Test migration:** bts, dx-03, dx-06, fb-01, reminder-stage2, research-events, task-details-universal, tasks:125, today:59/:80/:123, wp5 adapted to new page, preserving intent (no AI/email, rule text, tampered-link rejection). Added `e2e/reminder-digest-centre.spec.ts`, `src/reminders/digest.test.ts`.

## Verification (2026-11-19, local production build)

- Unit/component: 2098 of 2100 passed; 2 failures (`uiLog` Export download, `calibration`5-second timeout) also fail pre-change `4d6290e`.
- Browser: full desktop 585 passed/23 skipped; mobile reminder-related 15 specs 82 passed/5 device skips. Remaining desktop failures compared with baseline: no new work-caused failures; `ob-08`, `ob-12`, `workflow-milestones:87` pass isolated reruns (intermittent parallel load); `rehearsal:59`, `tasks:13/:60/:163/:209` (old Task Details buttons), `dx-18`, `research-log:84`, `p3a:31`, etc. already fail baseline, unchanged.
- tsc/lint passed; all word budgets met (new reminders Today ~179 / 271, caps 200 / 500); page 1142 px (formerly 2856 px).
- Screenshots: `docs/prototypes/reminder-digest-implemented/final/` (desktop, Jordan email, self-send, after Send & next, mobile).

## Boundaries/known issues

- 0 product-AI calls/real emails; no `SCHEMA_VERSION` increase (optional fields only); signatures, authorization scope, mode, `canLead` unchanged.
- Still browser demo: automatic records only while page open; real email/server schedules/database in review section 2.
- Single-task Ask Remind counts as a separate email, but top sent today counts only digests.
- Event email links open Plan task panel, which lacks completion criteria (old single-task page shows them); marking Done through link requires content/attachment.
- `dx-06`: top counts/overdue pills lack tabular numbers (minor design gap, CSS unchanged).
- Baseline-failing page tests above need their respective owners.
