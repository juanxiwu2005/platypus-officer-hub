# Reminder-module review and UI concepts (2026-11-19, Claude)

Based on PR #14 tip `4d6290e` (= `claude/fervent-thompson-e2j5u2` = preview 14). Review/static mockups only, **no `src/` changes**, 0 product-AI calls/emails.

Images: [`docs/prototypes/reminder-centre-concepts/`](../prototypes/reminder-centre-concepts/manifest.json) (1 current-state +A–F +mode appendixG). Screenshots of static pages using actual site CSS (same tokens/navigation/rail), not image generation; Sent/Replied counts illustrative.

---

## 1. Why the current interface is hard to understand

Measured in local production build, Reminders (seed club, Sat Oct 31, `review_then_auto`):

| Problem | Evidence |
| --- | --- |
| Too long |2856 px, about 3 screens at 1440×900; all 5 blocks (Needs your OK/This week/Sent/Replies/No reply yet) expanded, even empty blocks occupy space |
| Heading/button counts disagree | "Needs your OK **13**", but "Approve all (**5**)": 8 of 13 are issues, not reminders (4 Waiting without recipient, 2 unassigned, 2 Stuck) |
| Too much text per row |3–4 lines: event/task/To · Task due/reason, mostly repeated ("The planned start has passed. Can we help?") |
| Duplication | Same task in Needs your OK and This week (Draft the meeting agenda, Book the spring weekly meeting room) |
| Send-all only in mode 3 | Mode 1 only "Awaiting automatic preparation"; mode 2 requires "Review & open draft" then "I sent this reminder" per item, 26+ clicks for 13 |
| **Send-all misses items (bug)** | "Approve all (5)" records only **4**, showing "Some reminders changed or reached a limit". Jordan has 3 today, `limitReason()` caps2/person/day and reserves second nonurgent slot for due/overdue; `planReminders()` counts only **sent** records, not other same-batch candidates, so initially allows them then blocks on send |

## 2. Backend structure and readiness for a future database

### Good parts (portable directly)

1. **Pure rule engine:** `planReminders(input)` consumes only `ReminderInput` (today, mode, people, tasks, runtime), no clock/AI/DOM, runs unchanged server-side.
2. **Append-only ledger:** `ReminderRuntime` `updates`/`deliveries`/`waitingRequests` have `id` +monotonic `sequence`; historical recipient/task/full-email snapshots do not change with later edits—naturally three tables.
3. **Mode permissions rechecked in engine:** `confirmReminderDelivery()` allows only corresponding `automatic/platypus/manual`; `recordReminderBatch()` revalidates each item.
4. **Deterministic candidate IDs** (`["reminder", planKey, reason]`) naturally support send idempotency (no double sends).
5. Legacy `nudges`/`protocolLog` not guessed/rewritten; `legacyUnresolvedNodeIds` explicitly flags manual review.

### Required before database integration (priority order)

| # | Problem | Location | Future change |
| --- | --- | --- | --- |
|1| **Sending/automatic behavior live in browser.** `useAutomaticReminders` runs only while page open | `useAutomaticReminders.ts`, `delivery.ts` | Daily server schedule (Netlify Scheduled Function) runs `planReminders`, writes outbox, sender delivers; browser reads results |
|2| **Task links signed with browser `demoLinkKey`** | `taskAccess.ts` `signature()` | Server-only environment secret/signing/verification |
|3| **Whole club is one JSON object**, `sequence` an internal counter; simultaneous users overwrite each other (code acknowledges no localStorage atomic compare-and-swap) | `store.tsx`, `ReminderRuntime.sequence` | Database generated IDs/transactions; unique `candidateId` constraint on deliveries |
|4| **No storage-interface layer.** `adapter.ts`/`batch.ts`/`message.ts` directly read/write whole `DemoState` | Same | Extract `ReminderRepository` (read tasks/people/runtime, write delivery/update), localStorage/browser and database/server implementations; engine unchanged |
|5| **One email per person absent from engine.** One reminder =one task =one email; 2/day cap causes bug above | `engine.ts` `limitReason()`, `mail.ts` | Group same-person/day candidates into digest; caps per email, not task; delivery row per task sharing `messageId` |
|6| **Repeated calculation.** Batch items rerun full `planReminders`2–3 times (sorting/mail validation/confirmation); `taskReminderSummary()` calculates entire center for one task | `batch.ts`, `adapter.ts`, `message.ts`, `centre.ts` | Compute one plan/request and pass down; more important server-side |
|7| **Two reminder systems coexist.** Old `nudges`/`protocolLog`/`silenceCases` (`engine/followup.ts`, `lib/reminderQueue.ts`) and new `reminderRuntime`; `Today` retains "Enable updated reminders" compatibility | Multiple | Migrate only new ledger; one-time read-only legacy import |
|8| **No date time zone.** `today` is demo-clock `YYYY-MM-DD` | `state.today` | Server computes today in club time zone (ASU=America/Phoenix) |
|9| Every save read validates entire indefinitely growing ledger (`isReminderRuntime`) | `runtime.ts` | Database table constraints; browser cache recent data only |

Conclusion: **engine (who/when to remind) is server-ready; storage, sending, signatures, concurrency remain demo implementations needing replacement, without rewriting rules.** Do item 5 (person grouping) first: solves UI and bug, prerequisite to every concept.

## 3. Six UI concepts (plus mode appendix)

All share three changes:
- **Separate sendable reminders from issues.**8 issues no longer called reminders; Fix first groups by issue type with count/fix button.
- **One email per person.**5 tasks→3 emails (Jordan's3 combine). Button "Send all 3 emails", not 5.
- **Hide empty blocks, condense history to one count row** (sent/replied/no reply); History opens details.

| Image | Concept | Best for | Benefit | Cost |
| --- | --- | --- | --- | --- |
|A| One-click overview | Presidents asking “where do I click today?” | One screen, least text, clearest button | Task details require click |
|B| Group by person | Presidents thinking “remind this person” | One-to-one with emails, uncheck person to omit |10+ people produce wrapped/longer cards |
|C| Pipeline | Flowchart users | See progress at a glance (fix→send→await reply→replied) | Uses full width, rail must collapse |
|D| Weekly timeline | Users looking ahead | Matches Plan subway map; click dot for person's email |7 days only; issues off graph |
|E| Table +bulk bar | Many tasks/filter/sort | Highest density, Gmail-like | Closest to current list, least visual appeal |
|F| Review email by email | Modes2/3, users reading before sending | Actual outgoing email in rail, Send & next | Slower than one click (send-all also provided) |
|G| Appendix: three modes | — | Same tasks: mode 1 no click, exceptions/pause only; mode 2 guided Gmail drafts (browser cannot open 3 windows at once); mode 3 send-all +10-second undo | — |

Recommendation: **A default landing +F review via Preview emails**; for visuals, replace A Next 7 days with D small timeline. B's grouping is data-layer work required by all.

## 4. Exclusions/next

- No code/word-budget changes (Today 160/450; conceptA first screen ~90 words, within budget).
- No mobile mockup; after selection, create mobile/interactive designs.
- Suggested order: ①engine person grouping/cap bug +unit tests →②UI →③server outbox/schedule with database.①②can happen on preview 14 without database.
