# Alarm Center Program F +Merge Mail: Delivery with Acceptance (2026-11-19, Claude Master Agent + Engineering / UI / Reviewew / Tests Agency)

Contract: `REMINDER_DIGEST_CONTRACT.md`; Review: `REMINDER_CENTRE_REVIEW_2026-11-19.md`.

## What did you do?

- **by person (Engine):** reminder of the same person = one email (`src/reminders/digest.ts`, `mail.ts` `buildReminderDigestMail`/ `checkReminderDigestMail`). Each maximum of 8 tasks (`DIGEST_TASK_CAP`), extra queues to tomorrow's email. Each task still has its own links, single snapshots and send records (the same `digestId`) and the whole group either keeps it in its entirety or without recording it (store action `recordReminderDigests`). `runtime.digests` Saves the full text of the actual mail.
- **cap calculated by seal (B1):** per person per day 2 and weekly 6 (key mail reservation) as "enclosed"; Seed data one full release = 3 / 5 complete records (previously only 4 entries).
- **interface (UI, Programme F):** top `Review N emails · M tasks · K sent today`+ progress; List by person (one line per task + cause color block + "Also has N other open tabs"); Right bar `DigestPanel` displays the real message to be sent, by mode: Platypus = Skip / Send & next / Send all; Open Gmail Draw = I sent this email; Auto = read-only. All outstanding tasks of this person are listed below. Fix first just fixable questions; History harvest line, Historia opens the right bar. Old "Tis week" repeat list deleted (B3).
- **Rehabilitated after independent review (128c184):** completed 8 and the remaining tasks were postponed until the following day for the second time; Fix first, replace "N tasks wait for the next email" with "N tasks wait for the next email" The mail preview is automatically updated when the title/date/recipient changes and the record fails; (b) Another person clears the old hint; Double-click won't allow the next one.
- **Test Migration (Tests):** bts, dx-03, dx-06, fb-01, reminder-stage2, research-events, task-details-universal,tasks: 125, today: 59/:80/:123, wp5 to the new page and retain its original intent (no AI, no mail, rule text, tampering links denied). New `e2e/reminder-digest-centre.spec.ts`, `src/reminders/digest.test.ts`.

## Authentication (2026-11-19, Local Production Construction)

- Modules/components: 2098 passed in full 2100; 2 failed (`uiLog` Export download, `calibration` 5 seconds time-out) as did `4d6290e` before the change.
- Browser: desktop full 585 pass/ 23skip; Cellular end alerts about 15 spec 82 via / 5 device cap. The remaining desktop failure compared to the pre-change baseline: no additional failures caused by this exercise; `ob-08`, `ob-12`, `workflow-milestones:87` repeats alone (coherent load down incidentally); `rehearsal:59`, `tasks:13/:60/:163/:209` (old Task Details button), `dx-18`, `research-log:84` and `p3a:31` failed on the baseline without change.
- Tsc, Lint pass; Words are all within the upper limit (about 179/ 271, cap 200/ 500 after the new alarm is enabled); Page height: 1142px (old 2856px).
- Screenshot: `docs/prototypes/reminder-digest-implemented/final/` (desk page, Jordan mail, self-distribution mode, Send after & next, mobile phone).

## Borders and known issues

- 0 subproducts AI, 0 live mail; `SCHEMA_VERSION` not promoted (optional fields only); Link signature, authorization scope, mode and `canLead` checks are not relaxed.
- Remains in the browser presentation: automatic mode is recorded only when a page is opened; The real sender, the server timed tasks and the database are listed in section 2 of the review report.
- The single task reminder (Ask Remind) is still counted as a stand-alone message, but the top "sent today" only counts merge messages.
- The active task mail link opens the Plan task panel, where the completion criteria are not shown (old single task page display); The contents or attachments need to be filled out from the link mark Done.
- `dx-06`: Wide figures such as top count and overdue colour block unused (small design gap, unchanged CSS).
- The baselines listed above fail the browser tests that need to be handled by their respective responsible sessions.
