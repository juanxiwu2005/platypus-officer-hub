# Phase 3 export data dictionary

A guide for the researcher (Juanxi): what is in the JSON file participants download by pressing **Export my data** in Settings, what each field means, how to calculate task duration, error counts, and whether cited sources were opened, and what it **cannot** establish.

- Applicable version: `formatVersion: 3` (since 2026-11-07, adding "study sessions"; see Section 1.1). The CSV script below can also read older `formatVersion: 1` and `2` files: version 1 has no interface interaction records; versions 1 and 2 have no sessions, and contain all records in that browser.
- The file contains only fictional student-organization data and participants' prototype interactions. **Nothing uploads automatically**: a file downloads to the participant's own computer only when they press the button, then they email it to the researcher (during Zoom).
- Code references for this document: log structure `LogEntry` in `src/data/types.ts`; interface events `src/lib/uiLog.ts`; writing and noise filtering `appendUiLog` in `src/data/store.tsx`; study sessions `src/lib/studySession.ts`; timeline `src/lib/timeline.ts`; export `buildExport`; CSV script `scripts/export-to-csv.mjs`.
- Four **behavior-only** records were added on 2026-11-07 (task markers, leaving the page, starting field edits, hover cards); see Section 11.
- On 2026-11-08 (P3-H), the president flow gained a **Reminders** screen (asking how reminders should reach officers), changing the flow version to `ob-4`; exported session summaries gained `reminderModeChoice`. **No new record types were added**: the choice was already recorded as `ui.change`; see Section 12.

---

## 1. In one sentence

Participant actions in the prototype are recorded in occurrence order (at most the latest 2000 per study session). Each entry contains an ID, real time, the current View as identity, action, target (long text truncated), pre-change values when modifying data, and whether the prototype accepted the action. Export adds a chronological "timeline" of all records for direct reading or conversion to Excel.

### 1.1 Research sessions (from formatVersion 3)

**Why sessions exist:** while trying the live site, the researcher found the first 49 of 177 exported entries came from another day in the same browser. Study sessions ensure each test file contains only the current sitting, without losing data through accidental actions.

- **When a new session starts:** whenever a recorded walkthrough begins: opening the study link `/#/start`, Start walkthrough on the welcome page (`/welcome/start`), or Replay walkthrough in Demo. The two Test buttons in Demo **do not** start sessions or write records.
- **At the start:** generate a session ID (for example, `s-3f9a0c71d2e4b856`, random and containing no name, time, or device information) and record the start time. Then **remove only earlier-sitting material**: interaction entries and walkthrough attempts older than 6 hours, unless they belong to a session started within the last 6 hours. Retain only deletion counts (`previousEntriesCleared`, `previousAttemptsCleared`), not content. **Keep everything from the last 6 hours**, including browsing minutes before the study link was opened (those entries have no session ID).
- **Afterward:** every log entry has this session ID (`session`). Continue `seq` numbering without restarting. A session covers one sitting only: entries written more than 6 hours after it began have no session ID until the study link is opened again.
- **Opening the study link again mid-session (or Replay walkthrough):** starts a second session, but **loses none** of the previous session's records (they are within 6 hours). The export contains both sessions, one row each in `sessions`; each entry's `session` identifies its session.
- **Why 6 hours:** a test lasts at most 75 minutes. Material older than 6 hours almost certainly belongs to another day or sitting (possibly another person using the computer). Removing it avoids consuming the 2000-entry limit or mistakenly exporting it; retained counts still tell the researcher that earlier material existed.
- **2000-entry limit:** applies to the entire retained browser log (possibly several sessions in the same sitting). Drop the oldest when full; `interactionLog.droppedEarlier` counts these removals only, excluding the 6-hour cleanup.
- **On export:** include all retained entries and walkthrough attempts, applying the same 6-hour rule again to prevent an old tab from writing old entries back. Top-level `sessions` has one row per session; `session` contains the latest plus counts excluded from the file (section 3.1). If this browser has never started a session (for example, only Test buttons or direct sample browsing), `session` is `null`, `sessions` is empty, and the file contains all records as before.

## 2. How to obtain and open the file

1. Participant: Settings → My preferences → **Export my data**. The browser downloads a file named something like `platypus-export-2026-11-07-15-04-31.json` (the filename time is UTC).
2. After receiving it, the researcher runs the following from the repository directory on a computer with Node.js 22:

   ```
   node scripts/export-to-csv.mjs path/platypus-export-2026-11-07-15-04-31.json
   ```

   This creates a `.csv` with the same name in the same folder, one event per row, ready to open in Excel.
   - In R: read directly with `readr::read_csv("….csv")`; for base R's `read.csv`, generate it with `--no-bom` (the initial "byte order mark" helps Excel recognize Chinese text and symbols).
   - The script reads only this file and writes only that CSV; it does not access the network.
3. You can also open the JSON in any text editor or browser and inspect `timeline`.

## 3. Top-level file fields

| Field | Meaning |
| --- | --- |
| `format` | Always `"platypus-export"`, identifying an export from this prototype |
| `formatVersion` | File structure version, currently `3`. Version 2 added ★ fields to version 1; version 3 adds ◆ fields, and `interactionLog`, `onboarding`, `timeline` contain only this sitting (last 6 hours, see 1.1; no original fields removed) |
| `exportedAt` | Actual export-button time (ISO, UTC) |
| `schemaVersion` | Club data schema version (development) |
| `storageKey` | Browser storage name for data (development) |
| ★ `build` | Website version: `version` (app version), `commit` (code commit), `branch`, `context` (Netlify production / deploy-preview). Local builds lacking metadata use `"unknown"`. Confirms all participants use the same version |
| ★ `demoToday` | Prototype's "demo date" at export. Fictional date, advanceable via Demo menu; unrelated to real time |
| ★ `onboardingFlowVersion` | Current onboarding version (`ob-4`: Reminders added after First event, before Confirm; `ob-3` lacks it). Every onboarding attempt also records its own version |
| ◆ `sessions` | One row per research session, ordered by start time; see 3.1; `[]` when none |
| ◆ `session` | Latest session (same as last `sessions` row), plus counts omitted from file; see 3.1; `null` when none |
| `state` | Entire fictional club state at export (events, tasks, members, settings…). Signing key replaced by `"[omitted]"`. Since Handoff redesign (schema 21), includes `roleTerms` (who held each role: `status` `incoming` / `active` / `former`, start/end dates), members' `leftOn` (departure date after handoff), `incomingFor` (designated successor, not yet active); since schema 22 also `archivedRoles` (closed roles retained as history), roles' `formerNames` (old names), `startNotes` (new-role starting answers). All fictional demo data |
| `onboarding` | Separate onboarding records (`/#/welcome/…`), Section 6 (when sessions exist, only this sitting's attempts) |
| `interactionLog` | Interaction log itself, Sections 4 and 5 (when sessions exist, only this sitting). Wrapper also contains `limit` (2000), `count` (current entries), `firstSeq` / `lastSeq` (first/last sequence numbers), `droppedEarlier` (oldest entries discarded after exceeding 2000; 0 means none lost. Excludes six-hour cleanup removals; see `previousEntriesCleared`) |
| ★ `timeline` | Interaction logs and onboarding records merged and time-sorted, each row with a brief English description; Section 7 |

> **Handoff log reading (2026-11-09; Juanxi decided not to separate Q&A records from study logs):** when rendered, the newcomer's Handoff card reads questions the newcomer asked Ask after being named successor (`ui.ask`'s `question`) from this document's `interactionLog`, for the president and newcomer themselves. **Add no records**, save no separate copy, put no questions in the handbook or dossier, and send none to AI.

### 3.1 Sessions (`sessions` and `session`, formatVersion 3)

`sessions[]` has one row per session (when it has entries or attempts in the file, or is latest); `session` is the final row plus totals `olderEntriesLeftOut` and `olderAttemptsLeftOut`. Times have three forms: `…At` is UTC ISO, `…AtMs` is milliseconds, `…AtAz` is **Arizona time** (America/Phoenix, UTC−7 year-round, no daylight saving), for example `2026-11-07 10:46:40.337`, directly comparable to the scoring sheet.

| Field | Meaning |
| --- | --- |
| `id` | Random session ID |
| `startedAt` / `startedAtMs` / `startedAtAz` | Session start time (when the study link opened) |
| `attempt` | This session's onboarding-attempt ID (matches `onboarding.attempts[].id`) |
| `outcome` | How the **whole** onboarding attempt ended: `completed` / `exited` / `null` while unfinished. `exited` does not mean "club creation failed"; see next row |
| `setupCompletedAt` / `setupCompletedAtMs` / `setupCompletedAtAz` | First press of **Start workspace** or **Keep current demo** on Confirm. A value means club setup is complete; `null` if never pressed |
| `setupChoice` | Button chosen: `start-workspace` (Start workspace, created a club) or `keep-demo` (Keep current demo, retained the sample club) |
| `firstEventChoice` | Last forward action on First event: `planned` (planned an event) or `skipped` (Skip for now); `null` if never visited. Derived only from screen-step records, not entered content |
| `reminderModeChoice` | Last forward answer on Reminders (2026-11-08): `auto_email` (Send automatically), `review_then_self` (I review, then I send), `review_then_auto` (I review, Platypus sends), or `skipped` (Skip for now); `null` if never advanced from that screen (also `null` in older `ob-3` files). Derivation in section 12 |
| `entries` | Number of this session's log entries in the file |
| `previousEntriesCleared` | Number only: older log entries removed from this browser at session start because they exceeded 6 hours |
| `previousAttemptsCleared` | Older onboarding attempts removed at the same time for the same reason |
| `olderEntriesLeftOut` (only in `session`) | Total older entries absent from this file = sum of its sessions' `previousEntriesCleared` + older entries filtered again at export (e.g. written back by another old tab still open; usually 0) |
| `olderAttemptsLeftOut` (only in `session`) | Onboarding-attempt count calculated the same way |

**Example (researcher's trial on 2026-11-07):** clicked Start workspace, then opened member preview and clicked Exit there. File now has populated `setupCompletedAt`, `setupChoice: "start-workspace"`, `outcome: "exited"`. To analyze "was club setup completed?", use `setupCompletedAt`, not `outcome`.

## 4. Each interaction-log entry (`interactionLog.entries[]`)

| Field | Meaning |
| --- | --- |
| `seq` | Sequence 1, 2, 3 …, never duplicated or reused; a new session does not restart numbering (only the 6-hour cleanup deleting the entire log restarts at 1). If it does not begin at 1, the earliest entries were deleted; the file separately records whether this was the 2000-entry cap (`droppedEarlier`) or the 6-hour cleanup (`previousEntriesCleared`) |
| `at` | Real time, milliseconds since 1970 (participant computer's clock) |
| `actor` | Who the prototype's "View as" was set to at the time (a fictional person's id, e.g. `alex`) |
| `type` | What happened. Entries starting with `ui.` are **interface operations** (section 5); others are **data actions** (operations changing club data, such as `completeSetup`, `updateNode`) |
| `payload` | Details of the event (long text truncated to 200 characters; fields resembling secrets are not collected) |
| `before` | Present only for data actions that "modify existing data": the prior values of those fields. Interface operations have **no** `before` |
| `applied` | `true` = accepted by the prototype; `false` = not accepted (no permission, invalid, nothing to change; see below for interface operations) |
| `session` | Which research session this entry belongs to (formatVersion 3). Entries written outside a session (before the research link, or more than 6 hours after session start) have no such field |

**Both entry types share one sequence**, so "which button was clicked → how data changed" can be read directly in order.

### 4.1 Common data actions (not exhaustive)

| `type` | When it appears |
| --- | --- |
| `completeSetup` | Start workspace in the walkthrough creates the club (`payload` includes the participant's club details, truncated by existing rules) |
| `saveProfile` | Saving a profile (also written by Done in the member-preview walkthrough) |
| `draftChanges` / `aiAutoApply` | Ask generates changes awaiting approval / AI directly applies a small change |
| `reviewChange` | Approving or rejecting a set of changes (`payload.decision`) |
| `undoAuto` | Undoing a small AI change |
| `createTasks`, `addTask`, `claimTask`, `moveTask`, `replyTask`, `updateNode`, `updateEvent` | Creating/updating tasks and events |
| `issueOfficerGrant`, `confirmNudgeSent` | Creating a one-time task link while preparing a reminder; participant clicks "I sent this reminder" |
| `advanceClock`, `setViewer`, `setAi`, `reset` | Demo menu: advance the date, change viewer, toggle AI, reset demo |

## 5. UI actions (`type` starts with `ui.`)

### 5.1 Type overview

| `type` | When an entry is recorded | Contents of `payload` |
| --- | --- | --- |
| `ui.navigate` | Page changes (including first opening after refresh, browser Back, direct address changes) | `from` (previous route, `null` on first opening), `to` (new route) |
| `ui.click` | Pressing a button, link, tab, menu item, `<summary>` disclosure, or another pressable control | See 5.2 |
| `ui.change` | Checking/unchecking a checkbox, selecting a radio button, or choosing a dropdown item | See 5.2, plus `checked` (true when checked), `group` (group heading), or `value` (selected item's text) |
| `ui.ask` | Sending a question in Ask (typing Enter, pressing Send, selecting a suggested question, or receiving "Ask about this rule" from elsewhere) | `question` (original question, truncated beyond 200 characters), `via` (`typed` / `suggestion` / `handoff` from elsewhere), `route`, `focus` (what Ask was focused on: `node` / `event` / `page`) |
| `ui.answer` | Ask returns an answer (**only the answer type is recorded, not its text**) | See 5.3 |
| `ui.details` | Right-rail Details opens an item or closes | `action` (`open` / `close`), `kind` (`task`, `nudge`, `event`, `partner` …), `id` (fictional data ID) |
| `ui.reminder` | Reminder editor ("Private reminder") opens | `action: "open"`, `nodeId` (task), `channel` (default channel) |
| `ui.export` | Pressing Export my data (this appears in the exported file as its final entry) | `entries` (log count at export) |
| `ui.task` | Participant presses task start/done in Demo menu (2026-11-07, section 11.2) | `task` (1–6), `event` (`start` / `done`), `implicit`, `ms`, `route` |
| `ui.visibility` | Leaving the page for 1 second, and returning (2026-11-07, section 11.4) | `state` (`hidden` / `visible`), `via` (`tab` / `window` / `close`), `awayMs`, `picker`, `route` |
| `ui.edit` | First edit after focusing an input, and leaving it (2026-11-07, section 11.5; **contents not recorded**) | `field`, `kind`, `area`, `route`, `event` (`start` / `end`), `ms` |
| `ui.hover` | Hover card (`Hover` / `Info`) closes after ≥ 0.5 seconds open (2026-11-07, section 11.6) | `name`, `near`, `ms`, `via` (`mouse` / `focus` / `tap`), `area`, `route` |

### 5.2 Common fields for clicks and selections

| Field | Meaning |
| --- | --- |
| `route` | Page where it occurred (path only, e.g. `/tasks`; all values after `?` are excluded) |
| `role` | Control type: `button`, `link`, `tab`, `menuitem`, `summary`, `checkbox`, `radio`, `combobox` (dropdown), etc. |
| `name` | Accessible control name (as read by a screen reader: button/link text, `aria-label`, or label text), up to 80 characters. May contain fictional data displayed on screen (e.g., task names, fictional names), occasionally text participants entered earlier that later appears on a button (e.g., their task title); all truncated |
| `testid` | Internal control ID, if present, e.g., `export-data`; more stable than `name`, useful for filtering |
| `area` | Screen region: `answer` (inside an Ask answer), `reminder` (reminder editor), `ask`, `rail` (right rail), `nav` (left navigation), `header`, `main`, `dialog`, `menu` |
| `to` | Destination route of this click (link, or button that changes pages, e.g., onboarding Continue) |
| `external` | `true` = **external link** clicked (e.g., cited ASU source, Gmail/WhatsApp draft) |
| `href` | External link's **host + path** (e.g., `eoss.asu.edu/sites/default/files/…Handbook.pdf`); only the prefix for `mailto:`, `sms:`, etc. Query parameters (which may contain message text or link tokens) are excluded |
| `expanded` | Expanded (true) or collapsed (false) after pressing, for menus, `<details>`, sidebar toggles |
| `selected` | Tab selected |
| `repeat` | Number of consecutive presses on the same control within 0.6 seconds (e.g., double-click or impatient repeated clicks). Present only when ≥2 |

### 5.3 Answer types (`ui.answer`)

| Field | Meaning |
| --- | --- |
| `answer` | Main response form: `rule-answer` (rule answer with citations), `plan-form` (event creation form), `task-form` (task creation form), `change-card` (change card awaiting approval), `change-applied` (small change applied), `event-date-form`, `task-list`, `reminder-card`, `plan-check` (new-event plan check), `text` (plain text), `error` (error, `applied: false`), `timeout` (AI second pass did not return in time) |
| `cards` | Types of all cards in the response, in order |
| `citations` | Cited rule/policy IDs, e.g. `["R06"]` (in both rule answers and plan checks) |
| `inScope` | Whether the rule question falls within the rule library's scope |
| `source` | Small label below the answer identifying the responder, e.g. `Matched by keywords · AI unavailable`, `AI checked policy sources · …` |
| `fallback` | `true` = no AI used (AI off, unavailable, or timed out; local rules or templates answered) |
| `ms` | Milliseconds from question to displayed answer |
| `changeSetId` / `autoSetId` | Change-set ID generated by this response, matchable to later `reviewChange`, `undoAuto` |
| `refine` | `true` = AI's "second look" (local form first, then AI fills fields when it returns) |
| `trigger` | `plan-check` = automatic plan check after approval of a new event, rather than a participant question |

### 5.4 `applied` and `before` for interface actions

- Interface actions **have no `before`**: they do not themselves change data. The actual data change appears immediately afterward as a data action containing `before`.
- `applied` is usually `true` (the action occurred). It is `false` only for a click on a control marked unavailable (`aria-disabled`), or `ui.answer` with `answer: error`.

### 5.5 Noise reduction (why entry counts stay bounded)

1. The same event repeated within 0.6 seconds (one click triggers two events, duplicate development-mode execution): retain one entry.
2. Repeated presses on the same control within 0.6 seconds: retain one entry, count with `repeat`.
3. Navigation within 2 seconds of clicking a link/button: omit separate `ui.navigate` and record the destination in the click's `to`. (If the actual destination differs from the click's destination — for example, a redirect — still record a separate `ui.navigate`.)
4. Clicking blank space, focusing an input, clicking label text: not recorded (the selection itself is recorded as `ui.change`).

**Estimated entry counts** (`src/test/uiLog.test.tsx` simulation, 2000 cap; includes the four section 11 additions from 2026-11-07): normal pace (60 minutes in the prototype, one action every 8 seconds on average) about **650 entries**; very busy (75 continuous minutes, every 4 seconds, 6 task markers, leaving every 3 minutes, one typing action and one hover-card read per 12 actions) about **1560 entries** (previously 600 / 1500 before these additions). The scripted e2e flow (prepare reminder + onboarding club setup + visit a few pages + rule question + open source + export, taking a human a few minutes) now produces **40–42 entries** (desktop 42, mobile 40; previously 34, with additions for “start/stop typing”). A file with `droppedEarlier` greater than 0 actually exceeded the cap and lost its earliest portion.

## 6. Onboarding records (`onboarding`)

This separate record has existed since v1.5 (`src/lib/onboardingRecord.ts`); it records behavior only, not entered contents:

- `attempts[]`: one entry per onboarding run (or "Explore the sample club" on welcome): `id`, `entry` (`start` walkthrough / `explore` sample directly), `flowVersion`, `replay` (replay number), `startedAt`, `finishedAt`, `outcome` (`completed` finished / `exited` left midway / `explored`).
  - Since formatVersion 3: `sessionId` (owning session), `setupCompletedAt` (Start workspace or Keep current demo time, milliseconds), `setupChoice` (`start-workspace` / `keep-demo`).
  - `outcome` still describes the **whole attempt** (including the post-setup member preview). `exited` may mean leaving before club setup or pressing Exit in the member preview afterward; distinguish using `setupCompletedAt`.
- `steps[]`: each screen's `enter`, `leave`, `back`, `skip`, `complete`, `exit` (Save & exit), each with timestamp `at`.
- Clicks and navigation on onboarding pages **also** appear in interaction logs (`route` starts `/welcome/`), allowing timeline comparison.

## 7. Timeline (`timeline[]`, the basis of CSV)

| Field | CSV column | Meaning |
| --- | --- | --- |
| (row number) | `row` | 1, 2, 3 … |
| `time` | `time_iso` | Real time, ISO, **UTC** |
| `timeAz` | `time_az` | Same instant in **Arizona time** (UTC − 7 hours year-round), e.g. `2026-11-07 10:46:40.337`. CSV script calculates this column even for older files lacking `timeAz` |
| `at` | `time_ms` | Same instant in milliseconds |
| `session` | `session` | Session this row belongs to; empty outside sessions |
| — | `elapsed_s` | Seconds since **this row's session began**; empty outside sessions. Older files (no sessions): since first row |
| — | `gap_s` | Seconds since previous row (for pauses/hesitation) |
| `source` | `source` | `log` (interaction log), `onboarding` (onboarding records), or `session` (session start, one per session) |
| `seq` | `seq` | Interaction-log sequence number (empty for onboarding rows) |
| `attempt` | `attempt` | Onboarding attempt id (onboarding rows only) |
| `actor` | `actor` | "View as" identity |
| `type` | `type` | Event type; onboarding rows use `onboarding.start` / `onboarding.enter` … / `onboarding.setup` (clicked Start workspace or Keep current demo; description appends Reminders answer, e.g. `Setup finished: Start workspace; reminders: review_then_auto`; omitted if screen not visited) / `onboarding.finish`; session rows use `session.start` |
| `route` | `route` | Page route |
| — | `name` | Control name; for `ui.ask`, the question itself; if neither, `payload.field` (`ui.edit` input label, not typed text) |
| — | `target` | Link destination (external: website + path; internal: page), or selected dropdown option |
| — | `external` | `TRUE` for external links |
| `applied` | `applied` | `TRUE` / `FALSE`; empty for onboarding rows |
| `desc` | `description` | Brief English description, e.g. `Opened outside link "R06 source ↗" → eoss.asu.edu/…` |
| — | `payload_json` / `before_json` | Full `payload` and `before` (JSON text); consult when details are needed |

Sort by time; within the same millisecond, interaction-log entries come first (the click is recorded before the walkthrough step it causes). Preserve sequence-number order between interaction entries.

CSV text beginning with `=`, `+`, `-`, or `@` is prefixed with `'` to prevent Excel executing participant-entered text as a formula.

## 8. Calculating research measures from the file

The scoring sheet needs, for each task: completion, elapsed time, errors, and whether cited sources were opened.

### 8.1 Task duration

- **Method A (recommended):** researcher notes clock time when marking task start/end on Zoom (to the second, Arizona time). Find that interval directly in CSV `time_az` (no UTC conversion needed); duration = end − start. Rows in that interval are all actions for that task.
- **Method B (without handwritten times):** difference between the task's first and last relevant events. For example:
  - Create club: `session.start` (or `ui.navigate` with `route` `/welcome/founder/name`, `onboarding.start`) → `onboarding.setup` (i.e., `session.setupCompletedAt`; Start workspace also has adjacent `completeSetup`). **Do not use `onboarding.finish`**: it ends the whole attempt, including member preview.
  - Rule question: that question's `ui.ask` → final action before the participant answers (usually opening a source or the next `ui.ask`).
  - Plan event: first `ui.ask` mentioning the event → `reviewChange` (`decision` approval).
  - Prepare reminder: `ui.reminder` (open) → click `Open … draft` (`external` TRUE, `area` `reminder`) or `confirmNudgeSent`.
- **Method C (from 2026-11-07):** participants mark task start/done in the Demo menu (`ui.task`); `done` directly includes duration, from which time away can be subtracted. See section 11.3.
- Rows with large `gap_s` can reveal sticking points or thinking time; intervening `ui.visibility` means the participant left the page.

### 8.2 Errors

Countable "error signals" (choose as needed and document in the methods):

1. Data action `applied` is `FALSE`: the prototype rejected it (no permission or invalid).
2. A rejection `decision` in `reviewChange`, `undoAuto` (undo AI changes), or `updateNode` / `updateEvent` quickly reverting the same object (compare `before_json` with the prior value).
3. In onboarding, `onboarding.back` (previous screen), `onboarding.exit` (exit midway), or repeated `enter` for the same screen.
4. `ui.answer` is `error` or `timeout` (system errors rather than participant errors; count separately).
5. Wrong-page navigation: `ui.navigate` / clicks with `to` visit an unrelated page and return.
6. Clicks with `repeat` ≥ 2 (repeated clicks, possibly due to no response or impatience); `ui.click` with `applied` `FALSE` (an unavailable control was clicked).

### 8.3 Whether cited sources were opened (source checking)

1. Find this task's `ui.answer` and inspect `citations` (e.g. `R06`).
2. Then find `ui.click` rows with `external` = `TRUE` and `area` = `answer` (the "R06 source ↗" button in a rules answer; `name` contains the rule number, `target` the source URL).
3. Present → opened; absent → not opened. Source links on Rules also log (`route: /rules`, `area: main`), allowing a separate "checked sources on Rules" measure.
4. This establishes only that the link was opened, not what was read or for how long on the external page.

### 8.4 AI use

- Number of `ui.ask` entries (`via` distinguishes typing from clicking suggestions).
- `fallback` in `ui.answer`: TRUE means no AI was used; `source` identifies who actually answered.
- `aiAutoApply` (small changes AI applies directly), `draftChanges` (AI drafts awaiting approval), and subsequent `reviewChange` / `undoAuto` show whether participants accept or reject AI suggestions.

## 9. Limitations (state in methods and limitations)

1. **Records only this browser.** Switching browser/computer or closing a private window loses access to those records; clearing site data also removes them.
2. **Browser retains at most 2000 entries** across all sessions in this sitting; oldest are dropped beyond that (see `droppedEarlier`).
   - **Starting a new session deletes logs and onboarding attempts older than 6 hours** (retaining counts only). Recent six-hour data remains, so accidentally opening a study link mid-test loses no data, merely adds a session. But two tests on the same computer less than 6 hours apart without clearing browser data place the previous participant's records in the next file (each has `session`, so separable): follow the runbook and use a new private window per participant.
3. **No keystrokes or typed input text** (text, number, date, password, file inputs are neither read nor length-logged). Since 2026-11-07, logs record only "which field editing began in and for how long" (`ui.edit`, 11.5); passwords do not even record that. Actual form saves still log saved results as data actions (e.g. club name in `completeSetup`), as before.
4. **No AI response text**; only answer kind, citation IDs, and tags. Participant question text is recorded (truncated to 200 characters).
5. **No scrolling, mouse movement, or time spent reading a page region**; reading time can only be inferred from adjacent timestamps. Exception (2026-11-07): hover cards open ≥ 0.5 seconds produce one entry (`ui.hover`, duration and trigger control name only).
6. **No activity outside the site**: knows only that a source or Gmail/WhatsApp draft was opened, not what happened there or whether anything was actually sent.
7. Pressing Enter on a task card to open details produces no "click" entry, but does produce `ui.details` (open). Keys such as Esc closing menus are not logged.
8. Time comes from the participant's computer clock; an inaccurate clock makes `at` inaccurate (relative ordering still uses `seq`).
9. Programmatic clicks are not logged, such as the browser's internal export download link.
10. **iOS Safari is unverified.** Automated tests verified downloads on desktop Chromium and mobile size (Pixel 7 emulation). iOS Safari handles downloads differently (may display JSON on a new page, requiring "Share → Save to Files"); test on an actual iPhone before formal testing; recommend computers to participants.

## 10. Comparison with IRB-approved wording (Juanxi to confirm)

IRB wording says logs record “every participant action on the website,” each with sequence number, real timestamp, fictional actor, action type, truncated arguments, before-values, and acceptance status; they remain only in participants' own browsers, capped at 2000 entries, with no automatic transmission. Participants use Export my data to export one JSON file and send it to the researcher.

- **What is consistent: ** interface interactions and data actions use the same entry type and numbering; storage location, limits, export, and no automatic upload are unchanged. "Every action" is now more literal (previously only data-changing actions were recorded).
- **Points to consider and potentially tell IRB (flagged for a decision; code already takes the most conservative approach): **
  1. Records now include "which page was viewed, what was pressed, which option was selected, and which external source URL was opened (site and path only)." These are behavior records with no new personal information, but more detail than the former "data-changing actions only."
  2. Control names (`name`) may contain on-screen text: fictional data or participants' previous input (such as a task name they chose), truncated to 80 characters. The IRB text already allows "participant-entered text may appear in truncated form."
  3. Original Ask questions enter the log (truncated to 200 characters). The IRB text already gives this example.
  4. Export adds `build` (site version), `demoToday`, `onboardingFlowVersion`, and `timeline`. These describe the site version or reorganize existing records, rather than new participant information.
     - formatVersion 3 adds `sessions` / `session`: random session ID, start time, student-organization setup completion time and choices, First event planned or skipped, and the **count** of earlier records. The session ID identifies no person; "Start workspace / Keep current demo time" and "First event skipped or planned" derive from existing behavior records (button clicks and screen steps), rather than new personal information. Records older than 6 hours are deleted at session start, retaining less than before.
  5. Not recorded: device model, browser model, screen size, IP, location, keystrokes, or AI response text.
- AGENTS.md Section 6d requires "ask Juanxi before adding record types (study design; check against IRB)." This version adds interface interaction records; **Juanxi must confirm before merging**, and decide whether IRB needs notification (for example through Marcie).
- **Four additions on 2026-11-07 (Section 11), approved by Juanxi on 2026-11-07 as "behavior-only" records**: task start/end markers (`ui.task`), time away from the page (`ui.visibility`), starting an input edit and its duration (`ui.edit`), and hover-card open duration (`ui.hover`). Compared with the IRB text:
  1. Still the same log, entry type, and numbering; still only in the participant's browser, capped at 2000 entries, never uploaded automatically, and exported by the participant.
  2. No new personal information: no entered text (not even its length), keystrokes, AI responses, or device/browser/IP; password inputs are completely excluded.
  3. The addition is **timing information**: how long participants leave the page (`awayMs`), type in a field, or keep a hover card open. "Leaving the page" reveals only that they left, for how long, and whether it was a tab/app switch (`tab`) or window blur (`window`); **it does not reveal where they went or what they did**.
  4. `ui.edit`'s `field` and `ui.hover`'s `name` / `near` come from interface labels (like `ui.click`'s `name`, these may contain displayed fictional data or text previously entered by a participant and later shown in a label, truncated to 80 / 60 characters).
  5. Juanxi decides whether to notify IRB (for example as a minor "more detailed logs" amendment); code already takes the most conservative approach (e.g. hovers under 0.5 seconds and absences under 1 second are not recorded).

## 11. Added 2026-11-07: task markers, leaving the page, starting edits, hover cards (behavior only)

The four items approved by Juanxi on 2026-11-07. All use the same interaction log and unchanged entry structure (`seq`, `at`, `actor`, `type`, `payload`, `applied`, no `before`); `type` starts with `ui.`, and `applied` is always `true`. Code: `src/lib/uiLog.ts` (four recorders), `src/components/UiLogger.tsx` (page-leave and editing listeners), `src/components/chrome/DemoMenu.tsx` (task buttons), `Hover` in `src/components/ui/index.tsx` (hover cards), and `src/lib/timeline.ts` (short English timeline descriptions).

### 11.1 Overview

| `type` | When recorded | `payload` |
| --- | --- | --- |
| `ui.task` | Press Start task N / Done in the Demo menu | `task` (1–6), `event` (`start` / `done`), `route` (page at time of pressing); `done` also has `ms` (milliseconds from task start to finish), and automatic completion also has `implicit: true` |
| `ui.visibility` | One `hidden` after leaving for a full 1 second; one `visible` on return | `state`, `via` (see 11.4), `route`; `visible` also has `awayMs` (milliseconds away); `picker: true` if a picker was in use when leaving |
| `ui.edit` | **First change** after focusing an input: `event: "start"`; leaving that input: `event: "end"` | `route`, `field` (input label), `kind` (`text` / `textarea` / `number` / `date` / `search`), `area`; `end` also has `ms` |
| `ui.hover` | When a hover card (`Hover` / `Info`) closes, if it was open ≥ 500 milliseconds | `route`, `name` (trigger control's name, ≤ 80 characters), `ms`, `via` (`mouse` / `focus` / `tap`); add `near` (the nearby subheading) if the name is generic ("More information"); `area` |

Appearance in the timeline (`description` column):

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

### 11.2 Where to find and how to use task markers (`ui.task`)

- **Location:** top-bar Demo pill (`Demo · date`) → menu's first row **Study task**: buttons `1` … `6` (screen-reader names "Start task 1" …) and `Done` ("Task done"). Nowhere else in the UI.
- **Mobile:** same Demo pill, opening a full-width menu with the same buttons. **Keyboard:** Tab to Demo → Enter → Tab to a button → Enter.
- The menu closes after a press (to read task cards), returning focus to Demo. The pill shows `· Task 3`; the active task button is pressed; Done is disabled when no task is active.
- Press Start task N when beginning to read a task card, Done when finished. **Starting another task without Done** first records the previous task's `done` with `implicit: true`, then the new `start`.
- Pressing the currently active task button records nothing.
- The active task is derived from logs, survives refresh, and is unaffected by Reset demo.
- These buttons **do not additionally log `ui.click`** (`ui.task` is their record); opening the Demo menu still logs `ui.click` normally.
- **No Demo menu in onboarding** (the focused `/welcome/…` shell has no top bar), so setup task (f) cannot and need not use these buttons: use onboarding records for start/end (section 8.1 method B: `ui.navigate` to `/welcome/founder/name` or `onboarding.start` → `completeSetup` or `onboarding.finish`).
- **Number mapping (set by Juanxi on 2026-11-08, recorded in the scoring sheet, unchanged during testing):** 1 = (f) setup (no button press), 2–6 = cards (a)–(e). To time the final "create an event with Ask" separately, press Done after (e), then calculate that Ask segment from `ui.ask` → `reviewChange`.

### 11.3 Calculate task duration using task markers

1. Filter CSV to `type` = `ui.task`. Each task is a pair: `start` → `done`.
2. **Duration = `ms` on the `done` row** (the difference between the two `time_ms` values).
3. `done` with `implicit` = TRUE means the participant forgot Done; its end is actually the next task's start, overestimating duration. Instead use the last task-related action in the segment (method B) or researcher notes (method A). State which method was used.
4. **Time outside the prototype during a task:** sum `awayMs` across `ui.visibility` `visible` rows between `start` and `done`. "Time in prototype" = duration − time away.
5. Other rows in the segment (clicks, questions, edits, hovers) are all task actions; combine with section 8's error and source-check measures.
6. Participants can forget or press the wrong button. Cross-check against Zoom recordings or notes.

### 11.4 Leaving the page (`ui.visibility`)

- **`via: "tab"`**: the page becomes hidden through tab switching, minimizing, switching mobile apps, or locking the screen. External sources opened by the prototype (ASU pages, Gmail drafts) open in new tabs and use this category.
- **`via: "window"`**: the page remains on screen, but the entire browser window loses focus to Zoom, an ASU page or PDF in another window, or a file picker. **We chose to record this** (Juanxi requested "valuable and quiet" logging): when sharing only one browser window in Zoom, viewing another window does not hide the page; window blur is the only signal. Noise controls: the same 1-second threshold; count only whole-window blur, not moving between in-page inputs; mark `picker: true` if a dropdown, date picker, or file picker was active at blur (selection rather than departure).
- **`via: "close"`**: closing, refreshing, or leaving the page (`pagehide`); write and persist immediately (do not wait 1 second; the page is about to disappear). Refresh is followed by a new `ui.navigate` with empty `from`.
- **Noise filtering:** record neither row for departures shorter than 1 second (quick Alt-Tab or window flicker). The `hidden` row is written after 1 second away, so its timestamp is **about 1 second later** than departure. Use `awayMs` on the `visible` row for accurate duration.
- If the window blurs before a tab switch, count one departure and use the more complete departure category (`tab`) on both `hidden` / `visible`.
- Mobile browsers freeze background pages, so `hidden` may be missing; `visible` still contains the full `awayMs`. Closing without returning (`close`) has no `visible` row.
- **Compare with official ASU pages:** locate a `ui.click` with `external` TRUE (opening a source), then the following `hidden` → `visible` pair's `awayMs`: this is time away, probably viewing that source. It is an upper bound: we know only how long the participant was away, not what they viewed or whether they did something else. Opening ASU manually in another window creates a `window` or `tab` departure without a preceding external-link click.

### 11.5 Starting a field edit (`ui.edit`)

- After focusing a text, multiline, number, date, or search field, record `start` on the **first actual content change**; focusing without typing records nothing. Only one `start` per focus period, regardless of text volume.
- On leaving the field (Tab, clicking elsewhere, navigation, closing the page, **including switching windows** — the browser blurs the field), record `end`; `ms` = time from first change to leaving. Returning to type starts a new pair.
- **Never record:** Field content, length, keystrokes, or pasted material. **Password fields are entirely excluded** (`type="password"`, or password in `autocomplete`). Checkboxes, radio buttons, and dropdowns are not edits (their selections remain `ui.change`).
- `kind`: `text` (also email, URL, phone), `textarea`, `number`, `date` (also time fields; choosing a date with a date picker counts as a change), `search`.
- `field` comes only from labels (`aria-label`, `<label>`, placeholder), **never from field content**. Labels are UI text; a few may contain names participants previously entered (as with `name` in `ui.click`).
- **Editing time:** Sum `ms` for all `end` rows within a task. Note that `ms` includes pauses and thinking while the field remains focused; it is not "time spent physically typing."
- Ask input is included: if it remains focused after a question is sent, typing the next question does not record another `start`; the eventual `end` includes those questions.
- CSV: `name` currently uses only `name` or `question`, so `ui.edit` rows have an empty `name`; the field name is in `description` and `field` within `payload_json` (one-line change in `scripts/export-to-csv.mjs` to put it in `name`).

### 11.6 Hover cards (`ui.hover`)

- The "hover" level of the interface rules (AGENTS.md section 7): small cards shown when hovering or focusing colored dots, ⓘ icons, progress-chain points, etc.; on mobile, tap to open from the bottom and tap elsewhere to close.
- **Write one entry on close**; `ms` is the open duration (chosen over "write at 0.5 seconds, then modify on close": entries remain immutable, consistent with other entries). Do not record openings shorter than 500 milliseconds (passing mouse). If navigation occurs while open, still write an entry; `route` is the page where it opened.
- `via`: `mouse` (desktop hover), `focus` (keyboard Tab, or focus retained after clicking a button inside — the card stays until focus leaves, so `ms` may be inflated), `tap` (mobile).
- `name` is the triggering control's name (button text or accessible name), **not card content**. Many ⓘ controls are named "More information, " so add `near` = containing subheading (e.g. "Needs a nudge").
- **Use:** Per-task `ui.hover` count and summed `ms` show how many "why" explanations a participant opened and for how long; inspect which cards (e.g. Today risk reasons, Events funding stages, rule sources). This measures open duration, not whether they were reading.

### 11.7 Entry count

See section 5.5: about 650 entries at a normal pace, about 1560 when very busy (cap 2000). The sequence in `e2e/research-events.spec.ts` (start task 1, type in Rules search, read a hover card, leave for 2 seconds, start task 2, press Done by keyboard, export) yields 19–20 entries, including 9 for these four additions.

## 12. Added 2026-11-08: Reminders screen (P3-H, observing the president's choice)

The president flow adds "How should reminders go out?" after First event and before Confirm (`founder.reminders`, `/welcome/founder/reminders`, skippable). Three options in **fixed order** (identical for all participants, so order is not separately recorded):

| Order | Screen title | One-line explanation below | Stored value |
| --- | --- | --- | --- |
| 1 | Send automatically | Platypus emails the officer on that date. | `auto_email` |
| 2 | I review, then I send | Platypus drafts it. You check and send it. | `review_then_self` |
| 3 | I review, Platypus sends | You check the draft. Platypus sends it. | `review_then_auto` |

- Top line: "Platypus knows each task's latest start date." Bottom line: "Demo: no email is ever sent." (IRB: no reminders are sent during testing). **Initially nothing is selected**; select one to enable Continue, or choose Skip for now.
- **No website behavior changes.** Whatever the choice, the site sends no emails; reminders still mean “open a draft for a human to send.” After selection, the reminder editor (Private reminder) gains a read-only line such as "Your club chose: I review, Platypus sends (demo: nothing is sent)." Skipping omits it.
- **Storage:** Start workspace saves it in `state.org.settings.reminderMode`; skipping (or using old classic setup) leaves this field **absent**. Keep current demo does not change club data, so the answer exists only in the record.
- **No new record types**; these were already recorded:
  1. **Selection (by label), and every change of mind:** each option click records `ui.change`: `role: "radio"`, `name` = option title (e.g., `I review, Platypus sends`), `checked: true`, `group: "How should reminders go out?"`, `testid` = `reminder-mode-<value>`, `route: "/welcome/founder/reminders"`. Changing one's mind produces consecutive `ui.change` entries on the same screen; example timeline text: `Ticked radio "Send automatically" in "How should reminders go out?" on /welcome/founder/reminders`.
  2. **Time on this screen:** time from `enter` to `leave` (or `back`) for `founder.reminders` in `onboarding.attempts[].steps`; returning starts a new pair.
  3. **Skipping:** `skip` immediately followed by `leave` on that screen.
  4. Continue is `ui.click` (`name: "Continue"`, `to: "/welcome/founder/confirm"`).
- **Deriving `reminderModeChoice` (session summary, section 3.1):** consider only steps before Start workspace / Keep current demo. Find this screen's last `leave`: if preceded by `skip` → `skipped`; otherwise take **the last checked `ui.change` on this screen in this session before leaving**, mapping `testid` to value. If absent from logs (e.g., dropped at the 2000 cap), the latest session can fall back to `state.org.settings.reminderMode` (only for Start workspace); otherwise `null`. Refresh preserves the draft choice and the pre-refresh `ui.change` remains in the log, so it has no effect.
- Code: screen `src/onboarding/founder/ReminderMode.tsx`, copy `src/onboarding/copy.ts` (`founder.reminders`), values/order `src/data/reminderMode.ts`, derivation `reminderModeChoice` in `src/lib/onboardingRecord.ts`, timeline `src/lib/timeline.ts`, tests `src/test/onboardingReminderMode.test.ts`, `e2e/p3h-reminder-mode.spec.ts`.
