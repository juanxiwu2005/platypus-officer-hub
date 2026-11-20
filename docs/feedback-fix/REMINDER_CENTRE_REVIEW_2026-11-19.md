# Reminder Module Review and Interface Program (2026-11-19, Claude)

Based on PR #14 top `4d6290e` (= `claude/fervent-thompson-e2j5u2` = preview14). Only review and static effect maps, **did not change any `src/` code**, 0 products AI, 0 emails.

Picture: [ `docs/prototypes/reminder-centre-concepts/` ](../prototypes/reminder-centre-concepts/manifest.json) (Status 1 1+ Programme A-F + 3 Models with Chart G). The figure is a static page repaint using the live CSS (the same set of token, navigation, right bar) on the website and not an image creation; The number of Sent/Replied is indicative.

---

## 1. Why can't you read the interface?

Opens up Reminders in local production construction (seed torrent orgation, Sat Oct 31, mode `review_then_auto`):

| Problem | Evidence |
| --- | --- |
| Too long. | The entire page 2856px, 1440 x 900 screens approximately 3 screens; 5 blocks (Needs your OK/ This week / Sent / Replies / No reply yet) are all opened and empty blocks are in place |
| Headline numbers don't match buttons. | "Needs your OK **13**♪ But the button is "Approve all ( **5**)"：13It's in there. 8It's not a reminder. It's a question to fix first. 4Waiting didn't pick anyone. 2No one's in charge. 2Stuck)  |
| Too many words per line | Each 3–4 line: activity/ task name / To Task Due/ Reason sentence; The planned start has passed. |
| Repeat | Needs your OK and this week (e.g. Draw the meeting away, Book the spring only meeting room) |
| One full shot only in mode 3 yes | Mode 1 shows only "Awaiting automatic preparation"; Mode 2"I sent this reminder", 13Points 26No more than  |
| **, one shot is actually incomplete.**. | Point "Approve all (5)" actually records only **4**, prompting "come reminds changed or reached a limit". Reason: Jordan had 3 on that day. `limitReason()` Up to 2 per person per day and the non-emergency number of 2 places reserved for due/overdue; `planReminders()` Only **has issued** records, not all the other candidates in the same batch. |

## 2. Level of readiness for bottom code and "post-database"

### Well done.

1. **rule engine is a pure function.** `planReminders(input)` only eats `ReminderInput` (today, mode, people, tasks, rantime), does not read the clock, doesn't tune AI, does not touch DOM and can run on the server.
2. The **book is supplementary.** `ReminderRuntime`Yeah. `updates` / `deliveries` / `waitingRequests`Both. `id`+ Single `sequence`, history snapshots (received name, task name, mail full text) change without subsequent changes - right for three tables.
3. **'s three modes of missions rechecking in the engine.** `confirmReminderDelivery()` by mode only the corresponding type in `automatic/platypus/manual`; `recordReminderBatch()` Every article is re-validated.
4. The **candidate id is a definitive** (`["reminder", planKey, reason]`), which naturally can be sent as an alternative key (the same one does not send twice).
5. The old data (`nudges`, `protocolLog`) have not been falsified and `legacyUnresolvedNodeIds` clearly indicates what is to be manually confirmed.

### Required changes (in order of priority) before receiving the database

| # | Problem | Location | How do you change it? |
| --- | --- | --- | --- |
| 1 | **sent and "automatic" were in the browser.** Auto mode only runs when page is open ( `useAutomaticReminders`Turn off the website and no one will send it. | `useAutomaticReminders.ts`、`delivery.ts` | Server Timed Tasks (Netlify Scheduled Action) run once a day `planReminders`, enter the outbox table and send it by the sender; Browser Read-only Results |
| 2 | **task link in browser `demoLinkKey` Signature** | `taskAccess.ts` It's... `signature()` | secret key only places server environment variables and signatures/certifications are on the server |
| 3 | **The entire student organization is a big** object for JSON. `sequence` is a counter in this object; Two people do the same thing overlay each other. | `store.tsx`、`ReminderRuntime.sequence` | Self-enhancement of id/ services with database; The table's right. `candidateId` Create only constraint |
| 4 | **doesn't have "storage interface" on this floor.** `adapter.ts`、`batch.ts`、`message.ts` Read and write the whole thing. `DemoState` | Same source as above | Take one. `ReminderRepository`(read tasks/people/runtime, write reference/update), the browser version is done with localStorage and the server version with a database; The engine's not moving. |
| 5 | **"One One Mail" doesn't exist in the engine.** Now a reminder = One task = one letter where the cap of 2 per person per day leads to bug above | `engine.ts` `limitReason()`、`mail.ts` | Add a step "at the recipient ' s merge": the same person 's candidacy for the same day is synthesized in a digest, with an upper limit calculated by "enclosed" instead of "task"; Record record of one line for each task but share the same `messageId` |
| 6 | **double counting.**Every single one of them runs again when the batch records. 2–3Secondary complete  `planReminders`(sort, authenticate mail, confirm each); `taskReminderSummary()` It's an entire reminder center for a mission. | `batch.ts`、`adapter.ts`、`message.ts`、`centre.ts` | (a) One request is counted only once, plan down; It's more important on the server. |
| 7 | **two alarm systems coexist.** Old `nudges` / `protocolLog` / `silenceCases`（`engine/followup.ts`、`lib/reminderQueue.ts`and new `reminderRuntime` It's the same thing. `Today` "Enable updated references" | Multiple | Only new accounts will be moved when migrated to the database; Old records for one-time read-only import |
| 8 | **date does not have a time zone.** `today` It's a show time clock. `YYYY-MM-DD` | `state.today` | The server calculates "Today" by using the current event time zone (ASU = America/ Phoenix) |
| 9 | Every time you read the archive, you take the whole account. `isReminderRuntime`The books are growing indefinitely. | `runtime.ts` | Replaced by table structure in the database; Browser Cache Only Recent |

Conclusion: **engines ( "who should be reminded and when") are suitable for moving to the server; Storage, dispatch, signature and distribution of the four layers are still demonstration methods, which are reworked when accessing a database, but no rewriting of rules is required.** proposes to start with 5 (by person) as it addresses interface problems and existing bugs, which are also prerequisites for any new interface programme.

## 3. Six interface options (with one model with a diagram)

All programmes share three changes:
- **separates "alarmable" from "questions to be fixed".** 8 questions are no longer called reminder, put in "Fix first", give numbers by problem type and a fixed button.
- **a man for an e-mail.** 5 missions  →  3 (Jordan 3 combined 1). button to write "Send all 3 emails", not 5.
- The **empty block does not show a line number of historical harvests** (sent/ reprinted / no reply), dot History.

| Figure | Programme | For who? | Advantages | Disadvantages |
| --- | --- | --- | --- | --- |
| A | Summary of one key | I just want to know what it is today. | (a) Under a screen; At least words; Buttons are most visible | I don't see a specific mission. Let's go inside. |
| B | Merge by person | I'm used to reminding someone. | At the same time as an e-mail, you cut off someone and don't send it. | The card becomes longer when the number of people (10+) |
| C | Waterlines | Someone who likes flow charts. | Seeing where every reminder comes to. | Full horizontally, right column needs to be closed |
| D | A week's axis. | I want to see the next few days. | Same as Plan's subway map; Look at this guy's e-mail. | Only for 7 days; The question is not on the map. |
| E | Table + Bulk Bar | People who want to sort out a lot of things. | The highest information density, like Gmail | Most like the current list, with the least visual attraction. |
| F | Reviewed by seal | Mode 2/3, someone who wants to see the mail before sending it. | The message sent is shown directly in the right column, Send & next | One seal is slower than one key. |
| G | Annex: Three Modes | — | (a) The same group of tasks: model 1 not to press, see exceptions and may be suspended; Mode 2 to open Gmail drafts on a case-by-case basis (the browser cannot open 3 draft windows at once); Mode 3 One full-time + 10 second to undo | — |

My suggestion: **A when default first screen + F when "Preview emails" enter page**; If you like graphics, replace "Next 7 days" in A with a D small time axis. B's "mege by person" is a change in the data layer, and any program has to be done.

## 4. Nothing to do / next

- No code change, no word change budget. 160/450- First screen for scenario A 90in the budget).
- There is no map of the cellular version; The selected scenario is followed by a mobile phone map and an interactive text.
- Implement the sequenced recommendation: one engine fixes the upper limit bug (with unit tess) § 2 new interface 3 server outbox/timed task (when the database is received). There is no need for a database. You can do it first at preview14.
