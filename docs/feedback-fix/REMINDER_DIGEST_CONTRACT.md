# Alarm Center Program F + Mege Mail: Freeze Contract and Division of Work (2026-11-19, Claude Master Agent)

**Juanxi Decision (2026-11-19):** adopts option F (`docs/prototypes/reminder-centre-concepts/F-review-and-send.png`): a person in vertical order who can see what tasks he has now; The right bar shows the message that you really want to send, and Send & next is sealed and can be sent full-time. The same person's day reminder **synthesizes a** email ( "5 tasks  →  3 emails" in the scheme). It also fixes bugs found in the review. Division of work with multiple Agent.

See `docs/feedback-fix/REMINDER_CENTRE_REVIEW_2026-11-19.md` for background and list of issues.

## 1. Bug to fix (acceptance must be covered)

- (a) **B1 with a single reduction:** seed data (Sat Oct 31, Mode `review_then_auto`) point "Approve all (5)" only records 4 and Jordan 3 is blocked by the ceiling per person per day of `limitReason()`; `planReminders()` takes the maximum amount of records issued and not the same number of candidates. **Changed:** cap is calculated by "mail" and the same person's candidacy is one; The interface shows a few and records the same number as the display, and does not appear "Some records changed or reached a limit".
- The **B2 figures do not match:** "Needs your OK 13 " mixes up the problem of 8. **Replace:** available (grouped by person) and Fix first (no_owner/ unresolved_waiting/paused/unavailable_recipient / liberty_history, etc.) shown and counted separately.
- **B3 Repeat:** The same task appears at the same time as this week. **Change:** today no longer appears in the list of "next."
- **B4 Model 2 points dozens of times:** `review_then_self` now has one draft. Replace **with:** a draft for one person, in order of "Open Gmail draft"  →  "I sent this email" ~ next.

## 2. Freezing interface (no change of signature is permitted); We're going to have to go back.

- Type: `src/reminders/digestContracts.ts` (`ReminderDigestGroup`, `ReminderDigestPlan`, `ReminderDigestSnapshot`, `PreparedDigest`, `DigestRecordResult`).
- Optional fields (plus, no `SCHEMA_VERSION`): `ReminderDelivery.digestId?`, `ReminderRuntime.digests?`.
- Function: `src/reminders/digest.ts`
  - `planReminderDigests(state)` - bones can be grouped by person (interface directly); Engine Agent changed to capped.
  - `prepareReminderDigest(store, groupId, origin, via)` - Release and **save** links to each task of the group (as when `ReminderComposer` was opened), generating single snapshots and merge mail for each task; Mode 2 calls before opening the draft to make sure that links in the mail are available.
  - `recordReminderDigests(store, prepared[], via)` - a store action record; Each group is either completely or completely unrecorded.
  - `sendReminderDigests(store, groupIds, origin, via, isCurrent)` - "Send all" and auto mode with.
- Model and `via` (relay `confirmReminderDelivery`): `review_then_self`  →  `manual`; `review_then_auto`  →  `platypus` (president / Vice presidant); `auto_email`  →  `automatic` (`platypus` is also allowed).

## 3. File affiliation (one file belongs to only one Agent)

| Agent | Responsible. | No touching. |
| --- | --- | --- |
| **Engine** | `src/reminders/digest.ts`、`engine.ts`、`policy.ts`、`runtime.ts`、`batch.ts`、`delivery.ts`、`deliveryContracts.ts`、`useAutomaticReminders.ts`、`mail.ts`(only add merge mail function, no change in the behaviour of a single message), `src/data/store.tsx`(new action and log summary only), corresponding unit sets | Page, Right Bar, CSS, e2e |
| **UI** | `src/pages/Today.tsx`、`src/reminders/centre.ts`(show layer), new `src/reminders/DigestPanel.tsx`New `src/reminders/digest-centre.css`、`src/components/rail/RailContext.tsx`、`Rail.tsx`(new kind), `src/pages/Today.reminders.test.tsx`Reminder relevant `e2e/*.spec.ts` | Files in the previous line (call interface only) |

## 4. Interface requirements (Program F, UI Agency)

- A small card at the top: `Review N emails · M tasks · K sent today`+ progress bar; button to mode: `review_then_auto` = "Send all N emails"; `review_then_self` = "Open draft 1 of N"；`auto_email` = only states "Platypus sends these autologically (demo: nothing is sent), do not approve the button.
- In the middle: **, a list by person of** (with 10 also in one column): header initial + name + status (Up next / Reviewing / Sent ); Every task we're reminded of today. **One line.**Task name + one cause color block (N days overdue / Due today / Start passed / Follow-up /waiting on you);  A quiet line of "Also has N other open tabs" (point name or line  →  right bar).
- Right column (new rail kind, e. g. `{ kind: "reminderDigest"; recipientId }`): a true merge mail preview (recipient, theme, text, one Open tab link for each task); button to mode: `Skip`/ `Send & next`, "Send all N without seeing"; 2 is "Open Gmail Draw"  →  "I sent this email"; Here's a list of this guy. **All Unfinished**(name + status block + Due), click on the details of the task.
- Below "Fix first N": Pick who it waits on / No owner / Stuck / Check early returns / No value email) plus a button (open details of the task); "I checked... allow future returns".
- Historical harvest line: `N sent this week · N replied · N no reply`; "History" opens the list of rightbars (to follow the data from Sent/Replies/ No reply). Empty blocks are not shown.
- The `YourReminders` perspective keeps the current meaning.
- Conserve AGENTS.md Section 7: Token only, line-free styles (except CSS variables and data driver dimensions), word number  ≥ 14px (supplement 12–13), dynamic effects only token one row; Today word cap **200 / 500** (`npm run words`). Interface text in English.

## 5. Hard border.

- 0 live AI call, 0 live mail; Mail text is generated only by rules. Date from rule engine only.
- Not promote `SCHEMA_VERSION`, only optional fields; Old v1/v2 books, old `nudges`/ `protocolLog` records read as usual.
- Do not relax existing security checks (link signatures, single-mandate scope, mode permissions, `canLead`).
- Do not change Settings template, Plan, Task Details and other behaviors.
- Submits small steps in your own worktree branch, submitting information `[Reminder digest][Engine|UI] …`, **, not push**, by master Agent metge.
- Test: `npm test` (Vitest); Browser tests Playwright preloaded to set its own port before running: `PW_PORT=<4300+> PW_STORAGE_PORT=<4400+> npx playwright test e2e/<spec> --trace off`, not `playwright install`.
