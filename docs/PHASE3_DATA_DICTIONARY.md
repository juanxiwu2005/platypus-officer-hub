# Phase 3 export data dictionary

A guide for the researcher (Juanxi): what is in the JSON file participants download by pressing **Export my data** in Settings, what each field means, how to calculate task duration, error counts, and whether cited sources were opened, and what it **cannot** establish.

- Applicable version: `formatVersion: 3` (since 2026-11-07, adding "study sessions"; section 1.1). The CSV script below also reads older `formatVersion: 1` and `2`: version 1 lacks UI operation records; versions 1 and 2 lack sessions and contain all records in that browser.
- The file contains only fictional-club data and participant actions within the prototype. **Nothing uploads automatically**: only pressing the button downloads the file to the participant's own computer; they then email it to the researcher (over Zoom).
- Code map: `LogEntry` in `src/data/types.ts`; UI events in `src/lib/uiLog.ts`; writing/denoising in `appendUiLog` in `src/data/store.tsx`; study sessions in `src/lib/studySession.ts`; timeline in `src/lib/timeline.ts`; export in `buildExport`; CSV script `scripts/export-to-csv.mjs`.
- Four new **behavior-only** records added on 2026-11-07 (task markers, leaving the page, starting field edits, hover cards); see section 11.
- On 2026-11-08 (P3-H), the president flow added a **Reminders** screen (how reminders reach officers), becoming flow version `ob-4`; exported session summaries gained `reminderModeChoice`. **No new record types**: the choice already logs as `ui.change`; section 12.
- **ob-5 (2026-11-22, S2):** the founder **Reminders screen is removed**. The president flow is Name → Constitution → Goals → Team → First event → Confirm → Invite (7 screens; First event goes straight to Confirm, and Back on Confirm returns to First event). New clubs default to `review_then_auto` ("I review, Platypus sends"), set by `completeSetup`, not chosen by the president; the choice can be changed in Settings (an ordinary `ui.change` on `/settings`). `ob-5` attempts have no `founder.reminders` step events and no `ui.change` on `/welcome/founder/reminders`, so **`reminderModeChoice` is absent for `ob-5` attempts** (`null` in the session summary; the timeline/CSV setup row has no `; reminders:` part), even though `state.org.settings.reminderMode` holds the default. An old link `/#/welcome/founder/reminders` forwards to Confirm and records nothing for the removed screen. Older `ob-4` attempts in a file are still read as in section 12. **No new record types.** Group old/new comparisons by `flowVersion`.
- Note on numbering: the FB-2 and FB-3 notes below describe unmerged branches that had planned to call their flow `ob-5`. The released `ob-5` is the S2 change above; if FB-2/FB-3 land later they need the next version number.
- (FB-2, branch `fix/fb-2-onboarding`, **not live yet**; the official Phase 3 site remains `ob-4`.) The president flow becomes Name → Team → First event → Reminders → Confirm → Invite, version `ob-5`. **Constitution and Goals screens are removed**: constitution moves to the Team screen's top collapsible "Fill roles from your constitution (optional)", Mission moves to Name, and goals are set only in Settings. Thus `ob-5` attempts **no longer contain** `founder.constitution` or `founder.goals` step IDs (or their enter/leave/skip events); Name goes directly to `founder.team`. Name's Continue logs `to: "/welcome/founder/team"`. Opening the constitution section and choosing sample/upload/paste produces ordinary `ui.click` records (`route: /welcome/founder/team`). FB-3 removes the post-Invite member preview and leaves one primary Confirm button in the same release. **No new record types.** Group old/new comparisons by `flowVersion`.
- (FB-3, branch `fix/fb-3-onboarding-b`, **not live yet**; the official Phase 3 site remains `ob-4`.) Final two `ob-5` screens: Confirm's primary button becomes **Create my club** (formerly Start workspace; stored value remains `setupChoice: "start-workspace"`, still writes `completeSetup`). Remove Keep current demo; only users with an existing club see **Cancel and keep the current club** below the replacement warning, behaving like Keep current demo (`setupChoice: "keep-demo"`, `founder.confirm` records `exit`, attempt ends `exited`). Invite has one primary **Open my workspace** button (formerly Go to Today: `founder.invite` records `complete`, attempt ends `completed`, navigates to `/`). Remove "See what your officers will see", so `ob-5` attempts **no longer contain** `member.*` steps; `outcome` describes only the president flow (Exit on Invite still yields `exited`). Member preview remains available from Demo → Test Onboarding Page Invite without recording. Reminders adds a sample reminder card, three-step diagram under each option, analogy, and one sentence about behavior in Platypus; previous one-line explanations become screen-reader descriptions only. The three option titles, order, no preselection, `data-testid`, stored values, and `ui.change` records stay unchanged. First event buffers become Tight 1 / Standard 3 / Safe 5 (draft values 2 or 7 show Custom); stored `clubBufferBusinessDays` values stay unchanged. Choosing an option produces ordinary `ui.click` (e.g. button name "Safe · 5 days"). Timeline descriptions for `onboarding.setup` still say `Start workspace` / `Keep current demo` (unchanged labels for stored values). **No new record types.**

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
| ★ `onboardingFlowVersion` | Current onboarding version (`ob-5` since 2026-11-22, S2: the Reminders screen is removed, so Confirm follows First event; `ob-4`: Reminders added after First event, before Confirm; `ob-3` lacks it. Branch `ob-5` omits Constitution and Goals; step ids `founder.constitution`, `founder.goals` no longer appear; see file opening). Every onboarding attempt also records its own version |
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
| `attempt` | This session's walkthrough-attempt ID (matches `onboarding.attempts[].id`) |
| `outcome` | How the **overall** walkthrough attempt ended: `completed` / `exited`, or `null` if unfinished. Note: `exited` does not mean "club setup unfinished"; see next row |
| `setupCompletedAt` / `setupCompletedAtMs` / `setupCompletedAtAz` | First press of **Start workspace** or **Keep current demo** on Confirm. A value means club setup is complete; `null` means neither was pressed |
| `setupChoice` | Which button: `start-workspace` (Start workspace, created their own club) or `keep-demo` (Keep current demo, retained the sample club). Values are unchanged in branch version `ob-5` (FB-3, unreleased), where labels are Create my club / Cancel and keep the current club |
| `firstEventChoice` | Last forward navigation from First event: `planned` (planned an event) or `skipped` (pressed Skip for now); `null` if this screen was never traversed. Derived only from step records, not entered content |
| `reminderModeChoice` | Last forward-navigation answer on Reminders (2026-11-08): `auto_email` (Send automatically), `review_then_self` (I review, then I send), `review_then_auto` (I review, Platypus sends), or `skipped` (Skip for now). `null` if there was no forward navigation from this screen (also `null` in old `ob-3` files, and always `null` for `ob-5` attempts, which have no Reminders screen; the stored default is not counted as an answer). Derivation is in section 12 |
| `entries` | Number of this session's log entries in the file |
| `previousEntriesCleared` | Number only: old log entries removed from this browser at session start because they exceeded 6 hours |
| `previousAttemptsCleared` | Old walkthrough attempts removed at the same time for the same reason |
| `olderEntriesLeftOut` (only in `session`) | Total earlier entries excluded from this file = sum of all sessions' `previousEntriesCleared` in the file + old entries filtered again on export (for example, restored by another still-open old tab; usually 0) |
| `olderAttemptsLeftOut` (only in `session`) | Walkthrough-attempt count computed the same way |

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
| `completeSetup` | Start workspace in onboarding creates the club (`payload` contains entered club details, truncated under existing rules) |
| `saveProfile` | Save a personal profile (also written on member-preview Done during onboarding) |
| `draftChanges` / `aiAutoApply` | Ask generated pending changes / AI directly applied small changes |
| `reviewChange` | Approve or reject a change set (`payload.decision`) |
| `undoAuto` | Undo a small AI change |
| `createTasks`, `addTask`, `claimTask`, `moveTask`, `replyTask`, `updateNode`, `updateEvent` | Create/update tasks and events |
| `issueOfficerGrant`, `confirmNudgeSent` | Generate a one-time task link while preparing a reminder; participant clicks "I sent this reminder". **FB-8 (branch only; inapplicable until live):** `confirmNudgeSent.payload` may additionally contain optional `via`: `"president"` = president/VP opened and sent the draft themselves ("I sent this reminder"); `"platypus"` = in a club choosing "I review, Platypus sends", clicked "Approve · Platypus sends (demo)" or reminder-center "Approve all (N)" (one `confirmNudgeSent` per reminder, so approving N creates N entries). Also stored in `state.nudges[].via`. Missing in old files means `president`. The site still **sends nothing**; "Would be sent · demo" under "Send automatically" is derived and **writes no record**. No new record types |
| `advanceClock`, `setViewer`, `setAi`, `reset` | Demo menu: advance date, switch viewing identity, toggle AI, reset demo |

### 4.2 Rule-based reminder runtime addition (2026-11-16, feature branch stage 1)

Optional `state.reminderRuntime` exists only after explicit `enableReminderPlan`; formatVersion and the outer version of old saves do not change. The runtime has `updates` (same-day order and actual actor), `waitingRequests` (explicit waiting target and closure reason), and `deliveries` (immutable recipient and task snapshots), all ordered through `sequence`; `activatedOn`/`sentOn` use the demo date. `enableReminderPlan` enables it; `confirmPlannedReminder` records review. Both use the existing data-action log format; no buttons were added to old pages.

New automatic-mode `deliveries` persist `outcome: simulated`; manual-send confirmation is `recorded_by_sender`, which does not mean this site verified external delivery. Old `state.nudges` and `protocolLog` are not converted into new sends with unknown recipients. Corrupt or future-version runtimes are retained but disabled. Old pages have not enabled the new runtime by default; the previous section's description of FB-8 inferred records still applies to the old path. Do not combine the two versions as real email counts. Stage-two email and task-page additions are described below; stage three connecting all Details/reminder-center surfaces and a real sending service have not yet been implemented.

### 4.3 Rule emails and reusable-task entry (2026-11-16, feature-branch stage two)

- `state.taskAccessGrants?`: reusable local demo grants, separate from the old one-time `officerGrants`. They contain the task, current owner and term version, actual recipient, `owner`/`waiting` scope, optional waiting request, issue/expiry dates, and a local signature. The new URL is `/#/officer?access=…`; viewing does not change state, and the same entry supports Working followed by Done. It cannot be reused after reassignment, leaving office, invalidation, or reset. This is not server sign-in or cross-device authorization. A damaged grants table is retained and no further entries are appended.
- `issueTaskAccessGrant`: log payload contains only task, recipient, scope, and optional waiting-request ID; signatures and full links are not logged. `taskAccessAction`: the log actor is the actual recipient of the valid grant; payload contains task, recipient, scope, and action kind. URL tokens are excluded from action summaries. New business actions use the existing data-action logging mechanism; general `ui.*` logging on old pages continues unchanged. This round did not change study guidance steps or the collection process.
- `Node.instructions?` / `completionCriteria?`: manually entered specific requirements and completion criteria; importance continues to use `why`. Human requirements take precedence as facts; AI must not invent missing information.
- `Nudge.message?` / `ReminderDelivery.message?`: a complete rule-based email snapshot revalidated against current facts, recipient, mode, and authorization; includes subject, body, unique task link, planned email address, channel, generation date, grant ID, word count, and `source: rules`. Snapshots are generated when records are saved; old records are not backfilled. Users still select the actual destination externally for manual drafts; this site does not verify it. Action logs contain only snapshot summaries such as recipient/source/word count, without copying body or links. This records approved demo content, not an external delivery receipt.
- `waitingRequests[].response? / respondedOn? / responseBy?`: Acknowledge / Update provided by an explicitly designated waiting recipient; also appends the actual actor and ordering to runtime.updates, with `ownerReply: false`. Waiting recipients cannot change the original task's four statuses; responding does not overwrite its original owner/status. The initial request is not duplicated; in the 2026-11-18 increment, Acknowledge means a promise only and still has an expected-date check; only provided stops helper follow-up. Canceling a wait, changing the recipient, reassigning, and completion retain existing undo constraints.
- **Four reminder corrections on 2026-11-18: ** `waitingRequests[].expectedOn?` is the manually entered date saved when the helper first promises. If omitted by older clients, rules default to demo today+2 calendar days; old ack records are assessed from respondedOn+2, without backfilling historical facts. A promise and provision each send the original owner one `info` in-app notification, with IDs `waiting-promised:<requestId>:<ownerId>` and `waiting-provided:…`; stalled-wait notifications use `waiting-needs-action:<requestId>:<unanswered|promised>:<ownerId>`. These are not external delivery receipts.
- `ReminderDelivery.reason` adds `no_reply` (at most one ordinary no-response follow-up outside the default three stages) and `waiting_followup` (unanswered waiting requests/overdue promises). Fields, actual sentOn, and immutable snapshots continue using existing delivery records; candidateId distinguishes the two helper-follow-up stages. Do not use candidateId alone to decide whether a rescheduled milestone has been sent. Old duplicate sends are not deleted; every message still counts toward the recipient's daily/seven-day totals, while the per-task milestone allowance counts distinct stages already sent. No new study guidance steps, action types, or export formatVersion were added, and outer schema 23 is not reset. Full rules are in the [handoff](feedback-fix/REMINDER_FOLLOW_THROUGH.md).

The new single-email editor makes no AI requests; the old `?token=` entry remains compatible. Stage 2 did not enable new plans by default, unify old batch records, connect an email backend, or change the study flow version. Full permission and acceptance boundaries: `feedback-fix/REMINDER_STAGE2_CONTRACT.md`.

### 4.4 Unified rule emails and new plans (2026-11-16, feature-branch stage three)

- New organizations default to `reminderRuntime.version: 2`; legacy data without runtime/v1 is explicitly upgraded via `upgradeReminderPlan`, preserving original settings, updates, requests, and send history. `mailRequiredAfter` is 0 when enabling, or the original sequence when upgrading; subsequent new deliveries require a complete message; no legacy records are fabricated. Unknown/corrupt values are retained and disabled, without reverting to legacy sending. This stage did not change the outer schema/export formatVersion.
- `reviewLegacyReminder` records leadership's review of current task assignments, removing that task's ambiguity block on future reminders and adding an audit update with `ownerReply:false`. Legacy nudge/protocol recipients, bodies, and recorded dates are unchanged; review is not a member reply.
- `recordReminderBatch` uses the existing business-action log; payload contains only via, candidateIds, count, without copying email, signatures, links, or workspace keys. via=automatic uses actor `system:reminders`, without impersonating the current viewer or president. Preparation failure leaves no grant; saving rechecks current settings/object/date/ownership/quota per item and counts only this operation's new delivery IDs.
- Single, batch, and automatic demos save the same complete rule-email snapshot; automatic sends are no longer inferred from Today. Automatic failure text and busy are current-page state, not delivery receipts; refresh deduplicates against persistent records and handles only still-valid candidates.
- Replies derive from actual ownerReply in the same term or a response to the same waitingRequest, ordered by sequence within a day; No reply starts from an actually saved delivery. History displays saved recipient/task snapshots; deleting/reassigning tasks does not attribute history to a new owner. Legacy records with unknown recipients are excluded from new-version no-reply counts. Manual records remain recorded_by_sender and platform records simulated; there are no external delivery receipts.
- Retry browser saving retries only the current business snapshot/log save, without submitting local form drafts or creating send records; if another tab has new business data, pause and retain both copies, offering no overwrite retry. Settings, enabling, batch, and automatic actions each require their own explicit submission/retry.

The old one-time `?token=` entry remains compatible; new emails continue to use reusable `?access=`. Study guidance steps and collection mechanisms are unchanged, and new business actions use existing logging; see `feedback-fix/REMINDER_STAGE3_HANDOFF.md`.

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
| `answer` | Primary response form: `rule-answer` (rules answer with citations), `plan-form` (event creation form), `task-form` (task creation form), `change-card` (change card awaiting approval), `change-applied` (small change already applied), `event-date-form`, `task-list`, `reminder-card`, `plan-check` (new-event plan check), `text` (plain text), `error` (error, `applied: false`), `timeout` (AI's second pass did not return in time), `stopped` (FB-1, 2026-11-15: the participant pressed Ask's **Stop** while waiting; the response comes from the browser locally—chat uses a local fallback answer, forms stay as they are, and Plan check uses the rule engine's own check; `fallback` is `true`, `source` states "stopped"; refinement also has `refine: true`, and Plan check has `trigger: "plan-check"`. **Skip AI line** in the reminder editor does not produce `ui.answer`, only a generic click record) |
| `cards` | All card kinds in this answer, in order |
| `citations` | IDs of cited rules/policies, e.g. `["R06"]` (in both rules answers and plan checks) |
| `inScope` | Whether the rule question falls within the rule library's scope |
| `source` | Small label beneath the answer identifying who answered, e.g. `Matched by keywords · AI unavailable`, `AI checked policy sources · …` |
| `fallback` | `true` = AI was not used (AI disabled, service unavailable, or timeout; local rules or templates answer) |
| `ms` | Milliseconds from asking until the answer appears |
| `changeSetId` / `autoSetId` | Change-group ID generated by this answer; can be matched to subsequent `reviewChange` and `undoAuto` |
| `refine` | `true` = AI's "second look" (local form appears first, then AI fills it in on return) |
| `trigger` | `plan-check` = an automatic plan check after approving a new event, rather than a participant question |

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

- `attempts[]`: one entry per walkthrough (or choosing "Explore the sample club" on Welcome): `id`, `entry` (`start` walkthrough / `explore` sample directly), `flowVersion`, `replay` (replay number), `startedAt`, `finishedAt`, `outcome` (`completed` / `exited` midway / `explored`).
  - From formatVersion 3: `sessionId` (session it belongs to), `setupCompletedAt` (time Start workspace or Keep current demo was pressed, milliseconds), `setupChoice` (`start-workspace` / `keep-demo`).
  - `outcome` still describes how the **whole attempt** (including post-setup member preview) ended. `exited` can mean leaving before club creation or pressing Exit in the member preview afterward; `setupCompletedAt` distinguishes them. (Branch `ob-5`, FB-3, not deployed: no member preview, so post-setup `exited` can only mean Exit on Invite.)
- `steps[]`: `enter`, `leave`, `back`, `skip`, `complete`, `exit` (Save & exit) per screen, each with timestamp `at`. Step IDs follow flow version: `ob-4` has `founder.name`, `founder.constitution`, `founder.goals`, `founder.team`, `founder.first-event`, `founder.reminders`, `founder.confirm`, `founder.invite`; the S2 `ob-5` (2026-11-22) has the same list without `founder.reminders`; `ob-5` omits `founder.constitution` and `founder.goals` (constitution is in Team, Mission in Name, goals outside onboarding).
- Clicks/navigation on onboarding screens now **also** appear in the interaction log (`route` starts with `/welcome/`), allowing timeline comparison.

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

> **Removed in `ob-5` (2026-11-22, S2).** This section now describes `ob-4` attempts only, which older export files may still contain; the export code keeps reading them. For `ob-5`, see the file opening: no screen, no answer, new clubs default to `review_then_auto`. The screen file `src/onboarding/founder/ReminderMode.tsx` no longer exists; the three option titles below remain in `src/onboarding/copy.ts` for Settings and Reminders.

The president flow adds "How should reminders go out?" after First event and before Confirm (`founder.reminders`, `/welcome/founder/reminders`, skippable). Three options in **fixed order** (identical for all participants, so order is not separately recorded):

| Order | Screen title | One-line explanation below | Stored value |
| --- | --- | --- | --- |
| 1 | Send automatically | Platypus emails the officer on that date. | `auto_email` |
| 2 | I review, then I send | Platypus drafts it. You check and send it. | `review_then_self` |
| 3 | I review, Platypus sends | You check the draft. Platypus sends it. | `review_then_auto` |

- At the top: "Platypus knows each task's latest start date." Below: "Demo: no email is ever sent." (IRB: no reminders are sent during testing). **No option is initially selected**; Continue requires a selection; use Skip for now to avoid choosing.
- **This changes no website behavior.** Whatever the choice, the site sends no email; reminders still "open a draft for a person to send." After selection, Private reminder gains a read-only line, e.g. "Your club chose: I review, Platypus sends (demo: nothing is sent)." No line if skipped.
- **Storage:** Start workspace saves `state.org.settings.reminderMode`; when skipped (or using the old classic setup), the field **does not exist**. Keep current demo changes no club data, so the answer exists only in logs.
- **No new log types**; these were already recorded:
  1. **Choice (by label), and every change of mind:** Each option click records `ui.change`: `role: "radio"`, `name` = option title (e.g. `I review, Platypus sends`), `checked: true`, `group: "How should reminders go out?"`, `testid` = `reminder-mode-<value>`, `route: "/welcome/founder/reminders"`. Changes of mind appear as consecutive `ui.change` entries on that screen; timeline description e.g. `Ticked radio "Send automatically" in "How should reminders go out?" on /welcome/founder/reminders`.
  2. **Time on screen:** Difference between `enter` and `leave` (or `back`) for `founder.reminders` in `onboarding.attempts[].steps`; returning and reentering creates another pair.
  3. **Skip:** `skip` immediately followed by `leave` on the same screen.
  4. Continue records `ui.click` (`name: "Continue"`, `to: "/welcome/founder/confirm"`).
- **Calculating `reminderModeChoice` (session summary, section 3.1):** Consider only steps before Start workspace / Keep current demo. Find this screen's last `leave`: if preceded by `skip` → `skipped`; otherwise take **the last checked `ui.change` before leaving, within this session and on this screen**, mapping `testid` to the value. If missing from logs (e.g. dropped by the 2000-entry cap), the latest session may use `state.org.settings.reminderMode` (only if Start workspace was pressed); if neither exists, `null`. Refresh retains the draft selection and the prior `ui.change` remains in logs, so it does not affect this.
- Code: screen `src/onboarding/founder/ReminderMode.tsx`, copy `src/onboarding/copy.ts` (`founder.reminders`), values/order `src/data/reminderMode.ts`, inference `reminderModeChoice` in `src/lib/onboardingRecord.ts`, timeline `src/lib/timeline.ts`, tests `src/test/onboardingReminderMode.test.ts`, `e2e/p3h-reminder-mode.spec.ts`.

## Actual task Details and generic submission (2026-11-17 addition)

This increment affects actual Nodes only, not Settings StepTemplate/EventWorkflow; the outer schema remains 23.

| Field/action | Meaning and boundaries |
| --- | --- |
| `Node.externalLinks[]` | Manually edited service-entry labels and http/https URLs; unset uses known entries, explicitly empty arrays are not refilled; does not write back to templates |
| `Node.taskWork.version/revision` | General submission format supporting version 1 embedded files and version 2 file references, plus incrementing content revision; saving also verifies owner term; unknown/corrupt versions are not automatically cleared |
| `taskWork.drafts[]` | Legacy per-author body/attachment IDs/business-day drafts remain readable; new automatic drafts use a separate IndexedDB journal and do not count as completion or owner replies |
| `taskWork.submissions[]` | Append-only submitted body, author, saved business day, original owner term, and attachment IDs; corrections retain earlier submissions; other members can view published results on the node |
| `taskWork.files[]` | Deduplicated file metadata and blobKey; raw bytes in platypus.task-work/files; legacy dataUrl remains readable, complete JSON exports include bytes, downloads use octet-stream, no automatic AI transmission. At most 3 current attachments, 2MB each, 5MB total; retain historical files from old revisions |
| `platypus.task-work/drafts` | Isolated by workspace hash, node, author, ownerId/ownerVersion; body and file references autosave in one transaction; revision provides cross-tab CAS; report saved only after transaction completion, task switches do not cancel it; contains no directly usable link-signing key |
| `taskDrafts` (complete export) | Autosaved private unsubmitted drafts with actual file bytes; downloadExport collects asynchronously and does not emit a falsely complete copy when files are missing or saving fails; restoreTaskWorkArchive stages files before returning a small business snapshot; no new import UI |
| `saveTaskWork` | Saves results and completion in one persistent write; finance nodes save materials only, with completion still determined by Event Budget. Business logs record only body length and attachment metadata; original UI input logs retain site-wide rules |
| Edit | Separate panel saves task definition with its original fingerprint and preserves member submissions; Cancel writes nothing. Legacy draftLink remains openable without posing as new submitted content |
| `Node.targetDates` | Option D's independent version 1 date-change log: revision and append-only changes. Each item contains id/actorId/ownerId/ownerVersion/on/previousDate/date/message/notifiedPersonIds/affectedNodeIds; retained in original business exports; unknown/corrupt logs cannot be overwritten; outer schema remains schema23 |
| `updateTaskTarget` | Directly changes the club target and merges in-app notifications for selected member IDs; expectedTask checks date/owner term/status/log revision. Permissions come from the current viewer or issued owner grant, never from an informed person's grant or the browser's president identity; target, record, and notifications persist together; original task status/results unchanged |
| Legacy extension data (next two rows are historical compatibility) | New D UI shows no approval buttons and creates no ExtensionRequest; old pending requests do not auto-apply; saving a new target cancels old pending requests for that node and retains other history. Existing reviewExtension remains for compatibility, not as a new D-flow entry |
| `ExtensionRequest.requestedBy?` | New requests record the actual actor separately from original ownerId; old requests without it show the original owner. reason is an optional Message; draftLink may be empty for new requests, old links remain readable; recipients are current approver and current leaders, saved with the request |
| `reviewExtension` | Current approver-role holder or president/VP may act; continue checking departure, reassignment, expiry, and deadline version; acknowledge only after persistence succeeds; approval changes only clubDeadlineOverride, never the official school deadline |
| Reopen Done / Undo mark done | `replyTask` or owner-grant update to todo/working/help/waiting clears completedOn and the task's current contribution, preserving taskWork results/history. Undo verifies workspace, author permissions, original owner term, and this submission revision before restoring original status; after refresh, reopen through the status menu; finance Done remains controlled by Event Budget |

All dates still come from the original rule engine or demo business clock; operation times use the original log's `at`. Current browser storage is not server-based cross-device synchronization; a waiting-person grant cannot submit the original task. See `feedback-fix/TASK_DETAILS_UNIVERSAL_HANDOFF.md`.
