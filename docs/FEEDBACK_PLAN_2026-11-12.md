# Proposed fixes for testing feedback (2026-11-12, awaiting Juanxi's choices)

> Status: **Proposal only; no code has changed.** Implement after Juanxi chooses an option for each item.
> Basis: issues raised after Juanxi asked other club presidents to test; code at `main` = `ee7e825`; 2 minimal AI diagnostics on the production website on 2026-11-12; Juanxi's uploaded schedule file `event-workflow-calibrated-2027-04-16-3.tsv` (not added to the repository).
> Each issue has 2–3 options; **★ = my recommendation**. Effort estimates are rough, not commitments.

## 0. Three findings first

### 0.1 The main cause of AI failures is not Netlify timeouts

On 2026-11-12, I made two calls with entirely fictional data to the production website's smallest AI endpoint (the "Why it matters" sentence in reminders):

| Attempt | Result | Time |
| --- | --- | --- |
| 1 | Failed: `AIR stopped before finishing the response (output limit)` | 4.1 seconds |
| 2 | Same failure | 4.0 seconds |

Failure after 4 seconds is far below any time limit. The cause is **our AI output allowance is too small**: this endpoint permits only 120 tokens, cutting the model off before it finishes; our code treats truncation as failure. The likeliest explanation is that the model "thinks" first and uses up the allowance (`AGENTS.md` Section 12, v3.1, already records that Muse still reasons even when asked not to). I have no direct evidence of that explanation; the fix should log "tokens used for reasoning" to confirm it.

**Consequence: the AI sentence in reminders currently fails every time**, so reminders always display "Checked template · AI unavailable". This is one of our selling points.

There are therefore two classes of AI failure to fix separately:

1. **Output allowance too small** (consistent failure within seconds): `nudge-draft` 120, `ask` 300, `handbook-draft` 400, `chat` 400–600, `policy-answer` 500.
2. **AIR itself is slow** (intermittent): chat requests take 15–23 seconds, while our own limit is 22 seconds (`SYNC_AI_BUDGET_MS`), after which we abandon the request.

For Netlify's time limit, the repository says "cut off at about 30 seconds" (production logs on 2026-11-07: 504 after 31.2 seconds). Netlify's current documentation says **60 seconds** for synchronous functions ([Functions configuration](https://docs.netlify.com/build/functions/configuration/)). These conflict; measure again during implementation. If it really is 60 seconds, our 22-second limit can increase.

### 0.2 Reminder choices currently have no effect

The three reminder modes selected in onboarding are merely saved (`org.settings.reminderMode`) and **change no behavior**; the website sends no messages anywhere (IRB: no reminders sent during testing). The actual flow is Today → click Remind → select channel → open Gmail/WhatsApp draft → send it yourself → return and click "I sent this reminder". Thus "automatic reminders," a selling point, are currently the least developed part of the product.

### 0.3 Five points in the uploaded schedule need confirmation first

See Section 1.3.

---

## 1. Onboarding

### 1.1 Goals lack clear timeframes; use SMART

**Current state:** `src/onboarding/founder/goals/suggestions.ts` offers three suggestions: Weekly events (per week), Active members (members), External income (USD). A goal contains only a name, target amount, current amount, and unit: **no timeframe and no deadline**. The screen title is just "Set goals for your club".

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| A Copy only | Include time in each goal's name and unit: `External income this semester (USD)`, `Events per week`, `Active members by semester end`; add "Goals are for this semester (ends May 8)." under the title (date supplied by the calendar engine) | Half a day; no data changes | Still not SMART, merely unambiguous |
| ★ B SMART sentences | Show each goal as a sentence: **"By [May 8] reach [$500] in [external income] ([this semester ▾])"**. Timeframe dropdown: per week / per month / this semester; engine fills the deadline from semester end. Three small checkmarks under each row: Specific · Measurable · Time-bound, gray when missing. Top copy: "A good goal says what, how much, and by when." | Testers immediately understand what they are setting; Today's goal ring can later say "$120 of $500 · 6 weeks left" | About 1.5 days; add optional `period` to `Goal` (old saves unaffected, no schema-version bump); flow version must increase to `ob-5` |
| C AI-assisted writing | President types freely ("get more sponsorship"); AI rewrites it as SMART and asks for missing details | Least mental effort | Depends on currently unreliable AI; dates must still come from the engine; defer |

### 1.2 Organization structure: missing Advisor and unclear reporting hierarchy

**Current state:** code actually supports Advisor (`RoleFunction` includes `advisor`; the org chart draws it beside the president with a dashed line), but it is absent from a new club's 5 initial roles. "Add role" only adds "New role"; users must rename it Advisor to make it an advisor, which nobody will discover. Team is a table (Role / Person / Reports to dropdown), with a read-only org chart **below** it.

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| A Add Advisor | Add a default **Advisor** row (may be vacant; show "Advises the club" instead of a Reports to dropdown); add "Add advisor"; move the org chart **above** the table | Half a day; solves "no advisor" | Hierarchy still understood through dropdowns |
| B Outline table | Build on A: group table rows by hierarchy with connecting lines; each row has "← →" to promote/demote a role one level (like a Word outline); clicking a row highlights its box in the chart | About 1 day; works well on mobile and keyboard | Still requires comparing two representations |
| ★ C Edit directly on the chart | Build on A: editable org chart; click a box to edit role/person; "+" below adds a subordinate; dragging a box onto another changes its manager (mobile/keyboard use "Move under…"). Collapse the table into an "Edit as list" alternative | Immediately understandable; direct editing | About 2–3 days; can reuse board dragging code (`src/lib/dragSort.ts`) |

Recommend A first (same-day completion), with C later.

### 1.3 Date-engine update (your uploaded schedule)

I have read the whole file: its 32 steps map one-to-one to the current template. Changes concern **estimated days** (many increase from 1 to 5 or 10), **timing relative to event day**, and some **dependencies**. Five confirmations are needed before implementation:

1. **Sequential steps share the same start and deadline.** Event Plan → Back-up Plan → Candidate Venue → Event Registry → Book Room each wait for the previous step, yet all five say "start 2/10, due 2/15, 5 days each." The current engine (next step starts only after the previous finishes) cannot produce this. Do you mean ①these five can run concurrently (remove their waits), or ②they should be staggered?
2. **"Event Day" is not a step.** Feedback, Post Marketing, Photo Backup, and Attendance Submit say they wait for "Event Day." I interpret this as "can start after event day"; is that correct?
3. **Paid Reimbursed, Finance Record, and Documentation fall 129–132 days after the event (August).** With the event on 4/16, the engine treats summer as "students not working," pushing these to fall semester. Is that intended, or should they finish before semester end?
4. **"Effort days" now resembles "window length," not "days of work."** Quote Gather's 10 days are really waiting for quotes. This is the same issue as Section 3; decide them together.
5. **Budget note "Needs Event Plan as prerequisite"**: should we add a "Budget waits for Event Plan" dependency?

Implementation options:

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ A Update standard template | Update each step's timing, days, and dependencies in `src/engine/playbooks.ts` from the file; add tests; update `docs/RULES.md` | All new events use the new timing | About 1 day; existing events do not change automatically (whether to offer "Recalculate with the new template" is a separate discussion) |
| B Data-file template | Build on A: put the schedule in a repository table file and add import/export scripts | Future updates require editing a table instead of code | About 1 additional day |
| C SEO only | Save only as SEO's own workflow (`org.eventWorkflow`); leave standard template unchanged | No effect on other clubs | Other testers still see old timing |

### 1.4 Nobody understands buffer days; the flow never explains why

**Current state:** every screen has only a title and at most one subtitle (60-word limit per screen). The Buffer control is on First event, described as "Your club finishes this many working days before each official deadline." Another known issue (`AGENTS.md` 6d): **changing buffer does not change dates in the progress chain above**, so it really appears useless.

**The buffer itself:**

| Option | Action |
| --- | --- |
| ★ A Remove from onboarding | Default to 3 days; do not ask during onboarding; keep it in Settings with a small explanatory timeline |
| B Keep it, tell a story | Replace 1/2/3/5/7 with Tight (1) / Standard (3) / Safe (5); show a small timeline: `ASU deadline Apr 2 → your club finishes Mar 30 → Sam is reminded Mar 26`, plus "If a quote comes back two days late, you still make it." |

**The whole flow's Why (Golden Circle: Why → How → What):**

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ A One Why sentence per screen | Fixed "Why:" line under each title using consistent phrasing. Examples: Constitution — "Your constitution already says who does what. Reading it saves you typing."; Goals — "So Platypus knows which events matter most."; Team — "Every task needs one owner. Reminders go to a person, not to 'the club'."; First event — "See every ASU deadline before it bites."; Reminders — "So you never have to chase people yourself." | About half a day; each screen answers "why fill this in?" | Raise screen word limit from 60 to about 80 (requires your approval) |
| ★ B Add opening "why Platypus exists" screen | A 15-second screen after welcome, with three lines: **Why** "Clubs miss deadlines because nobody sees the whole chain, and everything resets at handoff." → **How** "Platypus watches every deadline and writes the reminder for you." → **What** "Four things to set up: your team, your first event, how reminders go out. About 5 minutes." Change progress labels to outcomes too: "Who owns what" instead of "Team" | Explain the whole purpose before asking for input | About half a day; one additional screen |
| C Live results while filling | A preview to the right of each screen shows what Platypus will do with the input (entering the Treasurer's name immediately shows "Maya gets the budget steps") | Most intuitive; "show, don't tell" | About 3–4 days |

A and B can be combined (about 1 day total).

### 1.5 Reminder screen has no examples

**Current state:** `src/onboarding/founder/ReminderMode.tsx`: three radio options, one sentence each, no examples or pictures.

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ A Example + three-step diagram + analogy | First show **a realistic reminder** at the top (using the event and officer names the tester just entered, with engine dates): *"Hi Sam — Book the room for Welcome Mixer. Start by Mar 26, due Mar 30. Reply: Done · Waiting · Need help."* Below each option, show a three-step mini-diagram and everyday analogy: **Send automatically** — Platypus writes → Platypus sends ("Like a calendar alert."); **I review, then I send** — Platypus writes → you check → you send ("Like a draft waiting in your outbox."); **I review, Platypus sends** — Platypus writes → you approve → Platypus sends ("Like approving a scheduled post.") | Understandable to non-engineering students; preserves all three options and their order, keeping study data comparable | About 1 day; word limit must increase |
| B Two simple questions | Question 1: "Do you want to check each reminder first?" Yes / No; question 2 (only after Yes): "Who presses send?" Me / Platypus | Plain language in each question | Changes study-question wording; before/after data are not directly comparable; check against IRB |
| C Try it | Build on A with "Try it": select an option to play a brief simulation (phone receiving a message, what the president sees) | Clearest | About 1.5 additional days |

Note: footer "Demo: no email is ever sent." must remain throughout Phase 3.

### 1.6 Final-step buttons are confusing

**Current state:** Confirm has **Start workspace**, **Keep current demo**, and Back; Invite's primary button is **See what your officers will see** (followed by 6 member-preview screens), with Go to Today secondary.

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ A One primary button, remove preview from this path | Confirm keeps one primary **Create my club**; remove "Keep current demo" (Exit already exists at the top; only when a club previously exists show small text "Cancel and keep the current club"). Invite's primary becomes **Open my workspace**; remove "See what your officers will see". Keep member preview in the Demo menu ("Test Onboarding Page Invite" already exists) | President enters immediately after setup; 6 fewer screens | About half a day; flow version increases to `ob-5`; study records no longer include member preview |
| B Merge into one screen | Combine Confirm and Invite: one summary sentence + **Create my club**; after click, the same screen becomes "Your club is ready" with invitation link and **Open my workspace** | 8 screens become 7 | About 1 day |
| C Demote preview | Keep preview as a small text link below the primary button: "Preview the officer invitation (optional)" | Smallest change | May still distract |

---

## 2. Other modules

### 2.1 Club deadline and Due date coexist

**Current state:** every step has three dates: Start by, Club deadline, ASU deadline. For manual tasks, the third is "Due date"; enabling buffer makes Club deadline several days earlier, so **the same task shows two "deadlines"** (`officialLabel` in `src/engine/taskDates.ts`).

I agree with your idea (remove ASU's date and use only the club's), with one requirement: **the engine must still compute the official deadline internally**, because it determines whether the school's hard limit will be missed. Only the interface changes.

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ A One Due in the interface | Everywhere, show one date **Due** (= club deadline). ASU's date is no longer a parallel field; it appears only ①when opening "Why this date": "ASU needs this by Apr 2. Your club finishes 3 working days earlier."; ②as a red risk warning. Remove manual tasks' "club deadline N working days earlier" checkbox, leaving one date. Rename "Start by" to "Reminder goes out Mar 26" (it already is the reminder trigger date) | One task, one deadline | About 1–1.5 days; change product-plan wording "Mechanism 1: three deadlines" (record the decision) |
| B Keep two, explain relationship | Rename to **Due (club)** and **ASU cut-off (hard limit)** with a small timeline; show the second only for steps with an actual ASU rule (7 of 32) | Preserves information | Still two dates |
| C By role | Officers see only Due; president and VP can see ASU cut-off in Details | Simplest for officers | Different people see different things; explain during demos |

### 2.2 Events has no Create Event button

**Current state:** `src/pages/Events.tsx` has no creation entry point; empty copy says "Ask Platypus to plan one." Users must type "Plan …" into Ask in the right rail. Tasks has "+ New task".

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ A Button opens form directly | Add primary **+ New event** to the Events header (and Today's Events card); clicking opens the existing event form in the right rail, without typing first. Unauthorized users see a disabled button and "Only the president or VP can create events." | About half a day to 1 day; reuses existing form; follows interface rule "Ask is the only AI entry" | None |
| B Button opens one-sentence dialog | Small dialog: "Describe your event in one sentence" + three examples (as in onboarding) → Plan it → form | Preserves the "create an event in one sentence" highlight | Still depends on AI parsing |
| C Both | Button dropdown: Fill in a form / Describe it to Platypus; add an Ask suggestion "Plan an event" | Serves both user types | One extra choice |

### 2.3 AI fails every time

See 0.1 for causes.

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ A Fix output allowances | Raise all short-task output allowances enough that "thinking" cannot consume them (for example, at least 800–1000); when truncated because of the allowance, **automatically retry once with a larger allowance**; log "tokens used for reasoning"; add a test that deliberately small allowance produces failure | About half a day; directly fixes the consistent-failure class; restores the reminder's AI sentence | Automatic retry costs another AIR call (`AGENTS.md` Section 12 says "do not automatically repeat paid requests," so your approval is needed) |
| ★ B Increase time limit + show waiting | Remeasure Netlify's actual limit (documentation says 60 seconds); if confirmed, raise our 22-second limit to about 45 seconds and browser waiting accordingly; display "Thinking… 12 s"; extend "show form first, let AI fill it afterward" to all AI entries | About 1 day; fixes intermittent timeouts | Up to 45 seconds of waiting, so progress feedback is required |
| C Background tasks + polling | Move long tasks (constitution reading, handbook drafting) to background functions (Netlify limit 15 minutes), with the page polling every few seconds. Existing repository example: `org-ai-run-background.mts` | Removes the time-limit problem entirely | About 2–3 days; requires enabling currently disabled server storage (`ORG_SETUP_ENABLED`), your decision |
| D Change model or provider | Faster model for short tasks | — | Phase 3 must use ASU AIR; not recommended now |

Recommend A + B together; consider C if they still fail.

### 2.4 What does "Not claimed" mean?

**Current state (from code):** this single status combines two entirely different situations:

1. **Assigned to someone who has not clicked "I've got it".** Only that person may claim it. Occurs when transferring tasks to a successor, when the president assigns someone, or when moving a role's work.
2. **No owner; anyone can take it.** Occurs when a role is vacant or the president posts a "who can do this?" task.

This column in "My tasks" = assigned to me + unowned; "Team tasks" = all unclaimed club tasks, including those assigned to others that you cannot claim (only "Only Sam can claim this task." appears). Cards do not distinguish the cases. This causes testers' confusion.

Also, when creating events, steps for occupied roles start as To do (no claim needed); only vacant roles produce Not claimed.

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ A Distinguish with copy | Keep data unchanged. Rename the "My tasks" column **Waiting for you** (assigned to me, awaiting acceptance), retain "I've got it", add "Accept all (5)"; place unowned tasks in a separate **Open · anyone can take** group. Label each "Team tasks" card "Waiting for Sam" or "Open to anyone" | About 1 day; clear logic; no schema-version bump | Column names differ across views; update Settings → Board explanations |
| B Fewer claims | Build on A: transferred handoff tasks are accepted together when the successor takes over | Far fewer clicks | Changes Handoff stage 2 rule you approved (D-2a) |
| C Two statuses | Add Open (unowned) and Offered (assigned to someone) | Cleanest | 6 statuses become 7; schema-version bump, board-color changes, and `AGENTS.md` 7.6 changes; not recommended |

### 2.5 Details is cluttered

**Current state (`src/components/TaskDetail.tsx`):** top to bottom: status, title, why, owner, three dates, waits, draft links, Where to submit, Open Event Budget, Copy All Event Details, Remind, sources, extension notice, **then finally primary actions** (I've got it / Done / Waiting on… / Need help / Need more time), followed by Edit. Up to 6 same-size buttons precede the primary action; doing and managing the task are mixed together; owner and dates cannot be edited here (requires the table). `src/components/NodePanel.tsx` is also an unused old details panel.

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ A Three sections | ①**Header:** title, status, owner, Due. ②**Your next step:** one primary button (I've got it or Mark done), remaining status buttons in a small row; "Where to submit" links immediately below (the actual work). ③**Collapsed sections:** Why & dates / People / Edit (president edits name, owner, dates, tags here) / Sources. Show Remind only to non-owners; move Copy All Event Details to the event's own details | About 1.5 days; reorganization, no new features | Update affected page tests |
| B By person | Owner gets "Do" view (instructions, submission, status reply); president gets "Manage" (owner/date edits, reminders, risk) | Everyone sees only what they need | About 2–3 days; different views during demos |
| C Full-page task | Desktop tasks open a full page, with the right rail only a preview | More space | Large change; not recommended now |

Also delete unused `NodePanel.tsx` (or move its editing fields into A's Edit section).

---

## 3. Is a task "one day" or "15 minutes"?

**Current state:** every step has `estDays` ("working days of work"), minimum 1. Manual tasks always use 1 day. The engine computes "latest start" = deadline − estimated days − personal buffer. Thus a 15-minute email is scheduled to "start 2 working days early," and the reminder says "~1 workday".

The underlying issue: **two different things share one number.**

- **Workload**: actual time spent (15 minutes / half a day / several days).
- **Lead time**: days needed in advance because of waiting for others (quotes take 10 days, but only 1 hour of your work). The 10 days in your uploaded schedule are lead time.

Reminders need only **lead time** (which day to send); workload affects only reminder wording and Team's workload display. Neither needs minute-level precision.

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ A Separate them, neither requiring exact numbers | **Size**: Quick (under half an hour) / Half day / Multi-day; reuse light / medium / heavy, no new field. **Lead time**: "Start N days before due", the existing `estDays` with a new UI label. Engine unchanged (still days, as reminders are daily). Replace "~1 workday" with Size-based wording such as "about 15 minutes" | About 1 day; no schema-version bump; matches your schedule | Add Size to every template step (can combine with 1.3) |
| B Add minutes | Optional "estimated minutes" field (15/30/60/120/240/480); Quick tasks have 0 lead time (same-day reminder) | More precise | Another input; students already estimate time poorly |
| C Copy only | Rename "Effort (working days)" to "Start this many days before due"; remove "~1 workday" from reminders | Half a day | Does not fix 15-minute tasks being reminded 2 days early |

**"Someone posts a very long task":** recommend a rule: **one task = one owner + one deliverable + completable within one week.** Anything larger is not a task:

| Option | Action |
| --- | --- |
| ★ A Short title + notes | Limit titles to 80 characters; longer content goes in new "Notes" (tasks currently have only why, no notes field) |
| B Suggest splitting | Build on A: if title contains "and / then" or exceeds one line, Ask suggests "This looks like 3 tasks. Split it?" into multiple tasks with individual owners (rule-based, no AI) |
| C Checklist | Checklists inside tasks |

---

## 4. Focus: two core functions, everything else steps aside

### 4.1 Current features grouped around two core functions

| Category | Features |
| --- | --- |
| **Core 1: spot risk → automatic reminders** | Rule-engine dates, event workflows (task source), Today's "Needs a nudge", reminder editor, silence protocol (days 3/5/7/8/10), claiming, one-click status replies, notifications |
| **Core 2: handoff within 24 hours to 3 days** | Handoff, automatically compiled role dossier, handbook, role contacts, Rules (for newcomers) |
| **Supporting** | Events, Tasks, Ask, Settings |
| **Peripheral (weak connection to either core)** | Team (workload, star of the week, meeting times), Partners board and organizations, Funding and budget details, goal rings, forecast percentages, board names/colors/tags, Tasks timeline, Deeper review, old `/phase1` pages |

**Biggest finding: Core 1 is currently the least developed.** Reminders take 5 clicks, leaving the website, and returning to confirm; the AI sentence always fails; onboarding choices do nothing; nowhere shows "which reminders go out this week." Peripheral features, meanwhile, are very detailed.

### 4.2 Simplifying navigation and the homepage

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ F1 Reminders first, rest under More | Left navigation drops from 9 items to 4: **Today** (risks + reminder queue), **Plan** (Events and Tasks), **Handoff**, **Rules**; Team, Partners, Funding move under "More" (code retained). Today becomes a **reminder center**: Going out this week (engine-scheduled by latest start) / Needs your OK / Sent / Replies; one "Review and send all (3)" button. Onboarding's reminder mode actually applies (demo automatic sends show "Would be sent · demo") | Product purpose is immediately clear; selling point on homepage | About 4–6 days; page moves affect Phase 3 task cards and existing page tests |
| F2 Keep pages, add focused homepage | All pages stay; Today starts with two large **Reminders** and **Handoff** cards, with the rest collapsed under "Tools" | Lowest Phase 3 risk | Same feature count, merely reordered |
| F3 Cut directly | Remove Partners, Team, Funding from product | Most focused | Thesis tradeoff table lists them as required; Handoff dossier needs contacts; not recommended |

### 4.3 Actual "automatic sending"

No messages are sent now for two reasons: IRB (no reminders during testing), and no accounts/server (data lives only in the browser). Two steps:

1. **Possible now (demo):** reminder center + three genuinely different mode flows + restored AI sentence. It looks and works automatically, with no actual final send.
2. **v1.5 (real):** login, server persistence, scheduled job checks reminders every morning, email service sends them. Already scheduled for December in the product plan; do separately outside the IRB study, and you must choose the email service.

### 4.4 Core 2: achieving handoff within 24 hours to 3 days

**Current state:** Handoff has 8 stages (interview, AI handbook draft, outgoing officer confirmation, president approval, successor assignment, newcomer reading and teach-back, shadow task, day 7/30 review). Comprehensive, but each step waits on people, taking weeks overall. The most valuable piece **requiring no waiting on anyone** is the role dossier (`src/lib/roleDossier.ts`): it automatically compiles unfinished tasks, deadlines within 30 days, contacts, and lessons from everyday records.

| Option | Action | Benefits | Cost |
| --- | --- | --- | --- |
| ★ S1 Three-day handoff pack | Clicking "Hand over this role" **immediately** produces a three-day checklist from the dossier (no AI, no wait): **Day 1 (30 minutes)** urgent matters: unfinished tasks/deadlines, next 30 days' deadlines, accounts/links to obtain; **Day 2** read 5 lessons, meet 3 contacts, ask predecessor 3 system-selected gap questions; **Day 3** "Accept all" tasks, then reminders switch to successor. Header: "Handoff 60% · 1 day left". Existing interview, handbook, teach-back become later enrichment instead of blocking handoff. **Reminders drive the handoff itself**: prompt predecessor to answer and newcomer to complete today's checklist; the two core functions reinforce each other | Take over on day one; reuses dossier code | About 4–5 days; changes current mandatory Handoff steps |
| S2 Continuous handoff | No separate "handoff": after every task, a 10-second "Anything the next person should know?" keeps dossier current; personnel change = name change + three-day reading list | Almost no transition work | One extra question per task; takes time to accumulate content |
| S3 Fast track | Retain 8 stages; add "Fast track (3 days)" skipping confirmation, approval, teach-back | Smallest change | Two coexisting flows, more complexity |

---

## 5. Suggested implementation order

| Stage | Content | Rough estimate |
| --- | --- | --- |
| 0 Immediate improvements | 2.3 A (AI output allowance), 2.2 A (+ New event), 1.6 A (final buttons), 1.1 A or B (Goals), 1.2 A (Advisor) | 2–3 days |
| 1 Explain clearly | 1.4 (Why and buffer), 1.5 A (Reminders examples), 2.1 A (one Due), 2.4 A (Not claimed), 2.5 A (Details) | 5–6 days |
| 2 Timing | 1.3 (schedule; answer 5 questions first), Section 3 (Size and Lead time), 2.3 B (time limit) | 3–4 days |
| 3 Focus | 4.2 (navigation and reminder center) | 4–6 days |
| 4 Handoff | 4.4 S1 (three-day handoff pack) | 4–5 days |
| 5 Real sending | 4.3 step 2 (login, storage, scheduled sending) | Plan separately |

Each stage has its own branch and preview for you; proceed to the next only after you say "yes".

## 6. Questions Juanxi must answer first

1. **What is Phase 3's current status?** The roadmap freezes code during the 11/16–12/4 evaluation. Are the "other club presidents'" tests formal Phase 3 data or preliminary trials? If formal collection has begun or is imminent, changing onboarding (flow `ob-4` → `ob-5`) and navigation makes the two cohorts' data incomparable. You must decide what changes now and what waits until collection ends.
2. **The 5 confirmations in 1.3.**
3. **Changes to approved rules requiring your approval:** screen word limits (1.4, 1.5); three deadlines reduced to one in the UI (2.1); one automatic retry after AI truncation (2.3 A); reminder-question wording (1.5 if B); navigation changes (4.2).
4. **Whether to enable server storage** (required by 2.3 C and 4.3 step 2).
5. **Channels and timing for real sending** (4.3).
