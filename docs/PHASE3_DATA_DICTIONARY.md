# Phase 3 Export File Data Dictionary

To the researcher Juanxi, what's in the JSON file that participants downloaded on Settings page by **Export my Data**, what is it for each field, how to calculate the time of the task from inside, the number of errors and "does not open reference source" and what **couldn't do**.

- Applicable version: `formatVersion: 3` (from 2026-11-07, with "research session", see 1.1). The old `formatVersion: 1`, `2` files can also be read in the following CSV scripts: 1 has no interface operating records; 1 and 2 don't have a session, the file is all the records in this browser.
- The file contains only data from the field station application and records of participants ' operations in the prototype. **Nothing automatically uploads**: files are downloaded to his own computer only when the participant presses the button himself, and he e-mails it to the researchers.
- This document corresponds to the code: `LogEntry` for log structure `src/data/types.ts`; Interface event `src/lib/uiLog.ts`; `appendUiLog` for writing and decoupling `src/data/store.tsx`; Study session `src/lib/studySession.ts`; Timeline `src/lib/timeline.ts`; Export `buildExport`; CSV script `scripts/export-to-csv.mjs`.
- For 2026-11-07 four new **records (task tags, exit pages, start editing fields, suspension cards) for behavior only**, see 11.
- The 2026-11-08 (P3-H) president process has a screen for **Reminders** (inquire how to send a reminder to office), and the process version becomes `ob-4`; Exported session summaries more `reminderModeChoice`. **No new entry**: The selection itself would have been recorded as `ui.change`, see section 12.
- (FB-2, branch `fix/fb-2-onboarding`, **not online**; Phase 3The official website remains `ob-4`) president process becomes process version `ob-5`。 **Removes Constitution, Goals 2 screens**: Constitution becomes a folding area on the top of Team "Fill rolls from your screen (optional)" and Mission moves to the Name Screen with only targets set in Settings. So **did not appear again in the `ob-5` attempt** `founder.constitution`, `founder.goals` id (and without their entry/ leave/skip), name followed directly by `founder.team`; Name screen's Continue is `to: "/welcome/founder/team"` in the interactive log. Opens the constitution folding area, selects samples/ uploads/ pastes as normal `ui.click` (`route` is `/welcome/founder/team`). Invite does not receive a crew preview anymore, Confurm has only one main button that FB-3 completes in the same release. **did not add a new entry.** Grouping by `flowVersion` when comparing old and new data.
- (FB-3, branch `fix/fb-3-onboarding-b`, **not online**; 3 The official website is still `ob-4`) the last two screens of `ob-5`: Confurm's main button changed its name to **Create my club** (former Start workspace); The log value remains unchanged, it is still `setupChoice: "start-workspace"` and it is written `completeSetup`. Remove the Keep current demo button; Only when a student event has been built, replace warning with text links **Chancel and keep the current club**. The behavior is identical to that of Keep current demo (`setupChoice: "keep-demo"`, `founder.confirm` recording `exit`, trying to end with `exited`). Invite only has one main button **Open my workspace** (former Go to Today: `founder.invite` Remember `complete`, trying to end with `completed`, go to `/`); "See what your offices will see", so... `ob-5`♪ In the attempt **No more.** `member.*`Steps, `outcome`Just how the president process ends (at Invite press Exit still) `exited`）。 The staff preview can still be opened from the Demo menu Test Onboarding Page Invite without writing a record. The phrase "what happens in Platypus" to add an example card to the Reminders screen, a three-step diagram under each option and an analogy, was originally used as a screen description for each option; The titles, sequences, non-preselections, `data-testid`, values stored and records of `ui.change` remain unchanged for the three options. For first event buffer read Tight 1/ Standard 3 / Safe 5 options (as shown in the draft for 2 or 7 as Custom), with no change to the stored `clubBufferBusinessDays` value; Point options are recorded as normal `ui.click` (button names like "Safe 5 days". The description of `onboarding.setup` in the export time line is still written `Start workspace`/ `Keep current demo` (they are labels for recording values, unchanged). **did not add a new entry.**

---

## 1.

What the participants do in the prototype is recorded as an article in the order of occurrence (up to a maximum of 2000 for each study session). Each of these articles has a number, live time, then "who did it", what was done, what was done (long text cut off), the value before when the data were changed and whether the prototype was accepted. Export is accompanied by a "time line" of all records scheduled in time for easy viewing or conversion to Excel.

### 1.1 research session (formatVersion 3)

**Why should there be:** researchers, when they tried it on their own website, discovered that the former 49 of the exported 177 were left over another day (before the same browser). In order for the documents tested to be filled with only one sit-in at a time (hereinafter referred to as "sitting" ) and not to lose data by mistake, there is now a "study session".

- **When will a new session start:** Just start "The Guide to Record" once: Opens the research link `/#/start`, Start walkthrough (`/welcome/start`) on welcome pages, or Replay walkthrough on Demo menu. Two Test buttons in the Demo menu **No, I'm not.**Start the session and write no records.
- **What does it do when you start doing:** produces a session number (e. g. `s-3f9a0c71d2e4b856`, randomly, without information about anyone ' s name, time or device) and records the starting time. **then only deletes the earlier little thing**: an interactive log entry over 6 hours and a guided attempt (unless it belongs to a session that starts within 6 hours). How many notes (`previousEntriesCleared`, `previousAttemptsCleared`) have been deleted without content. **has kept** for the most recent 6 hours, including a few minutes of browsing before the point research link (these entries do not have session numbers).
- After **: This session number is taken in every** log (`session` field). No. `seq`, then count down, not again. One session only sits once: start 6 hours before writing again without a session number until the next time a research link is opened.
- **opened up a research link (or pressed Replay walkthrough):** will start a second session, but none of the records of the previous **will be lost** (all within 6 hours). There are two sessions in the export file, one line in `sessions`, and each log is sorted with a `session` field.
- **Why 6 hours:** up to 75 minutes for one test; 6 hours ago was basically another day and another time (possibly another person used the computer). We don't take them off. 2000A ceiling would not be misleading;  The number is still in the document, and researchers can see that something has happened before.
- **2000 cap:** calculates the entire log left in the browser (possibly including a few sessions of the same sitting), full from the earliest to see `interactionLog.droppedEarlier` (only the upper limit, not 6 hours of clean-up and deletion).
- **Exporting: all log entries and pilot attempts retained by** (exceeding the same 6 hour rule to prevent another old tab from writing back the old entry); At the top are `sessions` (one line for each session) and `session` (the latest one, plus the number of bars not entered in the file), see section 3.1. If this browser has never started a session (e.g. only Test buttons or direct example), `session` is empty for `null` and `sessions`, with all records as before.

## 2.

1. Participants: Settings — My preferences — **Export my data**. The browser downloads a file with a name like `platypus-export-2026-11-07-15-04-31.json` (the time in the filename is UTC).
2. Upon receipt, the researcher entered the repository directory on Node.js 22 computer:

   ```
   node scripts/export-to-csv.mjs Path /platypus-export-2026-11-07-15-04-31.json
   ```

   Generates a `.csv` with the same name in the same folder, an event in a row that can be opened directly by Excel.
   - Read directly with R: `readr::read_csv("….csv")`; If you use `read.csv` for base R, add `--no-bom` (the initial byte order mark is used for Excel to recognize Chinese and symbols).
   - Scripts read only this file, write only that CSV, not online.
3. You can also open the `timeline` field directly with any text editor or browser.

## 3. Fields on the outermost layer of a file

| Fields | Meaning. |
| --- | --- |
| `format` | Hold on. `"platypus-export"`, to recognize this as a prototype export file |
| `formatVersion` | File schema vension. Now. `3`。2 is more marked than 1; 3 has more field tags, and `interactionLog`、`onboarding`、`timeline` Only this time sitting (most recently 6 hours; see 1.1; I didn't delete any of the original fields. |
| `exportedAt` | Press exported Live Time (ISO format, UTC) |
| `schemaVersion` | Version number of the student data structure (developed) |
| `storageKey` | Name of data stored in browser (developed) |
| ★ `build` | What kind of website is this? `version`(Application version number), `commit`(Code submission number), `branch`、`context`(Production / deploy-preview for Netlify) Write when local construction does not contain this information `"unknown"`。The same version is used to identify each participant. |
| ★ `demoToday` | "Date of presentation" in the prototype. The date of the prototype is false and can be dialed forward by the Demo menu; It has nothing to do with live time. |
| ★ `onboardingFlowVersion` | New hand-led process version of the current website (the official site is now available) `ob-4`: After First event and before Confurm there are more Reminders screens; `ob-3` There's no such screen. In the branch `ob-5` No Constitution, Goals 2 screens id `founder.constitution`、`founder.goals` No more, see the beginning of the document). It's been written in every guide attempt. |
| ◆ `sessions` | For each research session in the file, see 3.1; No session is empty `[]` |
| ◆ `session` | The latest session. `sessions` Last line) and the number of strips that are not in the file, see 3.1; When there is no session `null` |
| `state` | Export data from the whole fictional community at that moment.（event、Tasks、Members、Settings……）。Sign Key Replaced with `"[omitted]"`。Handoff Change start.（Structure Version 21）There's more in there. `roleTerms`（Who's been in what position?：`status` Yes. `incoming` / `active` / `former`，Start and end date）、Members `leftOn`（Date of departure after handover）and `incomingFor`（Designated to take over、It's not officially taken over.）；Structure Version 22 There's more. `archivedRoles`（Closed posts，Save for History）、Job. `formerNames`（Old name）and `startNotes`（The start of the new job.），It's all a fictional presentation. |
| `onboarding` | Newer Guides `/#/welcome/…`For a separate record, see 6. |
| `interactionLog` | An interactive log body, see 4 and 5 (only sitting this time when a session is available). There's more on the outer floor: `limit`（2000）、`count`(Number of existing articles), `firstSeq` / `lastSeq`(number of the first and last articles), `droppedEarlier`(Because more than 2000 was lost) 0 means one didn't lose. 6 hours cleans up and deletes are not here. See you. `previousEntriesCleared`） |
| ★ `timeline` | A list that combines the interactive log with the newer guide, time-bound, with a short description of each line in English; see section 7 |

> **Handoff read the log (2026-11-09, Juanxi decides that question-and-answer records and research logs will not be separated):** Handoff's incoming officer card reads questions about Ask (`question` of `ui.ask`) from `interactionLog` as described in this document at the moment it is drawn. **Do not add any new entries**, do not save these questions, do not place them in manuals or files and do not send them to AI.

### 3.1 Sessions (`sessions` and `session`,formatVersion 3)

`sessions[]` A line for every session (the document contains its entry or attempt, or it's the latest); `session` is the last line, plus `olderEntriesLeftOut` and `olderAttemptsLeftOut`. Time is written in three ways: `…At` is an ISO time for UTC, `…AtMs` is a millisecond number, `…AtAz` is **Arizona time** (America/Phoenix, UTC-7, unchanged throughout the year, without summertime), e.g. `2026-11-07 10:46:40.337`, which can be directly weighed against the score sheet.

| Fields | Meaning. |
| --- | --- |
| `id` | Session number (random) |
| `startedAt` / `startedAtMs` / `startedAtAz` | The start of the session (the moment to open the research link) |
| `attempt` | Direct attempt number for this session (comparable) `onboarding.attempts[].id`） |
| `outcome` | **The whole** How did this end: `completed` / `exited` / Not finished yet `null`。Note: `exited` It's not like "unbuilt," see next line. |
| `setupCompletedAt` / `setupCompletedAtMs` / `setupCompletedAtAz` | At the time of pressing **Start workspace** or **Keep current demo** (first press). Worthy = building solid organization has been completed; I didn't press the button. `null` |
| `setupChoice` | Which one is it? `start-workspace`(Start workspace, built its own student organization) or `keep-demo`(Keep current demo, retain the example of student organization). In the branch `ob-5`（FB-3Create my blue / Cancel and keep the current Club  |
| `firstEventChoice` | First event last move forward: `planned`(One activity planned) or `skipped`(Skip for now); I've never walked through this screen. `null`。Just from the screen step record, not to see what's in it. |
| `reminderModeChoice` | The answer to the 2026-11-08 screen when it last moves forward: `auto_email`（Send automatically）、`review_then_self`（I review, then I send）、`review_then_auto`(I review, Platypus sends) or `skipped`(Skip for now); Never walked forward on this screen. `null`（`ob-3` The old papers too. `null`）。How did you get to see the 12 festival? |
| `entries` | Number of log bars in the file belonging to this session |
| `previousEntriesCleared` | The session begins with the number of old logs removed from this browser for more than 6 hours (numbers only) |
| `previousAttemptsCleared` | Number of old pilot attempts deleted at the same moment, for the same reason |
| `olderEntriesLeftOut`(only) `session`） | Number of earlier entries not in this file = session by session in the document `previousEntriesCleared` Add together + old entries that are filtered when exporting (e.g. another old tab that is open); Usually 0) |
| `olderAttemptsLeftOut`(only) `session`） | Number of pilot attempts with the same algorithm |

**Examples (researchers) 2026-11-07TRYING:**Start workspace, then go to the staff preview and press Exit there.  The files now contain `setupCompletedAt` with value, `setupChoice: "start-workspace"`, `outcome: "exited"`. Please see `setupCompletedAt` when analysing whether there is no finished construction. Do not look at `outcome`.

## 4. Each article in the interactive log (`interactionLog.entries[]`)

| Fields | Meaning. |
| --- | --- |
| `seq` | No. 1, 2, 3 ..., no repetition, no reuse; The new session will not be renumbered (only when 6 hours cleans up the log and deletes all light from 1). The beginning is not 1: the earliest articles have been deleted and are capped at 2000. `droppedEarlier`) or 6 hour cleanup ( `previousEntriesCleared`It's written separately in the document. |
| `at` | Live time, milliseconds since 1970. |
| `actor` | Who was the prototype View as? id, for example. `alex`） |
| `type` | What's going on? By `ui.` Started with **interface operation** (section 5); The rest are **data actions** (changed the operation of student data, for example) `completeSetup`、`updateNode`） |
| `payload` | Details of the event (long text cut to 200 characters); It looks like a secret key field is not accepted |
| `before` | Only the data movement "re-allocation of existing data" is available: change the values of the previous fields. Interface operation **No** `before` |
| `applied` | `true` = prototype accepted; `false` = Unaccepted (not accepted, invalid, nothing to change); See under interface operation) |
| `session` | This is a study session (formatVersion 3). There are no entries written in any session (before the link is studied or after 6 hours) |

**two entries are in the same numbering sequence**, so "what button did you point? How did the data change?" can be read directly in order.

### 4.1 Common Data Actions (not all)

| `type` | When did you show up? |
| --- | --- |
| `completeSetup` | The guide is built by Start Workspace, target organisation ( `payload` Information filled out by participants, cut according to the original rules) |
| `saveProfile` | Save personal data. |
| `draftChanges` / `aiAutoApply` | Ask generated a set of changes to be approved / AI directly made |
| `reviewChange` | Approval or rejection of a set of changes `payload.decision`） |
| `undoAuto` | Undo an AI minor change |
| `createTasks`、`addTask`、`claimTask`、`moveTask`、`replyTask`、`updateNode`、`updateEvent` | Increases in mandates and activities |
| `issueOfficerGrant`、`confirmNudgeSent` | I send this reminder when you prepare the alarm to generate a one-time task link. **FB-8 (only branch, not applicable on the official website line):** `confirmNudgeSent` It's... `payload` There's one more. `via`：`"president"` = president / vice present ("I sent this draft"); `"platypus"` "Approve Platypus sends (demo)" or "Approve all (N)" for the reminder center. `confirmNudgeSent`There's an N rule at the time of ratification. And the same value. `state.nudges[].via`。There's no such field in the old file. Press `president` Understood. **still doesn't send anything**; "Send automatically" shows in the reminder center that "Would be sent... demo" is extrapolated, **does not write any records of**. No new record type |
| `advanceClock`、`setViewer`、`setAi`、`reset` | Demo menu: dial date, switch to see identity, switch AI, reset demo |

### 4.2 rules remind running-time increment (2026-11-16, functional branch I)

Selected `state.reminderRuntime` exists only after `enableReminderPlan` and does not change formatVersion or the old archived outer layer version. `updates` (same day sequence and real operator), `waitingRequests` (clearly waiting for the object and reason for closing down), `deliveries` (unchangeable recipient and task snapshot), with `sequence` retained; `activatedOn`/ `sentOn` uses demonstration dates. `enableReminderPlan` is an enabling action; `confirmPlannedReminder` is an audit log action. They follow the existing data action log format and do not add a button to the old page.

The new `deliveries` in automatic mode will keep a lasting record of `outcome: simulated`; Manually sent confirmation is `recorded_by_sender`, which does not mean that the station verified external delivery. Old `state.nudges`, old `protocolLog` does not convert to a new message from an unknown recipient. Damaged or future version rantime retained but disabled. The description of the previous FB-8 extrapolated record is still applicable to the old path when the old page defaults that it has not been run; Could not close temporary folder: %s Phase II mail and task page additions are shown in the following section, and the Details/Alarm Centre's overall access to phase III and live distribution services have not yet been implemented.

### 4.3 rule mail and repeatable task entry (2026-11-16, functional branch II)

- `state.taskAccessGrants?`: Retrievable local demonstration authorization independent of the old one-time `officerGrants`. Includes task, current owner and term version, actual recipient, `owner`/ `waiting` range, optional waiting date for request, issue/due date and local signature. The new URL is `/#/officer?access=…`; The same entrance can be used first for working and then for Done, after reassignment, departure, expiry or replacement. It is not a server login or cross-equipment authorization. Damages to the authorization form are retained and not added.
- `issueTaskAccessGrant`: Log payload contains only tasks, recipients, ranges and optional requests for IDs; No signature and no complete link. `taskAccessAction`: The actual recipient of a valid authorization by the log actor is task, recipient, range, type of operation. URL token does not write action summaries. Adding operations using existing data action log mechanisms, with the usual `ui.*` behavioural records for old pages as they are; No changes have been made to the research orientation and collection processes during this round.
- `Node.instructions?`/`completionCriteria?`: Specific manual requirements and completion criteria; The importance of `why` is maintained. The fact that the manual requirements are given priority and no information is available to prevent AI from completing them.
- `Nudge.message?`/ `ReminderDelivery.message?`: Full rule mail snapshot with theme, text, unique task link, planned mailbox, channel, date of generation, authorized ID, word count and `source: rules`, re-validated by current facts, addressees, mode and authorization. A snapshot is generated at the time of record-keeping; Old records are not filled out. The actual destination of the draft manual is still to be selected externally by the user and not verified at this station. Action logs only take summaries such as recipients/sources/words of snapshots and do not reproduce text or links. It records approved presentations, not external deliveries.
- `waitingRequests[].response? / respondedOn? / responseBy?`: Accnowledge/Update requested; Adds the actual operator and order to the runtime. updates, `ownerReply: false`. The waiting person cannot update the four status of the original task; The original head/state is not rewrited by the response. (a) Non-repetition of initial requests; Acknowledge of the 2026-11- 18 increment only expressed a commitment and was expected to continue daily inspections before provided ceased to assist with the follow-up. Cancel the waiting, re-targeting, reassignment and completion of original withdrawals.
- **2026-11-18 Reminds four amendments:** `waitingRequests[].expectedOn?`(b) The date of the labour kept for the initial commitment of the assisting person;  The default display of the rules when an old client omits is today +2 natural days, while old track records are judged by their respondOn+2 and do not fill out old facts. Commitment and provision of one `info` station notification to the former head, ID `waiting-promised:<requestId>:<ownerId>` and `waiting-provided:…`; Stagnation alert is `waiting-needs-action:<requestId>:<unanswered|promised>:<ownerId>`, not external delivery.
- `ReminderDelivery.reason` Added `no_reply` (general non-reaction follow-up not more than once outside of three phases by default) and `waiting_followup` (waiting for non-response/commitment due). The fields, actual sentOn and immutable snapshots continue to follow the existing deliftive, CandidateId between the two stages of assistance in follow-up; CandidateId should not be used only to determine whether post-renewal milestones have been issued. Old duplicates are not deleted and each one is still counted against the recipient ' s total daily/seven-day amount, with individual mission milestones measured at different stages of issuance. No new research guide, action type or export formatVersion and outer layer schema23 is not reset. See [ delivers ](feedback-fix/REMINDER_FOLLOW_THROUGH.md) for the full rules.

New single mail editor does not request AI; The old `?token=` entrance is compatible. Phase II did not use the new plan by default, harmonize old batch records, connect to the mail backoffice or change the study process version. See `feedback-fix/REMINDER_STAGE2_CONTRACT.md` for full missions and acceptance border.

### 4.4 Uniform Rules Mail and New Plan (2026-11-16, Functional Branch III)

- New organization default `reminderRuntime.version: 2`; The old rantime/v1 retains the original set-up, update, request and send history through `upgradeReminderPlan`. `mailRequiredAfter` is the original sequence at 0 or upgradation, after which the new delivery must be complete; Old records are not supplemented. The unknown/damaged value is kept and disabled, not the fallback old send. The outer layer Schema/exportformatVersion has not been changed at this stage.
- `reviewLegacyReminder` Record leaders reconcile current assignment, remove the ambiguity of this task to future reminders and add an audit update for `ownerReply:false`. (a) The old Nudge/protocol addressees, the body and the record date are not rewritten; Check is not part of the reply.
- `recordReminderBatch` Following the Business Action Log, payload only via, CandidateIds, Count, does not copy mail, signature, link or workspace secret key. Via=automatic actor is `system:reminders` and does not pretend to be a former viewer or presidient. We're not leaving any grant behind. When saving, check the current settings/objects/dates/ belongs and amounts on an item-by-article basis, only for this new number of dilith IDs.
- Single lines, lots, automatic displays save the same complete rule mail snapshot and are automatically no longer extrapolated from Today as sent. Automatically failed information and Busy is the current page state, not a sendback; Refresh the record to deal only with those candidates that are still valid.
- Replies are echoed by term actually ownerReply or by waitin'Request on the same day, in order to keep the situation; No reply starts with deliftion. History shows the memory of the recipient and the task snapshot, deleting the task/reassignment without pointing history to the new person in charge; The old unknown recipient record is not included in the new version without a reply. The manual records remain recorded_by_sender, the platform records simulated and no external deliveries were sent back.
- Retry breaker saving only retries current business snapshots/log saves, does not submit drafts that are still in partial form and does not generate sending records; The other label has new operational data, and two copies are suspended and retained without providing coverage for retesting. Settings, enablers, batches or automatically require explicit submission/retry.

The old one-time `?token=` entrance compatible with the reservation; New mail can still be repeated with `?access=`. (b) Study guidance and collection mechanisms remain unchanged, with additional operations using existing log mechanisms; See `feedback-fix/REMINDER_STAGE3_HANDOFF.md` for details.

## 5. Interface operation (`type` starts with `ui.`)

### 5.1 Type Overview

| `type` | When do you write one? | `payload` What's in it? |
| --- | --- | --- |
| `ui.navigate` | Changed page (including first opening after refreshing, back of browser, directly changing address) | `from`(Previous page path, first opened) `null`）、`to`(New page path) |
| `ui.click` | Press buttons, links, tabs, menu items, `<summary>` Expanding lines like "press" things. | See 5.2 |
| `ui.change` | Tick/ Untick check box, select single buttons, select one in the lower frame | See 5.2, plus `checked`(Trying) `group`(head of the group under which) or `value`(Text of selected item) |
| `ui.ask` | Question in Ask. | `question`(questions source text, more than 200 character cut), `via`（`typed` I did it myself. `suggestion` Suggested Button / `handoff` It's from somewhere else. `route`、`focus`(Ask was looking at something: `node` / `event` / `page`） |
| `ui.answer` | Ask gave the answer (**, type of reply only, unanswered text**) | See 5.3 |
| `ui.details` | Right column Details opens something or closes it. | `action`（`open` / `close`）、`kind`（`task`、`nudge`、`event`、`partner` …）、`id`(actional data id) |
| `ui.reminder` | Synchronising folder | `action: "open"`、`nodeId`Which task is it? `channel`(default channel) |
| `ui.export` | Press Export my data (this one appears in the exported document, last one) | `entries`(Number of logs at export) |
| `ui.task` | The participants started/ finished the task on the Demo menu (2026-11-07, 11.2) | `task`（1–6）、`event`（`start` / `done`）、`implicit`、`ms`、`route` |
| `ui.visibility` | Leave page full 1 seconds and come back (2026-11-07, sect. 11.4) | `state`（`hidden` / `visible`）、`via`（`tab` / `window` / `close`）、`awayMs`、`picker`、`route` |
| `ui.edit` | Focus on a input box to change it for the first time and leave it (2026-11-07, sect. 11.5); **No Content**) | `field`、`kind`、`area`、`route`、`event`（`start` / `end`）、`ms` |
| `ui.hover` | Suspend card (%1) `Hover` / `Info`*0.5 seconds to close (2026-11-07, sect. 11.6) | `name`、`near`、`ms`、`via`（`mouse` / `focus` / `tap`）、`area`、`route` |

### 5.2 Click and select generic fields

| Fields | Meaning. |
| --- | --- |
| `route` | On which page (only path, for example) `/tasks`；In the address. `?` The value behind is not recorded. |
| `role` | Control type: `button`、`link`、`tab`、`menuitem`、`summary`、`checkbox`、`radio`、`combobox`(down frame) et cetera |
| `name` | The name of the control (the one read by the screen reader: button text, link text, `aria-label` or label text), with maximum 80 characters. It may contain field data displayed on the screen (e. g. task name, field name) and occasionally contains text previously entered by the participant himself and later shown on the button (e. g. task name), which is cut off |
| `testid` | Internal identification of controls (if any), for example `export-data`Oh, yeah. `name` Stable, suitable for screening. |
| `area` | Which one is on the screen: `answer`(Ask's answer to one of the answers) `reminder`(in the alarm editor) `ask`、`rail`(Right column), `nav`(Left Navigator) `header`、`main`、`dialog`、`menu` |
| `to` | This click on the page path taken (links, or press buttons for subsequent pages, such as Continue in the guide) |
| `external` | `true` = Point is the **site offline link** (e. g. AAU source cited, Gmail/whatsApp draft) |
| `href` | **website with off-site links + Path** (for example) `eoss.asu.edu/sites/default/files/…Handbook.pdf`）；`mailto:`、`sms:` These are only the beginnings. Query Parameter (in which there will be message text, link sign) |
| `expanded` | If you press "true" or "false" for menus, `<details>`Sidebar Switches |
| `selected` | Tabs selected |
| `repeat` | The same control 0.6 has been pressed several times in a row (e.g. double-click, fast link). Only when 2 is available. |

### 5.3 Type of answer (`ui.answer`)

| Fields | Meaning. |
| --- | --- |
| `answer` | Main form of response: `rule-answer`(rule answer, with quotes), `plan-form`(building activity forms), `task-form`(construction of tasksheets), `change-card`(change card to be approved), `change-applied`(Slight changes in force), `event-date-form`、`task-list`、`reminder-card`、`plan-check`(Programme inspection of new activities), `text`(pure text), `error`(Errors, etc.) `applied: false`）、`timeout`I didn't get back on time. `stopped`(FB-1, 2026-11-15: Participants have been waiting to check with Ask 's **Stop** from the browser local - chat is a local quiz, form remains as it is, Plan check is an examination of rule engine; `fallback` Yes. `true`，`source` "Stopped" is written; At the time of filling `refine: true`There are times when Plan check `trigger: "plan-check"`。**Skip AI line** not generated in alarm editor `ui.answer`, only common click logs) |
| `cards` | The type of card in this answer, in order. |
| `citations` | Rule/policy numbers cited, for example `["R06"]`(rules answered and plans checked) |
| `inScope` | Question of the rules within the framework of the rule bank |
| `source` | Answer the line label below and tell me who answered it, for example. `Matched by keywords · AI unavailable`、`AI checked policy sources · …` |
| `fallback` | `true` = not used for AI (AI closed, service unavailable, timed, answered by local rules or templates) |
| `ms` | How many milliseconds did it take to answer the question? |
| `changeSetId` / `autoSetId` | This answer generates a change of group number that can be added to the back. `reviewChange`、`undoAuto` Right on. |
| `refine` | `true` == sync, corrected by elderman == |
| `trigger` | `plan-check` = Not a question from the participants, but an automatic plan check after approval of the new activity |

### 5.4 interface operating `applied` and `before`

- Interface operation **No `before`**: they do not change the data themselves; The real change of data is followed by a data action with `before`.
- `applied` is usually `true`. Only in two cases are `false`: point to a control marked "not available" (`aria-disabled`); `ui.answer` for `answer` is `error`.

### 5.5 Noise Rule.

1. The same thing happens again within 0.6 seconds (one click triggers two events, development mode repeat). Only one.
2. The same control 0.6 for a continuous time: leave one and count it to `repeat`.
3. 2 seconds after the link or button has been clicked: instead of recording `ui.navigate` separately, write a new page into the `to` click. (A different place to go from a click - for example, re-directed - still remembers another `ui.navigate`. ）
4. Point in blanks, point in text boxes, point tab text: do not remember (the selection itself will be recorded as `ui.change`).

**Article estimate** (`src/test/uiLog.test.tsx` simulation, cap 2000; (a) 2026-11-07 containing four elements of section 11: the general rhythm (in prototype 60 minutes, on average 8 seconds) is approximately **650 Article**; Very busy. 75Every minute, every time. 4One second. 6Jobmarks, each 3Every minute leaves the page, every minute. 12There's one typing in the operation and one reading of the suspension card. **1560Article**♪ And the four before ♪ 600 / 1500）。 The scripting process in the end-to-end test (preparation of a reminder + guide to build several pages + rule questions + open source + export, real person does about minutes) is now **40–42Article**(computer) 42Cell phones. 40； Once upon a time, 34 was "start/stop typing". If a file `droppedEarlier` is greater than 0, it means that the upper limit is actually exceeded and the earliest part is gone.

## 6. Newer Guide Record (`onboarding`)

This is a separate record (`src/lib/onboardingRecord.ts`) that has been recorded since 5, but only by conduct and not by content:

- `attempts[]`: Every time you go for guidance (or "Explore the welcome Club"): `id`、`entry`（`start`Guide / `explore`Let's just look at the example. `flowVersion`、`replay`(Standbacks), `startedAt`、`finishedAt`、`outcome`（`completed`Walking through / `exited`Middle exit / `explored`）。
  - FormatVersion 3 also: `sessionId` (what session is it from), `setupCompletedAt` (in milliseconds, at the time of Start workspace or Keep current demo), `setupChoice` (`start-workspace`/ `keep-demo`).
  - The meaning of `outcome` remains the same, which means that **is the end of the whole attempt on** (including a crew preview after construction). `exited` may have been withdrawn before the construction of a solid organization, or it may have been pressed in an exit preview after construction; The two are distinguished by `setupCompletedAt`. (branch `ob-5`, FB-3, unlined: no member preview, build later `exited` only press Exit on Invite screen. ）
- `steps[]`: `enter` (entry), `leave` (departure), `back` (return), `skip` (skip), `complete` (completed), `exit` (save & exit) with time `at`. Step id Following Process Version: `ob-4` is `founder.name`, `founder.constitution`, `founder.goals`, `founder.team`, `founder.first-event`, `founder.reminders`, `founder.confirm`, `founder.invite`; `ob-5` does not have `founder.constitution` and `founder.goals` (constitution on Team screen, Mission in Name screen, target is not guided).
- **and** now appear simultaneously in the interactive log (`route` starts with `/welcome/`), where both sides can be contrasted over a time line.

## 7. Timeline (`timeline[]`, CSV is it)

| Fields | CSV Row | Meaning. |
| --- | --- | --- |
| (line number) | `row` | 1, 2, 3 … |
| `time` | `time_iso` | Live Time, ISO Format, **UTC** |
| `timeAz` | `time_az` | **Arizona time at the same time** (UTC - 7 hours, unchanged from year to year), for example `2026-11-07 10:46:40.337`。No old file. `timeAz`, CSV script calculates this column |
| `at` | `time_ms` | milliseconds of the same time |
| `session` | `session` | Which session does this line belong to; Not in any session. |
| — | `elapsed_s` | Distance **Start of the session for which this line belongs**How many seconds have passed?  Do not act empty in any session. Old file (no session): away from line 1 |
| — | `gap_s` | How many seconds after the last line? |
| `source` | `source` | `log`(interactive log), `onboarding`(guide record) or `session`(Photo starts with one line for each session) |
| `seq` | `seq` | Interactive Log Number (Introduction Record Blank) |
| `attempt` | `attempt` | Guide Attempt id (only lead log lines) |
| `actor` | `actor` | "View ass" |
| `type` | `type` | Type of event; The lead record line is `onboarding.start` / `onboarding.enter` … / `onboarding.setup`(Start workspace or keep crent demo;) Describe answers with Reminders on the back, for example `Setup finished: Start workspace; reminders: review_then_auto`Not without that screen. `onboarding.finish`；Session line `session.start` |
| `route` | `route` | Page Path |
| — | `name` | Name of the control; `ui.ask` It is the problem itself; If you don't have two of these. `payload.field`（`ui.edit` Line input box labels, not typed) |
| — | `target` | Link to (outside is the website + path, inside is the page) or drop box selection |
| — | `external` | Off-site Link As `TRUE` |
| `applied` | `applied` | `TRUE` / `FALSE`；Lead record is empty. |
| `desc` | `description` | A short description in English, for example `Opened outside link "R06 source ↗" → eoss.asu.edu/…` |
| — | `payload_json` / `before_json` | Completeness of this article `payload` and `before`(JSON text) See if you need details. |

(b) Sorting rules: by time; The interactive log in the same milliseconds is kept numbered between the interactive logs before (click first, and it triggers a lead step).

CSV starts with `=`, `+`, `-` and `@` by adding a `'` before it to prevent Excel from typing participants into formulae.

## 8. How do you figure out what's in the file?

Each task in the score sheet is to: whether it has been completed, time spent, error, and whether the reference source has been opened.

### 8.1 Task Time

- **Method A (recommended)**: Researcher writes clock time on Zoom at "start/end of mission" (in seconds, Arizona time). Find this paragraph directly in the CSV `time_az` column (no conversion to UTC); Time = End - Start. The line in this section is the whole operation of the mission.
- **Method B (when there is no time to remember)**: The time difference between taking this task "Article 1 related event" and "the last relevant event". For example:
  - Create student organisation: `session.start`(or) `route`Yes. `/welcome/founder/name`It's... `ui.navigate`、`onboarding.start`）→ `onboarding.setup`(i) `session.setupCompletedAt`； Start workspace is selected right next to `completeSetup`. **Do not use `onboarding.finish`**: it's the end of the whole attempt (including a social preview).
  - Question of the rules: `ui.ask`* Last operation before the participant gives an answer (usually open source or next entry) `ui.ask`）。
  - One activity is planned: `ui.ask`  →  `reviewChange` (approved by `decision`) for the activities mentioned in article 1.
  - Ready to remind: `ui.reminder` (open) →  point `Open … draft` (`external` for TRUE, `area` for `reminder`) or `confirmNudgeSent`.
- **Method C (2026-11-07 cases)**: Participants themselves start/ finish tagging (`ui.task`) on tasks in the Demo menu, when direct to `done` lines; The time to leave the page can be reduced. See section 11.3.
- `gap_s` is a big line that can see where it's stuck and where it's thought. There's `ui.visibility` in the middle, is leaving the page.

### 8.2 Error

"Errors" that you can count.

1. Data action `applied` is `FALSE`: The prototype was rejected (no performances, invalid).
2. `reviewChange`Lee. `decision`For refusing, `undoAuto`(Undo AI changes), re-entering the same object very quickly. `updateNode` / `updateEvent`(Comparation) `before_json`and the previous value).
3. Lead `onboarding.back` (back to previous screen), `onboarding.exit` (midway exit), same screen several times `enter`.
4. `ui.answer` is `error` or `timeout` (system error, not participant ' s fault, number of separates).
5. Wrong page: `ui.navigate`/ Click with `to` to go back to the pages not related to the task.
6. `repeat`  ≥  2 clicks (connected points, probably unresponsive or in a hurry); `applied` for `ui.click` is `FALSE` (points an unusable control).

### 8.3 Whether to open the reference source (source checking)

1. Find `ui.answer` in this task, see `citations` (e. g. `R06`).
2. `ui.click` and `external` for `TRUE` and `area` for `answer` (the "R06 source" button in the answer to the rules); `name` has a rule number, `target` is the source web address.
3. Yes  →  opened; No, it's not open. The source link on the Rules page is also recorded (`route` for `/rules` and `area` for `main`), which can be added as "checking sources on the Rules page".
4. All we know is, "The light's on." I don't know how long it was on that page.

### 8.4 AI Use

- Number of `ui.ask` strips (`via` separates its typing/point proposal).
- `fallback`: TRUE of `ui.answer` indicates that this time it is useless to AI; The `source` label specifies who answered it.
- `aiAutoApply` (a minor change made directly by AI), `draftChanges` (drafted by AI pending approval) and subsequently `reviewChange`/`undoAuto`, see whether participants accept or reject the AI recommendations.

## 9. Something you can't do.

1. **only remembers this browser.** for browsers, computers, shut down with private windows and no records left; Clearing website data will also be cleared.
2. The **browser keeps up to 2000** (all sessions of this little session are combined) above the earliest (see `droppedEarlier`).
   - When **starts a new session, old logs and old pilot attempts that exceed 6 hours will be deleted** (only number of notes left). More recently, 6 hours have not been deleted, so the error in testing research links does not lose data, but only one more session in the document. But if the two tests on the same computer are less than 6 hours apart and there is no clear browser data, the records of the former participant will remain in the latter file (with each `session` split): please take a runbook with a new no-trace window for each participant.
3. **does not press keys, does not record words typed in input boxes** (text, number, date, password, file box do not read and do not remember length). 2026-11-07 marks only "in which box to start typing for how long" (`ui.edit`, sect. 11.5), not even this. When a form is actually saved, the saving result is recorded as a data action (e. g. student event name in `completeSetup`), which was originally available.
4. **takes no account of the text of the AI answer**, except for the type of reply, reference number and label; The questions asked by the participants are written (closing to 200 characters).
5. **No scrolling, mouse moving, how long does it stay on the page?**； The time difference between the two sides of the border can only be inferred from how long it takes to look. Exception (2026-11-07): The suspension card is open for one  ≥ 0.5 second (`ui.hover`, with only duration and control name that triggers it).
6. **does not remember what happened outside the station**: I know only that a source or Gmail/WhatsApp draft is opened, and I don't know what was done there, whether it actually came out.
7. When you press Enter to open the details on the task card, there is no "click" item, but there is `ui.details` (open). Keys such as the Esc off menu are not marked.
8. Time comes from the participants' computer clocks; Computer time is not good, `at` is bad (the relative order is still based on `seq`).
9. Click without memory triggered by a program (not a person), such as the download link within the export browser.
10. **iOS Safari was not verified.** downloads have been validated by autotesting on desktop chromium and cellular dimensions (Pixel 7 simulation). iOS Safari handles "downloading files" differently (possibly displays JSON directly on the new page and requires another "sharing  →  to store to file"). Please use an iPhone for one time before being formally tested; Participants are advised to use computers.

## Comparison of 10. and IRB approval text (please confirm Juanxi)

The IRB text states that the log says "every operation of the participant on the website", each article has a number, live time, role figure, type of operation, cut parameters, value before change and acceptance; Only exists in the participant ' s own browser, cap 2000, not automatically transmitted, and participants export a JSON file to the researcher using Export my data.

- **Consistency:** interface operations and data dynamics are the same entry, number; The storage location, ceiling, export mode and non-auto upload remain unchanged. "Each operation" is now closer to the literal meaning than it used to be.
- **Where IRB needs to be noticed and may be told (marked for decision, code is done in the most conservative way):**
  1. Now it's going to be "Look at what pages, press what, choose which options, click which external web sites (only websites and paths) are opened." This is a record of behaviour and no new personal information; But it's smaller than the original "recording of data only."
  2. The control name (`name`) may contain text displayed on the screen: fieldingal data, or content previously entered by the participants themselves (e. g. his task name), cutting off to 80 characters. IRB text already allows "The word of the participant may appear in cut-off form".
  3. Ask questions source text will enter the log (closing to 200 characters). The IRB text already gives this example.
  4. More files are exported `build` (web version number), `demoToday`, `onboardingFlowVersion`, `timeline`. These are site versions or compiled by existing records and not new information on participants.
     - FormatVersion 3 is more than `sessions`/ `session`: Time and choice at the time of opportunity numbering, start date, end of construction student event, First event plan or kip, earlier recorded number of ****. Session numbers do not concern anyone; "Start workspace / Keep current demo" and "First event step still plan" are organized from existing behavioral records (button clicks, screen steps), not new personal information. Old records of more than 6 hours were deleted at the beginning of the session, and fewer were kept than before.
  5. No records: Device type, Browser type, screen size, IP, geographic location, key press, AI answer text.
- Section 6d of AGENTS.md requires that "Juanxi (research design to compare IRB) be asked before adding a new entry." This version adds an interface operating record, and Juanxi needs to confirm **before** merge and decides whether IRB should be notified (for example through Marcie).
- **2026-11-07 adds four (sect. 11): Juanxi was approved by 2026-11-07 as a record item for "conduct only"**: the start/ end of mission mark (`ui.task`), time to leave the page (`ui.visibility`), time to begin editing an input box and time to edit it (`ui.edit`) and length of suspension card opening (`ui.hover`). IRB text contrasts:
  1. Remains the same log, same entry, same number; There are still only participants' own browsers, capped 2000, not automatically uploaded and exported by the participants themselves.
  2. None of the new personal information: no typed (not even length), no key pressed, no AI answer, no device/browser/IP; The password box is completely missing.
  3. Added is **Time Info**: How long the participants left the page (`awayMs`), how long they fought in one box and how long a suspension card was open. "Leave the page" only knows how long it's gone and whether the tab/ application (`tab`) or the window is missing (`window`), **does not know where to go, what to do with**.
  4. `field` for `ui.edit` and `ui.hover` for `name`/ `near` from the interface (as with `name` for `ui.click`), may contain data on film, or text previously entered by the participants themselves and later displayed on the label, cut off to 80/ 60.
  5. Whether IRB needs to be notified (e.g., as a minor modification of the "record") by Juanxi; The code has been done in the most conservative way (e.g. no 0.5 seconds for suspension, no 1 seconds for departure).

## 11. 2026-11-07 Add: Taskmark, Leave Page, Start Edit, Suspend Card (behavior only)

Juanxi 2026-11-07 approved four. All entries are written in the same interactive journal (`seq`, `at`, `actor`, `type`, `payload`, `applied`, no `before`), `type` starts with `ui.`, and `applied` is `true`. Codes: `src/lib/uiLog.ts` (four recorders), `src/components/UiLogger.tsx` (heavy to leave page and edit), `src/components/chrome/DemoMenu.tsx` (task button), `src/components/ui/index.tsx` `Hover` (suspension card), `src/lib/timeline.ts` (short description in English in the time line).

### 11.1, a good look.

| `type` | When? | `payload` |
| --- | --- | --- |
| `ui.task` | Press Start task N/ Done on Demo menu | `task`（1–6）、`event`（`start` / `done`）、`route`(on which page at the time); `done` And... `ms`And there's an automatic end to it. `implicit: true` |
| `ui.visibility` | Leave page one in 1 seconds `hidden`；One when you get back. `visible` | `state`、`via`(See 11.4), `route`；`visible` And... `awayMs`How many milliseconds left? The one that was using the selector when leaving `picker: true` |
| `ui.edit` | Focus on an input box **first change** it: `event: "start"`；Leave this box: `event: "end"` | `route`、`field`(labels of boxes), `kind`（`text` / `textarea` / `number` / `date` / `search`）、`area`；`end` And... `ms` |
| `ui.hover` | Suspend card (%1) `Hover` / `Info`When it's closed, if it's open ~ 500 ms | `route`、`name`♪ Trigger its control name, ♪ 80character,  `ms`、`via`（`mouse` / `focus` / `tap`）；Add when too general a name ("More information") `near`(It has a subheading); `area` |

The look in the time line (code `description`):

```
Started study task 1 on /
Started typing in search field "Search sources" on /rules
Stopped typing in "Search sources" after 6.2 s on /rules
Hover card "More information" (under "Needs a nudge") open 1.0 s on /
Left the page: another tab or app on /rules
Came back after 41.0 s away (another tab or app) on /rules
Ended study task 1 after 4 min 12 s (next task started)
Started study task 2 on /
Finished study task 2 after 3 min 5 s
```

### 11.2 Task Marker (`ui.task`) where and how to use it

- **Location:** topbar Demo small pill (`Demo · date`)  →  **Study task**: button `1`... `6` (read screen names "Start task 1 " ) and `Done` (read screen names "Task done"). Not anywhere else in the interface.
- **Mobile phone:** is the same Demo pill, with a menu full of width after pointing, like a button. **Keyboard:** Tab to Demo pills * Enter Opens * Tab to the button * Enter.
- Press the menu to close automatically (readable task card) and focus back on the Demo pill. Displays `· Task 3` on the pill, and the button that is in progress is shown as press status; Done was ash when no task took place.
- The participants start reading a task card and press Start task N to finish Doe. **forgot to press Done and then hit Start**: `done`, with `implicit: true`, and `start` for the new task.
- Press the button on the task under way: remember nothing.
- "What task is going on" was read out of the log, so it's still there after the page has been refreshed; Reset demo doesn't affect it.
- These buttons **don't separate `ui.click`** (their own `ui.task` is the record); Opens the Demo menu as usual `ui.click`.
- **There is no Demo menu in the guide.**（`/welcome/…`, so the setup task (f) cannot press a button and does not need: it starts/ends with an orientation record (para. 8.1Section B: `/welcome/founder/name`It's... `ui.navigate`or `onboarding.start` → `completeSetup`or `onboarding.finish`）。
- **number corresponds (Juanxi 2026-11-08 fixed, added to rating table, tested unchanged):** 1 = (f) setup (non-consistent), 2–6 = card(a)-(e); If the last "New Activity with Ask" is to be counted separately, then you can let (e) press Done after the end and use the Ask section of `ui.ask` →  `reviewChange`.

### 11.3 Time to calculate tasks using task tags

1. Screening `type` = `ui.task` in CSV. Each task is a pair: `start` lines — `done` rows.
2. **Time spent = `done`Yeah. `ms`**(equivalent to two lines) `time_ms`It's the difference.
3. `implicit` for TRUE `done`: The participant forgot to press Done, which is actually the time he started his next assignment. The last operation in this paragraph may be replaced by the end (method B) or the time taken by the researcher's hand (method A). What's in the method?
4. **Time outside the prototype in a mission.**: Take this paragraph. `start`Present. `done`All of them. `ui.visibility` `visible`Yeah. `awayMs`Add it up.  "Time in prototype" = Time - time to leave.
5. The other lines in this section (click, ask questions, edit, suspend) are all the operations of this task, together with 8 errors, source checks.
6. The person who pushes the button is a participant, forgets and makes a mistake. And Zoom video or handwritten time check.

### 11.4 Leave Page (`ui.visibility`)

- **`via: "tab"`**: pages are hidden - tabs changed, windows minimized, cell phones cut to other applications, lock screens. The external source (ASU page, Gmail draft) that is left open in the prototype is opened on a new tab, so this is the one.
- **`via: "window"`**: The page is still on the screen, but the whole browser window loses focus - points to Zoom, another ASU web page or PDF, file selection box. **decides to remember this type of** (Juanxi requires "valued and quiet"): Zoom shares only one browser window, and the participants look at another window without "hiddening", only if the window is missing. (b) Methods to control noise: the same 1 second threshold; (a) The entire window is missing focus and the page does not allow for a change of focus between input frames; Mark `picker: true` (that's something being selected, not leaving) if you are pulling a frame, date or file selection at the point of failure.
- **`via: "close"`**: Pages are turned off, refreshed or left (`pagehide`), written immediately and stored in the browser immediately (with no difference of 1 seconds, the page is running out). This will be followed by a new `ui.navigate` (empty of `from`).
- **Noise:** won't be able to leave 1 seconds (fast Alt-Tab, window flash). `hidden`It's all about leaving. 1It's written in seconds, so it's more time than really leaving. **Late appointment 1sec**； Look at the exact length of time you leave. `visible`Yeah. `awayMs`。
- First the window is missing and then the tab is changed: `via` for `hidden`/ `visible` takes the type of `tab`.
- The mobile browser freezes the back-office page, at which time `hidden` lines may not be written; `visible` lines still have complete `awayMs`. Just turn off the unreturned (`close`) no `visible` line.
- **vs. official ASU page:** looking for `external` for TRUE `ui.click` (open source), followed by the `hidden` →  `visible` couple `awayMs`, which is his time outside (mostly looking at that source). This is the upper limit: I only know how long I've been gone, I don't know what I'm looking at out there or anything else. The participants themselves open the ASU web site in another window, as `window` or `tab` leaves without an external link click.

### 11.5 Start editing fields (`ui.edit`)

- After focusing on a text, multi-line text, number, date or search box, **first real change content** timebook `start`; Just go in and don't type. The same focus is only recorded once on `start`, with the same number of words.
- Departing from this box (Tab, dots elsewhere, page changes, shutdowns, **also includes moving to another window** - the browser loses focus on the frame) takes `end`, `ms` = from first change to departure. Come back and type again is the new couple.
- **Discreet: What's in the** box, how long, key pressed, pasted. **The password box is completely missing.**（`type="password"`or `autocomplete`There's password in it.  Checkboxes, singles and drops are not edits (their selection is as `ui.change`).
- `kind`: `text` (also e-mail, web site, telephone box), `textarea`, `number`, `date` (also time frame); Select a date with the date selector to count changes), `search`.
- `field` comes only from frame labels (`aria-label`, `<label>`, hint text placeholdr), and **never reads text in the box**. The label is the interface text; A few labels may contain names previously named by the participants. `ui.click`It's... `name`）。
- **Edit Time:** Adds `ms` for all `end` lines in a task. Note that `ms` includes pause and reflection when the frame is still focused, not "hand in typing".
- The Ask input box also counts: the question box is still focused, and then the next question will not be counted for `start`, including these questions for `end` when leaving.
- CSV: The `name` column now only takes `name` or `question`, so the `name` rows of `ui.edit` are empty with field names in `description` and `payload_json` `field` (if it is to be placed in `name`, then `scripts/export-to-csv.mjs`).

### 11.6 Suspended Card (`ui.hover`)

- The "stop" level of the rules interface (AGENTS.md Section 7): colour points, i icons, points on the progress chain etc., and small cards that appear when the mouse stops (or the keyboard focuses in); On the phone, it comes out from the bottom and closes somewhere else.
- **closes and writes a**, `ms` is the time when it's open ( "Close when you write" instead of "0.5 seconds" instead of "COD003 seconds": log entries will not be changed after they have been written and are consistent with other entries). Less than 500 milliseconds left unattended. When the card was open, the page changed: just write one down, and `route` is the page that it opened.
- `via`: `mouse` (the mouse on the computer stops), `focus` (Keyboard Tab to it, or click on a button inside it, and then the card will remain focused until the focus leaves, `ms` will be long), `tap` (cell phone).
- `name` is the control name that triggers it (button text or screenname), and **is not the text in the card**. Many i are called "More information", so add `near` = its subheading (e.g. "Needs a Nudge").
- **Usage:** The number of articles in `ui.hover` per task and the sum of `ms` = how many "why" explanations did participants see; Depending on which one it is (e.g., the cause of the Today risk point, the funding phase for Events, the source of rules). I just know how long the card's open and I don't know if he's reading it.

### 11.7 strips

See 5.5: General rhythm approximately 650, very busy about 1560 (ceiling 2000). The e2e `e2e/research-events.spec.ts` section (starting mission 1, typing in the Rules search box, reading a suspension card, leaving 2 seconds, starting task 2, keyboard pressing Done, exporting) is 19–20, of which four are 9.

## 12. 2026-11-08 Add: Reminders Screen (P3-H, see how to select the president)

The presidient process has an extra screen "How should returns go out" (`founder.reminders`, Path `/welcome/founder/reminders`, kip) after First event. Three options, **sequences fixed** (each participant sees the same, so no order is added to the file):

| Order | Titles on screen | Description of the following row | Saved Values |
| --- | --- | --- | --- |
| 1 | Send automatically | Platypus emails the officer on that date. | `auto_email` |
| 2 | I review, then I send | Platypus drafts it. You check and send it. | `review_then_self` |
| 3 | I review, Platypus sends | You check the draft. Platypus sends it. | `review_then_auto` |

- "Platypus knows each task's latest start date." The following sentence reads "Demo: no email is ever sent." (IRB: No reminder will be given in the test). **Not a single** at first, not to press Continue; Press Skip for now if you don't want to.
- **won't change any behavior on the website.** doesn't e-mail the website, whatever it is chosen. The reminder is still "open a draft and send it yourself." After this selection, the reminder editor has one more line of read-only words such as "Your Club chose: I review, Platypus sends (demo: nothing is sent."
- Where **exists:** saves `state.org.settings.reminderMode` when Startworkspace; This field when skip (or old classic page) **Does not exist**。 Press Keep current demo to not change student data, so the answer is only in the record.
- **No new entries**, and these will be recorded:
  1. **Select which (by label), every change of mind:** each option takes a `ui.change`: `role: "radio"`, `name` = the title of the option (e. g. `I review, Platypus sends`), `checked: true`, `group: "How should reminders go out?"`, `testid` = `reminder-mode-<value>`, `route: "/welcome/founder/reminders"`. Change of mind is a series of `ui.change`s on the same screen; Timeline description such as `Ticked radio "Send automatically" in "How should reminders go out?" on /welcome/founder/reminders`.
  2. **How long has this screen stopped?** `onboarding.attempts[].steps`Lee. `founder.reminders`It's... `enter`Present. `leave`(or) `back`(a) The time difference;  It's a new couple to come back midway.
  3. **skip:** `skip` on the same screen followed immediately by `leave`.
  4. Press Continue that's `ui.click` (`name: "Continue"`, `to: "/welcome/founder/confirm"`).
- **`reminderModeChoice` How does it count (summary of the session, 3.1):** looks only at the steps ahead of Start workspace/ Keep current demo. Last time we look for this screen, `leave`: The first step forward is `skip`  →  `skipped`; Otherwise take the `ui.change` **from the last line on this screen before** leaves, in this session, and switch it to `testid`. When not found in the log (e.g. lost by 2000 cap), look at the latest session of `state.org.settings.reminderMode` (only when start workspace is pressed); None is `null`. Refreshing this screen will keep the choice in the draft, refreshing the previous `ui.change` is still on the log, so it doesn't matter.
- Code: Screen `src/onboarding/founder/ReminderMode.tsx`Text `src/onboarding/copy.ts`（`founder.reminders`), value and order `src/data/reminderMode.ts`It's a calculation. `src/lib/onboardingRecord.ts`It's... `reminderModeChoice`Timeline `src/lib/timeline.ts`Test `src/test/onboardingReminderMode.test.ts`、`e2e/p3h-reminder-mode.spec.ts`。

## Actual tasks Details and generic submission (2026-11-17 increment)

This increment only works for the actual Node, and does not change StepTemplate/EventWorkflow of Settings; The outer layer of Schema is still 23.

| Field/Operation | Meaning and boundaries |
| --- | --- |
| `Node.externalLinks[]` | Manually edited access labels and http/https URL; No known entrances are set and the visible empty array is not restored; Do not write back templates |
| `Node.taskWork.version/revision` | Universal submission and incremental content versions of embedded files in compatible version 1 and references to version 2 documents; Save and verify belongings while the unknown/ damaged version is not automatically empty |
| `taskWork.drafts[]` | The old version continues to be read according to the author ' s body/annex ID/business day; New auto drafts in independent IndexedDB journal are not marked as completed or answered by the person responsible |
| `taskWork.submissions[]` | The supplement was submitted to the body, author, saving business day, former owner term and attachment ID; Keep old submission when correcting. Other members can view published results at nodes |
| `taskWork.files[]` | (a) To rewrite file metadata and blobkey, the original bytes at platypus.task-work/files; The old DataUrl is still readable, the full JSON exports completion bytes, downloads with Octet-stream and does not automatically send AI. Up to 3 current attachments, 2MB/total 5MB with old versions of historical files retained |
| `platypus.task-work/drafts` | Hashi by working area、node、Author、ownerId/ownerVersionIsolation.，Automatic submission of text with reference to document；revisionDo cross tabsCAS，The report is saved after the transaction has been completed，Toggle Task Do Not Cancel；Do not contain directly usable link signature keys |
| `taskDrafts`(complete export) | Self-saved private unsubmitted drafts and their actual files bytes; (b) DownloadExport astrologing, without file/save failed to produce a false full copy; RestoreTaskWorkArchive first saves the file and returns the small business snapshot without adding an import interface |
| `saveTaskWork` | (a) The same sustained write-off to save results and complete them; Only material is stored at the financial node, which remains to be completed by the decision of Event Budget. The operational log records only body length and attachment metadata; The original UI input log follows the full site rule |
| Edit | Independent panel to save the definition of the task, with the original defined fingerprint, and to keep the memory submission; Cansel doesn't write. The old dragLink can still be opened without pretending to be new to the submission |
| `Node.targetDates` | DProject stand-alone version1Date Change Log：revisionand additionalchanges。Each inclusiveid/actorId/ownerId/ownerVersion/on/previousDate/date/message/notifiedPersonIds/affectedNodeIds；Export reservations with the original business，Unknown/Damage log is forbidden to overwrite；Outer level stillschema23 |
| `updateTaskTarget` | Directly change target orientation and notify the selected member ID merge station; ExpectedTask reconciliation date/ belong to term/ status/log version. Missions are obtained from the current site or from the issuer, Grant, and cannot be borrowed from a president identity in the informer or browser; Targets, records and notifications maintained on a permanent basis with original tasks status/results unchanged |
| Old extension data (the following two lines are historically compatible) | The new D interface does not display approval buttons or create ExtensionRequest; Old pending does not automatically apply, while new targets are saved and old nodes are removed. Other historical fields are kept. Original review Extension logic reservation compatible, not the new D process entrance |
| `ExtensionRequest.requestedBy?` | New application to record the actual operator, separate from former ownerId; The old application does not have such a field to show the original owner. Reason, as an option for Message, a new application for DraftLink can be empty and old links may still be readable; The notification is to be filed by the current approving officer and the current leader, together with the request. |
| `reviewExtension` | The current approval of the roll holder or president/ Viice presidency may be processed; Continuing reconciliation of outgoing, reassignment, expired and cut-off versions; It was only confirmed by the success of sustainability, and approvals were made only for clubDeadline Override and not for official school days. |
| Undo mark done | `replyTask`or the head of grant to update to Todo/working/help/waiting, clear completedOn with the task currently contribution; Do not delete taskWork results and history. Undo checks the workspace, authors permissions, original belongings term and restoration status following this submission and re-opens the status menu after refreshing it; Finance Done remains controlled by Event Budget |

All dates are still generated by the original rule engine or demonstration operation clock, using `at` from the log. The current browser storage does not equate to server synchronisation across devices; Could not close temporary folder: %s See `feedback-fix/TASK_DETAILS_UNIVERSAL_HANDOFF.md` for details.
