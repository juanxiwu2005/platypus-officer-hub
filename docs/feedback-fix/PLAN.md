# Test feedback repair: execution programme (2026-11-14)

> For the background and options for each issue, see [ `../FEEDBACK_PLAN_2026-11-12.md` ](../FEEDBACK_PLAN_2026-11-12.md). This document is Juanxi. 2026-11-14After selection **Executive rules**。
> **2026-11-15 Update:** Juanxi identifies products and studies as focusing only on two things: 1 reminder to target organisation meeting, 2 Organization access (handoff). Section 11 reviewed each phase in these two directions and changed the order of implementation; The old content of the conflict with this section is subject to 11.
> Integrated branch: `claude/fervent-thompson-e2j5u2` (do not touch `main`). Each stage is completed by an independent worktree sub-agent, with Claude (the main session) responsible for the merge, overall return, `docs/PROGRESS.md` and `AGENTS.md`.

## 0. Juanxi Decision (2026-11-14)

| Problem | Resolves | Phase |
| --- | --- | --- |
| Onboarding 1 Goals | Option B: SMART sentences | FB-2 |
| Organisation Onboarding 2 | Advisor connects to Private in parallel with a dotted line | FB-2 |
| Onboarding 3 Date Engine | Update on upload schedule | FB-6 |
| Onboarding 4 Buffer / Why | Do not remove buffer, redo with user interactive logic | FB-3 (buffer), FB-2 + FB-3 (each screen) |
| Onboarding 5 Reminders | Option A: Example + 3-step diagram + analogue | FB-3 |
| Onboarding 6 Last Step | Scenario A: One master button to remove the member preview | FB-3 |
| Other 1 cut-off date | Scheme A: only one Due interface | FB-4 (Show), FB-5 (Creating Task Sheets) |
| Other 2 Create Event | Option A: + New event | FB-5 |
| Other 3 AI | A + B: Amount of repair output; (a) Extending as much time as possible; Give the user "stop thinking" button | FB-1 |
| 4 Not laimed | Keep it. No change. | — |
| 5 Details | Option A: Reletter the third paragraph | FB-4 |
| Add | Can not delete folder: %s: No such folder | FB-5 |

## 1. Stages and parallel relationships

| Phase | Contents | When do you run? | Port ( `PW_PORT` / `PW_STORAGE_PORT`）|
| --- | --- | --- | --- |
| FB-0 | Scaffolding (main session): empty style files, `.ob-why`List of documents for the timetable, programme | Complete | — |
| FB-1 | AI Reliability: Output volume, time limit, Stop button | Wave one, parallel. | 4201 / 4202 |
| FB-2 | Onboarding First half: Welcome, Name, Constitution, Goals, Team | Wave one, parallel. | 4211 / 4212 |
| FB-3 | Onboarding Second half: First event, Reminders, Confilm, Invite | Wave one, parallel. | 4221 / 4222 |
| FB-4 | Task Details 3 + only one Due interface | Wave one, parallel. | 4231 / 4232 |
| FB-6 | Date engine calibrated according to schedule | Wave one, parallel. | 4261 / 4262 |
| FB-5 | + New event；Designated person at the time of task creation; There's only one date for the task. | Second wave (after FB-1, FB-4 merge) | 4251 / 4252 |
| FB-7 | Integrator (main session): merge, whole return, document | And finally... | 4173 / 4174 |

There is no overlap between the documents of the first wave of five phases (see the "single document" for each stage). `src/onboarding/copy.ts` is shared by FB-2, FB-3 but changed to individual blocks (the old rule of header comment).

## 2. Joint compliance at all stages

1. Read `AGENTS.md` Sections 3 (hard rules), 7 (interface rules), 7.1 (operational rules) and then the section of this document.
2. **hard rules:** interface text in English; Dates are calculated only by rule engine (`src/engine/`), and AI and interfaces do not calculate dates themselves; Disable secret key, research data; Do not send any live messages; **does not call the official website or any live AI interface** (test all simulations).
3. **Research Record:** No new recording type (the `ui.*` category remains unchanged), no change in the meaning of `data-testid`, already recorded fields. Yes, it does. "Require Juanxi to confirm."
4. **Not I `SCHEMA_VERSION`. The** new field can only be optional and the old archive can read it.
5. Only the files in your own "secret document"; When it is necessary to touch someone else's documents, the changes are kept as small as possible and listed in the report. **No change** `docs/PROGRESS.md`, `AGENTS.md`, `package.json`, `.github/**`, `netlify.toml`.
6. Styles are written into your own `src/styles/fb-0N-*.css` (built and imported); Only token; Not write `!important`, `transition: all`, nudity milliseconds.
7. If you change your behavior, take a test: unit sets put `src/test/` on, browsertes on `e2e/fb-0N-*.spec.ts` or have changed the spec. **Test for greening is not allowed to skip, delete or weaken**; When the expectations of the old tests did change as a result of the present decision, they changed their expectations and were described article by article in the report.
8. Run in your worktree before delivery: `npm run lint`、`npm run build`、`npm run typecheck:netlify`、`npm test`、`npm run words`and **It's about your own change.**browser tess( `PW_CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome PW_PORT=… PW_STORAGE_PORT=… npx playwright test <specs> --workers=2 --trace off`）。 The machine has only 4 cores and five stages running simultaneously, so do not run full volumes of browser tests (except FB-6).
9. A small step is submitted to your local branch. Information format `[FB-N][Claude] Describe the change`, **does not send**. No model name is included in the submission.
10. Delivery report (last reply): branch name and last submission number; (b) What has been done; Live results of each test command (through several, failed, failed names); (b) Failure and reasons; They need Juanxi's identification. Hit someone else's file.

---

## 3. FB-1 AI Reliability

**Why:** 2026-11-12 on the line diagnosis: `/api/nudge/draft` 4 returns `output limit` in two seconds, both times. The output we give is too small (120), the model has not been finished and the code has failed to intercept, so the AI sentence in the reminder fails every time. Another kind of failure is the AIR slow (15–23 seconds) hit our own 22-second cap.

**Monopoly file:** `netlify/lib/ai.mts`、`netlify/functions/*.mts`(AI interface), new files `netlify/functions/limit-probe.mts`、`netlify/functions/health.mts`、`src/lib/api.ts`、`src/lib/aiRetry.ts`、`src/lib/assistant.ts`、`src/components/rail/AskPanel.tsx`、`src/components/NudgeComposer.tsx`New documents `src/components/AiWait.tsx`、`src/styles/fb-01-ai-wait.css`、`docs/AI_SETUP.md`、`docs/PHASE3_DATA_DICTIONARY.md`(plus one line only) `stopped`）、`src/test/aiBudget.test.ts`And new tests, `e2e/fb-01-*.spec.ts`、`e2e/ai-fallback.spec.ts`。

### 3.1 Output Amount (Program A)

1. `callProvider` miles: `maxTokens = max(caller allowance, AIR_MIN_OUTPUT_TOKENS)` when running an AIR, constant default **1024**, which can be covered by the environmental variable `AI_MIN_OUTPUT_TOKENS` (set in 256–4096). The interfaces themselves check the length of the answer (for example, remind that maximum 10 words) is constant: the amount is "up to how much," not "how much to write."
2. **Automatically try again** (Juanxi 2026-11-14) when cut off; This is... `AGENTS.md`Article 12An explicit exception to the section "No automatic duplication of requests for fees": `finish_reason`Yes. `length`/`max_tokens`and `salvageTruncated`When there's nothing left, use it. **Double**(Ceilings) 4096(a) Send it again;  (b) Test only for the remaining time  ≥  5 seconds; A logical call for a maximum of 2 requests (formation downgrading and amount retesting shared).
3. The user log `ai_usage` more than three (numbers and fixed words only): `maxTokens`, `reasoningTokens` (supplier giving talent in `usage.completion_tokens_details.reasoning_tokens`), `retry` (`"output_limit"` or non-appearing). Use it to confirm that the amount is not being used for thought.
4. Testing (simulation of `fetch`, no live request): 1 first `length`, second successful  ≥  `max_tokens` in the second request body was twice as successful; Two times `length`, output limit; 3 callers to 120  ≥  1024 actually issued; 4 There is not enough time left  ≥  No retry; The 5 log lines contain new fields and do not contain prompt and answers.

### 3.2 Time ceiling (option B)

Fact: Repository remembers Netlify about 30 seconds to be cut (2026-11-07 line log: 31.2 seconds later 504); Netlify now has the 60 seconds for writing synchronisation of documents. The two are not consistent and cannot be assumed without a re-volumeing. 60Seconds.

1. `SYNC_AI_BUDGET_MS` becomes function `syncAiBudgetMs()`: Read environment variable `AI_SYNC_BUDGET_MS`, caught in 10,000–55,000, **default 26,000** (within observed 30 seconds). Use all sync interfaces; `constitution.mts`, `workflow.mts` for 21,000 read budget minus 1 seconds.
2. `/api/health` returns more than `syncBudgetMs`. Waiting time for browser = this value + 4 seconds (`src/lib/api.ts`: read and cache); Can't read 30 seconds. `aiRetry.ts`'s timeout sync.
3. New interface `GET /api/limit-probe?s=NN`: wait only for NN seconds (1–58) and then return to `{ waited }`, do not tune AI, do not store anything; **Only available when the environmental variable `AI_LIMIT_PROBE=on` is available, otherwise 404**. Use: The live limit of Netlify is measured once on line, and `AI_SYNC_BUDGET_MS` is transferred to the appropriate value (e. g. 60 sets 50,000). Step into `docs/AI_SETUP.md`.
4. Testing: the extraction of environmental variables; Health returns value; Probe default 404.

### 3.3 Waiting to see + Stop button

1. New component `AiWait`: Rounding + "Thinking... 12 s" (updated every second); `aria-live` only airs once at the beginning, not every second) + **Stop** button. Waiting. 10"Complex questions can take up to N s."  Activation only with token.
2. `callApi` Support `signal`; `assistant.ts` `respond()`, `reviewEvent()` accepted and passed on.
3. **Ask panel:** shows `AiWait` when busy; Dot Stop (`data-testid="ask-stop"`) immediately aborts the request, the input box is available and gives a local answer: Chat — answer with an existing local pocket, "Platypus stopped, quick answer from this crowder"; Refilling of forms (refine) — Form retention, source: "Platypus AI stopped from your words"; Activate Plan check § Displays rule engine's own checks.
4. **Alarm Editor:** "Checking Drawt..." Displays `AiWait`, the button being **Skip AI line**: use checked templates immediately and draft buttons are available.
5. Research record: No new recording type. The `ui.answer` after Stop adds a line to the `ui.answer` at `docs/PHASE3_DATA_DICTIONARY.md` with `answer: "stopped"` (new value added to the same record). Button clicks are already recorded in a common click log.
6. browser tests (delayed with `page.route` for `/api/chat`, `/api/nudge/draft`): seeing seconds moving; Dot Pop will be followed by local answers, input boxes are available and late responses will not appear again; A post-draft for Skip AI line is available; Keyboards can reach Stop; a11y Check pass.

**This phase is not done:** reading, manual drafting, first event 's "Plan it" Stop button (they automatically get longer); `AiWait` is available for reuse, next round.

---

## 4. FB-2 Onboarding

**Monopoly file:** `src/onboarding/gate/Welcome.tsx`、`founder/Name.tsx`、`founder/Constitution.tsx`(WHISPERS ONLY), `founder/Goals.tsx`、`founder/goals/*`、`founder/Team.tsx`、`founder/team/*`、`src/onboarding/copy.ts`Welcome/ `name` / `constitution` / `goals` / `team`Blocks, `src/components/setup/OrgChart.tsx`、`src/engine/orgChart.ts`New documents `src/engine/goalDates.ts`、`src/data/types.ts`(Only moving) `Goal`）、`src/data/settings.ts`(Voice only to target), `src/components/SettingsForms.tsx`(Only moving) `GoalsEditor`）、`src/pages/Today.tsx`(only target card), `src/styles/fb-02-onboarding-a.css`, relevant tests ( `src/test/onboardingTeam.test.ts`for the testing of objectives and organizational charts, `e2e/ob-04-*`、`e2e/ob-05-*`、`e2e/ob-12-reload.spec.ts`(b) Part of the organization chart).

### 4.1: Why (gold rings)

- The heading is directly below the line `<p className="ob-why"><b>Why:</b> …</p>` (the style already exists in `fb-00-shared.css`). Text In `copy.ts`From each of the pieces. `why`：
  - Name："Your club's name goes on every reminder and handoff note."
  - Constitution："Your constitution says who does what. Platypus uses it to know who to remind and what each role hands over."
  - Goals: 4.2 suspended, this screen not for this time
  - Team："Every task needs one owner. Reminders go to a person, and a role is what gets handed over."
- Welcome replaces the current `welcomeBody` with a three-line label in front of each line:
  - **Why** "Clubs miss deadlines when nobody sees the whole chain, and everything resets at handoff."
  - **How** "Platypus watches every deadline and writes the reminder for you."
  - **What** "Set up your team, your first event and your reminders. About 5 minutes."
- The maximum number of words per screen refers from 60 to **90** (reverse only the corresponding test assertions on these screens); Juanxi is required to confirm and write into the report.

### 4.2 Goals: SMART sentence (option B) - **suspended (2026-11-15, see 11), not done this time**

1. Data: `Goal` with optional field `period?: "week" | "month" | "semester"`. No old targets show up as usual. `validateGoals` accepts only three values or defaults.
2. Date by engine: new file `src/engine/goalDates.ts`, pure function `termEnd(today)`: the last day of today's semester; (a) The last day of the next term between terms; returns null beyond the calendar range (the interface does not show a date at this time, but only "this seconder". Data from `src/engine/calendar.ts` `TERMS`, do not write the date elsewhere.
3. The three proposed objectives should read: Events (`period: "week"`, Target 1, Unit `events`), Active Members (`semester`, 40, `members`), External Income (`semester`, 500, `USD`). The id of the target remains unchanged.
4. Each target line shows a sentence, and the editable part remains the original control (switch, name, plus or minus number, unit) plus a **time frame drop-down**:
   - semester："By **May 8**, reach [500] [USD] in [External income] · [this semester ▾]"
   - week / month："Every [week ▾], hold [1] [events] · until **May 8**"
   - Three drops: `each week`/ `each month`/ `this semester`. Date from `termEnd` only.
5. Three sub-marks below each row **Special . Time-bound**: name is not empty / target number  ≥  1 / time range is selected to light up each (not bright with gray, read screen text). A good goal says what, how much, and by when. (formerly "Goals are operational. Progress starts at zero.")
6. `rowsFrom`/ `goalsFrom` with `period`; Keep after refreshing; The behaviour of Skip, Back, mandatory mission remains unchanged.
7. Settings' `GoalsEditor` plus the same drop. Today's target card is marked with the word "per week" / "per month" / "this seconder" (not without `period`); Run `npm run words` confirms that Today is still inside 160/ 450.
8. Tests: Boundary of `termEnd` (for a school term, between terms, outside calendar); Lines and Targets Intersection `period`; Old target (no `period`) was verified; browser tests: change the sentence after pulling and three tags to change, refresh and keep, and do not roll horizontally with cellular width.

### 4.3 Team: Advisor connects to President in parallel with the dotted line

Fact: The code already supports the consultant (`RoleFunction` with `advisor`); `orgChart.ts` draws a dash to president for "consultant without superiors" but there is no entrance and the consultant's box is placed on the right end of the map, far from the president.

1. Team screens on "Add rule" plus **Add advisor**: plus a role, name Advisor "Advisor 2 " , `fn: "advisor"`, `reportsToId: null`, functional template. Disable when reaching the rolle cap.
2. Consultancy line: do not show reports to drop down **Advisors the president**; No indentation; At the end of the list; It could be deleted, filled in and changed. When the name is changed to no longer being a consultant, it returns to normal rule.
3. Organizational chart: consultant box and Private **, on the same floor, right-to-right** (multiple consultants to the right); Left when you can't put it down on the right, connect with **horizontal dotted line** and President; It is not in the reporting chain (no line down). The width of the figure is to count the consultant in, and the "president centered" behavior on the cell phone remains unchanged.
4. Add a line with an example: "Solid Lines: Reports to . Dashed Line: references". Reads the list of consultants as "Advisor, addresses the president".
5. The consultant (`isAdvisor`) read the same display.
6. Test: `orgChart` unit sets (consultant layers and columns, dotted edges, multiple consultants, non-presidents); Browsertes: The Add list shows a line, a box with a dotted line on the chart, refreshing the reservation, can be verified.

---

## 5. FB-3 Onboarding

**Monopoly file:** `src/onboarding/founder/FirstEvent.tsx`、`founder/firstEvent/*`、`founder/ReminderMode.tsx`、`founder/Confirm.tsx`、`founder/confirm/*`、`founder/Invite.tsx`、`founder/invite/*`、`src/onboarding/copy.ts`It's... `firstEvent` / `reminders` / `confirm` / `invite`Blocks, `src/onboarding/record.ts`（`FLOW_VERSION`）、`src/styles/fb-03-onboarding-b.css`、`docs/PHASE3_DATA_DICTIONARY.md`(the sections of the process version) `docs/PHASE3_SESSION_RUNBOOK.md`, relevant tests ( `src/test/onboardingFirstEvent.test.ts`、`onboardingReminderMode.test.ts`、`onboardingInvite.test.ts`、`e2e/ob-06-*`、`ob-09-*`、`ob-10-*`、`ob-11-*`、`p3h-reminder-mode.spec.ts`"See what your offices will see" or "Keep crrent demo".  **No** `src/engine/**`.

### 5.1 Why line

- First event："Your event becomes the tasks Platypus reminds people about."
- Reminders："So you never have to chase people yourself."
- Write as 4.1. Word ceiling: First event 110, Refinders 140, Confurm and Invite are still 60.

### 5.2 Buffer: Keep it, but make it "seeable."

Question: Call 1/2/3/5/7 now. The date on the progress chain doesn't move, so nobody knows what it's doing.

1. Change control to three named options (value unchanged, still stored) `draft.buffer`）：**Tight · 1 day** / **Standard · 3 days**(label Recommended)/ **Safe · 5 days**。 The draft is "Custom N days" displayed as the fourth selected by 2 or 7. The five values in Settings remain unchanged.
2. The title was changed from "Club buffer" to "How early should your crub finish?" "Your club finishes this many working days before each ASU deadline."
3. Here. **The steps of this campaign live**Show effects (data from the same preview) `previewFor(..., buffer)`i.e. rule engine, not by itself: list steps with ASU cut-off date in this event (maximum) 3Each line: step names . `ASU deadline Apr 2` · `Your club finishes Mar 30`。 When changing options, the line in which **dates change is marked "moved earler" / "moved later"** (text that can also be heard with a screen, not just colour).
4. If something slips by up to N working days, you still meet the ASU deadline." If none of the dates in the current option are affected by it, change to: "Your plan already finishes earlier than this, so nothing moves."
5. When there are no steps with the ASU cut-off date, revert existing generic sentence (`bufferExample`).
6. Testing: three options and a display of Custom; The dates in the list after option change come from the engine and are consistent with the progress chain; "Nothing moves" branch; Refresh the reservation; Cellular layout.

### 5.3 Reminders: Example + 3-step diagram + analogue (Scheme A)

**No change (comparison of studies):**Titles, sequences, no pre-selections, talent selections for Continue, Skip for now, individual buttons `data-testid`"Demo: no email is ever sent."

1. **example reminder card on top of screen** (`aria-label="Example reminder"`), using the tester's own contents:
   - Recipient: The first one in the draft is a name, not a president's officer (not just 'your officer ').
   - Step, Activity Name and Date: The first unfinished step (no one) from the preview of the officer responsible; Dates are given only with engines.
   - Text: Hi Sam - Book Room & Layout for Welcome Mixer. Due Mar 30. Reply: Done · Waiting on… · Need help."
   - "Hi Sam — your next task is ready.
2. For each option, insert a **three-step diagram** (small squares + arrows, pure text and CSS) under the heading and a **analogy to**:
   - Send automatically：`Platypus writes` → `Platypus sends` ·"Like a calendar alert."
   - I review, then I send：`Platypus writes` → `You check` → `You send` ·"Like a draft waiting in your outbox."
   - I review, Platypus sends：`Platypus writes` → `You approve` → `Platypus sends` ·"Like approving a scheduled post."
   - The original sentence remains the screen description (`aria-describedby`).
3. Test: Example card uses the name and engine date in the draft; Common sentences for skip activities; Charts and analogies of the three options; The original `p3h-reminder-mode` assertion (sequence, non-preselection, export value) is maintained.

### 5.4 Confirm and Invite: A master button to remove the member preview (option A)

1. **Confirm:** Main Button text changed to **Create my club** (Same act as Start workspace). Remove the "Keep current demo" button. Only if a solid organization (`replaces` is true) has been built, show a line of text links to **Constellation and keep the curent club** below the replacement warning (act like Keep: Remember `keep-demo` and withdraw). Back reserves.
2. **Invite:** main button **Open my workspace** (record complete, ending this walkthrough for `completed`, today). Remove "See what your offices will see" and its processing function. Copy the links, WhatsApp, Email, officer list to keep. That lonely I became a line of words.
3. Members' preview 6Screen **Do not delete**: "Test Onboarding Page Invite" in router and Demo menu is available as usual (no record writing).
4. `FLOW_VERSION` Up to **`ob-5`**, note: ob-5 = presidient process ended in Invite and no more crew previews were taken; Confirm has only one master button. Update `docs/PHASE3_DATA_DICTIONARY.md` and `docs/PHASE3_SESSION_RUNBOOK.md`. The `setupChoice` value remains unchanged.
5. Test: End of full process at Invite and `outcome: "completed"`; For the first time there is no Cancel link; it is available when redacted; The Demo menu's crew preview can still be finished; All specs that rely on old buttons change to a new path.

---

## 6. FB-4 task details 3 paragraphs + only one Due interface

**Unique documents:** `src/components/TaskDetail.tsx`, `TaskActions.tsx`, `EventDetail.tsx`, `NodePanel.tsx` (deleted), `src/pages/Events.tsx` (**action only on the list view table and its descriptive text**), `src/pages/Tasks.tsx` (**movement only on the form**, no move NewTask and board), `src/lib/nudges.ts` (date language only in the message), `src/styles/fb-04-task-detail.css`, relevant tests. **No changes to** `src/engine/**`, `src/components/rail/AskPanel.tsx`, `TaskFields.tsx` (date of establishment of task forms changed at FB-5).

### 6.1 One Due (Programme A)

Principle: **engine counts three dates as usual** (judgment whether or not to miss the hard term of school) and only club deadline is considered the only "Due".

1. The date bar for any list, card or details is only **Due** and the value is club deadline.
2. "Why this date": "AAU needs this by Apr" 2. Your club finishes 3Working days earlier."  Risk reminder 2: The red/ yellow problem given by the engine is shown at the top of the details (with `issues` already available).
3. "Start by" is no longer a parallel date: in "Why this date" it is written as "Reminder goes out Mar 26." (The task of others still uses the current generic statement that does not disclose individual buffers.)
4. List view for Events: reletter the column to Step / Owner / Status / **Due** (remove both Start and ASU); There are ASU risk rows that retain red and suspended reasons.
5. When the alert message (`buildNudge`) line is changed to "Due Mar 30. Best started by Mar 26." No more ASU... (a) The theme line remains unchanged; The five paragraphs of `nudgeCheck` remain unchanged. The server 's `nudge-draft.mts` refers to the same function, without changing it.
6. There are no more places to show "ASU deadline", "Club deadline" and "Due date" three parallel labels (except the sentences in "Why this date". `officialLabel`, no one uses it.

### 6.2 Details 3 (Programme A)

Top to bottom:

1. **Head:** Activity name (small word) Title . . Status block . . . Director (head + name) . **Due Mar 30** (expired red). People who are not responsible and have the right to warn see a secondary button here, **Red Sam** (the behaviour of former Remind and the reason for its disallowing remains unchanged).
2. **Your next step：**Only. **A master button.**：Not claimed → **I've got it**； The rest of the **Mark done**. Secondary operation in a row of small buttons: Wariting on... . Need help . Need more time (form behaviour remains unchanged). Steps for budgetary control: Mark done deactivated this step in Event Budget. and **Open Evert Budget**. There's no people who see the original statement. Next is the link to **Where to submit** and "Open current Draw".
3. **reminder area (only shown): problem with** engine, Wariting on, extension request pending.
4. **Collapse zone** (`<details>`, closed by default):
   - **Why this date** (see 6.1) plus that step.
   - **People**: Head, Approving Officer, Consulted, Infomed (read-only).
   - **Edit** (president/ vice president only): name, header drops, Due date (writing `clubDeadlineOverride` with "Use recommended"), label. "can be changed in the task table."
   - **Resources**: Source and rule link.
5. "Coppy All Event Details" moves from task details to the activity 's own details (`EventDetail.tsx`).
6. Removes unusable `src/components/NodePanel.tsx` (it's editable fields have been incorporated into Edit).
7. Keep the existing `data-testid` (`task-detail` et al.) and focus behaviour (open focus to title, Esc close).
8. Test: Main button and Edit, seen by the principal, president, other officer; Budgetary steps; Edit became effective and reversible (with former `updateNode`); "Why this date" with the ASU rule, there's that saying and there's nothing; Events List only has four columns; The new wording of the reminder message is `nudgeCheck`; a11y。The affected specs (`tasks`, `events`, `dx-13-details`, `dx-19-swap`, `wp5`, `today`, `a11y` and `word-budgets`) have to run and follow up.

---

## 7. FB-6 date engine calibrated according to schedule

**Input:** [ `event-workflow-calibrated-2027-04-16.tsv` ](event-workflow-calibrated-2027-04-16.tsv) (Juanxi uploading, 32 moves, day of activity 2027-04-16: 60, outside catering, USG funds).

**Monopoly documents:** `src/engine/schedule.ts`, `src/engine/playbooks.ts`, `src/data/types.ts` (only new optional fields for `StepTemplate`, `Node`), `src/data/seed.ts`, `src/data/sampleScenario.ts`, `src/engine/workflow.ts` (where necessary), engine-related tests, `docs/RULES.md` (when required), new document `docs/feedback-fix/CALIBRATION_REPORT.md`, and browsertes to follow as a result of the change in the sample date.

### 7.1 how to read this table.

There are two dates in each step of the document, and the number of days to be replaced with a relative activity day is an integer:

- **Proposed start** = window opening date of this step (e. g. Event Plan T-65, Moderator T-60, Budget Approval T-30, Full Check T-14).
- **Proposed deadline** = this step of the club deadline ("Reactive Timing" column, e. g. T-60, T-25, T-1).
- **Effort days**= Workload to spend, not window length (Moderator window) 35Day, workload 10Oh, God.
- **Depends on** = order of completion. The serial step window in the document overlaps (five Plan/Prepare steps are T-65 →  T-60), so it cannot be "exceeding the next step before starting", but only "the next step is completed earlier than before".

### 7.2 Engine Change

1. `StepTemplate` and `Node` plus optional field `timing?: { startDays: number; dueDays: number; unit?: "calendar" | "business" }` (positive before the activity date, negative after); default `calendar`). There's a step called "correction." Original `anchor` Reservation: `rule` still gives ASU of financial data, `target` labels are still used for illustration.
2. **Date of calibrated steps:**
   - club deadline = `min(official deadline − club buffer, event day − dueDays)`; The previous working day is spent on weekends or holidays (the following working day is used for post-event steps) - the existing `targetDate` rules are maintained.
   - (b) latest start = activity day - `startDays`, which falls earlier on the person's non-working days (weekends, holidays, end weeks, school term, busy week). Personal buffer **It's more than the default. 1Part of the sky.**(The result is equal to the file under the default settings;  Some people set the individual buffer at 3 days, and then advance it to 2 workdays. The narrative text (`explain.latestStart`) is true.
   - No more being squeezed down by "The Start Day of Downstream" (inverted step kip calibrated step).
   - Someone changed the cut-off date (`clubDeadlineOverride`): it was fixed by a user; Start date = `min(calibrated start, new due date − estDays workdays)`.
3. **Reliance between calibrated steps = Completion order:** This step is deferred to the upstream deadline (already allowed on the same day) only when the unfinished upstream cut-off date of **is later than the end date of this step of**, and remains as "Moved later...". If one of the parties upstream or downstream is not a calibrated step, the existing rules (it can only begin on the following working day after the previous step has been completed) should be followed.
4. **End-of-life:** calibrated and `dueDays` as 0 can start and end on the day of the event (Head Count); The remaining closing steps are still well ahead of the first working day after the event.
5. No `timing` steps and manual tasks: behavior is completely unchanged (those not dependent on standard templates in existing engine tests must pass as they are).
6. `buildEventNodes` Bring the template `timing` to the node. There are no standard steps for `timing` in the **self-defined process** (`org.eventWorkflow`): `key` is added from the standard template to `timing` and `estDays` (student organization does not add its own). **Activities that have been built do not automatically change** (they do not have `timing`, keep the original date).

### 7.3 template update (`EVENT_STEPS`)

Update 32 steps by three columns of the file:

| key | startDays | dueDays | estDays | Depends on |
| --- | ---: | ---: | ---: | --- |
| plan | 65 | 60 | 5 | — |
| backup | 65 | 60 | 5 | plan |
| venuechoice | 65 | 60 | 5 | backup |
| registry | 65 | 60 | 5 | Vuechoice (Reserved R01 Official T-14) |
| venue | 65 | 60 | 5 | registry |
| moderator | 60 | 25 | 10 | venue |
| materials | 60 | 15 | 5 | moderator |
| finalcheck | 14 | 1 | 5 | (b) The fact that it's not possible for a person to be a victim of an act of terrorism to have his or her own rights protected by the law; (Reliance on reservations to conditional steps) |
| checkin | 5 | 0 | 1 | finalcheck |
| budget | 60 | 55 | 3 | Plan (document Note: Needs Event Plan as prerequisite) |
| foodCompliance | 60 | 55 | 3 | Budget (Reserved R06 Official) |
| quotes | 60 | 50 | 10 | foodCompliance |
| budgetRequest | 60 | 49 | 1 | Quotes (foodcompliance retained by status quo) |
| budgetApproval | 30 | 18 | 1 | budgetRequest |
| purchaseRequest | 30 | 18 | 1 | Budget Approval (Reserved R09 Official) |
| purchaseApproval | 30 | 10 | 1 | purchaseRequest |
| orderPlaced | 30 | 10 | 2 | purchaseApproval |
| marketingNeeds | 60 | 58 | 2 | — |
| contentCreation | 58 | 48 | 10 | marketingNeeds |
| promotionItems | 48 | 38 | 10 | contentCreation |
| content | 17 | 10 | 7 | PromotionItems (rsvp, this conditional step depends on reservations) |
| reminder | 4 | 3 | 1 | content |
| headcount | 0 | 0 | 1 | checkin |
| thankyou | 0 | −1 | 1 | headcount |
| feedback | 0 | −1 | 1 | — (Documentation Event Day: After the event is ready) |
| postmarketing | 0 | −1 | 1 | —（Event Day）|
| photoBackup | 0 | −7 | 1 | —（Event Day）|
| invoice | 0 | −7 | 1 | headcount |
| attendance | 0 | −7 | 1 | —（Event Day）|
| spending | 0 | 5 working days after event | 1 | attendance |
| financeRecord | 0 | 7 working days after event | 1 | spending |
| documentation | 0 | 14 days after the event | 1 | feedback |

Note:

- The last three lines of **did not copy the "post-activities 129 / 132 / 129 days".** The three numbers are the output of the old engine (the activity of 4/16, the end of which was pushed through the end of the week and summer vacations and dropped to 8), and the three lines have not been changed in the document. The copying allows any event on any date to be reimbursed more than four months later, thus retaining their original intent (5/7 working days after the activity and 14 days). **needs Juanxi to confirm** and write the report.
- No conditional steps in the document (speaker, addressr, access, security, alcohol, drone, rsvp, etc.): **without `timing`**, the date still being introduced by a neighbouring step according to existing rules; The report lists the actual dates they had in the sample activities for subsequent calibration by Juanxi.
- `key` of steps remains the same (it is used for existing activities, process editing, and policy references).

### 7.4 Comparative Report and Guardian Test

1. New unit ts: a TSV read into the library, running engine with the same activity (2027-04-16, 60, external catering, USG funds, default settings) to match start and end dates. **The only differences that can and must be specified are:** weekends/families moved to working days, last three lines (see above). If any other step fails, the test will be red.
2. `docs/feedback-fix/CALIBRATION_REPORT.md`: A table (step/ file start/ engine start/ file close/ engine end/ reason for variance) with the date of the condition step, impact on available data, unresolved issues. The table is generated by a test or script from the engine output, without handwritten dates.

### 7.5 Example Data and Returns

The date of the template is changed as soon as it changes, for example, the current event (`seed.ts`, `sampleScenario.ts` with `buildEventNodes` currently being constructed). Request:

1. Example The same story can still be explained by the fact that, on presentation day 2026-10-22, there are today 3 "Needs a Nudge", completed steps, red and yellow, not all expired. If necessary, adjust the status of each step in the seed, the completion date and the person responsible for it, **does not change the demonstration day or the activity date** (unless there is no other way to do so, then write it in the report).
2. `e2e/demo-contract.ts` and test follow-up based on specific dates or risk ranking; What has been changed in each place and why, as indicated in the report.
3. This phase allows running of **full-volume** crowds once (`--workers=2`), because the engine has the greatest impact; The failure is compared to the unmodified baseline (the old occasional failures of `PROGRESS.md`: `workflow-setup:123`, `dx-18:34`, `ob-08`, `ob-12:208`, `production-security:14`, `organization-setup:1381`).
4. `npm run words`: Changes in the sample data may change the number of words on the page and are beyond processing.

---

## 8. FB-5 New entrance (wave 2)

**Unique documents:** `src/pages/Events.tsx` (head of page), `src/pages/Today.tsx` (head of Events card), `src/pages/Tasks.tsx` (addition of New Task and board), `src/components/rail/RailContext.tsx`, `AskPanel.tsx` (receive "open form"), `TaskFields.tsx`, `src/lib/assistant.ts` (export of blank form cards), `src/data/board.ts`, `src/data/store.tsx` (build task actions), `src/styles/fb-05-create.css`, associated tests.

### 8.1 + New event (Programme A)

1. Events header button **+ New event**; The same button is placed in an inactive empty state. Click: Opens the Ask tab in the right bar and immediately shows the existing active form card (and hit " Plan... " ) and gets the same form, the column is empty and does not call AI, with a focus on the first field.
2. Today's Events card header with a small button next to Open **+ New event** (the same act).
3. ...permissions with existing `canCreateEvent`: "Only the present or VP can create events." (Settings are available to others as they actually say.)
4. do not put AI input boxes on the page (interface rule 1); Actions such as Plan check after the form remain unchanged.
5. Test: president point button  →  Form appears  →  Filling up creation  →  New activity is present in Events; (a) The role of the non-permissions sees debarment and reasons; The cell phone has a full screen on the right bar and can be turned off; Word ceiling (Events 180/ 420, Today 160/ 450).

### Designated on 8.2 construction task

1. **+ New task** on the tabs page opens a small list: **Task name**, **Assign to**, **Due**.
   - Assign to: Default "Me"; Select any current officer; You can also choose "Anyone (open)" (no one can claim it without a head). With the existing `officers()` list, no former and incoming members appear.
   - Due: Default to "days in today+Settings" (`defaultTaskDue`, engine) which can be changed; That's the only date.
2. The rules follow M2b (2026-10-27): To do; **gave it to someone else, "I've got it" to take over** and get a notice; "Anione" is not led. Try to reuse the already existing `createTasks` actions.
3. "Sent to Sam. It stays in not covered until Sam reports."
4. The fast "+Add task" at the bottom of each column is kept only by name (fast path), and the tasks created can be changed to a responsible person in Edit for details (FB-4).
5. The task (existing read-only rules) can still not be built by the incoming office and its predecessor in View as.

### 8.3 construction task has only one date (closing of 2.1A)

1. The task sheet in Ask and the new form above: remove "Club deadline N working days earlier" tickbox, only **Due**. Created task club deadline = selected date, no other "official" date. `buffered` for `createTasks` is always passed on to false (parameter retained, old records readable).
2. The default days in Settings — "Tasks and events" are retained. The description in Settings is updated.
3. Testing: only one date for both forms; It's built for someone else. The other person's perspective is not recognized and can be claimed. To do; Anyone – no responsible person; Read-only characters cannot be built.

---

## 9. FB-7 integration (main session)

1. In the order of FB-1, FB-2, FB-3, FB-4 and FB-6 combined into an integrated branch (not squash, easy to rollback) for every run + unit types; Reassign FB-5, merge.
2. Total `npm run check` (browser tests running alone, occasional failure against baseline).
3. Document: `docs/PROGRESS.md`(What did you do, how did it happen, unverified, need Juanxi) `AGENTS.md`(6d process version and buttons, number) 6Details of the sections and `NodePanel`Delete, 12No, no, no, no, no, no. `timing`）、`docs/PRODUCT_PLAN.md`Mechanisms 1. (interface one Due, engine three dates).
4. Send an integrated branch. **not merge `main`, no PR unless Juanxi says so.**

## 10. Default values set for Juanxi by the master session (changed if not agreed)

1. **Interpretation of the timetable** (7.1): documents for both start and end dates; Only the order of completion is required between serial steps; weekends and holidays moved to working days; Last three steps without copying the 129 days.
2. **per screen Why**: Juanxi 's answer to item 4 is "No remove, interactively updated" and there are no separate options for why; The original feedback ( "Why more explanation why, combined with the golden ring") was given on each screen page of Why/How/What.
3. The **word cap**: it refers to 90 (First event 110, Reminders 140) from the 60 screens.
4. **AI Time**: Default 26 seconds before measuring the live limit of Netlify; When measured, a change to an environmental variable can be extended without changing the code.
5. **process version `ob-5`**: reading changed and the number of the version in the study log changed. If the Phase 3 official data is already collected, Juanxi will be set for merge `main`.
6. **Advisor**: Instead of defaulting to add a line, give the "Add advisor" button (default plus changes the starting data and all relevant tests for each new student organization).

## 11. Focus Review (2026-11-15)

Juanxi: The website and the research focus only on two things - **1 Reminders oftant organisation meeting; ②Organization succession**。The rest are additional functions, not the focus. Each of these points is reviewed below.

| Item | Which target to serve? | Conclusions |
| --- | --- | --- |
| The AI sentence of the FB-1 reminder failed every time (outline amount) | 1 Direct | Do it first. |
| FB-1 Time limit, Stop / Skip AI line | 1 Reminder editor directly benefits; Ask, it's an auxiliary. | Do it. |
| FB-6 date engine calibrated according to schedule | 1 Direct: deciding which day each reminder will be sent and which date the deadline is; 2 Indirect: role file "after taking over 30"the day of the end of the day."  | Do it first. |
| FB-4 only one Due | Direct: There is only one date in the reminder and task | Do it first. |
| FB-4 Details 3 | Direct: This screen is visible when the reminded person clicks a link, and one main button returns to state | Do it. |
| Designated on FB-5 construction task | Direct: no one can warn without the person in charge | Do it. |
| FB-5 + New event | 1 Support: Activity is the source of the reminder | Do it. |
| Example of the FB-3 Reminders screen, three-step diagram, analogue | 1 Direct | Do it. |
| FB-3 leaves only one main button at the last step | Supported: Less detour and faster access to two cores | Do it. |
| FB-3 Buffer Redo | 1 Indirect: it is a parameter for the reminder time; It's rarely really moving a date in the calibration template. | Do, but press 5.2's smallest version without adding anything. |
| FB-2 / FB-3 per screen | Support: text has been changed to "a reminder of who" or "handoff"? | Do it. |
| FB-2 Advisor | 2 Weakly related: The consultant is the only person who kept it in place when he left. | Do (small change) |
| SMART sentences for FB-2 Goals | **Not Serving**: The target is a manual number, no reminder, no handoff. | **Suspended**, etc., confirmed by Juanxi; Suggested change to move Goals screen off |

**More important finding:**, this 11 feedback is all peripheral. The gap between the two cores themselves, not one round:

- **Core 1**Send a reminder. 5If you leave the site, you will return to confirm it.  Selecting the alarm is not working; There's no place to see "what reminders this week, who hasn't returned."
- **Core 2** Handoff has 8 stages, waiting for people at every step for weeks, far from "24 hours to 3 days."

So at the FB- 1…FB-7After that, add two phases ( **Wait till Juanxi says "do."**, because it's going to change the cover page and navigation to affect Phase 3Task card:

| Phase | Contents |
| --- | --- |
| FB-8 Reminder Center + Receiving Navigation | The home page becomes your OK/ Sent / Replies / No reply yet; Onboarding really takes different processes. Navigation is reserved only for Reminders, Plan, Handoff, Rules and the rest for More |
| FB-9 Three Days Handoff Package | "Hand over this rule" immediately generates the Day 1/ Day 2 / Day 3 list from a roll file, without AI or someone else; (a) Interview and handbooks will be deepened when they become available; Synchronising folder |

### New order of execution (up to 3 pieces at a time, avoid crashing the upper limit of our use)

1. First wave: FB-1, FB-6, FB-4.
2. Wave 2: FB-3, FB-2 (excluding 4.2 Goals), FB-5.
3. Integration of FB-7.
4. FB-8, FB-9: decision by Juanxi.

## 12. Final scope (2026-11-15, Juanxi agrees to focus programme) - this section should prevail in case of conflict

Juanxi agreed to five articles: one page is a reminder centre; 2 Navigation received from Reminders, Plan, Handoff, Rules, Team and Partners in More (without deleting code); 3Handoff became a three-day handoff bag; 4Onboarding only contains the name  → Team  →  First event  → Reminders  → Create; Goals onboarding, stay in Settings; 5 No grinding: Target Ring, Star of this Week, Forecast Percentages, name change, meeting time, budget details, Partners board.

### 12.1 Changes in the scope of phases

| Phase | Change |
| --- | --- |
| FB-1 | No change |
| FB-6 | No change |
| FB-4 | No change |
| FB-2 | **Change:** 4.2 Goals SMART **Canceled** (Goals are not onboarding); The Goals editor in Settings remains still. Add process adjustment (12.4). Never change. `Today.tsx`。|
| FB-3 | **Change:** No more `FLOW_VERSION`(FB-2 modified). The three-step map of 5.3 adds "What happens in the reminder center" (12.5). |
| FB-5 | **Change:** 8.1 Article 2 (Today Events Caga button) is cancelled because there are no longer Events cards on the front page. |
| FB-8 | **New:** Reminder Center + Navigation (12.2) |
| FB-9 | **New:** 3 days handoff (12.3) |

### 12.2 FB-8 Reminder Center + Navigation

**Unique documents:** `src/routes.ts`, `src/components/chrome/SideNav.tsx`, `src/components/Layout.tsx` (only navigation), `src/pages/Today.tsx` (rew into a reminder centre), new documents `src/lib/reminderQueue.ts`, `src/components/NudgeComposer.tsx` (after FB-1 merge), `src/lib/nudges.ts` (with only functions and no changes to the wording specified in FB-4), `src/data/types.ts` (with only optional text added to `Nudge`), `src/data/store.tsx` (with `confirmNudgeSent`), `src/pages/Settings.tsx` (with only reminders), `src/pages/Events.tsx` and `src/pages/Tasks.tsx` (with exceptions to the pages of Events |  Tasks), `scripts/word-count.mjs` (with only one line changed), `docs/PHASE3_SESSION_RUNBOOK.md`, `docs/PHASE3_DATA_DICTIONARY.md`, new style `src/styles/fb-08-reminders.css`, relevant tests.

**Navigation**

1. Main navigation left: **Reminders** (`/`), **Plan** (`/events`); Also bright at `/tasks`, **Handoff**, **Rules**. The following foldable **More**: Team, Partners (default closes); The current page opens automatically when it is inside. Bottom Settings, Help remains unchanged. Synchronizes mobile navigation (DX-20).
2. Turns out to move the incomplete number on Tasks to Plan.
3. `/events` and `/tasks` place the same switch to **Events |  Tasks** (link, not new page).
4. Each page "Reminders = "Who needs a reply, and who hasn't answered?" Plan = "What has to happen, and who owns it?"。
5. Funding has been redirected to Events, don't move.

**Reminder Center (First Page)**

The data are all calculated by a pure function `reminderQueue(state)` (`src/lib/reminderQueue.ts`), the date being written only by engine on node `latestStart` (day of reminder) and `clubDeadline` (Due) and not by itself. One = an uncompleted mission with a person in charge.

| Columns | Contents |
| --- | --- |
| **Needs your OK** | ♪ Today, after this day, there's no warning ♪ |
| **This week** | The day of the reminder comes tomorrow. 7Tasks within days: "Goes out Mon, Oct 26"  |
| **Sent** | _Other Organiser `state.nudges`；Automatically "to day" (see below); Simulated reminder of the silence agreement ( `protocolLog` "Follow-up-demo." |
| **Replies** | The task has been updated since it was sent. `response` Not empty, or mission `lastUpdate` Later than the day of dispatch: Showing what back (Done / Waiting on... /Need help / Need more time / Claimed) |
| **No reply yet** | 2 has not been updated for more than three days: button **follow up** (open editor); Compliance with existing ceilings `nudgeBlocked`）|

- The forecast is that the red task will be at the top of each column with a risk mark (no "Needs a Nudge" card).
- Deleting the front page: Events Progress Card, Semester Goals, Superstar of the week (target at Settings, star this week at Team).
- It's not the president, vice presenter who sees a read-only "Your missions": when their mission will be reminded and what kind of reminders have been received.

**Three reminders really follow a different process** (`org.settings.reminderMode`); The website is still there. **Do not send any live messages**）

| Modalities | It's the day of the reminder. |
| --- | --- |
| Send automatically | Needs your OK, direct to Sent **Would be sent... demo**. This one's extrapolated. No data. |
| I review, then I send | Needs your OK, button **Review & open drag** * Existing editor * Gmail/WhatsApp * "I sent this draft" * Sent |
| I review, Platypus sends | Needs your OK, button **Review** * Main button in the editor becomes **Approve Platypus sends (demo)**  →  Sent, code **Sent by Platypus . demo**; **Approve all (N)** on top |
| No choice (skip) | Press "I review, then I send", the line at the top of the column |

- Data: `Nudge` with optional field `via?: "president" | "platypus"`; `confirmNudgeSent` action plus optional parameter `via`. **No new action type** (the type of research record remains unchanged); In the Data Dictionary `confirmNudgeSent`I'll make it up to you. `via`Note.
- Settings  →  Tasks and events add the same three-by-one way (text is identical to onboarding).
- Word ceiling: change from **200 / 500** (former Today 160 / 450); Please confirm this report by Juanxi.
- Research: Study task card and runbook of Phase 3 refer to Today, "Needs a Nudge" with a new name; No change to record format.

**Test:** `reminderQueue` unit sets (categorization in four columns, three ways, no choice, maximum number of times, read-only perspective, date from node); Browsertes: Walk through each of the three ways, Approve all, Follow up, Navigator + More, `/tasks`, Plan Highlighting, mobile navigation, a11y, word count. The affected specs (`today`, `smoke`, `dx-09-rail`, `dx-20-mobile`, `word-budgets`, `a11y`, `p3h-reminder-mode`, etc.) have to run and follow up.

### 12.3 FB-9 3 days handoff bag

**Principle:** point "Hand over this rule" immediately available, without AI, without waiting for anyone. Existing interviews, manuals, confirmations, approvals, recapitulations, 7/30 read all reservations but received **Go deeper (optional)** and **no longer stuck handoff**.

**Unique files:** new file `src/lib/handoffPack.ts` (pure function), `src/engine/handoffDays.ts` (three-day date), `src/pages/Handoff.tsx`, `src/pages/HandoffNewOfficer.tsx`, `src/data/handoff.ts` (conditions only "can Finish"), `src/pages/Today.tsx` and `src/lib/reminderQueue.ts` (FB-8 merge) after which only handoff reminds that category), new style `src/styles/fb-09-handoff-pack.css`, associated tests.

1. **List** (`handoffPack(state, roleId)`, data from existing `roleDossier`, `handoffQuestions`):
   - **Day 1. What's on fire** (newly read, approximately 30 minutes): outstanding tasks and their Due; (b) The end date of the 30 days after taking over; This loge link (draft links in the task, Drive/ calendar links to the current event).
   - **Day 2 . Learn the rule**: maximum 5 experience (Lessons); Up to 3 contacts ("Meet"); A maximum of 3 questions to the predecessor (using the existing response mechanism, the former automatically ticks after answering).
   - **Day 3 . Take over**: **Accept all (N)**: take on all tasks transferred to him at the new time (take an existing title for each task and do not add a new action type); Then **Finnish rule handoff**.
2. Dates of three days: three working days from the start of the handoff, calculated by `src/engine/handoffDays.ts` using a calendar workday function and not an interface.
3. Check: Reuse existing `check` actions (`itemId` with `pack:` prefix), and do not add action types; The top displays " Handoff 60 %. Day 2 of 3 " . Who can read: New Check Day 1, Day 3 and Day 2; Questions answered by the predecessor; I'm sure you'll be able to do it.
4. For **Finnish rule handoff read** has designated a successor (or "Nobody yet"). The manual is no longer required to be drafted, validated and approved. The list can't be finished, but the button says "3 items not done yet".
5. **Reminder to handoff** (in addition to the FB-8 reminder centre, as a separate line): "Remind Maya to answer 2 questions"; "Remind Sam to answer 4 tasks"; The 3 day has passed yet button opens a written message (open the draft Gmail/WhatsApp with the existing `composeUrl`, not sent).
6. The progress on the relay card should be changed to a three-day list; Handoff risk (`handoffRisk`) is retained.
7. Words: Handoff has a cap on 120/ 120 (list in right column details).

**Tests:** `handoffPack` and `handoffDays` unit sets; Browsertes: Start handoff, immediately see the three-day list. 1An automatic ticking of a question from the predecessor  The original process in Go deeper can still be completed; Remind the center to appear with a handoff reminder. The `handoff-stage1–7` and `handoffReview` tests, which "must approve the manual before finish" are expected to be changed by the new rules and written article by article.

### Process adjustments for 12.4 FB-2 (replace 4.2)

1. `FOUNDER_STEPS` Amend to read as follows: `FLOW_VERSION` up to **`ob-5`** (Note: Remove Constitution, Googles); Invite will no longer receive the staff preview; Confirm has only one main button -- the latter two are completed by FB-3 and published at the same time.
2. **condition Non-discard:** Team tops a folding zone **Fill rolls from your constitution (option)**, which contains the existing Uses sample/ Upload a file / Paste text and "Use these subpositions" (repeal `Constitution.tsx` reading logic and `useReading`, without adding an AI interface).
3. **Mission Move to the Name Screen** (`validateClub` still required): One line input box, why: "Used in every framer: why the work matters."
4. Goals: dismissing the question and leaving the draft empty; The Goals editor for Settings remains unchanged.
5. Why there are only two screens left in the line named and Team; Welcome Page Why/ How/ What by 4.1.
6. Follow-up by browser tests (`ob-04`, `ob-05`, `ob-12`, `ob-11`, `research-*`, `p3a`, etc.) depending on the order of the old process.

### 12.5 FB-3 Supplement

Add the following line to the analogy of each option for Reminders screen: "What happens in Platypus?"
- Send automatically："On the send day it appears under Sent. You don't have to do anything."
- I review, then I send："On the send day it waits under Needs your OK. You open the draft and send it yourself."
- I review, Platypus sends："On the send day it waits under Needs your OK. One click approves it."

### 12.6 order of execution (up to 2 sub-agents at one time); Three or five parallels have hit the upper limit.

| Bodi | Phase |
| --- | --- |
| A | FB-1 (last), FB-6 (last) |
| B | FB-4、FB-2 |
| C | FB-8、FB-3 |
| D | FB-9、FB-5 |
| And finally... | FB-7 Integration |

Every wave of merges is integrated into the branch and send another wave. The next wave begins with the submission after the merge.
