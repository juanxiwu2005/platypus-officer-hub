# Platypus focus strategy: only two things (2026-11-15)

> Overview for Juanxi. Technical details and per-stage acceptance criteria: [`PLAN.md`](PLAN.md) (Section 12 defines final scope).
> **Phase 3 testing is ongoing**: all these changes stay on `claude/fervent-thompson-e2j5u2`, **off production**, until you approve merging.

## 1. In one sentence

**Platypus does only two things: remind the right people for the president at the right time, and hand a role to its successor within three days during leadership transitions.**
Keep other features only as data sources for those goals; otherwise tuck them away and stop polishing them.

## 2. Three questions for every change

1. Does it get **one reminder** to the right person earlier, more accurately, with less effort?
2. Does it hand **one role** to its successor faster and more completely?
3. If neither: is it an **essential data source** for those goals (who owns work, when it is due, what a role has done)?

If all three answers are no, do not do it. Future suggestions will identify which goal they serve.

## 3. Goal one: remind organization members to work

### Current problems

| Problem | Fact |
| --- | --- |
| Sending one reminder takes too much effort |5 clicks: Today → Remind → choose channel → open draft/leave site → return and press "I sent this" |
| The AI sentence fails every time | Both live attempts failed within 4 seconds; reminders always show "AI unavailable" |
| Reminder-mode choice does nothing | Three onboarding choices are saved without changing behavior |
| No overview | Nowhere shows this week's reminders, replies, and nonresponders |
| Confusing dates | Three dates per task (Start by, Club deadline, ASU deadline) |
| Link recipients cannot find the action | Main detail action follows 6 buttons |

### A president's day afterward (target experience)

> Open Platypus Monday morning: homepage is the reminder center.
> **Needs your OK** has 3 prepared reminders; "Approve all" finishes in 10 seconds.
> **Replies**: Maya says "Done", Sam says "Waiting on the caterer".
> **No reply yet**: Jordan silent for two days; press "Follow up".
> **This week** shows what will go out Wednesday/Friday.
> The president need not chase anyone.

### Work

| Stage | Content | Solves |
| --- | --- | --- |
| FB-1 | Fix AI sentence; show elapsed seconds and Stop / Skip | Reminder content |
| FB-6 | Calibrate date engine to your schedule | Send dates and due dates |
| FB-4 | One Due and one primary task-detail button | Recipient view and reply |
| FB-8 | **Homepage becomes reminder center**; three modes have distinct flows; 4 navigation items | Reminder operation itself |
| FB-5 | Select owner during task creation; + New event | Every task has someone to remind |
| FB-3 | Onboarding Reminders examples, three-step diagram, analogy | President understands on first encounter |

Three modes afterward (all **simulate sending**; IRB requirements unchanged):

| Mode | On reminder day |
| --- | --- |
| Send automatically | Appears directly in Sent, "Would be sent · demo"; no presidential action |
| I review, then I send | Needs your OK; president opens/sends draft |
| I review, Platypus sends | Needs your OK; president approves once, with "Approve all" available |

### Success criteria

- Approving one reminder drops from 5 clicks to **1**; approving many takes 1.
- AI sentence success rises from 0 to succeeding most times (template fallback remains).
- Homepage immediately answers “who needs reminding?” and “who has not replied?”
- One date per task.

## 4. Goal two: Organization succession (three-day handoff)

### Current problems

| Problem | Fact |
| --- | --- |
| Too slow |8 stages: interview → AI handbook draft → predecessor confirmation → presidential approval → successor designation → teach-back → shadowing → day 7/30 review. Each waits for people, taking weeks |
| Blocked by handbook | Cannot finish without drafting/approving it |
| Most useful material buried | Role dossier (unfinished tasks, next 30-day deadlines, contacts, lessons) is automatic with no waiting, but only a collapsed detail section |

### Three days afterward (target experience)

> President selects "Hand over this role"; **checklist appears immediately**, no AI or waiting.
> **Day 1 (about 30 minutes) · What's on fire: ** successor sees unfinished tasks/Due, next 30-day deadlines, necessary links.
> **Day 2 · Learn the role: ** read 5 predecessor lessons, meet 3 contacts; system asks predecessor about 3 record gaps, automatically checking answers off.
> **Day 3 · Take over: ** successor chooses "Accept all" tasks, president selects Finish. Reminders now go to the successor.
> Header always shows "Handoff 60% · Day 2 of 3".

### Work

| Stage | Content |
| --- | --- |
| FB-9 | Three-day package: checklist, progress, Accept all; successor designation alone enables finishing |
| FB-9 | Retain interviews, handbook, teach-back, reviews under "Go deeper (optional)" |
| FB-9 | Reminder-center handoff notices: predecessor questions, successor task acceptance, president if unfinished on day 3 |
| FB-2 | Onboarding Team: each role is a future handoff unit; Advisor (only person unchanged across terms) connects to President by dashed line |

### Success criteria

- "Hand over this role" to successor's first checklist: **0 waiting**.
- No handbook writing required to complete handoff.
- Finish within three business days; unfinished items trigger reminders to someone.

## 5. Goals reinforce each other

- **Routine reminder records become handoff content.** Every reminder, reply, extension enters the role dossier; no separate writing at transition.
- **Reminders drive handoff.** Unanswered predecessor questions/unaccepted successor tasks appear in the center.
- **Finished handoff automatically redirects reminders.** Tasks follow roles rather than people.

## 6. Other features

| Treatment | Features | Reason |
| --- | --- | --- |
| **Main navigation** | Reminders (homepage), Plan (Events/Tasks), Handoff, Rules | Two goals plus data sources and rules for newcomers |
| **More, retained** | Team, Partners | Partners contacts feed dossiers; Team is not core |
| **Remove from onboarding** | Goals (keep in Settings), separate Constitution screen (optional within Team) | Neither creates reminders nor enters handoff |
| **Stop polishing** | Goal rings, weekly stars, forecast percentages, board renaming/colors, meeting times, budget details, Partners board | All three questions answer no |
| **Cancel** | SMART Goal sentences | Same reason |

Onboarding changes from 8 screens to **Name → Team → First event → Reminders → Create** (plus an invitation-link screen). One Why sentence below each heading links to “whom to remind” or “what to hand off.”

## 7. While Phase 3 testing continues

1. **All changes stay on the branch, without merging `main`.** Production remains as participants currently see it, keeping before/after data comparable.
2. After Phase 3 data collection (or your chosen time), release together; before release I will also update task cards/test-day page names (Today → Reminders, etc.).
3. **One candidate for a separate release now: ** AI output allowance fix (first part of FB-1). Server-only, no page/flow/log-format changes; currently the reminder AI sentence fails every time.
   - Benefit: later participants get working AI.
   - Cost: participant AI experience differs before/after and needs disclosure in the thesis.
   - Keeping it unreleased is acceptable: accurately report “reminder AI sentence unavailable during testing; templates used.”
   - **You decide; I will not release it myself.**

## 8. Execution order

At most two subagents at once (more hit usage limits); merge each wave before starting the next.

| Wave | Stages | Status |
| --- | --- | --- |
| A | FB-1 AI fixes · FB-6 date engine | In progress |
| B | FB-4 Details/one Due · FB-2 simpler onboarding | Await A |
| C | FB-8 reminder center/navigation · FB-3 Reminders/final screen | Await B |
| D | FB-9 three-day handoff · FB-5 creation entries | Await C |
| Final | FB-7 integration, full regression, docs | Await D |

After each wave I will report changes, passing tests, and unverified items. After all work, provide a preview URL/acceptance steps (preview requires a PR; I will ask before opening it).

## 9. Deferred beyond this round

- **Real delivery** (email/WhatsApp): needs login, server data, scheduled jobs, and IRB review; v1.5 scope. This round fully automates the flow except actual sending.
- Stop buttons for constitution reading/handbook drafting.
- Size / Lead time (one day vs 15 minutes per task): undecided; this date engine uses your schedule's day counts.
