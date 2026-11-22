# Test-feedback fixes: execution plan (2026-11-14)

> Background/options for each issue: [`../FEEDBACK_PLAN_2026-11-12.md`](../FEEDBACK_PLAN_2026-11-12.md). This is the **implementation specification** after Juanxi's choices on 2026-11-14.
> **2026-11-15 update:** Juanxi explicitly narrowed product/research to ①reminding club members to work, ②Organization succession (handoff). Section 11 reviews each stage against these and changes implementation order; Section 11 overrides conflicting earlier content.
> Integration branch `claude/fervent-thompson-e2j5u2` (do not touch `main`). Each stage is completed by a subagent in an independent worktree; Claude (main chat) handles merges, full regression, `docs/PROGRESS.md`, `AGENTS.md`.

## 0. Juanxi's decisions (2026-11-14)

| Issue | Decision | Stage |
| --- | --- | --- |
| Onboarding 1 Goals | B: SMART sentences | FB-2 |
| Onboarding 2 Organization | Advisor connected parallel to President with dashed line | FB-2 |
| Onboarding 3 Date engine | Update from uploaded schedule | FB-6 |
| Onboarding 4 Buffer / Why | Keep buffer; redesign around user interaction | FB-3 (buffer), FB-2 + FB-3 (Why per screen) |
| Onboarding 5 Reminders | A: example + three-step diagram + analogy | FB-3 |
| Onboarding 6 Final step | A: one primary button, remove member preview | FB-3 |
| Other 1 Deadlines | A: one Due in UI | FB-4 (display), FB-5 (task form) |
| Other 2 Create Event | A: + New event directly opens form | FB-5 |
| Other 3 AI | A + B: fix output allowance; extend time as much as possible; "stop thinking" button | FB-1 |
| Other 4 Not claimed | Retain for now | — |
| Other 5 Details | A: three sections | FB-4 |
| New | Choose a person when adding tasks | FB-5 |

## 1. Stages and parallel work

| Stage | Content | When | Ports (`PW_PORT` / `PW_STORAGE_PORT`) |
| --- | --- | --- | --- |
| FB-0 | Scaffolding (main chat): empty style files, `.ob-why`, schedule file, this plan | Complete | — |
| FB-1 | AI reliability: output allowance, time limit, Stop | First wave, parallel | 4201 / 4202 |
| FB-2 | Upper onboarding: Welcome, Name, Constitution, Goals, Team | First wave, parallel | 4211 / 4212 |
| FB-3 | Lower onboarding: First event, Reminders, Confirm, Invite | First wave, parallel | 4221 / 4222 |
| FB-4 | Three-section task details + one Due in UI | First wave, parallel | 4231 / 4232 |
| FB-6 | Date-engine calibration from schedule | First wave, parallel | 4261 / 4262 |
| FB-5 | + New event; task assignees; one task date | Second wave (after FB-1/FB-4 merge) | 4251 / 4252 |
| FB-7 | Integration (main chat): merges, full regression, docs | Last | 4173 / 4174 |

The first wave's five stages have nonoverlapping files (see each stage's "exclusive files"). FB-2 and FB-3 share `src/onboarding/copy.ts` but edit separate blocks (the existing rule in its header comment).

## 2. Rules shared by all stages

1. Read AGENTS.md section 3 (hard rules), section 7 (interface), 7.1 (motion), then your section in this file.
2. **Hard rules:** English interface; dates computed only by `src/engine/`, never AI/UI; no keys/research data/real messages; **no production-site or live-AI calls**, all tests mocked.
3. **Study records:** no new record types (ui.* unchanged), no existing data-testid or record-field meaning changes. Necessary changes go under "Juanxi confirmation needed" in delivery.
4. **Do not raise SCHEMA_VERSION.** New fields optional; old saves readable.
5. Edit only exclusive files; necessary cross-owner changes minimal/listed in report. **Do not edit** docs/PROGRESS.md, AGENTS.md, package.json, .github/**, netlify.toml.
6. Own `src/styles/fb-0N-*.css` already created/imported; tokens only, no !important, transition: all, bare milliseconds.
7. Behavior changes need tests in src/test/ and e2e/fb-0N-*.spec.ts or existing specs. **Never skip/delete/weaken tests to pass.** Update genuinely changed expectations and explain each in report.
8. Before delivery run in your worktree: npm run lint, npm run build, npm run typecheck:netlify, npm test, npm run words, and **affected** browser tests (`PW_CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome PW_PORT=… PW_STORAGE_PORT=… npx playwright test <specs> --workers=2 --trace off`). Four cores, five concurrent stages: no full browser suite except FB-6.
9. Small local commits, format `[FB-N][Claude] What changed`; **do not push**. No model names in commit messages.
10. Final delivery report: branch/final commit; changes; actual results for every command (passes/failures/names); omissions/reasons; Juanxi decisions; other owners' files touched.

---

## 3. FB-1 AI Reliability

**Why: ** Live diagnosis on 2026-11-12: `/api/nudge/draft` returned `output limit` within 4 seconds on both attempts. Our output allowance (120) was too small; generation was truncated and code treated truncation as failure, so the reminder AI sentence failed every time. Another failure is slow AIR (15–23 seconds) hitting our own 22-second limit.

**Exclusive files:** `netlify/lib/ai.mts`, `netlify/functions/*.mts` (AI APIs), new `netlify/functions/limit-probe.mts`, `netlify/functions/health.mts`, `src/lib/api.ts`, `src/lib/aiRetry.ts`, `src/lib/assistant.ts`, `src/components/rail/AskPanel.tsx`, `src/components/NudgeComposer.tsx`, new `src/components/AiWait.tsx`, `src/styles/fb-01-ai-wait.css`, `docs/AI_SETUP.md`, `docs/PHASE3_DATA_DICTIONARY.md` (add only one stopped row), `src/test/aiBudget.test.ts`/new tests, `e2e/fb-01-*.spec.ts`, `e2e/ai-fallback.spec.ts`.

### 3.1 Output allowance (option A)

1. In `callProvider`, AIR uses `maxTokens = max(caller value, AIR_MIN_OUTPUT_TOKENS)`, default **1024**, overridden by `AI_MIN_OUTPUT_TOKENS` (clamped 256–4096). Endpoint response-length validation remains (e.g. reminder sentence ≤10 words): allowance is the maximum usable, not requested length.
2. **One automatic retry after truncation** (Juanxi approved 2026-11-14; explicit exception to `AGENTS.md` Section 12 "no automatic repeated paid requests"): if `finish_reason` is `length`/`max_tokens` and `salvageTruncated` recovered nothing, retry at **twice allowance**, capped 4096; only with ≥5 seconds left. Maximum 2 requests per logical call, shared by format fallback and allowance retry.
3. `ai_usage` adds three fields (numbers/fixed words only): `maxTokens`, `reasoningTokens` (only when provider supplies `usage.completion_tokens_details.reasoning_tokens`), `retry` (`"output_limit"` or absent). Use to establish whether reasoning consumed allowance.
4. Tests (mock `fetch`, no real calls): ①first `length`, second success → doubled `max_tokens` in second request, successful result; ②both `length` → output-limit error; ③caller 120 → actual ≥1024; ④insufficient remaining time → no retry; ⑤logs include new fields, no prompts/answers.

### 3.2 Time limits (option B)

Fact: the repository records Netlify terminating at about 30 seconds (2026-11-07 live logs: 504 after 31.2 seconds); current Netlify docs say 60 seconds for synchronous functions. These disagree; do not assume 60 seconds without remeasurement.

1. Replace SYNC_AI_BUDGET_MS with syncAiBudgetMs(): read AI_SYNC_BUDGET_MS, clamp 10,000–55,000, **default 26,000** (below observed 30-second limit). All synchronous endpoints use it; replace hardcoded 21,000 in constitution.mts/workflow.mts with budget minus 1 second.
2. /api/health adds syncBudgetMs. Browser wait = value + 4 seconds (src/lib/api.ts reads once/caches, falls back to 30 seconds); synchronize aiRetry.ts timeout.
3. New GET /api/limit-probe?s=NN waits NN seconds (1–58) then returns `{ waited }`, no AI/storage. **Available only with AI_LIMIT_PROBE=on; otherwise 404.** After deployment, measure actual Netlify limit once and tune AI_SYNC_BUDGET_MS (e.g. 50,000 for a real 60-second limit). Document in docs/AI_SETUP.md.
4. Tests: environment clamping, health values, default probe 404.

### 3.3 Visible Waiting + Stop Button

1. New `AiWait`: spinner + "Thinking… 12 s" (updates each second; `aria-live` announces only at start, not every second) + **Stop**. After 10 seconds add "Complex questions can take up to N s." (N from health budget). Motion tokens only.
2. `callApi` supports `signal`; `assistant.ts` `respond()`/`reviewEvent()` accept/forward it.
3. **Ask panel:** show `AiWait` while busy; Stop (`data-testid="ask-stop"`) aborts immediately, re-enables input, provides local answer: chat → existing fallback, source "Platypus · stopped, quick answer from this browser"; form refine → retain form, source "Platypus · AI stopped, filled from your words"; event Plan check → rule-engine review.
4. **Reminder editor:** show `AiWait` during "Checking draft…", button **Skip AI line** immediately uses checked template/enables draft button.
5. Study logs: no new record type. Post-Stop `ui.answer` uses `answer: "stopped"` (new value within same type); explain under `ui.answer` in `docs/PHASE3_DATA_DICTIONARY.md`. Generic click log already records button click.
6. Page tests (`page.route` delays `/api/chat`, `/api/nudge/draft`): seconds advance; Stop shows local answer/enables input, late answer never appears; Skip AI line enables draft; Stop keyboard-accessible; a11y passes.

**Excluded from this stage: ** Stop buttons for constitution reading, handbook drafting, and First event's "Plan it" (they automatically get more time; make `AiWait` reusable for integration next round).

---

## 4. FB-2 First Half of Onboarding

**Exclusive files:** `src/onboarding/gate/Welcome.tsx`, `founder/Name.tsx`, `founder/Constitution.tsx` (add Why row only), `founder/Goals.tsx`, `founder/goals/*`, `founder/Team.tsx`, `founder/team/*`, welcome / `name` / `constitution` / `goals` / `team` blocks in `src/onboarding/copy.ts`, `src/components/setup/OrgChart.tsx`, `src/engine/orgChart.ts`, new `src/engine/goalDates.ts`, `src/data/types.ts` (`Goal` only), `src/data/settings.ts` (goal validation only), `src/components/SettingsForms.tsx` (`GoalsEditor` only), `src/pages/Today.tsx` (goal card only), `src/styles/fb-02-onboarding-a.css`, related tests (`src/test/onboardingTeam.test.ts`, goal/organization-chart tests, `e2e/ob-04-*`, `e2e/ob-05-*`, organization-chart portion of `e2e/ob-12-reload.spec.ts`).

### 4.1 One Why sentence per screen (Golden Circle)

- Directly below heading, `<p className="ob-why"><b>Why:</b> …</p>` (style already in `fb-00-shared.css`). Text in each `copy.ts` block's `why`:
  - Name: "Your club's name goes on every reminder and handoff note."
  - Constitution: "Your constitution says who does what. Platypus uses it to know who to remind and what each role hands over."
  - Goals: (4.2 deferred; no Why this round)
  - Team: "Every task needs one owner. Reminders go to a person, and a role is what gets handed over."
- Replace Welcome `welcomeBody` sentence with three lines (Why → How → What), each with small label:
  - **Why** "Clubs miss deadlines when nobody sees the whole chain, and everything resets at handoff."
  - **How** "Platypus watches every deadline and writes the reminder for you."
  - **What** "Set up your team, your first event and your reminders. About 5 minutes."
- Raise screen word limit 60→**90** (change only corresponding test assertions; requires Juanxi confirmation, record in report).

### 4.2 Goals: SMART Sentence (Option B) — **Deferred (2026-11-15, section 11); excluded this round**

1. Data: add optional `period?: "week" | "month" | "semester"` to `Goal`. Old goals without it display normally. `validateGoals` accepts only these three or omission.
2. Engine-provided deadline: new `src/engine/goalDates.ts`, pure `termEnd(today)`: final day of current semester; between semesters, final day of next semester; outside calendar, null (UI omits date, shows "this semester"). Source `TERMS` in `src/engine/calendar.ts`; no dates hardcoded elsewhere.
3. Suggestions: Events (`period: "week"`, target 1, unit `events`), Active members (`semester`, 40, `members`), External income (`semester`, 500, `USD`). IDs unchanged.
4. Each goal is one sentence using existing controls (toggle, name, number stepper, unit) plus **timeframe dropdown**:
   - semester: "By **May 8**, reach [500] [USD] in [External income] · [this semester ▾]"
   - week / month: "Every [week ▾], hold [1] [events] · until **May 8**"
   - Options `each week` / `each month` / `this semester`; dates only from `termEnd`.
5. Three markers **Specific · Measurable · Time-bound** light up for nonempty name / target ≥1 / selected period respectively (otherwise gray with screen-reader text). Subtitle "A good goal says what, how much, and by when." Preserve meaning of "Goals are optional. Progress starts at zero." in Skip help.
6. `rowsFrom` / `goalsFrom` retain `period`, including refresh. Skip, Back, required mission unchanged.
7. Same dropdown in Settings `GoalsEditor`. Today goal cards append small "per week" / "per month" / "this semester" (omit without `period`); `npm run words` confirms Today ≤160 / 450.
8. Tests: `termEnd` boundaries (within/between/outside semesters); row/goal conversion retains `period`; old goals validate without it; page changes sentence/markers with dropdown, persists refresh, no mobile horizontal scroll.

### 4.3 Team: dashed parallel connection from Advisor to President

Fact: code already supports advisors (`RoleFunction` includes `advisor`; `orgChart.ts` draws a dashed line from an advisor without a manager to the president), but there is no entry point, and the advisor box sits at the far right of the chart, far from the president.

1. Team adds **Add advisor** beside Add role: create "Advisor" ("Advisor 2" if duplicate), `fn: "advisor"`, `reportsToId: null`, template duties. Disable at role limit.
2. Advisor row replaces Reports to dropdown with **Advises the president**; no indentation, last in list; deletable, assignable, duties editable. Renaming it to a non-advisor reverts to an ordinary role under existing rules.
3. Chart: advisor box **same level as President, immediately right** (multiple extend right; use left if insufficient room), **horizontal dashed** connection, outside reporting chain with no solid downward edge. Include advisors in width; preserve mobile opening centered on president.
4. Legend: "Solid line: reports to · Dashed line: advises". Screen-reader list: "Advisor, advises the president".
5. Constitution-derived advisors (isAdvisor) use same presentation.
6. Tests: orgChart units for advisor row/column, dashed edge, multiple advisors, missing president without crash; browser Add advisor adds list row/dashed box, survives refresh, passes Continue validation.

---

## 5. FB-3 Lower onboarding

**Exclusive files:** `src/onboarding/founder/FirstEvent.tsx`, `founder/firstEvent/*`, `founder/ReminderMode.tsx`, `founder/Confirm.tsx`, `founder/confirm/*`, `founder/Invite.tsx`, `founder/invite/*`, `src/onboarding/copy.ts` blocks `firstEvent`/`reminders`/`confirm`/`invite`, `src/onboarding/record.ts` (`FLOW_VERSION`), `src/styles/fb-03-onboarding-b.css`, `docs/PHASE3_DATA_DICTIONARY.md` (flow-version sections), `docs/PHASE3_SESSION_RUNBOOK.md`, related tests (`src/test/onboardingFirstEvent.test.ts`, `onboardingReminderMode.test.ts`, `onboardingInvite.test.ts`, `e2e/ob-06-*`, `ob-09-*`, `ob-10-*`, `ob-11-*`, `p3h-reminder-mode.spec.ts`, and every spec clicking "See what your officers will see" or "Keep current demo"). **Do not change** `src/engine/**`.

### 5.1 Why Lines

- First event: "Your event becomes the tasks Platypus reminds people about."
- Reminders: "So you never have to chase people yourself."
- Same format as 4.1. Word limits: First event 110, Reminders 140, Confirm/Invite remain 60.

### 5.2 Buffer: retain it, but make its effect visible

Problem: selecting 1/2/3/5/7 does not change dates on the chain above, so nobody knows what it does.

1. Replace the control with three named choices (same values, still `draft.buffer`): **Tight · 1 day** / **Standard · 3 days** (Recommended) / **Safe · 5 days**. Draft values 2 or 7 appear as a fourth selected "Custom · N days". Settings' five values remain unchanged.
2. Change "Club buffer" to "How early should your club finish?"; explanation: "Your club finishes this many working days before each ASU deadline."
3. Show effects using **this event's real steps** below (same `previewFor(..., buffer)`, hence rule engine, no separate calculation): list up to 3 steps with ASU deadlines, one per line: step name · `ASU deadline Apr 2` · `Your club finishes Mar 30`. On choice changes, **label each changed-date row "moved earlier" / "moved later"** (screen-reader-accessible text, not color alone).
4. Dynamic sentence: "If something slips by up to N working days, you still meet the ASU deadline." If no row is affected by the current choice: "Your plan already finishes earlier than this, so nothing moves." (truthful, no pretend effect).
5. If this event has no ASU-deadline steps, use existing generic `bufferExample`.
6. Tests: three choices/Custom display; changed dates come from engine and match the chain; "nothing moves" branch; refresh persistence; mobile layout.

### 5.3 Reminders: Example + Three-Step Diagram + Analogy (Option A)

**Unchanged for research comparability:** three option titles/order, no preselection, selection required for Continue, Skip for now, each radio's `data-testid`, stored values, and "Demo: no email is ever sent." at the bottom.

1. **Example reminder card** at top (aria-label="Example reminder"), using tester's own content:
   - Recipient: first named non-president officer's first name in draft; otherwise "your officer".
   - Step/event/date: first incomplete preview step owned by that officer, or any officer if absent; dates from engine only.
   - Copy: "Hi Sam — Book Room & Layout for Welcome Mixer. Due Mar 30. Reply: Done · Waiting on… · Need help."
   - If First event skipped, undated fallback: "Hi Sam — your next task is ready. Reply: Done · Waiting on… · Need help."
2. Beneath each option heading, **three-step diagram** (small blocks/arrows, text/CSS only) and **analogy**:
   - Send automatically: `Platypus writes` → `Platypus sends` · "Like a calendar alert."
   - I review, then I send: `Platypus writes` → `You check` → `You send` · "Like a draft waiting in your outbox."
   - I review, Platypus sends: `Platypus writes` → `You approve` → `Platypus sends` · "Like approving a scheduled post."
   - Retain original sentence as screen-reader description (aria-describedby).
3. Tests: draft name/engine date, skipped-event fallback, all diagrams/analogies; all existing p3h-reminder-mode assertions (order, no preselection, exported values) continue passing.

### 5.4 Confirm and Invite: one primary button, remove member preview (A)

1. **Confirm:** Primary label **Create my club**(same behavior as Start workspace). Remove "Keep current demo" button. Only if a club already exists (`replaces` true), show **Cancel and keep the current club** text link under replacement warning (same as old Keep: record `keep-demo` and exit). Retain Back.
2. **Invite:** Primary **Open my workspace**(record complete, end attempt as `completed`, go Today). Remove "See what your officers will see" and handler. Retain copy link, WhatsApp, Email, officer list. Replace lone ⓘ with small text line.
3. **Do not remove** 6-screen member preview: routes and Demo's "Test Onboarding Page Invite" remain (no logging).
4. Increment `FLOW_VERSION` to **`ob-5`**; comment: ob-5 = founder flow ends at Invite, no member preview afterward; Confirm has one primary button. Update `docs/PHASE3_DATA_DICTIONARY.md`, `docs/PHASE3_SESSION_RUNBOOK.md`. `setupChoice` values unchanged.
5. Tests: one full attempt ends at Invite with `outcome: "completed"`; Cancel absent initially, present on replay; Demo member preview still completable; specs using old buttons move to new path.

---

## 6. FB-4 Three task-detail sections + one Due date in the UI

**Exclusive files:** `src/components/TaskDetail.tsx`, `TaskActions.tsx`, `EventDetail.tsx`, `NodePanel.tsx` (delete), `src/pages/Events.tsx` (**List table/explanatory copy only**), `src/pages/Tasks.tsx` (**Due-column wording only**, not NewTask/board), `src/lib/nudges.ts` (date wording in messages only), `src/styles/fb-04-task-detail.css`, related tests. **Do not edit** `src/engine/**`, `src/components/rail/AskPanel.tsx`, `TaskFields.tsx` (task-form dates change in FB-5).

### 6.1 One Due (option A)

Principle: **engine still calculates three dates** (needed to assess missed school hard deadlines); UI uses club deadline as the sole "Due".

1. Date fields in all lists/cards/details are called **Due**, showing club deadline.
2. Official deadline appears only ①collapsed "Why this date": "ASU needs this by Apr 2. Your club finishes 3 working days earlier." (omit without ASU rule); ②risk notices: engine red/yellow `issues` unchanged near top of details.
3. "Start by" no longer a parallel date: "Reminder goes out Mar 26." inside "Why this date" (others' tasks retain generic explanation protecting personal buffer).
4. Events List columns Step / Owner / Status / **Due** (remove Start/ASU); ASU-risk rows retain red color/hover reasons.
5. Reminder `buildNudge` When becomes "Due Mar 30. Best started by Mar 26.", no "ASU …"; subject unchanged; five-section `nudgeCheck` unchanged. Server `nudge-draft.mts` uses same function, no separate edit.
6. Nowhere shows parallel "ASU deadline", "Club deadline", "Due date" labels (except prose in "Why this date"). Remove unused `officialLabel`.

### 6.2 Three detail sections (option A)

Top to bottom:

1. **Header:** small event name · title · status pill · owner avatar/name · **Due Mar 30** (red when overdue). Non-owner authorized to remind sees secondary **Remind Sam**, preserving Remind behavior/disabled reasons.
2. **Your next step:** exactly **one primary button**: Not claimed → **I've got it**; otherwise **Mark done**. Small secondary row: Waiting on… · Need help · Need more time, unchanged forms. Budget-controlled steps disable Mark done with "Complete this step in Event Budget." and **Open Event Budget**. Unauthorized viewers retain explanation. Follow with **Where to submit** links/"Open current draft".
3. **Notices only when present:** engine issues, Waiting on, pending extension request.
4. **Collapsed details** (`<details>`), default closed:
   - **Why this date** (6.1) plus step's why.
   - **People:** owner, approver, Consulted, Informed, read-only.
   - **Edit**, president/VP only: name, owner dropdown, Due (writes clubDeadlineOverride, "Use recommended (date)"), tags. Remove "can be changed in the task table".
   - **Sources:** source/rule links.
5. Move "Copy All Event Details" from task details to EventDetail.tsx.
6. Delete unused src/components/NodePanel.tsx; editable fields moved into Edit.
7. Preserve existing data-testid values (task-detail, etc.) and focus (heading on open, Esc closes).
8. Tests: primary/Edit for owner/president/other officer; budget steps; owner/Due edits take effect and undo via updateNode; ASU-rule explanation present only where applicable; Events List exactly four columns; new reminder wording passes nudgeCheck; a11y. Run/follow affected tasks, events, dx-13-details, dx-19-swap, wp5, today, a11y, word-budgets specs.

---

## 7. FB-6 calibrate date engine to timetable

**Input:** [`event-workflow-calibrated-2027-04-16.tsv`](event-workflow-calibrated-2027-04-16.tsv) (uploaded by Juanxi, 32 steps, event date 2027-04-16: 60 people, outside catering, USG funding).

**Exclusive files: ** `src/engine/schedule.ts`, `src/engine/playbooks.ts`, `src/data/types.ts` (only new optional fields on `StepTemplate`/`Node`), `src/data/seed.ts`, `src/data/sampleScenario.ts`, `src/engine/workflow.ts` (if needed), engine tests, `docs/RULES.md` (if needed), new `docs/feedback-fix/CALIBRATION_REPORT.md`, and page tests needing updates for changed sample dates.

### 7.1 Reading This Table (main chat's interpretation of Juanxi's "update from my file")

Each step has two dates in the file; both become integer day offsets from event day:

- **Proposed start** = step window opens (e.g., Event Plan T−65, Moderator T−60, Budget Approval T−30, Full Check T−14).
- **Proposed deadline** = step club deadline ("Relative timing" column, e.g., T−60, T−25, T−1).
- **Effort days** = effort, not window length (Moderator window 35 days, effort 10 days).
- **Depends on** = completion order. Linked step windows overlap (five Plan/Prepare steps all T−65→T−60), so it cannot mean “next starts only after previous completes”; only “next finishes no earlier than previous.”

### 7.2 Engine changes

1. Add optional `timing?: { startDays: number; dueDays: number; unit?: "calendar" | "business" }` to `StepTemplate`/`Node` (positive before event, negative after; default `calendar`). Steps with it are “calibrated.” Retain `anchor`: `rule` still provides ASU official deadline; `target` label remains explanatory.
2. **Calibrated dates:**
   - Club deadline = `min(official deadline − club buffer, event date − dueDays)`; weekends/holidays use previous working day (post-event steps use next)—existing `targetDate` rule.
   - Latest start = event date − `startDays`; on owner's nonworking days (weekends, holidays, finals, intersemester breaks, personal busy weeks), use earlier working day. Personal buffer counts **only the excess over default 1 day** (default matches file; 3-day personal buffer moves another 2 working days earlier). Explain accurately in `explain.latestStart`.
   - No longer pushed earlier by downstream starts (backward pass skips calibrated steps).
   - Manual deadline (`clubDeadlineOverride`): use chosen deadline; start = `min(calibrated start, new deadline − estDays working days)`.
3. **Dependencies between calibrated steps = completion order:** only if unfinished upstream deadline is **later than** this deadline, defer this step to upstream deadline (same day allowed), retaining "Moved later…". If either step is uncalibrated, existing rule applies (start no earlier than next working day after predecessor completion).
4. **Wrap-up:** calibrated wrap-up steps with `dueDays`0 can start/end on event day (Headcount); other wrap-up steps remain no earlier than first post-event working day.
5. Steps/manual tasks without `timing`: entirely unchanged (existing engine tests independent of standard template must pass unchanged).
6. `buildEventNodes` copies template `timing` to nodes. Standard steps without `timing` in **saved custom club workflows** (`org.eventWorkflow`): when creating a new event, supplement `timing`/`estDays` by `key` from standard template (not club-added steps). **Existing events unchanged automatically** (nodes lack `timing`, preserving dates).

### 7.3 Template Updates (EVENT_STEPS)

Update 32 steps using the file's three input columns:

| key | startDays | dueDays | estDays | Depends on |
| --- | ---: | ---: | ---: | --- |
| plan | 65 | 60 | 5 | — |
| backup | 65 | 60 | 5 | plan |
| venuechoice | 65 | 60 | 5 | backup |
| registry | 65 | 60 | 5 | venuechoice (retain R01 official T−14) |
| venue | 65 | 60 | 5 | registry |
| moderator | 60 | 25 | 10 | venue |
| materials | 60 | 15 | 5 | moderator |
| finalcheck | 14 | 1 | 5 | materials, orderPlaced (remove reminder; retain conditional-step dependencies) |
| checkin | 5 | 0 | 1 | finalcheck |
| budget | 60 | 55 | 3 | plan (file note: Needs Event Plan as prerequisite) |
| foodCompliance | 60 | 55 | 3 | budget (retain R06 official deadline) |
| quotes | 60 | 50 | 10 | foodCompliance |
| budgetRequest | 60 | 49 | 1 | quotes (retain existing foodCompliance dependency) |
| budgetApproval | 30 | 18 | 1 | budgetRequest |
| purchaseRequest | 30 | 18 | 1 | budgetApproval (retain R09 official deadline) |
| purchaseApproval | 30 | 10 | 1 | purchaseRequest |
| orderPlaced | 30 | 10 | 2 | purchaseApproval |
| marketingNeeds | 60 | 58 | 2 | — |
| contentCreation | 58 | 48 | 10 | marketingNeeds |
| promotionItems | 48 | 38 | 10 | contentCreation |
| content | 17 | 10 | 7 | promotionItems (retain conditional rsvp dependency) |
| reminder | 4 | 3 | 1 | content |
| headcount | 0 | 0 | 1 | checkin |
| thankyou | 0 | −1 | 1 | headcount |
| feedback | 0 | −1 | 1 | — (file says Event Day: anytime after event) |
| postmarketing | 0 | −1 | 1 | — (Event Day) |
| photoBackup | 0 | −7 | 1 | — (Event Day) |
| invoice | 0 | −7 | 1 | headcount |
| attendance | 0 | −7 | 1 | — (Event Day) |
| spending | 0 | 5 working days after event | 1 | attendance |
| financeRecord | 0 | 7 working days after event | 1 | spending |
| documentation | 0 | 14 days after event | 1 | feedback |

Explanation:

- **Do not copy the file's final three offsets, "129 / 132 / 129 days after the event."** These are old-engine output (4/16 event, wrap-up pushed past finals/summer into August); those rows were never updated. Copying them would delay every event's reimbursement by over four months. Preserve original intent instead (5 / 7 business days and 14 days after the event). **Juanxi must confirm**; record in report.
- Conditional steps absent from the file (speaker, advisor, access, security, alcohol, drone, rsvp, etc.): **do not add `timing`**; existing neighboring-step rules still compute dates. Report their actual sample-event dates for later calibration by Juanxi.
- Preserve every step `key` (existing events, workflow editing, policy references depend on them).

### 7.4 Comparison report and guard tests

1. New unit test reads committed TSV and runs engine for the same event (2027-04-16, 60 people, external catering, USG funding, defaults), comparing every start/deadline. **Only allowed differences, which must be listed:** weekends/holidays shifted to working days; last three rows (above). Any other mismatch fails.
2. `docs/feedback-fix/CALIBRATION_REPORT.md`: table (step / file start / engine start / file deadline / engine deadline / reason), plus conditional-step dates, existing-data impact, unresolved issues. Generate table from engine output via test/script; no handwritten dates.

### 7.5 Sample data and regression

Template changes alter all sample-organization dates (`seed.ts`/`sampleScenario.ts` generate through `buildEventNodes`). Requirements:

1. Sample club must still tell the same coherent story: on demo day 2026-10-22, Today has 3 "Needs a nudge, "completed steps, and red/yellow statuses, rather than everything overdue. Adjust seed step statuses, completion dates, owners if needed; **do not change demo day or event dates for appearances**(unless no alternative, then explain in report).
2. Update `e2e/demo-contract.ts` and tests depending on dates/risk ordering; list each changed expectation and rationale in report.
3. This stage may run the **full** page suite once (`--workers=2`) because engine impact is broadest; compare failures with unchanged baseline before conclusions (preexisting flakes in `PROGRESS.md`: `workflow-setup:123`, `dx-18:34`, `ob-08`, `ob-12:208`, `production-security:14`, `organization-setup:1381`).
4. `npm run words`: seed changes may alter page counts; resolve overruns.

---

## 8. FB-5 creation entry points (second wave)

**Exclusive files:** src/pages/Events.tsx (header), src/pages/Today.tsx (Events card header), src/pages/Tasks.tsx (NewTask/board creation), src/components/rail/RailContext.tsx, AskPanel.tsx (receive open-form action), TaskFields.tsx, src/lib/assistant.ts (export blank-form cards), src/data/board.ts, src/data/store.tsx (create-task action), src/styles/fb-05-create.css, related tests.

### 8.1 + New event (option A)

1. Add primary **+ New event** to Events header and the same button in its no-events empty state. It opens the rail's Ask tab directly with the existing event form (same as "Plan …", empty fields, no AI call), focusing its first field.
2. Add small **+ New event** beside "Open" in Today's Events-card header (same behavior).
3. Use existing `canCreateEvent`; without permission, disable and visibly explain "Only the president or VP can create events." (reflect actual permissions if Settings opens access).
4. No AI input on the page (interface rule 1); subsequent Plan check behavior unchanged.
5. Tests: president clicks → form → fill/create → event in Events; unauthorized role sees disabled/reason; mobile fullscreen rail opens/closes; word limits (Events 180/420, Today 160/450).

### 8.2 Assigning people during task creation

1. Tasks header **+ New task** opens a small form: **Task name**, **Assign to**, **Due**.
   - Assign to defaults "Me"; any current officer selectable; president/VP also gets "Anyone (open)" (ownerless, claimable by anyone). Use existing `officers()` list; exclude predecessors/successors.
   - Due defaults "today + Settings' day count" (`defaultTaskDue`, engine-supplied), editable; only one date.
2. Retain M2b rules (2026-10-27): self tasks immediately To do; **others' tasks Not claimed until "I've got it"**, with a notification; "Anyone" is ownerless Not claimed. Reuse `createTasks` where possible.
3. Explain destination after creation, e.g. "Sent to Sam. It stays in Not claimed until Sam accepts."
4. Per-column quick "+ Add task" remains name-only (fast path); owner editable later through Details Edit (FB-4).
5. Successors/predecessors in View as still cannot create tasks (existing read-only rule).

### 8.3 One date during task creation (finish 2.1 A)

1. Ask task form/new form above: remove "Club deadline N working days earlier" checkbox, keep only **Due**. Created task club deadline = selected date, without another official date. Always pass `buffered` false to `createTasks` (retain parameter for old-record readability).
2. Keep default days in Settings → "Tasks and events". Club buffer applies only to event steps with ASU deadlines; update Settings explanation accurately.
3. Tests: one date in both forms; assign others → their view Not claimed/can claim; self → To do; Anyone → unassigned; read-only role cannot create.

---

## 9. FB-7 Integration (main session)

1. Merge FB-1, FB-2, FB-3, FB-4, FB-6 into integration in that order with merge commits (no squash, allowing per-stage rollback), running lint + types + unit tests after each; then dispatch/merge FB-5.
2. Full `npm run check` (page tests separately, compare intermittent failures against baseline).
3. Docs: `docs/PROGRESS.md` (changes, acceptance steps, unverified items, Juanxi confirmations); `AGENTS.md` (6d flow version/buttons, Section 6 details panel/`NodePanel` removal, Section 12 retry exceptions, engine `timing`); mechanism 1 in `docs/PRODUCT_PLAN.md` (one Due in UI, three dates in engine).
4. Push integration branch. **No `main` merge or PR unless Juanxi says so.**

## 10. Defaults chosen by the main chat for Juanxi (change if you disagree)

1. **Schedule interpretation** (7.1): use file start/deadline dates; serial steps require completion order only; shift weekends/holidays to business days; do not copy 129 days for the last three steps.
2. **Why per screen:** Juanxi's item-4 answer was "retain and update with interaction logic," without choosing a separate Why option; original feedback ("explain why more, use the Golden Circle") led to one Why sentence per screen plus Welcome Why/How/What.
3. **Word limits:** onboarding screens 60→90 (First event 110, Reminders 140).
4. **AI duration:** default 26 seconds until Netlify's real limit is measured; afterward extend via one environment variable without code edits.
5. **Flow version `ob-5`:** onboarding changes increment the research-record version. If formal Phase 3 collection is underway, Juanxi decides main-merge timing.
6. **Advisor:** offer Add advisor rather than a default row (a default changes every new club's initial data and related tests).

## 11. Focus review (2026-11-15)

Juanxi: The site and research focus on only **① reminding club members to work; ② Organization succession**. Everything else is secondary. Review each item below against those two goals.

| Item | Goal served | Decision |
| --- | --- | --- |
| FB-1 reminder AI sentence always fails (output allowance) | ① Direct | Do first |
| FB-1 timeout, Stop / Skip AI line | ① Direct for reminder editor; Ask supports | Do |
| FB-6 schedule calibration | ① Direct: reminder/deadline dates; ② indirect: dossier deadlines for 30 days after takeover | Do first |
| FB-4 one Due date | ① Direct: one date in reminder/task | Do first |
| FB-4 three detail sections | ① Direct: reminder recipient lands here, one primary status action | Do |
| FB-5 choose person during task creation | ① Direct: no owner means nobody to remind | Do |
| FB-5 + New event | ① Supporting: events generate reminders | Do |
| FB-3 Reminders examples, three-step diagrams, analogies | ① Direct | Do |
| FB-3 one primary final-step button | Supporting: fewer detours to the two cores | Do |
| FB-3 buffer redesign | ① Indirect reminder timing parameter; calibrated templates rarely move dates | Do only the minimal 5.2 version, no additions |
| FB-2 / FB-3 per-screen Why | Supporting: every sentence now addresses whom to remind or what to hand over | Do |
| FB-2 dashed Advisor–President line | ② Weak: advisor alone stays through leadership transitions | Do (small change) |
| FB-2 SMART Goals sentence | **Neither**: manually entered numbers generate neither reminders nor handoff data | **Defer**, pending Juanxi; recommend removing Goals from onboarding |

**More significant finding:** these 11 feedback items address the periphery; this round touches none of the gaps in the two core features themselves:

- **Core ①** Sending a reminder takes 5 clicks, leaving site and returning to confirm; onboarding reminder mode has no effect; nowhere shows "this week's reminders and who has not replied."
- **Core ②** Handoff has 8 stages, each waits on people, taking weeks rather than "24 hours to 3 days."

Add two stages after FB-1…FB-7 (**start only when Juanxi says to proceed**, because they change home/navigation and affect Phase 3 task cards):

| Stage | Contents |
| --- | --- |
| FB-8 Reminder Center + compact navigation | Home becomes Reminder Center (This week/Needs your OK/Sent/Replies/No reply yet); onboarding modes drive different flows (automatic demo shows "Would be sent · demo", sends nothing); navigation only Reminders, Plan, Handoff, Rules, remainder in More |
| FB-9 Three-day handoff package | "Hand over this role" instantly generates Day1/Day2/Day3 checklist from role dossier, without AI/waiting; interviews/handbook become later deepening; reminders prompt predecessor/newcomer |

### New execution order (at most 3 concurrent subagents, avoiding another usage-limit collision)

1. First wave: FB-1, FB-6, FB-4.
2. Second wave: FB-3, FB-2 (excluding 4.2 Goals), FB-5.
3. FB-7 integration.
4. FB-8, FB-9: await Juanxi's decision.

## 12. Final scope (2026-11-15, focused plan agreed by Juanxi)—this section prevails over conflicts above

Juanxi approved five points: ① home is reminder center; ② navigation narrows to Reminders, Plan, Handoff, Rules; Team/Partners under More (code retained); ③ Handoff becomes three-day handoff pack; ④ Onboarding only Name → Team → First event → Reminders → Create; Goals moves to Settings; ⑤ stop polishing goal rings, weekly stars, forecast percentages, board renaming/recoloring, meeting times, budget details, Partners board.

### 12.1 Scope changes by stage

| Stage | Change |
| --- | --- |
| FB-1 | Unchanged |
| FB-6 | Unchanged |
| FB-4 | Unchanged |
| FB-2 | **Changed:**4.2 Goals SMART **cancelled** (Goals outside onboarding; Settings Goals editor unchanged). Added flow changes (12.4). No `Today.tsx` edits. |
| FB-3 | **Changed:** no `FLOW_VERSION` edits (FB-2 owns it). Add “what happens in Reminder Center” below 5.3 three-step graphic (12.5). |
| FB-5 | **Changed:**8.1 item 2 (button on Today Events card) cancelled; home no longer has Events card. |
| FB-8 | **New:** Reminder Center/navigation (12.2) |
| FB-9 | **New:** three-day handoff package (12.3) |

### 12.2 FB-8 Reminder Center + Navigation

**Exclusive files:** `src/routes.ts`, `src/components/chrome/SideNav.tsx`, `src/components/Layout.tsx` (navigation only), `src/pages/Today.tsx` (rewrite as Reminder Center), new `src/lib/reminderQueue.ts`, `src/components/NudgeComposer.tsx` (after FB-1 merge), `src/lib/nudges.ts` (add functions only, retain FB-4 wording), `src/data/types.ts` (optional `Nudge` fields only), `src/data/store.tsx` (`confirmNudgeSent` only), `src/pages/Settings.tsx` (reminder mode only), `src/pages/Events.tsx`/`src/pages/Tasks.tsx` (Events | Tasks header switch only), `scripts/word-count.mjs` (home row only), `docs/PHASE3_SESSION_RUNBOOK.md`, `docs/PHASE3_DATA_DICTIONARY.md`, new `src/styles/fb-08-reminders.css`, related tests.

**Navigation**

1. Main left navigation: **Reminders** (`/`), **Plan** (`/events`, also highlighted on `/tasks`), **Handoff**, **Rules**. Below, collapsible **More**: Team, Partners (collapsed by default; auto-expands when current page is inside). Settings/Help at bottom unchanged. Update mobile navigation (DX-20) too.
2. Move Tasks' unfinished count to Plan.
3. Same **Events | Tasks** switch on left of `/events` and `/tasks` headers (links, not new pages).
4. Each page's "one question": Reminders = "Who needs a reminder, and who hasn't answered?"; Plan = "What has to happen, and who owns it?".
5. Funding already redirects to Events; no change.

**Reminder center (homepage)**

All data comes from pure `reminderQueue(state)` (`src/lib/reminderQueue.ts`), using only engine-written node `latestStart` (reminder day) and `clubDeadline` (Due), without calculating dates itself. One item = one unfinished task with an owner.

| Section | Content |
| --- | --- |
| **Needs your OK** | Reminder date ≤ today, with no reminder sent since that date; only under either review-first mode |
| **This week** | Reminder dates from tomorrow through 7 days ahead: "Goes out Mon, Oct 26" |
| **Sent** | Sent state.nudges; automatic reminders due today (below); silence-protocol simulated reminders (reminder in protocolLog), labeled "Follow-up · demo" |
| **Replies** | Updated after sending (nonempty reminder response, or task lastUpdate later than send date); show Done / Waiting on… / Need help / Need more time / Claimed |
| **No reply yet** | No update at least 2 days after sending: **Follow up** opens composer, obeying existing nudgeBlocked limit |

- Red-forecast tasks sort first in each column, with risk markers (no separate Needs a nudge card).
- Remove from home: Events progress cards, Semester goals, Superstar of the week (goals in Settings, star in Team).
- Non-president/VP viewers get read-only "Your reminders": when their own tasks will be reminded, and past reminders received.

**Three reminder modes follow genuinely different flows** (`org.settings.reminderMode`; website still **sends no real messages**)

| Mode | On reminder day |
| --- | --- |
| Send automatically | Skip Needs your OK; appear directly in Sent as **Would be sent · demo**. Derived, no write |
| I review, then I send | Needs your OK → **Review & open draft** → existing editor → Gmail/WhatsApp draft → "I sent this reminder" → Sent |
| I review, Platypus sends | Needs your OK → **Review** → editor primary action **Approve · Platypus sends (demo)** → Sent as **Sent by Platypus · demo**; **Approve all (N)** at column top |
| Unselected (skipped) | Use "I review, then I send"; column-top "Choose how reminders go out" links to Settings |

- Data: optional `via?: "president" | "platypus"` on `Nudge`, optional `via` on `confirmNudgeSent`. **No new action type** (study record kinds unchanged); explain `via` for `confirmNudgeSent` in data dictionary.
- Add same three reminder choices to Settings → Tasks and events (same copy as onboarding).
- Homepage word limit **200 / 500** (previous Today 160 / 450; record for Juanxi's confirmation).
- Research: rename Today/"Needs a nudge" references in Phase 3 Study task cards/runbook; logging format unchanged.

**Tests: ** `reminderQueue` units (four-column classification, three modes, unselected mode, frequency limits, read-only view, node-derived dates); browser tests: each mode, Approve all, Follow up, four navigation items + More, Plan highlighted on `/tasks`, mobile navigation, a11y, word counts. Run/update affected existing specs (`today`, `smoke`, `dx-09-rail`, `dx-20-mobile`, `word-budgets`, `a11y`, `p3h-reminder-mode`, etc.).

### 12.3 FB-9 Three-Day Handoff Package

**Principle:** immediately usable after "Hand over this role", without AI or waiting for anyone. Existing interviews, handbook, confirmation, approval, teach-back, day7/30 reviews all retained under **Go deeper (optional)**, **no longer blocking handoff**.

**Exclusive files:** New `src/lib/handoffPack.ts` (pure functions), new `src/engine/handoffDays.ts` (three-day dates), `src/pages/Handoff.tsx`, `src/pages/HandoffNewOfficer.tsx`, `src/data/handoff.ts` (Finish eligibility only), `src/pages/Today.tsx` and `src/lib/reminderQueue.ts` (after FB-8 integration, add handoff-reminder type only), new `src/styles/fb-09-handoff-pack.css`, related tests.

1. **Checklist** (`handoffPack(state, roleId)`, existing `roleDossier`/`handoffQuestions` data):
   - **Day 1 · What's on fire** (new officer reads, about 30 minutes): unfinished tasks/Due dates; deadlines within 30 days after takeover; role links (task draft links, club Drive/calendar).
   - **Day 2 · Learn the role:** at most 5 Lessons, 3 contacts ("Meet"), 3 gap questions for predecessor (existing answer mechanism, automatically checked when answered).
   - **Day 3 · Take over:** **Accept all (N)** claims every transferred task through existing per-task claiming, with no new action type; then **Finish role handoff**.
2. Three dates are the three business days starting on handoff-start day, calculated by `src/engine/handoffDays.ts` using calendar business-day functions, never by UI.
3. Checks reuse existing `check` (`itemId` prefix `pack:`), no new action type; top "Handoff 60% · Day 2 of 3". Newcomer checks Day 1 and Day 3 and Day-2 reading; predecessor answers; president may check everything.
4. **New Finish role handoff condition:** successor selected (or "Nobody yet"). No draft/confirmed/approved handbook requirement. Incomplete checklist still permits Finish, with "3 items not done yet" beside it.
5. **Reminders drive handoff**, separate rows in FB-8 reminder center: unanswered predecessor questions → "Remind Maya to answer 2 handoff questions"; unaccepted newcomer tasks → "Remind Sam to accept 4 tasks"; unfinished after Day 3 → remind president. Buttons open prepared Gmail/WhatsApp drafts via existing `composeUrl`, without sending.
6. Relay-card progress uses the three-day checklist; retain `handoffRisk`.
7. Handoff page budget remains 120 / 120 (checklist in right-rail details).

**Tests:** `handoffPack`/`handoffDays` units; browser flow: start handoff → immediately see three-day checklist → select successor → newcomer checks Day 1 → predecessor answer auto-checks → Accept all → Finish, without drafting a handbook. Original Go deeper flow still completes; reminder center shows handoff reminders. Update and itemize in the report every `handoff-stage1–7`/`handoffReview` expectation that previously required handbook approval before Finish.

### 12.4 FB-2 Flow Adjustment (Replaces 4.2)

1. `FOUNDER_STEPS`: Name → Team → First event → Reminders → Confirm → Invite (remove Constitution/Goals). Raise `FLOW_VERSION` to **`ob-5`**; comment explains removed screens, no member preview after Invite, one primary Confirm button (last two completed by FB-3 in the same release).
2. **Keep constitution:** Team-top collapsible **Fill roles from your constitution (optional)** contains existing Use sample / Upload a file / Paste text / Use these suggestions (reuse `Constitution.tsx`/`useReading`, no new AI endpoint).
3. **Move Mission to Name** (`validateClub` still requires it): one-line input, Why: "Used in every reminder: why the work matters."
4. Stop asking Goals in onboarding; draft goals empty; Settings editor unchanged.
5. Why remains only on Name/Team; Welcome Why / How / What follows 4.1.
6. Update tests depending on old order (`ob-04`, `ob-05`, `ob-12`, `ob-11`, `research-*`, `p3a`, etc.).

### 12.5 FB-3 supplement

Under each option's analogy on Reminders, add a “what happens in Platypus” line:
- Send automatically: "On the send day it appears under Sent. You don't have to do anything."
- I review, then I send: "On the send day it waits under Needs your OK. You open the draft and send it yourself."
- I review, Platypus sends: "On the send day it waits under Needs your OK. One click approves it."

### 12.6 Execution order (at most 2 subagents at once; previous parallel runs of 3 and 5 both hit usage limits)

| Wave | Stages |
| --- | --- |
| A | FB-1 (continue previous), FB-6 (continue previous) |
| B | FB-4, FB-2 |
| C | FB-8, FB-3 |
| D | FB-9, FB-5 |
| Final | FB-7 integration |

Merge each wave into integration before assigning the next; the next wave starts from that merged commit.
