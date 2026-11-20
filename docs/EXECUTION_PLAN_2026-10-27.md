> **Language policy update, November 19, 2026:** write documents, reports, comments, commits, and GitHub notes in English. This supersedes any earlier language instruction quoted in this historical file. Current `AGENTS.md` controls.

# Platypus Implementation Programme (after audit)

**wrote:** 2026-10-27 (Tuesday)
**Based:** `docs/AUDIT_2026-10-27.md`
**Precondition:** Juanxi 2026-10-27 Three decisions (see section 1)
**Status:** to start when Juanxi confirms

---

## Three answers from 1. Juanxi, and what have they changed?

### 1.1, "I miss the second edition of response speed. It's really quick.

**, which refers performance to first priority from "again" and finds the exact reason.**

Section 9 of the audit report originally stated that "The 1000 version of `forecast.ts` is not a problem on its current scale, and it is now a waste of time to optimize". **, this conclusion is now to amend** -- it's only for "mechanical speed" to be established and not for "people feeling fast."

Two proven reasons:

**One, wait for every suspension. 300milliseconds**

```css
/* src/styles.css:471(suspended card) and  :572(flowchart node card) */
transition: opacity .12s ease .3s, visibility 0s linear .42s;
                              ↑ 300ms Delay
```

The mouse stops on the **et cetera 300ms** while 120ms faded into **,420ms** before it sees anything. There's 420ms before it disappears.

And the second edition. 1The whole transition is... `.15s` / `.2s`，**Not a single delay.**：

```
$ grep transition public/legacy/index.html
transition: background .15s
transition: opacity .2s, transform .2s
transition: transform .15s
transition: none
```

`git log -S`Confirm: That 300ms delay is **`5bde479`「v1.1Simplified adaptations."**Incorporated **It's just the one you didn't like.**。

**This is 1 line CSS repair.**

**2 Projections double-counted 3–5Number of times**

```
src/pages/Today.tsx:19     useMemo(() => computeForecast(state), [state])
src/pages/Events.tsx:28    useMemo(() => computeForecast(state), [state])   ← Each one of them.
src/lib/aiContext.ts:18    computeForecast(s)        ← One at a time.  Ask Message
src/lib/assistant.ts:72    computeForecast(s)        ← In the same answer,
src/lib/assistant.ts:82    computeForecast(s)        ← Again.
```

5 call points without sharing caches with each other. Every time you run a full schemuling, you simulate 1000 times. **Sends an Ask message = 3 complete prediction.** plus store has to write the whole data package `JSON.stringify` into the browser every time you change it.

Method: A `useForecast()` is collected and the whole application of state changes is counted only once.

### 1.2, "The blue frame is too guiding. It's like a guided visit. Get rid of it."

**→  2026-10-27 Juanxi has confirmed by providing a screenshot: it's not our painting, it's the original focus ring of the browser.**

Screenshot: Settings page `Submit budget request`'s digital input box, with a circle of bright blues outside the focus.

Key evidence -- **That blue is not the color of this project.**：

```css
/* src/styles.css:53 —— The only focus style for this item  */
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
/* --accent = #0f766eCyan green, not blue.  */
```

Also verified: ** Full repository does not have any focus style for input/ selext/ texttarea and no treatment
** (`grep -n "webkit|focus-ring|outline: *none" src/styles.css`)
`.task-detail h2:focus`, `.panel h2:focus` and two unrelated `-webkit-` properties.

• Conclusion: It's the original focus ring that the browser itself draws for the form control. Juanxi says it's an apple, probably literally.
  The meaning is -- macos / Safari has a blue focus ring on form controls, and the author `outline` can't cover it.

⚠ **to be confirmed: Juanxi uses Safari or Chrome.** has a slightly different approach, and S3 is asked before starting work.

### This one can't just be deleted.

v0. 1 (including `:focus-visible`) is exactly the same today, and Juanxi likes both. Furthermore:
- `:focus-visible` **shows only** to keyboard users, and mouse clicks do not trigger (except text/digital input frames),
  It's standard to match them when they click -- that's exactly what happened in the screenshot.
- It's a WCAG 2.4.7 "Focus Visible" requirement, deleting `e2e/a11y.spec.ts` for direct failure.
- ASU has accessibility policy, and we can't write in the paper "We deleted the keyboard visibility."

### Change the law correctly.

```css
/* 1. Turn off the original ring for form control.  */
input:focus, select:focus, textarea:focus { outline: none; }

/* 2. Replace with our own low-key rings (only for keyboards and text input)  */
input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--accent);   /* Green, not blue.  */
  outline-offset: 1px;
}
```

Safari may also need to process extra spinners for `-webkit-appearance`/ digital input boxes. In Juanxi
Browsers are measured.

### Select State to be handled with

v1. The two new 1s are also biased, contrary to Juanxi’s “simplified, advanced” message:

| Location | Code | Problem |
|---|---|---|
| `styles.css:560` | `.m-node.is-selected .m-dot { outline: 3px solid var(--accent); outline-offset: 3px }` | An outside circle of 20 px with 3 px thick, 3px miles away, the ring is almost as big as a dot. |
| `styles.css:686` | `.heat-cell.all { outline: 2px solid var(--accent-ink); outline-offset: -1px }` | Team, the heat. |
| `styles.css:240` | `.flow-step.is-selected { box-shadow: ... }` | **Dead Code** (swipe map deleted), directly deleted |

* Crude outer ring for light background + 1px border (Linear / Notion / monday practice).

### 1.3 "Use false data before Supabase"

The **→ D line (data layer) is cancelled. It saves a lot of work and makes IRB much simpler.** was right about this decision.

But there are three attendant consequences that must be addressed:

The priority of **1 browser data protection has increased.** Now that the localStorage is the only storage, the audit report A7 ("Reshaping Data Structures = All User Data Without Voice Zero") has changed from "Hide" to "Participant 60 Minute Sessions may disappear after you push the code." **A7 must do it before Thursday.**

The **2 clock problem doesn't need to be fixed. The** time clock, which was fixed in the `2026-10-22` demonstration, was a problem, but your plan says "Phase 3 every participant sees the same date" (10/22 Decision Record). **so it's Feature not bug, stay still.** (but the calendar of 2027-05-08 is overdue for half an hour, and now it's cheaper than later. ）

**3 but your data government still gets it and doesn't need a server.**, this is my new idea:

Add a **only extra event log to that reducer incision (`store.tsx:104-245`, one switch covers all 40 operations) and write the same localStorage**. At the end of the session, participants order "Export Session" and hand over JSON to you.

You've got it: who, what, what, what, what before. **Zero Servers, Zero Superbases, Zero Databases, but the paper "data government as bottom" has live evidence.**

The **thing has to be written into the IRB submission on Thursday. The** export document does not contain a live name (participant uses false information from you), but the "collecting participant's interactive log" is in itself a collection of data, protocol. **is now written free of charge; After approval, you'll have to go and change it, and you'll be stuck with the 11/9 plan to start testing.**

### 1.4【2026-10-27♪ Juanxi likes it ♪ **This is the current edition.**It's not the old version.

Juanxi sent a screenshot of what he said, "What I like is this version." ** v1. 2 (Main)
**:

| Elements in the screenshot. | Code Position | Include Version |
|---|---|---|
| Right Bar `Ask \| Details` Two labels, "Looking at: Today x" | `src/components/rail/AskPanel.tsx` | v1.1 |
| Plan/Prep/Money/Promo/Run/Wrap Dot Chain | `Chain`（`ui/index.tsx`）| v1.1 |
| "Waiting" purple / "Not cleared" | `ui/statusDefaults.ts` 6 Colors | v1.1 |
| " Demo Thu, Oct 22 " pills | `DemoMenu` | v1.1 |
| The line between Rules and Settings | `Layout.tsx:79` empty grouping div | v1.1 |
| Timester goals | `Ring`（`ui/index.tsx`）| v1.1 |

v0. 1 and WP0-WP5 both generations of **have no** right column, Chain, StatusPill, so can be excluded.

**The extrapolation of section 7.4 of the audit report ( "He missed the second edition of a card with an explanatory caption") was rejected.**
The article in the report was marked “inference” and now has a counter-prosecution, which is followed by a counter-evidence.

### What's changed?

| Planned | Change to | Rationale |
|---|---|---|
| C4 Navigator back to action. | **Delete** | He likes the navigation now. |
| C5 restore Gantchat | **Delete** | He never asked. |
| C1 Behind-the-scenes switch | Reservation, **For a change of scenery.**  | It's not "get back what you miss," it's a paper that explains why 2 touch screen users don't see the suspension card. |
| C2 Problem becomes subheading | ⚠️ **Downgrade to Juanxi.**  | He hasn't complained that he can't read. It's an improvement, not a bug. |
| Positioning of S5 | ⚠️ **Change from "building design systems" to "fixing the current situation."**  | Here you go. |

### S5 Repositioning (important)

Juanxi can **like this deep green look**, and the code under **is really messy** -- these two things don't conflict.

23, 4 colours, 19.7% death CSS is not a question of "look ugly" but of "no one can change it safely".

**So what S5 has to do is not redesign, but restate the current situation with a set of rules.  When you're done, the interface should...
It looks almost exactly the same **, but from "23 random" to "6 slots". S5 must be written dead in prompt
This one, otherwise Opus would have been unable to "improve" the vision.

### 1.5【2026-10-27Juanxi actually prefers it. **Light Color Mode**And I can't choose now.

Juanxi adds: "I don't really like dark patterns, I prefer white ones. 」

So the screenshot of 1.4 is dark, just because ** his computer system was dark, and this app didn't give him.
Select the scope **. "Deep green version," he says, refers to brand green. `--accent #0f766e`No, it's not.
Dark mode.

**, the previous version of the program "S5 uses dark colour as a first scene" is dead. Light color is home.**

### Verified: Subject switch is missing, but CSS has already written it.

```css
src/styles.css:27   color-scheme: light;                              /* Default Light Colors  */
src/styles.css:29   @media (prefers-color-scheme: dark) {
src/styles.css:30     :root:not([data-theme="light"]) { ... }          /* Follow the system, unless light colour is forced.  */
src/styles.css:39   :root[data-theme="dark"] { ... }                   /* Force Dark Color  */
```

CSS **fully supports both mandatory coverage of** `data-theme="light"`/ `data-theme="dark"`.

**but no single line code will set `data-theme`.**
(`grep -rn "theme|Theme" src/components/ src/pages/Settings.tsx` THROUGH)

Consequences: **This app can only follow the operating system and the user cannot choose.** Juanxi's Mac is dark.
  So he's been seeing only dark versions.

Amendment: Set up `document.documentElement.dataset.theme` on `<html>`, stored in localStorage.
  **doesn't need a new line CSS**, the hook is already there. About 20 line.

• Affiliation: This only needs to move `Layout.tsx` and `main.tsx`, both of which are **S1 files**,
  And don't touch `styles.css` (S3 Monopoly). So to S1 do, **A11**.

### The effect of this on the Phase 3 (more important than what it looks)

Participants will see the themes decided by **of their respective computer systems**. If half are dark and half light:
- Unsymmetrical conditions for research (compared to Plan No. 16In the decision of this section, "each participant sees the same date" is precisely for consistency.
- And audit section 8.2 found that **6 colours had no dark color variant** for dark background
  Only 2.96–3.65:1, `--line`, and only 1.30:1 -- it's obviously worse in dark mode.

* **recommends that Phase 3 by default compel light**, but this is a product decision to be made by Juanxi.
→  S5 still has to fix the contrasts of dark colour mode (which are objective and bad) but **is next to light color**,
  Not the first scene.

---

---

## Section 2 New timetable

| Date | Week | Events | To finish what? |
|---|---|---|---|
| **10/27** | Tuesday | Today | Confirmation of the programme; Audit report submitted to GitHub |
| 10/28 | Wednesday | Implementation | **Phase 1** (3 sessions in parallel) |
| **10/29** | **Thursday**  | **Submitted IRB** | Full function, no visible bug, quick response. **IRB materials with an interactive log export** |
| 10/30–11/1 | Five or six days. | IRB Waiting | **Phase 2** (Design system, sequenced execution) |
| **11/2–11/3** | Monday and Tuesday. | IRB approval | Phase two continues. |
| **11/4** | **Wednesday**  | Sending of recruitment mail | Turn off Netlify access protection (**must finish**) |
| 11/5–11/8 | Four or five days. | End | **Phase 3** (explanatory) + release freeze |
| **11/9** | **Monday** | Start Live Test | v1. 0 Freezing, labelling |

**The boundaries of the three phases are hard:**

- **Phase 1 (Friday) = Useable, data-free, feeling fast.** doesn't touch the visual system.
- **Phase 2 (Tursday) = Design system.** This phase changes only CSS and Lint configurations without functionality.
- **Phase 3 (11/5  →  11/8) = Bring back the word "can read". The most valuable part of the** paper is put to the end because it builds on the first two phases.

**11/4 has a hard reliance:** sending recruitment mail means turning off Netlify's access to protection, and at that moment your AI Key was exposed on the public web. **So A8 (stream limit + delete redundant endpoint) must finish** before 11/4 and cannot be postponed.

---

## Section 3 - List of Sessions (9 Sessions)

### Answer "How many dialogues are expected": **9** in three batches.

| # | Session Name | Phase | Model | Branch | Could it be parallel? | Unique Files |
|---|---|---|---|---|---|---|
| **S1** | Organisation | One. | **Sonnet 5.5** | `fix/s1-ux-bugs` | ✅  Parallel to S2/S3 | `NodePanel.tsx` `Tasks.tsx` `board.ts` `Layout.tsx` `main.tsx` `TaskDetail.tsx` |
| **S2** | Security, engines, data protection | One. | **Sonnet 5.5** | `fix/s2-safety` | ✅  Parallel to S1/S3 | `netlify/**` `calendar.ts` `schedule.ts` `store.tsx` `seed.ts` `public/legacy/` |
| **S3** | Speed and quality of response | One. | **Opus 5.5** | `fix/s3-perf` | ✅  in parallel with S1/S2 | `styles.css` `Today.tsx` `Events.tsx` `aiContext.ts` `assistant.ts` `forecast.ts` |
| **S4** | Delete Dead Code | Two. | **Sonnet 5.5** | `design/s4-deadcode` | ❌  must be behind S3 merge | `styles.css` `helpers.tsx` |
| **S5** | Token Table (Design System) | Two. | **Opus 5.5** | `design/s5-tokens` | ❌  Must be after S4 | `styles.css` `statusDefaults.ts` `MetroChart.tsx` `Handoff.tsx` |
| **S6** | Guardrail (lint + CI + accessibility) | Two. | **Sonnet 5.5** | `design/s6-guardrails` | ❌  Must be after S5 | `package.json` `.stylelintrc` `.eslintrc` `ci.yml` `a11y.spec.ts` `word-count.mjs` |
| **S7** | Explanatory switch + Visible subtitle | III | **Opus 5.5** | `feat/s7-explain` | ❌  Must be after S6 | `Page.tsx` `Layout.tsx` `routes.ts` + Comment points for each page |
| **S8** | Touch screen down + Navigation Reassemble | III | **Sonnet 5.5** | `feat/s8-touch-nav` | ❌  Must be after S7 | `ui/index.tsx` `Layout.tsx` `styles.css` |
| **S9** | release freeze, document, merge online | III | **Opus 5.5** | `release/v1.0` | ♪ Finally ♪ | `README.md` `AGENTS.md` `PROGRESS.md` `PRODUCT_PLAN.md` |

### Why this split?

**S1/S2/S3 can be parallel because their file collection is checked and there is no overlap.**, that's not a guess -- I've got an exclusive list of documents, and it says, "Don't touch anybody else's files." The only intersection is `styles.css`: **, and only S3 can change it**, so S1 must revert to the existing `.btn .btn-primary` when adding a new button. No new styles are allowed.

**S4 must be before S5, which is contrary to the order of audit reports — I changed it.** original report B1(token) → B2 (deleted code). **Deletes and builds more savings.**: After 19.7% of the death of CSS, S5 will be missing a large fraction of the number/ spacing to map, and the audit found that most of the duplicated conflicts in 23 were dead -- before it was deleted, the conflict itself disappeared.

**Phases 2 and 3 are not parallel because they all have to move `styles.css`.** Two agents to the same 714 CSS file = inevitable merge conflict, and you can't solve it without writing code. **series is much safer than parallel lines.**

### Answer "What model to use"?

Principle: **is chosen according to the nature of the mission, not by "as expensive as possible".**

- **Opus 5.5 uses** (S3 S5 S7 S9):
  - S3 To judge which box is his blue frame, and how to call it "simple" -- this is aesthetic and trade-off.
  - S5 To map 23 characters into 6 files, each is a judgment question (this 13px should be xs or sm? ）
  - S7 is a new interactive from Zero Design.
  - S9. Make up your mind about being online.
- **Sonnet 5.5 uses** (S1 S2 S4 S6 S8): with precise files, line numbers, standards, just do it.
- **Haiku**. These missions are heavy and not recommended.

---

## Section 4: Answer "How to use git worktree"

### Let's start with a judgment that'll help you out.

**If you're opening a new conversation on the web (claude.ai/code this cloud session), you don't need worktree.**

Each cloud session will open a brand-new container and recode a cLone code. **Segregation is already free of charge** — it's physically impossible for two sessions to cover each other. Worktree solves the problem of "the same machine on multiple anent grabs the same folder", and you don't have that problem.

**so you just need a branch, not worktree.**, every session starts by checking out its own branch. You don't have to learn what worktree is.

### Scenario A (recommended) Cloud Session + Branch

One-time preparation (to today):

```bash
git checkout main && git pull
git checkout -b integration/v1.1-fix
git push -u origin integration/v1.1-fix
```

`integration/v1.1-fix` is the **assembly area**. The result of all the sessions comes first to merge, **is only Thursday and two nodes 11/9 to `main`** (following AGENTS.md 3 rule 4:main is the official website that requires your approval).

The first sentence of each session (written in pampt):

```bash
git fetch origin
git checkout -b fix/s1-ux-bugs origin/integration/v1.1-fix
```

End of each session: Push your own branch, **don't take its own merge**. You take a look at GitHub and press the merge button.

Merge order (**, one at a time and wait for the CI green light to merge next**):

```
S1 → S2 → S3  →  Merge.  integration/v1.1-fix Present.  mainThursday, you approve.
S4 → S5 → S6
S7 → S8
S9                →  Merge to  main + Fight!  v1.0 Label ( 11/9You approve?
```

### Scheme B. If you run off on your own Mac, Claude Code

At this point, worktree makes sense -- it allows three people to have an independent directory of jobs each, but shares the same `.git`, so they don't interfere with each other without having three:

```bash
cd ~/platypus-officer-hub
git fetch origin && git checkout -b integration/v1.1-fix origin/main && git push -u origin integration/v1.1-fix

# Open a work directory for each of the three sessions in phase one.
git worktree add ../pl-s1 -b fix/s1-ux-bugs integration/v1.1-fix
git worktree add ../pl-s2 -b fix/s2-safety  integration/v1.1-fix
git worktree add ../pl-s3 -b fix/s3-perf    integration/v1.1-fix

# Each directory has to be dependent on each of them. node_modules (Do not share)
cd ../pl-s1 && npm ci
cd ../pl-s2 && npm ci
cd ../pl-s3 && npm ci
```

Then we'll split up between the three terminals. `cd ../pl-s1`Claude Code again.

_Other Organiser

```bash
git worktree remove ../pl-s1    # The changes have to be submitted or discarded first.
git worktree list               # Look what's left.
```

**Two pits:**
1. `node_modules` No shared, each worktree to separate `npm ci` (three dependents on disk)
2. The same branch can't be detected in two worktrees at the same time. Git will simply refuse.

**My Proposal: With Option A.** You don't write code, worktree benefits are much less than its cognitive costs.

---

## Section 5 . 9 propt (direct replicable)

> Use: open a new dialogue to confirm the model and glue the following corresponding segment. Each paragraph already contains branch operations, file boundaries, standards and handoff requirements. You do not have to add any additional information.

---

### S1 --permissions and portal restoration  ｜ Sonnet 5.5  ｜  can be paralleled to S2/S3

```
You're...  Platypus Officer Hub Make a defined work patchage in repository. This is...  ASU It's an honorary thesis.
Phase 3 Prototype, Project Manager  Juanxi Don't write code.

Read first (in order of course):
1. AGENTS.md —— All  AI All the hard rules that apply, especially rule number one.  3 Sections and  7 Section
2. docs/AUDIT_2026-10-27.md —— Code audit report. You're gonna fix all the questions.  5、6 Section
3. docs/EXECUTION_PLAN_2026-10-27.md Article  3 Section  —— You are.  S1

_Other Organiser
  git fetch origin
  git checkout -b fix/s1-ux-bugs origin/integration/v1.1-fix
  npm ci

## Six things you have to do.

A1. src/styles.css:472 —— Suspended card not restored when shown  pointer-eventsThe one that caused the suspension of Kari
    Buttons don't click and keyboards don't come. src/pages/Team.tsx:39 This is why you're using the bottom line of your contribution.
    100% Not available.
    ⚠️ Exceptions: styles.css By  S3 Monopoly, you can't change it.
    → Please change it to  TSX We'll take care of it at all levels, or we'll put this in the handoff.  S3, and
      e2e Riga a test mark that will fail. test.fixmeI'm going to put the problem on hold. Option one. Justification.

A2. src/components/NodePanel.tsx:52,62,85,92,96,103,105,106 —— These edit controls are correct.
    ♪ Everybody rewrite but ♪  src/data/store.tsx:155 It's...  updateNode Yes.  !canLead(state) Hours
    Direct  return state。The user changed and did not respond, and did not have any hint.
    → Change to  disabled={!canLead(state)}, and add a note to the panel.
    → Documentation and interaction must be combined  src/components/rail/ChangeCard.tsx:111-113 Exactly.
      That's the only place that is right, copy it.
    ⚠️ Don't change.  store.tsx（S2 (single), change only  NodePanel.tsx。

A3. src/pages/Tasks.tsx:28-32 —— ♪ The only one standing ♪ + Add task* Buttons are *  :125, only exists
    Board Views the bottom of each column. Default View is  Table（:20) so the user opens  Tasks I can't see.
    Any new entrance will assume that it does not have a mandate.
    → Yes.  PageHead It's...  actions "Ricah" one. + New task, the main button, all three viewings.
    → Reuse Existing  dispatch({ type: "addTask", title, status })。
    → Attention.  src/data/board.ts:60-71 It's...  addBoardTask We don't check the missions, so this.
      button should be available for all characters.
    ⚠️ Must reuse the existing ones.  .btn .btn-primary Classes, do not add any  CSS。

A4. src/data/board.ts:64-67 —— Two.  bug：
    (a) Not  lead Yes.  "Not claimed" New column point, the card will show up  "To do" Columns.
        → Replace it with a clear indication of what happened to the user (text in English, interface in English, see).  AGENTS.md §7）。
    (b) :69 Yes.  "Done" The new column will be created directly  status=done and  completedOn=today The mission,
        Any officer can create a "finished" from an empty space.  canMoveTask(:22) But it's set to reboot.
        Tasks to be approved by president  —— The approval model is bypassed by creating a path.
        → Block it. New task does not allow direct  done。
    → Both entries are to be completed.

A5. src/components/Layout.tsx:123 —— Reset demo One key emptys all the data without any confirmation,
    And it's right next to the top bar menu.  "+1 day / +3 days / +10 days"。_Other Organiser  0 Branch  confirm()。
    → Add confirmation. Don't use originals.  confirm()♪ Will be ♪  Playwright And the mobile browser. Use it.
      A two-step click.  "Click again to reset"，3 Resume in second).
    → Update affected  e2e Test.

A6. src/main.tsx —— _Other Organiser  0 Branch  ErrorBoundary。Any Rendering Error  = The whole application of white screen, and
    localStorage The data in it that is damaged will lead to a white screen for each update. The participants would be stuck straight to death.
    → Add one.  ErrorBoundaryPack it up.  App。
    → Show when error occurred: A statement in English  + Two buttons ( Reload / Reset demo data）。
    → Reset Buttons need to be able  store Working in a broken condition.  localStorage，
      Don't go.  store It's...  action）。

A11【2026-10-27 Add Light  / Dark toggle.
    Verified: src/styles.css It's...  CSS **Fully supported**Theme Overwrite  ——
      :27  color-scheme: light                      (default light color)
      :30  :root:not([data-theme="light"])          (Follow the system, unless light colour is imposed)
      :39  :root[data-theme="dark"]                 (compulsory dark color)
    **But there's no one line to set it up.  data-theme**
    （grep -rn "theme|Theme" src/components/ src/pages/Settings.tsx Zero hit.
    → Consequences: app You can only follow the operating system and the user cannot choose. Juanxi It's...  Mac It's dark, so he...
      It's always dark, and he says he prefers light.
    → Practice: in  <html> Up Settings  document.documentElement.dataset.themeSave  localStorage。
      Third stage: Auto(Follow the system, no setting)  data-theme）/ Light / Dark。
    → ⚠️ **There's no need to change the line.  CSS**The hook is already there. styles.css Yes.  S3 Monopoly, you can't touch.
    → Place: The top bar already exists  5 Controls (audit number)  8.6 ♪ And say ♪  60% Don't turn into a scaffolding.
      Article  6 One. Suggested input  Settings Page or page  Demo menu. You judge and give reasons in your report.
    → When first load, avoid "spill the dark color before it becomes light."  main.tsx Lee.  React Just before the mount.
      Put it on.  data-theme Write it down.
    → To supplement test: cut to  Light Renovated, still.  Light。
    → Ask in the Handoff log.  Juanxi One question: **Phase 3 Do you want to compel light color by default?**
      Reason: Participants will see topics decided by their respective systems and half the depths of the study will lead to inconsistent research conditions.
      And...  6 No dark color variant for a state colour (Deep Color Contrast only)  2.96–3.65:1）。It's a product decision.
      It's up to him, you don't decide by yourself.

## Document boundary (hard)

You can only change:
  src/components/NodePanel.tsx
  src/components/TaskDetail.tsx
  src/pages/Tasks.tsx
  src/data/board.ts
  src/components/Layout.tsx
  src/main.tsx
  src/test/**and  e2e/** It's the inside test.
  docs/PROGRESS.md(Handoff records only)

You can't change it.
  src/styles.css        ← S3 Monopoly
  src/data/store.tsx    ← S2 Monopoly
  netlify/**            ← S2 Monopoly
  src/engine/**         ← S2/S3 Monopoly
  src/lib/assistant.ts, src/lib/aiContext.ts, src/pages/Today.tsx,
  src/pages/Events.tsx  ← S3 Monopoly

If something has to be changed to someone else's file, don't change it.  —— Write in.  docs/PROGRESS.md _Other Organiser
Note: S1 Found  XYes, I do.  S3/S2 Yes.  <Documentation > Do it.  Y」。

## Acceptance

- npm run check All Green (Golden) tsc + vitest + playwright）
- The original test article cannot be deleted or reduced. If a test is supposed to change because of your changes,
  It's an article-by-article explanation in the handoff record.
- There are tests for new behaviors.
- Don't change.  AGENTS.md、PRODUCT_PLAN.md、RULES.md

## At the end

1. Yes.  docs/PROGRESS.md _Other Organiser
   What's done?  / What's left?  / What? Acceptance. / Known problem  / Handoff to whom?
2. Form of submission: [S1][Claude] Brief description
3. git push -u origin fix/s1-ux-bugs
4. Don't merge to any branch. Don't touch it.  main。Juanxi I'll be there by myself.  GitHub Up metge.
5. Finally in simple Chinese  Juanxi Report: What's changed, where's his point at, what's not done.
   One step at a time, don't use terminology.
```

---

### S2 - Security, Engines, Data Protection  ｜  Sonnet 5.5  ｜  can be paralleled to S1/S3

```
You're...  Platypus Officer Hub Make a defined work patchage in repository. This is...  ASU It's an honorary thesis.
Phase 3 Prototype, Project Manager  Juanxi Don't write code.

Read first (in order of course):
1. AGENTS.md —— Especially the first one.  3 Coercive rules
2. docs/AUDIT_2026-10-27.md —— You have to fix it.  3 Section (three emergencies) and  10 Section
3. docs/EXECUTION_PLAN_2026-10-27.md Article  1.3 Sections and  3 Section  —— You are.  S2

Key background: Juanxi It's decided.  Phase 3 Don't.  Supabase, the participants use the messageal information we provide.
So...  localStorage is the only storage, data protection ( A7The priority has therefore been raised.

_Other Organiser
  git fetch origin
  git checkout -b fix/s2-safety origin/integration/v1.1-fix
  npm ci

## Four things you have to do.

A7Data protection. src/data/store.tsx:247-258：
    schemaVersion It's just a matter of time.  seedDemo(), no migration, no backup, no hint, no export.
    This version has been changed.  3 Second ( 3→4→5), every time means that all users enter silent disappears.
    Same.  catch（:254-256Give it back.  JSON The failure to deconstruct was also swallowed.
    :260-266 Save failed (%1) QuotaExceededErrorIt's also silence.
    → (a) Save old data to one with version number when the version does not match  keyDon't lose it.
    → (b) Shows a hint (not sileence) on the interface when saving failed.
    → (c) Add a "" Export my data"button to download current status as  JSON。
         Put it on  Settings Page, do not put the top bar.

A7b[New, Juanxi 2026-10-27 [Decision] interactive log.
    src/data/store.tsx:104-245 It's one.  switch, overwrite all about  40 , the only writing point.
    → Add an extra event log here and write it in the same one.  localStorage：
      { seq, at (Live time stamp  Date.now()), actor (viewerId), type (action Type ),
        payload (Streamlined parameters ), before (Changed old value of field only for operations with old value ) }
    → Note: This is the only place where you can use live clocks. The date shown on the interface still has to go
      state.todayDon't mix it.
    → Upper limit: retain recent  2000 The one with the old ones. localStorage Quotas are limited).
    → Let's go up.  A7(c) It's...  Export button to export this log together.
    → This is...  Juanxi In the paper.  data governance So the field is complete and can be re-established.
    → unit tess: do  5 It's a different operation.  5 Article, order and order. before Value is correct.

A8 Server port closes. 11/4 We have to turn it off.  Netlify Access to protection e-mails, that moment.  /api/* It's exposed.
    The Internet, and now it's out of control, out of bounds, out of order.  400KB。
    → (a) netlify/functions/chat.mts:29 It's...  body Upper limit  400_000 → 40_000
    → (b) Delete the four endpoints: netlify/functions/pool.mts(total dead code, SPA Never calling,
          parse-brief.mts、plan-draft.mts、classify.mts(only abandoned)  /legacy/ Call)
    → (c) Delete it.  public/legacy/ The whole directory. It's half broken.  6 I'm not sure if it's the end of the world.
          But it's still publicly accessible and will burn the same one.  AI key。
          ⚠️ Before deleting it, confirm: git log In which it's historically intact. Juanxi Could be reference.  v0.1 Designed,
          S7 We'll use it. Write in handoff's record v0.1 The code can be used.
          `git show 49b0b89:public/index.html` "Return" and verify that the order can really run.
    → (d) Press  IP The limit of the flow. Priority  Netlify Ability to carry itself (in)  netlify.toml (a) The Declaration of the Libyan Arab Jamahiriya;
          If the current program doesn't support it, it is.  netlify/lib/http.mts A simple flow limit within a Riga process.
          And honestly explain its limitations in the handoff record (the function example restarts to zero).
    → (e) Yes.  netlify/lib/ai.mts Use log for each call to book:
          provider / model / Enter Output  token(if the supplier returns) / Timetime  / peer name.
          ai.mts:110,118,131 It's timed out.
          ⚠️ You can't appear in a log.  key、token, user content.

A9 Calendar expired. src/engine/calendar.ts:15-60 It's...  ASU The school year data are only available.  2027-05-08。
    When we're done,  studentOffReason(:80-86) It's going to be "between semesters," so it's going to be a reverse date.
    Jump all the way forward. Verifyed: 2027-10-15 Inverted activity  14 A student's day will tell.
    2027-04-13"The right answer."  2027-09-27That's not true.  6 and does not report any error.
    → (a) To complete  2027–2028 School year  TERMS / FINALS / HOLIDAYS / BREAKS。
          Every one of them has to have an official source.  URL, and keep it up to date  docs/RULES.md Last Calendar Source
          （AGENTS.md Article  4 Section requires the same rules and documents).
          If we don't find the official...  2027-2028 Calendar, do not compile  —— Just do it.  (b), and in the handoff record.
    → (b)Yes.  src/engine/schedule.ts It's...  issue List (%1) :290-324、:326-343Lee!
          Add a new one.  error Level  issue: Any calculation involving a date outside the scope of the known calendar,
          Clear reporting of errors. Make it worse than quiet.
    → (c) Supplement unit tess: Raise date beyond known calendar, assert  issue Come on.

## Document boundary (hard)

You can only change:
  src/data/store.tsx, src/data/seed.ts, src/data/types.ts
  src/engine/calendar.ts, src/engine/schedule.ts
  netlify/**
  netlify.toml
  public/legacy/(deleted)
  src/pages/Settings.tsx(In thousands of US dollars)  Export buttons; Reuse Existing  .btn Classes, no new  CSS）
  docs/RULES.md(Reassigned to calendar source only)
  src/test/**and  e2e/** It's the inside test.
  docs/PROGRESS.md(Handoff records only)

You can't change it.
  src/styles.css           ← S3 Monopoly
  src/components/**        ← S1 Monopoly ( Settings.tsx _buttons are exceptions, but only buttons will be added)
  src/pages/Tasks.tsx, src/data/board.ts, src/main.tsx  ← S1 Monopoly
  src/lib/assistant.ts, src/lib/aiContext.ts, src/engine/forecast.ts,
  src/pages/Today.tsx, src/pages/Events.tsx             ← S3 Monopoly

## Acceptance

- npm run check All green.
- You can't delete the original test. You can't change it.
- A7 _Other Organiser
- A9(b) _Other Organiser
- After deleting the peer, e2e If there's a test to quote them, they'll be cleared together.

## At the end

1. docs/PROGRESS.md Handoff, add a line to the record.  / What's left?  / What? Acceptance?  / (Issues known)
2. Submission of information: [S2][Claude] Brief description
3. git push -u origin fix/s2-safety
4. Don't merge. Don't touch it.  main。
5. In plain Chinese  Juanxi Reporting. In particular, two things must be made clear:
   (a) What's the format for exporting the interactive log?  IRB (materials)
   (b) What's the limit? What's the limit?
```

---

### S3 . Respond speed and quality 5.5|  may be paralleled to S1/S2

```
You're...  Platypus Officer Hub Repository is responsible for work package: let interface "Feels fast. "，
And deal with the project leader.  Juanxi An explicit visual requirement. Juanxi Don't write code.

Read first (in order of course):
1. AGENTS.md —— Especially the first one.  7 Interface Rules
2. docs/AUDIT_2026-10-27.md —— Full text, focus section  4、8 Section
3. docs/EXECUTION_PLAN_2026-10-27.md Article  1.1 and  1.2 Section  —— That's...  Juanxi The exact words and
   Verified evidence. You are.  S3。

Juanxi The exact words: "I miss the second edition of the response, which is really quick and does not need to wait." 」
And: "The blue frame is too guiding. Feels like a guide to access or ancillary functions, drop it first. I need more brevity.
High, no mistake. 」

_Other Organiser
  git fetch origin
  git checkout -b fix/s3-perf origin/integration/v1.1-fix
  npm ci

## P1 · Get rid of it.  300 A millisecond suspension delay. 1 Okay.

src/styles.css:471 and  :572：
  transition: opacity .12s ease .3s, visibility 0s linear .42s;
The mouse stops and waits.  300ms It's just starting to fade. Total.  420ms Just saw it. Move it too.  420ms。

Verifyed: v0.1（Juanxi The whole transition is...  .15s / .2sNot a single delay.
git log -S Make sure the delay is...  5bde479「v1.1 It's a simplified version.  —— It's just that he didn't like it.
That's the version.

→ For Delay read  0 or very short ( ≤80ms"Asynchronous" and lighten time alignment.  v0.1 It's...  .15s。
→ At the same time, check everything. Anything else?  transition-delay Or too long animated to deal with.
→ Attention.  e2e There are suspended tests, and they may rely on this delay (waiting time to die). Change it together.

## P2 · Predictions only count once.

computeForecast Yes.  5 A no-shared cache call point:
  src/pages/Today.tsx:19     useMemo(..., [state])
  src/pages/Events.tsx:28    useMemo(..., [state])
  src/lib/aiContext.ts:18
  src/lib/assistant.ts:72
  src/lib/assistant.ts:82    ← Same time.  AI Twice in the answer.
You have to run all over each time.  computeSchedule, and simulate  1000 Second. Send one.  Ask Message  = 3 Second.

→ Collection from a single source (recommendation: hanging on)  store It's...  context Go, press.  state Memorize once.
→ Call point for pure function ( assistant.ts / aiContext.ts He's not here.  React In the trees, you have to be able to use it again.
  It turns out, don't just fix it.  React Those two.
→ Let's see what we can do.  store Every change  JSON.stringify Cost(s) store.tsx:262,278 (a) Full sequence).
  If clear, do the flow (but not lose data)  —— page is closed.
→ ⚠️ forecast.ts is the pure function of a fixed torrent, and the output must be the same in place as it is now.
  src/test/forecast.test.ts The certainty assertion must continue to be adopted. Don't change the algorithm, just the way you call.
→ Add a test to prove it.  state Change only triggers once.  computeForecast♪ We can use it ♪  spy Count.

## P3 · Blue Box Juanxi Screenshot provided, located.

Screenshot: Settings Page  `Submit budget request` , you get a bright blue circle outside the focus.

⚠️ The facts that have been verified must be read before action is taken:

**That blue is not the color of this project.**
  src/styles.css:53 It is the only focus style for this project:
    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
  --accent = #0f766eCyan green, not blue.
  And there's nothing to do with it.  input / select / textarea , nor do you have any treatment
  The code for the original focus ring of the browser ( grep webkit|focus-ring|outline: *none Two hits.  h2:focus）。

Exhausted checks already made 2026-10-27）：
  - _Other Organiser  *.css There's only one.  13 Branch  :focus/outline/accent-color The rules, **The color is everywhere.
    var(--accent)(#0f766e Cyan Green ) or  var(--late)/var(--accent-ink)**There's no blue focus.
  - There's nothing against it.  input / select / textarea Focus Styles
  - The only blue  #3a6fd8 Only in the presence  4 Places: statusDefaults.ts It's...  "To do" Status color,
    PALETTE Palettes, .chain .dot.now、.m-dot.now —— All of them. **Background Color**Not the focus ring.
  - There's nothing in the history of submission.  Apple / Apple.  / HIG Records

→ Juanxi This is what we added to our "Reference Apple Design Manual". The evidence doesn't support this judgment, but... **Oh, no.
  We need to make some noise first. ** —— The following changes are effective in both cases, as it visibly takes over the focus style of form controls.

**First thing: ask.  Juanxi With...  Safari Or...  Chrome**The two are slightly different, and ask him to do one.
10 : Opens the same input box in another browser. If the color or shape of the blue frame changes, it's a browser.
drawings; If it's the same, it's what we missed and come back to check.

### Do not simply delete the focus style

- :focus-visible Only for keyboard users, mouse clicks do not trigger (text) /The digital entry box is an exception to the norm.
  They match when they click.  —— That's exactly what happened in the screenshot.
- It is.  WCAG 2.4.7 It's a hard request. It's deleted.  e2e/a11y.spec.ts Direct failure
- ASU There's a policy of accessibility. We can't write in the paper, "We deleted the keyboard visibility."

### Reform

  /* 1. Turn off the original ring for form control.  */
  input:focus, select:focus, textarea:focus { outline: none; }

  /* 2. In exchange for our own low-key rings.  */
  input:focus-visible, select:focus-visible, textarea:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

Safari It may still need to be dealt with.  -webkit-appearance / Number Input Box  spinner。By  Juanxi Browser
Assumptions  —— After the change, ask him to order that input box for confirmation in his own browser.

### Handle preferred "choice"

  styles.css:560  .m-node.is-selected .m-dot { outline: 3px solid var(--accent); outline-offset: 3px }
                  ← 20px Dotsets  3px Crude, separated.  3px A long ring, almost as big as a dot.
  styles.css:686  .heat-cell.all { outline: 2px solid var(--accent-ink); outline-offset: -1px }
  styles.css:240  .flow-step.is-selected { box-shadow: ... }   ← Dead Code (swipe map deleted), directly deleted

→ Rough outer rings for light background.  + 1px Borders ( Linear / Notion / monday I'm sorry, but I don't know what to do.

### Authentication (compulsory)

Change Only Keyboard  Tab Let's go again.  Today / Tasks / Events / SettingsEvery step of the way, you have to see where the focus is.
It doesn't look like it's broken. And then run again.  e2e/a11y.spec.ts。

## P4 · Qualitative problems with handy hands.

- styles.css:340 There's a dead code.  .forecast { margin: .5rem 0 }, from removed components,
  That's why today every risk dot is on its back.  8px Top-down outer margin. Delete it.
- styles.css:489 Quoted a variable that has never been defined  --st-now, so the flow chart "Current "
  The dots always fall back hard-coded blue. Settings The color changes do not take effect.
  ⚠️ This formal restoration belongs to  S5（token Tables). Just write it down in the handoff record and don't move.

## Document boundary (hard)

You're the one.  src/styles.css —— S1 and  S2 It's forbidden to change it. If they left it in the Handoff records,
styles.css needs, for example  S1 It's...  A1 pointer-eventsYou take over.

You can only change:
  src/styles.css
  src/pages/Today.tsx, src/pages/Events.tsx
  src/lib/assistant.ts, src/lib/aiContext.ts
  src/engine/forecast.ts(redeployment only) /Memory, no algorithms)
  src/data/store.tsx Rim.  forecast context Relevant part
    ⚠️ store.tsx By  S2 Monopoly. If you have to change it, look first.  S2 There's no push.
       Conflict in handoff records, let  Juanxi Order it up, don't force it.
  src/test/**and  e2e/** It's the inside test.
  docs/PROGRESS.md(Handoff records only)

You can't change it.
  src/components/NodePanel.tsx, src/pages/Tasks.tsx, src/data/board.ts,
  src/components/Layout.tsx, src/main.tsx   ← S1 Monopoly
  netlify/**, src/engine/calendar.ts, src/engine/schedule.ts  ← S2 Monopoly
  src/components/ui/statusDefaults.ts        ← S5 Monopoly ( token (I)

## Acceptance

- npm run check All green.
- forecast The certainty test has to be passed place-by-place.
- Add a test certificate  forecast Every time  state It's only one change.
- Manual: Desktops and mobile phones, one by one  Today / Events / TasksThe suspension must react immediately.
- ⚠️ Juanxi It's always the day. **Dark Mode**All manual checks must be performed in dark mode.
- Keyboard  Tab Full focus is visible

## At the end

1. docs/PROGRESS.md Handoff log plus one line
2. Submission of information: [S3][Claude] Brief description
3. git push -u origin fix/s3-perf
4. Don't merge. Don't touch it.  main。
5. In plain Chinese  Juanxi Reporting. In particular, make it clear:
   (a) It's suspended. /How much faster did you click?
   (b) What did you find out about the blue frame, what you changed, why didn't you delete it?  :focus-visible
```

---

### S4 . Delete the code. 5.5|  must be after S3 merge

```
You're...  Platypus Officer Hub Repository does a pure cleanup. This is...  ASU It's an honorary thesis.  Phase 3
Prototype, Project Manager  Juanxi Don't write code. This work package does not change any user visible behavior.

Read first:
1. AGENTS.md
2. docs/AUDIT_2026-10-27.md Article  4.1、4.2 Section (full list of dead code)
3. docs/EXECUTION_PLAN_2026-10-27.md Article  3 Section  —— You are.  S4

Background: src/styles.css By  11 Sub-submission, every time.  diff It's all " +N / −0* Never in history
Delete any line  CSS。The one called "Simplified Reprint" 5bde479I got it.  341 All right, delete it.  0 Okay.  ——
It's deleted the swimmers and Gantchat.  React code, but leave all their styles behind.

⚠️ I'll confirm it.  S3 It's...  fix/s3-perf ♪ I'm in ♪  integration/v1.1-fixOr you and it will.
styles.css Up conflict. No, Merge, just stop and tell.  Juanxi。

_Other Organiser
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # Confirmed.  [S3] Submission
  git checkout -b design/s4-deadcode origin/integration/v1.1-fix
  npm ci

## You're gonna do it.

1. Recheck the dead code and don't copy the list of audit reports.  S1-S3 I've changed it.
   Method: extraction  src/styles.css In everything.  class Selector, one by one.  src/**/*.{ts,tsx} and
   public/**/*.html Search by word boundary. Leave the script.  scripts/ Now, this way we can run again.

2. Delete the rule block confirming that there is no reference. The audit report detected  62 Oh, my God.  class / 84 Rule block  /
   329 Declaration (approach)  16% It's...  CSSIntergenerational distribution:
     - v1 Swimming Charts flow-* / react-flow*，14 (numbers) —— FlowChart.tsx Deleted
     - v1 Gantchart gantt-*，10 (numbers) —— Gantt.tsx Deleted
     - v1 First-generation status colour (in millions of euros) st-*，9 (numbers) —— Has been  StatusPill Replace
     - WP0/WP2 Legacy ( coming / demo-strip / step-strip / star-card Wait. 14 (numbers)
     - WP3/WP4/WP5 Legacy ( task-list / board-column / funding-pipeline Wait. 12 (numbers)
     - Other  3 One.
   ⚠️ If...  Juanxi Later on, he said he'd resume Gantchat.  C5），gantt-* The style may still be useful.
     → Do not just delete it.  gantt-*, move the entire paragraph to one at the end of the document
       /* ---- Reservation: Gantchart style, etc.  C5 Resolves  ---- */ , in the Note block and in the Handoff log.
     → Delete the rest.

3. Delete it.  src/pages/helpers.tsx Quoted dead export:
   STATUS_LABEL(:6-13)、statusOf(:16)、statusClass(:21)、personName(:33)、
   initials(:35)。Let's split up.  grep Confirm that there is really no reference.
   Attention.  statusOf/statusClass It's "second-generation semantics" and deletes them from the audit report.
   Article  4.3 The festival.  4 The first in the colored language  2 A condom.

4. Reverse problem: yes  7 One of them.  TSX It's written but...  CSS There's no rules at all.  class：
   card-text（src/components/rail/AskPanel.tsx:123，AI A container for each text reply,
   No style at all) nudge-panel、task-gantt、info-wrap、todo、m-start、m-end。
   → One by one: it's a missing style.  bug, put the handoff on the record  S5It's redundant.  class
     ♪ Then from  TSX Delete it. Don't add new styles  —— That's...  S5 Something.

5. src/components/ui/index.tsx:93 Export one.  Empty Component, but  16 All pages are handwritten.
   <p className="empty">。
   → Change these handwritings to...  <Empty>。Organisation Today.tsx:41,81 / Tasks.tsx:70,136 /
     Events.tsx:34 / Funding.tsx:67,76 / Partners.tsx:58,68 / Rules.tsx:38 /
     Handoff.tsx:73 / Settings.tsx:126 / rail/Rail.tsx:61 / FollowupPanel.tsx:18 /
     BoardSettings.tsx:18
   → Just this one replacement, and don't change it.

## Rigid requirements

- **Do not change the visible behavior of any user.** It's pure deletion.  + One-time equivalent replacement.
- Cut each one. Run once.  npm run check。Delete the next group in full green.
- It's submitted several times, it's submitted one at a time, so the fallback problem is good.
- After deletion of the report: styles.css From  714 How many lines down, how many repeat conflicts have been eliminated
  (Audit reports detected)  23 The majority of those who repeat them are dead and should be eliminated automatically).
- ⚠️ Run once before it's deleted.  npm run build && npx playwright test, record the baseline. Delete the comparison.
- ⚠️ Visual regression: The project does not have a visual regression test. That's why you have to cross-reference it manually when you delete it.
  10 Page ( Desktop)  + Cell phones. Use  scripts/word-count.mjs:30 I'm not sure if you're going to be able to get a screenshot.
  Or write a temporary script for yourself.  scratchpad, do not submit).) Anything that seems to have changed is a mistake.

## File boundary

You can only change:
  src/styles.css
  src/pages/helpers.tsx
  Each  page and  component Rigs.  <p className="empty"> Change it to  <Empty> The lines.
  Awarded redundant.  class The lines.  TSX
  scripts/(Death Code Test Script)
  docs/PROGRESS.md(Handoff records only)

Do not change: any logic, any  netlify/**, any  src/engine/**Any test claims.

## At the end

1. docs/PROGRESS.md Handoff records plus one line must contain:
   - How many lines, which intergenerationals?
   - gantt-* Where's the reservation?
   - Article  4 List of missing styles found (to)  S5）
2. Submission of information: [S4][Claude] Brief description
3. git push -u origin design/s4-deadcode
4. Don't merge. Don't touch it.  main。
5. In plain Chinese  Juanxi Reporting, emphasising that the interface should not see any change if he sees a change
   That's me deleting the wrong page, please.
```

---

### S5. Token Table (Design System)  ｜  Opus 5.5  ｜  must be after S4

```
You're...  Platypus Officer Hub Repository fills a piece that has never happened to this project: the design system
Minimum delivery. This is...  ASU It's an honorary thesis.  Phase 3 Prototype, Project Manager  Juanxi No code, no code.
I don't know how to design a terminology.

Read first (all necessary):
1. AGENTS.md —— Especially the first one.  7 Interface Rules
2. docs/AUDIT_2026-10-27.md —— Full text. Article  4 Section is your statement of work, No.  8 Section is the contrast.
3. docs/EXECUTION_PLAN_2026-10-27.md Article  1.2 Section  —— Juanxi The only explicit requirement for vision.
4. docs/PROGRESS.md Up top.  S4 _Other Organiser  —— He left you a list of missing styles.

## Why are you doing this?

This item skip the first of a standard process  3 Step (Visual direction) and  4 Step (design system and component specifications).
AGENTS.md Article  7 The festival.  6 An "interface rule" is  2026-10-23 After all the pages have been written, we will be able to identify them.
It's only three columns.  / 5 Component  / This list does not have any colour order, word scale, spacing order or hierarchy.

Results (audit evidence): 23 Typenames, 22 Spacing value, 14 a rounded corner, 14 Naked.  z-index，
And the word, the spacing, the hierarchy.  token Not a single one. The same numbers running.  4 A non-connected state color.

Juanxi He said, "I can't say anything good or bad." —— Because there's nothing in the interface that can be...
Rule of presentation. Your job is to make it have.

Juanxi The only explicit requirement for vision is: **It's simple, sophisticated and right.** Don't guide too much stuff.

⚠️ I'll confirm it.  S4 It's...  design/s4-deadcode ♪ I'm in ♪  integration/v1.1-fix。No merge, just stop.
   Delete the dead code and build it.  token It saves most of the work. 19.7% It's...  CSS It's dead, don't map.

_Other Organiser
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # Confirmed.  [S4] Submission
  git checkout -b design/s5-tokens origin/integration/v1.1-fix
  npm ci

## ⚠️ The most important constraint: don't change the way it is.

2026-10-27 Juanxi Send a screenshot to confirm: **He likes the way it looks right now.**（v1.2 Dark mode.
See section of the programme  1.4 Section.

That's your mission. **It's not a redesign. It's a restatement of the way it is.**。
When it's done, the interface should look like... **Almost exactly the same.**♪ Just from ♪ 23 "Standing random numbers" becomes 6 It's a class."

- Don't. "Improvements "Color, don't adjust layout density, don't change fonts, don't change corner style
- Every map should be the closest one, not the better one.
- The only place that allows for a significant change in vision: the points where contrast is not qualified.  3 Article) and
  10px / 10.5px It's a little too small. AGENTS.md §7.4 Request is not less than  14pxIt's a very serious violation now.
- If a map can make the interface significantly different, **Let's start with a screenshot.  Juanxi**Don't decide for yourself.

## ⚠️ Number two: Light color is home, dark colour is second.

【2026-10-27 Corrections should be submitted to the original languages only.  1.5 FLIGHT Juanxi “I don’t really like dark patterns,” he says.
I still prefer white mode. He sent a dark screenshot just because his system was dark, and this.  app
There was no theme switch at the time. S1 It's...  A11 It'll add.

→ Each set of changes **Look in light mode first.**Look at the dark color.
→ But the dark contrasts still need to be addressed.  8.2 Section: 6 The color of the state is not dark.
  On a dark background.  surface Only.  2.96–3.65:1；--line Only.  1.30:1。
  Phase 3 Participants may use dark colours, which are objective defects, but only after light colour.

## You're gonna do it.

### 1. Fill the missing three steps  + Level

Existing  :root（styles.css:3-27 and  :357There is already.  18 Colours  token、3 Font family, 1 A shadow.
1 Round corner, 3 A layout width. What's missing is:

- **Letters  6 Level**：--fs-xs:12 / --fs-sm:13 / --fs-base:15 / --fs-lg:17 / --fs-xl:20 / --fs-2xl:26
  Take the existing one.  23 _Other Organiser 10 / 10.5 / 11 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 /
  15 / 16 / 17 / 18 / 19 / 20 / 21 / 22 / 26 / 28px / clamp / .8rem / .95rem）
  It's one-by-one. Every one of them is a question of judgment, not mechanically rounded.  —— 10px and  10.5px This.
  It's too small. AGENTS §7.4 Require not less than  14pxI'm in a lot of trouble now.
  Go up.  --fs-xs Instead of opening a new line.
  ⚠️ This one changes vision. Change the page-by-page screenshot to  Juanxi Look.

- **Spacing Order  6 Level**：--s1:4 / --s2:8 / --s3:12 / --s4:16 / --s5:24 / --s6:32
  Existing  22 Entrenchment value (%1) 1,2,3,4,5,6,7,8,9,10,11,12,14,16,18,19,20,22,24,28,40,48）
  Adsorption to the nearest slot. 5/7/9/11/19 These shits.  4px The grid needs special attention.
  padding Yes.  69 It's a different way of writing. gap Yes.  24 Seeds  —— Take it together.

- **Round Corner  3 Level**：--r-sm:8 / --r-md:12 / --r-lg:14（+ 999px Pills.  + 50% circle)
  Take it off.  3/4/5/6/9/10px。The only one we have.  --radius token It's only used.  7 And then...  8px It's written.
  16 Sub-paragraphs 10px 15 Second.

- **Level  5 Level**：--z-sticky:20 / --z-overlay:40 / --z-rail:55 / --z-menu:60 / --z-tip:70
  Existing  14 A nudity. 0,1,2,3,4,5,6,20,40,45,50,55,60,70It's in the brain.

### 2. The status is one.

Audit report number  4.3 Festival: Brand  token It's not about the color, it's about the color.  3 "Synonyms of different colours":

| Meaning  | Brand  token | Status Color  |
|---|---|---|
| It's late. /It's stuck  | --late #b42318 | blocked #c0362f |
| Completed  | --good #1a7f37 | done #237a42 |
| Attention. /Ongoing  | --warn #8f5206 | in_progress #b25c00 |
| To-do  | (non-existent) | accepted #3a6fd8 ← Blue all over.  token It's not in the table.  |

And...  git show 3d68221 Show this  6 The color of the state was...  monday.com It's...
#7d8682 #d97b06 #d23f37 #2b9550，2026-10-23 For the sake of comparison, it's been turned into a current value.
**They're taken from outside products.  + It's fine-tuned. It never happened to the color system of this project.  #0f766e) Align.**

→ (a) Get rid of this.  3 Repeat: Only one value is left for each meaning.
   ⚠️ You can't just take one.  —— 6 All status colours now pass.  WCAG AA（4.72–5.82:1，
   Audit report number  8.1 And the three brand colours don't necessarily. We need to recalculate the contrasts after every change.
   and to list the numbers in the handoff log. Below  4.5:1 It's not working.
→ (b) One for the blue.  token（--info Or something like that. Don't let it go away.  #3a6fd8。
   ♪ The same blue is now written ♪  4 Places: statusDefaults.ts:7、styles.css:489、:554、:556。
→ (c) Here.  6 Each state color fills a dark mode variant. Now they're on the dark interface.  surface
   Only.  2.96–3.65:1(Audit)  8.2 is a set of deep-coloured solid pieces designed for the white bottom.
→ (d) Definitions  --st-now（styles.css:489 Quote it, but all repository never defined) and let
   src/components/flow/MetroChart.tsx _Other Organiser  useStatusStyles() Not.  CSS。
   Now.  Juanxi Yes.  Settings → Board Reaper. To doThe color of the ‘sweeper’. Today progress chain and flow chart
   The dots don't change.  —— It's a demonstration.  bug。
→ (e) src/pages/Handoff.tsx:61 Put it on.  #237a42 / #3a6fd8 / #5f6763 Hard encoding for internal styles,
   So the name change doesn't sync up to the handoff relay card. Let's go.  token。

### 3. Where contrasts are not qualified.

Audit opinion  8.2 Factories, text class  1 Qualifying:
  --good #1a7f37 on --good-soft #e3f4e7 = 4.44:1(deficit)  0.06）
  Use it.  .tag.good（ChangeCard It's...  "Approved" labels) and  .save-status.ok
  styles.css:707 It's hard-coded.  #146c2e I fixed it alone.  .days.good An example.  ——
  **That's it.  23 Source of repeated statements: fixed symptoms.  token。**
→ Change  tokenAnd then delete it.  :707 That single patch.

Non-Text Class(s) WCAG 1.4.11Request  3:1Yes.  5 Qualifying:
  Yellow risk point  #e3a008 on White  = 2.26:1   ← The three-colour risk system is only yellow.
                                        And yellow is the one where we're most dependent on weak users.
  Team Medium-load bars  = 1.74:1
  Metro Main not completed session  = 1.85:1
  Chain/Metro Empty Borders  = 2.59:1
  All stations.  1px Borders  --line on White  = 1.29:1
→ The first four must be fixed.  ≥3:1。
→ Last ( --lineBe careful: Deepening it will change the interface. "Heavy "and  Juanxi Yes.
  "Simple, advanced" is the opposite. Recommendation: The border remains light, but any border conveys by borders /Where it's interactive,
  Adds an additional non-colour thread (brough, background, icon). Show your trade-offs in the handoff record.

### 4. Write a book that one can read.  token Document

Create `docs/DESIGN_TOKENS.md` in English for all collaborators, including Juanxi:
- How many steps do you have? When do you use it?
- 6 Meaning of a state color, colour values, contrast numbers
- One rule: "Any new style can only be used  token"Don't write death values."
This document is the missing part of this project.  4 "Step delivery." Every one from now on.  AI Read it in front of the world.

## Rigid requirements

- ⚠️ This work package will change vision. **Each one of these is a page-by-page screenshot.**（10 Pages  × Desktop /Cell phone.  ×
  Light /"Dark colour" is used to match the background.  Juanxi。He's the only acceptance person.
- Change in principle only  CSS。Except for:  statusDefaults.ts / MetroChart.tsx / Handoff.tsx These three.
  To make the color go away.  token Must move somewhere. Don't recreate anything else.  TSX。
- Don't change any layout, don't move the component level, don't change the text.
- npm run check Green. a11y Tests must continue to pass.
- Multiple submissions: one step at a time (word order)  / Spacing Order  / Round Corner  / Level  / Status Color  / I'm sorry, but I'm not sure what to do.
  It's good to have a fallback problem.

## File boundary

You can only change:
  src/styles.css
  src/components/ui/statusDefaults.ts
  src/components/flow/MetroChart.tsx(Change source only)
  src/pages/Handoff.tsx(renumbered only)  61 All three hard code colors)
  docs/DESIGN_TOKENS.md(New)
  docs/PROGRESS.md(Handoff records only)
  S4 Handoff 's missing style (e.g.) named in the record  AskPanel It's...  card-text）

Do not change: any logic, netlify/**、src/engine/**、src/data/**Test assertion.

## At the end

1. docs/PROGRESS.md Handoff record plus one line, must contain a modified contrast numeric table
2. Submission of information: [S5][Claude] Brief description
3. git push -u origin design/s5-tokens
4. Don't merge. Don't touch it.  main。
5. In plain Chinese  Juanxi Reporting and must be accompanied by cross-references. Ask him a specific question:
   "Does it look more neat now, or just different? 」—— If he says so. "It just changed. ", describe the map
   It's not right. We have to go back.
```

---

### S6 . guardrail (lint + CI + accessibility)  ｜  Sonnet 5.5  ｜  must be after S5

```
You're...  Platypus Officer Hub Repository load guardrail. This is the most important part of the plan.  ——
Not because it changed something, but because it prevented the next one.  AI Repeat what has happened in the last three days.

Read first:
1. AGENTS.md
2. docs/AUDIT_2026-10-27.md Article  4.1 sections (historical of stylesheets) and  8.3、8.4 Section
3. docs/DESIGN_TOKENS.md（S5 It's just written. This is what you have to enforce.
4. docs/EXECUTION_PLAN_2026-10-27.md Article  3 Section  —— You are.  S6

## Why are you doing this?

src/styles.css By  11 Sub-submission, every time.  diff It's all " +N / −0"and never deleted anything.
A line. Five.  AI Each adds its own generation style to the end of the document, covering the first layer by "write below " .
The result is...  23 A restatement selector, 62 Oh, my God.  class、4 Coloured language.

S4 and  S5 Just clean these up. **If you don't load it, next.  AI It'll be back in a week.**

And now.  CI I can't control this. .github/workflows/ci.yml Just run.  build / test / e2e，
Nothing.  ESLintNo, I didn't.  Stylelint。GitHub Actions and  Netlify Two separate waterlines.  ——
Push.  main On the line, failure of testing will not prevent deployment.

⚠️ I'll confirm it.  S5 It's...  design/s5-tokens ♪ I'm in ♪  integration/v1.1-fix。
   Nothing.  token Table linter The rules cannot be written.

_Other Organiser
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # Confirmed.  [S5] Submission
  git checkout -b design/s6-guardrails origin/integration/v1.1-fix
  npm ci

## You're gonna do it.

### 1. Stylelint + 3 Rule

Load.  stylelint, configure at least three:
- font-size / border-radius / z-index **It's only for use.  token**
  （declaration-property-value-allowed-list or Equivalence)
- Divide  :root Outside **Ban  hex Colours**（color-no-hex (with exceptions)
- **Disable Repeating Selector**（no-duplicate-selectors）—— That's a straight line.  23 We're back from conflict.

→ Run and see how many violations there are. S5 It should be clean by now. If there's any left, fix it.
  Don't use it.  ignore Go around.
→ There are reasonable exceptions (e.g. data-driven internal variables), in line  disable Notes and justifications.

### 2. ESLint + Ban In-line  style

Audit findings  21 Inline  style={{...}}, of which about  8 It's used to overthrow the front.  CSS Temporary patches
（Help.tsx:23、NodePanel.tsx:125、AskPanel.tsx:144、TaskDetail.tsx:34、
Team.tsx:39、BoardSettings.tsx:27 # And wait #

→ Load.  eslint + typescript-eslint + eslint-plugin-react
→ Ban In-line  style，**But let it be legal.  CSS Variable Injection**（--pill / --tag / --a / --label-w /
  Data-driven  left/width These are proper usages, about.  10 (Values)
→ That's all.  8 Temporary patches: change to real  class。
  ⚠️ This needs to move.  styles.cssAnd...  S5 Just standing up.  token。Newly added  class We have to use only.  token。

### 3. Word ceiling becomes real

scripts/word-count.mjs He's not here.  CI Lee, so...  AGENTS.md §7.5 There's no word ceiling at this time.
Auto-constraint.

And more importantly,  scripts/word-count.mjs:13-15 Explicitly wrote "skip hidden suspension card and closed card
details」。**Which means, "The number of words per page is reduced."  60%*A part of the score is a product of measurement *  ——
The amount of information has not decreased, but has moved to places that are not visible to the users of the tentacle screen. **

→ (a) Change this skip behavior and count all text
→ (b) Add  npm run check and  CI
→ (c) ⚠️ It's almost certain that the word number will exceed.  AGENTS.md §7.5 upper limit
      （Today ≤160 / Events ≤180 / Rules ≤170 / Tasks ≤130 / Team ≤130 /
       Settings Each piece.  ≤125）。
      **Don't delete words just to cross the line.** —— That's why the explanation was hidden.  Juanxi Now.
      The complaint is that "I can't see what every piece is."
      → Good practice: Count live numbers and write them in handoff records, recommend  Juanxi Up ceiling or
        Change of caliber. It's a product decision, not a technical one. Let him decide.

### 4. Accessibility screening for blind areas

e2e/a11y.spec.ts There are now two blind areas:
- :7 It's just for me.  wcag2a + wcag2aa Label, **Not included  wcag21aa**# And so # 1.4.11 Non-text contrasts”
  And 2.5.8 The two rules are never running.  —— Audit findings  5 A contrast failure and  6 One.
  It's all in this blind area.
- :9 Yes.  test.skip(project !== "desktop")，**The moving end has never been swept.**♪ And the moving end is exactly
  hover It's not available. The most troublesome part of the layout.

→ (a) Add  wcag21a / wcag21aa Label
→ (b) Take off the moving end.  skip
→ (c) Fix the problem. Touch the target at least to fix it.  6 All of them  ≥24×24）：
      .m-dot 20×20（styles.css:552，Events (Major interaction)
      .heat-cell High  14px（:685，Team ♪ I'm trying ♪ ♪ I'm trying ♪
      .swatch 20×20（:615，60 Colours Button)
      .move-menu max-width 26px（:605, keyboard user only change state)
      .info ≈20×20（:476）
      .chain .dot 16×16 / compact 12×12（:487,493）
      ⚠️ It’s not the first time I’ve seen it, but it’s the first time I've ever seen it. Prefer transparent click area extension
        （::after Counterfeit elements  / padding + Negative  margin(b) Keeping sight low and shooting high.
→ (d) The keyboard test is now only authenticated.  3 One thing. / Focus  Ask、Enter Nodes, nodes. Escape Close.
      Add: Tab Order, focus management when the right bar is open, board change state.
      ⚠️ The focus management in the right column is now semi-finished.  4 Section: 7 There's only one detail.  3 The kind that moves the focus.
        No focus trap, no focus return after closing, and  ≤1199px when the right bar is a masked float,
        Keyboard  Tab It will go through the masked contents. **All fixes may be beyond this work package.** ——
        Write down the test first.  test.fixme It's fixed. The rest is in the handoff record.

### 5. CI Restricted.

Now push.  main → Netlify Get on the line right away. GitHub Actions A parallel run test. **Failure does not prevent deployment.**。

→ Put it on.  stylelint / eslint / word-count All in.  npm run check and  ci.yml
→ Write this down in Handoff's record.  Juanxi _Other Organiser  GitHub Repository On Settings
  branch protection + required status checksHe wants to order himself, you don't have missions.
  Do not use terminology as a step towards "where".

## Rigid requirements

- npm run check All green (should include now)  5 (Items)
- Don't use it.  ignore / disable Surrounding live problems. It's an exception. Just state the reason.
- Do not change any logic or text.

## File boundary

You can only change:
  package.json, package-lock.json
  .stylelintrc*, .eslintrc*(New)
  .github/workflows/ci.yml
  scripts/word-count.mjs
  e2e/a11y.spec.ts and others  e2e Test
  src/styles.css♪ Just to get inside the line ♪  style Change it to  class, touch the target)
  There.  8 There's a temporary line.  style components (delete only)  style Properties, Change to  class）
  docs/PROGRESS.md(Handoff records only)

Do not change: any business logic, netlify/**、src/engine/**、src/data/**

## At the end

1. docs/PROGRESS.md Handoff records plus one line must contain:
   - Live number of words  vs AGENTS.md §7.5 And what do you suggest?
   - What's in the right column focus management and what's the use?  test.fixme It's nailed.
   - Here.  Juanxi It's...  branch protection Operational Steps
2. Submission of information: [S6][Claude] Brief description
3. git push -u origin design/s6-guardrails
4. Don't merge. Don't touch it.  main。
5. In plain Chinese  Juanxi Reporting. Highlights: From now on, any  AI I want to go.  CSS There's one in it.
   numeric or colour, CI It'll stop directly.
```

---

### S7 - Explanatory Switch + Visible Subtitle  ｜  Opus 5.5  ｜  must be after S6

```
You're...  Platypus Officer Hub Repository brings back one of the most valuable essays on this project.
Project Manager  Juanxi Don't write code.

Read first (all necessary):
1. AGENTS.md
2. docs/AUDIT_2026-10-27.md Article  7.3、7.4 Section  —— v0.1 Where is it?  3 A design that's been thrown out.
3. docs/DESIGN_TOKENS.md —— S5 Stand up.  token Rules. You have to follow them.
4. docs/EXECUTION_PLAN_2026-10-27.md —— You are.  S7

## Background: What do you want to recover?

v0.1 Prototype (Photo) Juanxi There's a global switch.  **"Behind the scenes"**
(old code: public/legacy/index.html It's...  :396 Input Boxes, :925 It's...  bts() helper、
:1669 It's...  html.show-bts Switch.

Open it. On the interface. **Every number, every date, every single one.  AI The output points to where it came from.**：

  "Rule engine / startBy = finish-by date minus 2–3 business days"
  "Computed / sum(task.minutes) for open tasks starting within 14 days"
  "AIR Verdicts / choice: done|waiting|help|other · POST /api/replies/classify"

Today, this mechanism has been dismantled.  15 One.  details Collapse  + Dozens of suspended cards.  + One.  Help Page

**It's an argument.  AI In the case of interpretable honorary papers, it is precisely the interaction that is most valuable.**

⚠️【2026-10-27 Correct, read only) The audit report originally extrapolated " Juanxi It's an old version of the layout that I miss." And then he...
Send a screenshot to confirm.  **That's what he likes.**(See section II of this programme.  1.4 So that inference was denied.

→ You do.  C1 The reasons for this change: **It's not "get what he misses."**, but:
   ① The paper needs explanatory evidence.
   ② The contents of the suspension of Kari are not visible to touch screen users (audit No.  8.4 Sections, 4 Branch  hover-only）
→ So...  C1 Yes. **Increment Add**, not fallback. Do not change any vision of the current layout.

⚠️ public/legacy/ Could have been.  S2 Delete. Use  git Retrieval reference:
    git show 49b0b89:public/index.html > /tmp/v01-reference.html
  Check this out first.  commit And the path is right. If not, use it.  git log --all --oneline -- public/
   Find it yourself. S2 The handoff record should have written the right order. ）

## Good news: the material is all there.

The data structure of today already contains all the explanatory text and does not need to be regenerated:
  node.why
  sched.nodes[id].explain.{latestStart, club, official}   ← schedule.ts:44And every date comes with a "Why"?
  forecast.reasons + FORECAST_ASSUMPTIONS（forecast.ts:6-12）
  change.source
  rule.sources + rule.checkedOn
  contribution Source
All you have to do is show them on the ground.

_Other Organiser
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # Confirmed.  [S6] Submission
  git checkout -b feat/s7-explain origin/integration/v1.1-fix
  npm ci

## C1 · Behind-the-scenes Global Switches

→ Add a switch to the top bar src/components/Layout.tsx）。
  ⚠️ The top bar already exists.  5 A control, of which  3 This is a demonstration of the scaffolding. Demo Menu, View as、AI features），
    Audit opinion  8.6 The section says: 60% The global interface is a presentation tool." Don't make it the first.  6 One.
    Recommendations: and  AI features Switch to the same menu, or put in.  Demo Little Bill. You judge.
→ Every number when opened /Date /AI Show source (source) next to output  + (a) A line description).
  References  v0.1 It's...  bts() Write, but use today's.  token And components.
→ When it's closed, it doesn't take any space and no access.  DOM♪ Don't just  visibility: hidden —— That'll make
  The screen readers read it, and they'll get it.  word-count Count it down.
→ The status of this switch.  localStorage, refreshed and kept.

**This article addresses three issues simultaneously:**
1. The contents of the suspension of Kari are not visible to touch screen users (audit No.  8.4 Sections, 4 Branch  hover-only）
2. Juanxi Say, "I can't see what every piece is."
3. Explanatory arguments for the paper

## C2 · Put it on.  10 "Question" becomes visible text [downgrade: first question]  Juanxi】

⚠️ Juanxi I've never complained about "I can't read the page." —— This is an improvement recommended by the auditors, not in progress.  bug。
And he's confirmed to like the way it looks.

→ **Ask him before you do it.**: Show him an effect map with subheadings (which could be hand-painted or a new page as a demonstration).
  Ask him if he wants to. He said he'd do it again.  C1。
→ Do not default to start work.

src/routes.ts:13-24 Each page is defined as "the question answered on this page." This is the item.  IA Bones.
But...  src/components/Page.tsx:4 The note says: The page's question is the nav tooltip」，
src/components/Layout.tsx:75,81 Put it in.  title={p.question} —— **Browser Native  tooltip，
Hold it.  1 The second comes in, the touch screen doesn't exist at all. **

IA The bones were downgraded to an invisible attribute. And...  Page.tsx:9 Only the page title of one word is rendered.

→ Put it on.  question becomes visible subtitles: PageHead Heading for the next row.
→ Use  --fs-sm + --mutedDon't grab the main title.
→ ⚠️ It'll increase the number of words, and it could crash.  S6 Just added  CI .
  S6 There should be a recommendation on how to adjust the cap. If it's not decided, **Stop and ask.  Juanxi**，
  Don't change it yourself.  AGENTS.md §7.5 Numbers (which is the rule he has approved and which he would agree to).
→ Take care of it.  IA One question: routes.ts It's in there.  3 The "Question" on the page is...  2–3 A question.
  （/team"Who's overloaded, who's supposed to be recognized and when can we meet?" = Page  3 An unrelated card;
   /funding and  /events In the same way.
  → Do not reconfigure the page. Just rewrite the question into a really single one, and tell it in the handoff record.  Juanxi
    Here.  3 The page should actually be unbundled and left for later.

## Rigid requirements

- Compliance  docs/DESIGN_TOKENS.md。Do not write down any values or colours ( S6 It's...  stylelint I'll stop you.
- npm run check Green, including the new ones.  stylelint / eslint / word-count
- New interaction needs to be...  e2e Test: Switch is open, can be turned off, kept after refreshing and closed without content  DOM Lee.
- a11y Test continues, both desktop and mobile end
- Don't change.  AGENTS.md / PRODUCT_PLAN.md / RULES.mdQuestion first.  Juanxi）

## File boundary

You can only change:
  src/components/Layout.tsx, src/components/Page.tsx
  src/routes.ts
  src/styles.css(New)  bts associated styles, use only  token）
  Each  page / component Riga's line of comment on the ground.
  src/test/**and  e2e/**
  docs/PROGRESS.md(Handoff records only)

Do not change: netlify/**、src/engine/**(Except reading)  explain Fields, src/data/** Structure

## At the end

1. docs/PROGRESS.md Handoff log plus one line
2. Submission of information: [S7][Claude] Brief description
3. git push -u origin feat/s7-explain
4. Don't merge. Don't touch it.  main。
5. In plain Chinese  Juanxi Report and tell him to turn on the switch and look.  Today Page  ——
   He'll be told next to each date how it was calculated. Ask him to make sure he doesn't miss it.
   That feeling.
```

---

### S8. Touch screen downgrade + navigational reorganization  ｜  Sonnet 5.5  ｜  must be after S7

```
You're...  Platypus Officer Hub Repository for two end-of-life interactive modifications. Project Manager  Juanxi Don't write code.

Read first:
1. AGENTS.md —— Especially the first one.  7 Section
2. docs/AUDIT_2026-10-27.md Article  8.4 Section(s) hover-only List) and  7.4 Section(s) v0.1 _Other Organiser
3. docs/DESIGN_TOKENS.md
4. docs/EXECUTION_PLAN_2026-10-27.md —— You are.  S8

_Other Organiser
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # Confirmed.  [S7] Submission
  git checkout -b feat/s8-touch-nav origin/integration/v1.1-fix
  npm ci

## C3 · The suspense is downgraded on the tentacle screen to enable it to be expanded.

AGENTS.md §7.3 The third level of interaction is: look. → Stop (suspension card) → dots (details in the right column).
**Article  2 The level doesn't exist at all on the touch screen.**Because there's no touch screen.  hover。

Oh, shit.  :focus-within The prerequisite for recovery is that the trigger element itself can be focused. Audit inventory  4 Keyboards
I can't make it.  hover-only）：
  src/pages/Funding.tsx:54,60   6 Station logistics chain  —— None  onClickRendering  <span role="img">
                                 There's a line on the phone.  6 One.  12px No label dots, no text,
                                 There is no interesting explanation. **That's the worst part.**
  src/pages/Handoff.tsx:33-37,46  Quarterly Progress Chain
  src/pages/Handoff.tsx:116       First week inventory source
  src/pages/Funding.tsx:54        Phase  hint（showLabels={false} compact）

→ Yes.  @media (hover: none) Down, take it.  Hover Component rendering as clickable to expand  disclosure。
→ ⚠️ S7 I just added it.  Behind-the-scenes Switch, it uses the same explanatory text.
  **Reuse  S7 No more second set of mechanisms.** Read first.  S7 . Handoff records and codes.
→ Events There is also a related issue in the flow chart (audit No.  8.4 Section: On Touch screen  tap Open the right bar immediately.
  The card never appears, but the message is unique to Kari. ASU It's a complete deadline.  + Rules  ID、
  We've got one in the right column.  details Collapse.
  → More cell phones.  2 The next time you see what a desktop user can see is suspended. Handle it together.

## C4 · Navigator 2026-10-27 Canceled, only one small item retained.

⚠️ **The planned "navigation back to action orientation" has been cancelled.** Juanxi 2026-10-27 Send a screenshot to make sure he likes it.
The current version, including the current navigation (see Programme No. 1)  1.4 Section ). **Don't change any navigation labels.**

Only two uncontroversial little things remain:

→ (a) src/components/Layout.tsx:79 There is an empty, untitled breakup line:
     <div className="group" aria-hidden="true" />
     And...  styles.css Lee.  .sidenav .group It also retains the style of uppercase label text, but it never contains anything.
     → Give it a title.  "Reference", the interface text in English). It's a half-finished product.
       Not a design change.
     → ≤860px It's time.  display:none, the navigation becomes horizontally rolling  pill Article  —— It's the same as it is.
       A narrow screen that does not show group headings is reasonable.

→ (b) Restores the unread count of the navigation item. v0.1 Yes, not today. styles.css Lilian.  .sidenav .count
     The styles are gone. Data source: Unread notifications for the current role, Layout.tsx:132 It's already gone.
     → ⚠️ This will add visual elements. Let's start with a screenshot.  Juanxi Do you want to open it up to another entry?

**Don't do it.**: re-route navigation labels, re-order navigation, change navigation icons, plus secondary navigation.

## Rigid requirements

- Compliance  docs/DESIGN_TOKENS.md
- npm run check Full green (including)  stylelint / eslint / word-count / a11y Desktop +Move)
- Touchdown must have a moving end  e2e Test
- Don't change.  AGENTS.md / PRODUCT_PLAN.mdQuestion first.  Juanxi）

## File boundary

You can only change:
  src/components/ui/index.tsx（Hover Component)
  src/components/Layout.tsx
  src/components/flow/MetroChart.tsx
  src/pages/Funding.tsx, src/pages/Handoff.tsx
  src/styles.css(Use only)  token）
  src/test/**and  e2e/**
  docs/PROGRESS.md(Handoff records only)

## At the end

1. docs/PROGRESS.md Handoff log plus one line
2. Submission of information: [S8][Claude] Brief description
3. git push -u origin feat/s8-touch-nav
4. Don't merge. Don't touch it.  main。
5. In plain Chinese  Juanxi Report with old and new control tables attached to the navigation label for selection.
   And ask him to use his cell phone.  Funding It is confirmed that:  6 A dot can now be opened.
```

---

### S9. release freeze, document, merge online  ｜ opus 5.5  ｜

```
You're in charge.  Platypus v1.0 Release freeze. This is...  ASU Honorary papers  Phase 3 The last work package of the prototype,
When you're done, live participants will use it. Project Manager  Juanxi Don't write code.

Read first (all necessary):
1. AGENTS.md —— Full text
2. docs/AUDIT_2026-10-27.md —— Full text
3. docs/EXECUTION_PLAN_2026-10-27.md —— Full text
4. docs/PROGRESS.md —— S1 Present.  S8 All handoff records. Here's your check list.
5. docs/DESIGN_TOKENS.md

_Other Organiser
  git fetch origin
  git checkout -b release/v1.0 origin/integration/v1.1-fix
  npm ci
  npm run check     # It has to be green for it to continue.

## 1. Check  S1–S8 _Other Organiser

Article by article, listing:
- What does it say to do but not actually do it?
- What's the matter?  test.fixme It's nailed.
- What do you need?  Juanxi He hasn't decided yet.
Give me the list.  JuanxiLet him decide which ones have to.  Phase 3 We'll fix it. What can we keep?

## 2. Repair of documentation (old in the audit appendix)

- README.md:7 —— Still describing  v0.1（"the whole app in one file"、
  "Data storage is still in-memory"）。Change to the current live situation.
- AGENTS.md:81 —— Still writes: "The official web site remains  v0.1* And *  v1 Already  10/23 The merge's online.
- AGENTS.md:76 —— Say it.  Feedback The team's on the list.  Rules Bottom, actually moved to  Settings。
- AGENTS.md Article  6/6b Section  —— Overall outmoded (swipe map) /Gantchart deleted, peer deleted, new  token Table
  and  lint）。Change to the current code map.
- AGENTS.md Article  7 Section  —— Add the following sentence:  docs/DESIGN_TOKENS.md，
  It's only for use.  token」。
  ⚠️ AGENTS.md Yes.  Juanxi Rules document ratified. We have to change it first.  diff Show him, he agrees to change.
- docs/PRODUCT_PLAN.md —— Article  6 interface description and  11 section may need to be updated
  (Data layer continues to be  localStorage，Supabase Has been  Juanxi 2026-10-27 Decision to defer).
  He was also asked to agree.
- ⚠️ docs/PROGRESS.md Quoted in 253 unit tess  + 107 Numbers like "browser tests" **I'm not running.
  Authentication **(Audit)  9 Appendix to section ). Run once, replace it with live numbers.
  **These figures may be included in the paper and cannot be estimated.**

## 3. Clean-up of remnants

- Delete  ax.tmp.mjs(repository root directory, 11 Debug temporary files, hard encode the browser path of a machine,
  Function Already  e2e/a11y.spec.ts Overwrite)
- vite.config.ts:8 It's...  sourcemap: true —— Full release of production environment  source map。
  It is suggested to turn off (the code itself is publicly repository, not a bug, but a configuration that should not be opened by default).
- id The ones that increase themselves in the length of arrays. store.tsx:107 It's...  report:${length}、
  taskWorkflow.ts:79、store.tsx:205）—— You'll crash if you support deletion in the future.  ID。Change to stability.  id。
- Confirm  netlify/lib/ai.mts It's...  AI_TIMEOUT_MS Default  25000ms Whether to exceed  Netlify Synchronization function
  Implementation ceiling (audit No.  4.5 (a) The extract is an inference and needs to be measured). I'm fine.

## 4. A hard check before getting on the line.

- [ ] npm run check Full green, record live test numbers
- [ ] Do it manually: 10 Pages  × Desktop /Cell phone.  × Light /Dark
- [ ] Keyboard Walk Through: Use Only  Tab / Enter / Escape Finish 'Acquire a job'  → Change Status  → Done"
- [ ] Participant path exercise: Reset demo → Five-step settings  → Construction of an activity  → Create a mission.  →
      Question  AI It's a rule.  → Export data. We can't be stuck, we can't be white.
- [ ] S2 interactive log: do  10 Operation, Export, Check  JSON Lee.  10 It's all in order.
- [ ] S2 : confirmation effective and recording actual thresholds
- [ ] Hey, live.  DeepSeek Actual (not simulation): Ask Panel  + WP5 It's...  40 Question-rule assessment.
      ⚠️ docs/AI_TESTS.md Explicitly states that the simulation or local fallback cannot be described as live  AI Acceptance.
      If you can't get away with it because of the interview, **If actually recorded as incomplete**Don't be vague.

## 5. About  Netlify Access protection (%1) 11/4 Before, yes.  Juanxi Operation)

The official station is now full.  401Just log him in.  Netlify The account can open. It has to be turned off before sending out a recruitment e-mail.
**But that moment...  /api/* It's just that it's exposed to the internet.**

→ Confirm  S2 The current's in effect before he closes it.
→ Write a step-by-step note to him.  Netlify I don't know.
→ Also remind him to check.  AI_API_KEY Yes.  Production / Deploy Previews / Branch deploys
  It's filled in three places. docs/PROGRESS.md It's only filled out.  Production, which leads to the preview being simulated reply).

## 6. merge with tagging (need)  Juanxi Explicit "approval")

AGENTS.md Article  3 Section rules  4：main It's the official website. Just...  Juanxi Approval for merge.

→ Give him the results.
→ After he said "approved merge":  release/v1.0 Present.  mainFight!  v1.0 Label
→ Confirm  Netlify Successful deployment, /api/health Show live vendor connected
→ Yes.  docs/PROGRESS.md Write Final Handoff Records

## At the end

In plain Chinese  Juanxi Reporting:
- Which ones have been checked, which ones have not.
- How many things does he have to do on his own? Netlify Settings, branch protectionLet's get something straight.
- Live numbers that can be quoted in the paper (number, contrast, performance)
- There's nothing left to do.  v1.5
```

---

## 6. What you're doing now.

### Today (10/27, Tuesday)

1. **confirms this program**, in particular: Is there a rational division of conversation? Can you keep up with the schedule?
2. **intercepts an image that can see the blue frame and sends me** (point flow chart node or board card, full screen). S3 needs to be able to change things.
3. **Submits the audit report and this programme to GitHub**, otherwise 9 sessions will not be read later.
   Both documents are pure documents and do not affect the website. I can do that for you, but press AGENTS.md rules 4 needs to say "yes".
4. **Build the assembly branch** (I can do it for you):
   ```
   git checkout -b integration/v1.1-fix main && git push -u origin integration/v1.1-fix
   ```

### Wednesday (10/28)

Opens three **S1/ S2/S3** sessions (may be simultaneously). Sticks the entire section of 5 corresponding to the prompt.

### Thursday (10/29) . Submission of IRB

- S2 S3 to `integration/v1.1-fix` and then `main`.
- **IRB materials with "collect participants' interactive log and export"** (see 1.3, sect. 3). It's free to write about it now, and then we'll have to change it after approval, and we'll cut off your 11/9 test plan.

### After Thursday.

In the S4 → S5 → S6 → S7 → S8 → S9, one at a time. **11/4 must confirm that the S2 current is valid** before turning off Netlify's access to protection mail for recruitment.

---

## Section 7. My judgment on the schedule.

To be honest: **Thursday ( 2The goal itself needs to be clarified.**

The **function is actually done with** -- WP0 to WP5 work package in 10/22. What we're going to do before Thursday is not "compensation," but **, which allows us to be able to do it without being ugly.**: Buttons can be found, reacting, non-white screens, data don't drop, no point and so on.

This is the content of S1+S2+S3, **2, which is realistic** because three sessions can be held in parallel and each with a precise file and line number.

But one thing to remind you is that **live DeepSeek has never been measured. Both** `docs/PROGRESS.md` and `docs/AI_TESTS.md` clearly remember this gap - the key of Netlify's preview was filled in by Production, so the preview was always a mock answer, and 40 rule evaluation ran only over the model supplier.

If AI is really going to answer the student's question in the Phase 3 session, **has to be measured before 11/9 and cannot use simulations as** (`AI_TESTS.md` makes its own rules). I put it in S9, but **it may need to have a single session** because it depends on you filling key on Netlify and redeploying and possibly finding new problems.

Recommendation: **do live AI** as soon as the 11/4 access protection is turned off. Do not leave it to 11/8. If an AI is found at that time answering quality questions, you have 4 days to adjust prompt.

---

# Section 8. DP3 x DP4 mege (addition of 2026-10-27, current focus specified by Juanxi)

## 8.1, what are the two previews?

**Deploy Preview Number = PR Number.**

| | PR | Branch | Contents | Relative `main` |
| --- | --- | --- | --- | --- |
| **DP4** | #4 | `integration/v1.1-fix` | Main + S1/S2/S3 restoration (permissions portal, security data, performance quality) | +2,446 Rows |
| **DP3** | #3 | `feat/organization-setup-ai` | v1 + `src/phase1/` + `src/organization/`（Setup v3）+ `src/workspace/` | +29,773 Rows |

DP3 is "pure white" because its 4,567 line independence CSS (`phase1.css`/ `organization.css`/ `setupV3.css`) **does not achieve dark color mode**. Juanxi says he prefers light color (section 1.5), so it's a coincidence to add sub-items, not designs.

`v1` has the same content as `main`, so the common ancestors of **DP3 and DP4 are main**.

## Live result of 8.2 test merge (2026-10-27 running)

Link DP3 to DP4:

```
130 AutoMerge Success for File
 11 File Conflict
```

**Conflicts are all small conflicts.** Checks one by one:

| Documentation | Conflict block | Nature | Cost |
| --- | --- | --- | --- |
| `netlify/functions/{ask,chat,command,handbook-draft,nudge-draft}.mts` | 1 places | **Two names for the same parameter**: S2 plus  `endpoint: "ask"`(useage log)vs DP3 `task: "ask"`(Model route) | Every line. |
| `netlify/functions/{classify,parse-brief,plan-draft}.mts` | 0 | **Delete/modify Conflict**:S2 deletes them, DP3 just changed the line above. Verifyed DP3 `src/` and `public/` **No reference to the three endpoints of** | Directly accept deletion |
| `netlify/lib/ai.mts` | 2 Branch | DP3 `ChatJSONArgs` / `ChatJSONResult` S2 version **Strict Superset**  | Select the type of DP3 to call S2 logs back on |
| `src/main.tsx` | 1 Branch | ErrorBoundary + theme switch for S1 vs DP3 `phase1` Route import. **Both of them. We'll just have to stagger it.**  | 10 minutes |
| `docs/PROGRESS.md` | 1 Branch | Each side added a handoff record. | Both of them. |

## 8.3, a discovery of "get back and forth."

S2 does A8(e) user logs with only provider / model / time-consuming -- because at the time `ChatJSONResult` did not have token numbers.

`ChatJSONResult` for **DP3 already has all the fields S2 wants and cannot get:**

```ts
inputTokens, outputTokens, finishReason, headersMs,
requestedModel, reasoningEffort, servedReasoningEffort, routingVersion,
inputChars, outputChars
```

After **metge, S2 cost monitoring will directly complete** without extra work. This is one of DP3 supplement to DP4.

In turn, DP4 supplement DP3: ErrorBoundary, Data Export and Interactive Logs, Limit Flows, Theme Switches, Zero Delayed Suspends, Forecasts only once, Form Focus Style - DP3 none.

## 8.4 Conclusion: This is a session that can be done.

Of the 11 conflicts, **8 are one-line or zero-line**, and only `ai.mts` (two type definitions) and `main.tsx` (two staggered code).

**Expected 2–4 hours, a session.**

⚠ but merge only solves **code**. The interface to DP3 after metge remains its own 4,567 line CSS, and the main application is not a visual set. Visual integration is another thing, see 8.6.

## Prompt (M1) for 8.5 merge sessions

```
You take care of it.  Platypus Two.  Deploy Preview The merge becomes a version. Project Manager  Juanxi Don't write code.

Read first (required):
1. AGENTS.md —— Full text, in particular the first  3 Rigid rules and regulations **Article  8 Section Subdirectorate**
2. docs/EXECUTION_PLAN_2026-10-27.md Article  8 Section  —— Try the full result of metge, your job description.
3. docs/AUDIT_2026-10-27.md —— Background
4. docs/organization/V3_CHANGELOG.md(In )  DP3 (on branch) —— DP3 What did you do?

## Background

DP4 = integration/v1.1-fix（PR #4）= main + S1/S2/S3 Repair
DP3 = feat/organization-setup-ai（PR #3）= v1 + src/phase1/ + src/organization/ + src/workspace/

Run-off merge: 130 Automege success for a file 11 A conflict, all small.

⚠️ Article  8.2 It contains the nature and direction of each conflict, following its course and not rejuvenating itself.

_Other Organiser
  git fetch origin
  git checkout -b integration/dp3-dp4-merge origin/integration/v1.1-fix
  npm ci
  git merge --no-ff origin/feat/organization-setup-ai

⚠️ Never rename or delete.  integration/v1.1-fix、feat/organization-setup-ai、
  feat/ai-native-phase1、v1 These four branches. They're carrying them.  PR #2/#3/#4，
  If you move, it'll shut down.  PR And it's forever destroyed.  Deploy Preview Website (%1) AGENTS.md Article  8.2 Section ).

## Conflict resolution on a case-by-case basis

1. 5 One.  netlify Function  `endpoint:` vs `task:` ——
   **Uniform  DP3 It's...  `task`**(It is.)  AiTask Type, Participation Model Routes, More Information)
   And then...  S2 _Other Organiser  `task`。

2. classify.mts / parse-brief.mts / plan-draft.mts Delete /Modify Conflict  ——
   **Accept  S2 Delete**。Verified  DP3 It's...  src/ and  public/ None of these endpoints are quoted at all.
   After it's deleted, repository.  grep There was a confirmation that there were no references to residues.

3. netlify/lib/ai.mts ——
   **Take  DP3 It's...  ChatJSONArgs / ChatJSONResult**Yes.  S2 This post is part of our special coverage Egypt Protests 2011.
   Again.  S2 The user log calls back.
   → By way of completion: DP3 The return value has been brought.  inputTokens / outputTokens /
     finishReason / headersMs，S2 I couldn't get it. Now, remember that.
   → ⚠️ You can't appear in a log.  key、token Strings, user content.

4. src/main.tsx ——
   S1 It's...  ErrorBoundary + clearSavedDemo + Theme Switch ( A11and  DP3 It's...  phase1 Routes
   **Both of them.**。Scrabble, don't choose.
   → ErrorBoundary It has to be covered.  phase1 Routes ( DP3 I didn't.  ErrorBoundary）。

5. docs/PROGRESS.md —— Handoff records on both sides are kept in reverse order of date.

## I'll do it later.

- npm run check All green. ⚠️ DP3 Take your own test. organization.test.ts、setupV3.test.ts、
  phase1.test.ts、server.test.ts They're going to be all over now.
- We'll go through it manually.  **Two lines.**：
  (a) Main application: Today / Events / Tasks / Team / Funding / Handoff / Partners / Rules / Settings
  (b) DP3 Lines: /#/phase1/ Five chapters.  onboarding(constitution)  → Team  → Duties  → Activity Process  → Review）
- ⚠️ Juanxi I prefer it. **Light Color Mode**。Both lines have to be examined under light colour.
- Confirm  S1 Theme Switching Right  /#/phase1/ Also in force; If not in force ( DP3 He's got his own.  CSS，
  Probably not.  data-theme I don't know. **Write Handoff Records**Don't change now.  —— That's visual unity work.

## To  Juanxi Three things in the report.

1. **Server storage**：DP3 Yes.  netlify/lib/organization/storage.mts(Service-based storage organization configuration,
   Private workspaces reserved  7 Oh, God. This is different from the main application of data only on browsers.
   → Make it clear.  Juanxi：**There's something about it.  IRB Meaning, he has to know before he delivers the material on Thursday.**
2. **Two sets.  onboarding Simultaneous**: master application has  src/pages/Setup.tsx(five-step settings),
   DP3 There are five chapters.  onboarding, overlapping functions. **I can't give you both.  Phase 3 Participants look.**
   Listing the differences between the two, let  Juanxi Choose one.
3. **AI Vendors**：DP3 It's...  modelPolicy Use  Gemma 4 31B / Muse / GLM 5.3 Three roads.
   And the main application  DeepSeek。Which do you actually use after metge? How does the environment variable fit?
   → Find out and write it in.  docs/AI_SETUP.md。

## At the end

1. docs/PROGRESS.md Handoff log plus one line
2. Submission of information: [M1][Claude] Brief description
3. git push -u origin integration/dp3-dp4-merge
4. **New one.  draft PR**（base Use  mainHere's the thing.  Juanxi I can get a new one.  Deploy Preview
   And see what happens after the metge. **Do not close or modify  PR #2 / #3 / #4。**
5. Don't merge to  main。
6. In plain Chinese  Juanxi Report back to him, tell him about the site of the new preview and the three above-mentioned items that he was asked to decide.
```

## What's left after 8.6 metge?

Merge only solves code co-existence. The DP3 interface is still its own 4,567 line CSS.

**Cheap Practices (Proposal):** and S5 token Tables are completed, so three CSS files for DP3 can be replaced with one set of consumption token
(number, spacing, rounding, state color, light-deep colour). Don't touch that 5,200 line TSX. The results don't match the pixels, but they do.
It's obviously the same product. This should be **S5b** after S5.

**(Phase 3 later):** writes about the configuration of the DP3 organization and the adaptor for the main application `DemoState`.
Redone five chapters onboarding with the primary application of 5 components. This is v1. 5 workload.

---

# 9 Four decisions of Juanxi and DP3/DP4 integration (2026-10-27 evening)

## 9.1 Four Decisions

| # | Resolves | Impact |
| --- | --- | --- |
| 1 | **The server for DP3 is stored without deletion, hidden**  | `netlify/lib/organization/storage.mts` and `org-*` function is reserved, but the participant path cannot be reached. **See 9.2 IRB Request** |
| 2 | **Onboarding Two sets of**: Integration of DP3 onboarding into DP4 | The biggest piece, see 9.4. |
| 3 | **AI instead of DeepSeek, switch to DP3 route** (Gemma 4 31B/ Muse/ GLM 5.3). Juanxi: tested and returned fastest. | See 9.3 |
| 4 | **Keeps the subway route map for DP4,**, not the flow chart for DP3. Juanxi: "It's neat, like a subway route map. It's better than DP3." | It's a direct decision on how to solve a 9.4 conflict. |

Juanxi's future plan (**not now**): lets setting and onboarding also use the same metro pattern style and allow users to adapt themselves.

## 9.2 "hidden" must be defined, otherwise IRB will have problems.

"Hide" can't just be "no entrance on the interface." As long as `org-setup.mts`/ `org-archive.mts` is alive on the public web, it is still a **server that can receive and store data**.

**Hide = Three simultaneous:**

1. **There's no path to it on the interface.**(Participant missing)
2. **Endpoint directly rejects** in the production environment: read an environmental variable (e. g. `ORG_SETUP_ENABLED`), returns 404 or 403 without opening, and does not execute any storage logic
3. **code and test to keep all**. You can bring it back anytime you want.

To do this, the IRB material of Juanxi does not require **to write** "Service Storage Organization Configuration" -- because participants do not really have data on the server.

It's not enough just to do 1. In that case, the protocol must write on the server 's storage, otherwise it would be a protocol and actual discrepancy.

**this one must be confirmed before IRB is delivered Thursday.**

## 9.3 AI Vendor to DP3 Route

The `src/organization/modelPolicy.ts` definition for DP3 is based on:
- **Gemma 4 31B** - Longer Structural Settings Task
- **Muse** - Short Dialogue and Editor
- **GLM 5.3** - Only when the user requests the Deeper review

⚠  DP3’s own document (`docs/organization/V3_CHANGELOG.md`) says, "The selection is not a proven performance ranking." Juanxi says that the fastest return was measured, **based on his measurements**, but does not write it as a "certified performance ranking" in the paper.

**To do:**
- The main applications of `/api/chat`, `/api/ask`, `/api/nudge/draft` and `/api/handbook/draft` are all rerouted to DP3
- Bring the `task` parameter (`AiTask`) to these four endpoints so that routers can choose the model.
- Update `docs/AI_SETUP.md`: How to match the environment variable and how to replace DeepSeek
- ⚠  `AGENTS.md` Section 3 Rule 5 states that "Phase 3 with DeepSeek for development and live participants must use ASU Air (or IRB-approved supplier)".
  The **supplier is to confirm whether the new model is within IRB approval. It's something Juanxi and Marcie are going to confirm, not that AI can decide.**

## 9.4 The core question: Are the two data models right or not?

Juanxi asks, "What's most important is whether the variables and components of the merge are fit." Field-by-field reconciliation results:

### It's clean to the top.

| DP3 | Main application | Annotations |
| --- | --- | --- |
| `OrgRole.id` | `Role.id` | DP3 specializing in stable ID, just in time. |
| `OrgRole.title` | `Role.displayName` | ✅ |
| `OrgRole.description` | (New field) | Low risk |
| `RaciRow.responsible` | `Node.ownerId` | ✅ |
| `RaciRow.accountable` | `Node.approverRoleId` | ✅ |
| `RaciRow.consulted` | `Node.consultedRoleIds` | ✅ |
| `RaciRow.informed` | `Node.informedRoleIds` | ✅ |
| `FlowNode.dependsOn` | `Node.dependsOn` | ✅ |
| `FlowNode.title` | `Node.title` | ✅ |

The group of **RACI is close to one, and that's the best news.**

### Five real conflicts, one decision for each.

**① `departmentId` vs `RoleFunction`- Two different axes.**

DP3 According to **Sector** (Programs & Planning / Event Losistics / Finance / Marking & Community / Outreach & Partners / Leadership & Records, 6).
Main Apply Press **Function Enumeration**min ( `RoleFunction`：president / vice_president / treasurer / …）。

The **process template, flowcharting swimming lanes, roll manual catalogue** is all attached to `RoleFunction`.

→  **is not a corresponding**, requires a map and will be more than one.
Decision: **reserves `RoleFunction` as the main key** (engine relies on it) and stores `departmentId` as an additional tab for group displays and colours. Keep both, don't choose one.

**2 `FlowNode.position{x,y}` Manual coordinates vs subway map automatic layout -- Juanxi has selected**

The main application of the metro map `src/components/flow/metro.ts` is the **pure layout algorithm** (with unittes), without coordinates.
The `FlowEditor.tsx` (code 397) of DP3 allows users to drag nodes and store x/y in data.

**Juanxi explicitly likes the subway map and not the DP3 flow chart.**

Decision: Discard `position` on **import using `metro.ts` automatic layout**. DP3 `FlowEditor.tsx` does not migrate.
He said, "The future allows the user to change itself," not by going back to manual coordinates, but by **to reorder and depend on the user, the layout still automatically counts as**. Put it in the future plan, not now.

**3 `dependencyMode: "all" | "any"` -- engine doesn't know "any"**

The main applications of `topoOrder()` and `computeSchedule()` only support "all upstream completions to start".

Decides: **Accept only when importing `all`**。 When you meet `any`, you reject and clearly tell the user not to pretend to be `all`.
→ ⚠️ **Don't change engines for this.** `src/engine/` is the closest and most prosthesis-value code tested throughout the project, and the risk of changing it far outweighs the benefits.

**Date: `FlowNode.timing`vs. "Only the engine counts the date."**

`AGENTS.md` Section 3 Rule 3 is the core principle of the entire project. DP3 `timing: RelativeTargetSchema` is the relative target.

Decision: The `timing` for DP3 can only be translated into the **`Node.anchor` (rule/target/fixed/followup)+ process template of the main application** and then handed over to `schedule.ts`.
→  **cannot write the DP3 text directly into three date fields under any circumstances.**

**5 DP3 No "human" concept**

The output of DP3 onboarding is **roll** (`OrgRole`), not human.
and the main application(s) `canLead`), circulars, workloads, reminders, contribution lists **Hang on to them all. `Person`Let's go.**。

Decision: integration must take **more than one step to "who acts as each ruler"**. You can use the existing `Join.tsx` five questions from the main application, or add a screen after the "team" chapter of DP3.
It's not a step to be saved. There are no data on Tasks / Team / Today after that.

### Non-movement

| PDP3 stuff. | Why not? |
| --- | --- |
| `FlowEditor.tsx`(manual drag flow chart) | Juanxi chose the subway map. |
| `phase1.css` / `organization.css` / `setupV3.css`(4,567 line) | Third design system. UI Redo with the primary application of 5 components |
| `src/workspace/`（Activity workspace）| Juanxi did not request and overlaps with Events/Tasks page responsibilities. **, hold still. Stay on branch**. |
| `OrgAction` → `Node` | The concept is different: Action is the job entry without a date, and Node is the task of three cut-off dates. Action is better suited to become **process template**, not task |

## 9.5 The exact reason why AI is "so stupid."

Juanxi: "I want to set up an excutable task, and it doesn't understand, and it helps me completely with the event workflow. 」

**has three layers, all in prompt and regulars, not models.**

**1 System prompt activity** (`src/lib/chatCards.ts`)

```
{"kind":"form","intent":"plan_event", ...} whenever the user wants to
   plan, host or organize a NEW event.
```
The word "organize" is too broad. While `add_node` (building a single task) is buried in the list of "Sown for application first", **has absolutely no indication when to use it or when to use activity form**.

**2. Of the four examples, zero is a single task.**.

The first example is the "I want to plan a mixer" activity form. All the examples that the model sees are teaching it "Users want to do something = run an event."

**3 Locally unable to connect** (`src/lib/commands.ts:143`)

```js
/^(?:add|create) (?:a )?(?:task|node|step)\s*[:：]?\s*(.+)/i
```
It must start with `add` or `create` and follow closely the task/node/step.
So `I want to set up an executable task…` **doesn't match**, directs it to AI, and AI's a priori is active.

**4 There is also a hidden**: `src/data/changeReview.ts:18` which requires that `add_node` **without `eventId` must first confirm a date**, while the default date is empty. So even if AI was right, the user point Apple would still be wrong.

### It's all cheap.

1. Prompt Ric added a **clear alternative judgement**:
   - The user's gonna do it. **Activities with dates, venue and budget** → `plan_event`Form
   - The user wants it. **It's an independent thing.**(not in any activity) `add_node`，`eventId: null`
   - I'm not sure. Ask a question under 2, don't guess.
2. **Make it two. `add_node`Example:**Prompt, one of which is clearly a stand-alone mission
3. **Exploiting local norms**: Catching `set up a task`/`I want to create a task` / `new task` / `make a task` / `add an executable task`
4. **Give a default date to an independent task**(e.g., `addDays(today, 7)`) Do not allow users to face a blank

## 9.6, do it in three sessions, not once.

| Session | Do what? | Model | When? |
| --- | --- | --- | --- |
| **M1** | Mechanical merge + cut AI route + hidden server storage | **Opus 5.5** | Now, by Thursday. |
| **M2** | Fix AI comprehension (independent tasks vs activities) | **Opus 5.5** | After M1, Thursday. |
| **M3** | Onboarding Unit I (write adapter + redo UI with main application component) | **Opus 5.5** | **After Thursday**, IRB Waiting |

**Why M3 is scheduled after Thursday:**, it's going to write a adapter for two data models and deal with five conflicts in 9.4, then redo five chapters onboarding with the components of the main application. It's not a two-day job, it'll be worse to get out than it is now.

And IRB materials describe **to study how to do**, not every pixel. When M1 + M2 is completed, the prototype is functionally complete, not ugly, responsive and sufficient to deliver material.

---

# 10 . Juanxi 2026-10-27, second set of guidelines for the evening

## 10.1 AI Vendors: problems clarified, but `AGENTS.md` Rules 5 expired

Juanxi: All interfaces go straight to ASU AIR, where the data are in ASU servers and databases, only on models; The project will no longer be used by DeepSeek.

The records in **support this statement. `AGENTS.md` of**:DP3 has written `muse-glimmer-30b`, `glm-5-3`, route v3 (Gemma Long Structure Task / Muse Short Editor / GLM Active Depth) and refers to "no consumption of the AIR amount" - these models have been adjusted through AIR.

**The data processing layer is no longer an open issue and should not be repeated.**

### But there's a real problem: `AGENTS.md` contradicts itself.

```
Article  23 Lines (both branches):
  5. **AI Vendors:** Development  DeepSeek, processing only field data;
     Live participant  Phase 3 Sessions must be used  ASU AIR(or)  IRB (a) Approved suppliers).

Article  128 / 137 / 140 Lines (only)  DP3 Yes:
  The new default model for speed priority is  muse-glimmer-30b；glm-5-3 Only active selection by the user …
  Default  MuseOnly clear.  Deeper review Use  GLM。
  Routes v3：Gemma Long-term structural tasks, Muse Short editing, GLM Active depth.
```

**line 23 has never been updated. In the same document,** says "with DeepSeek" in the hard rule of 3, and the code map of 6 says "with Muse/GLM/Gemma". `AGENTS.md` Section 1 requires every recipient of AI **to read section 3**.

• **M1 must change line 23 to**, otherwise the next AI will follow outdated rules.

## 10.2⭐  Sorting interactive and date variables: the good news is **The date logic has been fully realized.**

The interactive design proposed by Juanxi:
- Do not drag nodes on the road map (too hard to operate)
- Change to survey 'sorting question' format: drag icon with three crosslines on the left, drag order
- Two tiers: **Large Order** (large process that needs to be carried out separately)/ **Small Sorting** (set in large order, one big below which can put 5 small)
- One day for each big and small option to the right.
- Right road map automatically calculated and updated in real time
- Date cannot be a single cut-off date, must be broken down: school cut-off day / club deadline / everyone's different latest start
- Organisation requires advance N days to apply all tasks as a variable
- Organisational reminder days + time required to process
- Users can adjust to create a new alarm date (e.g. 2 Day Reminder)

### Check the existing code on a line-by-line basis: **It's not a bad logic. It's all in the engine.**

| Juanxi describes it | It's already in the code. |
| --- | --- |
| Number of days required to process | `Node.effort` — Since text: "Working days of effort, used for the least start date" |
| Organization requirements advance N days | `OrgSettings.clubBufferBusinessDays`(default 3 working days) |
| School closing date | `Node.officialDeadline` |
| Club deadline | `Node.clubDeadline` |
| Everyone's different. | `Node.latestStart` |
| What's the count? | `schedule.ts` Document comment: "Latest start = Club deadline minutes effort days and the owner's personal buffer, on the owner's working days" |
| The user adjusts on latest start | `Person.personalBufferDays` + `personalBufferEnabled` |
| Inverted from target date | `schedule.ts` Inverted Pass |
| Order of impact date | `Node.dependsOn` + Pick when pushing backwards"One working day prior to the start day of downstream swim" |
| **Large Sort / Small Sort** | **`Phase`(plan / prepare / money / marketing / run / close, 6) = large order; In the same Phase `Node` ♪ Small Sorting** |

**Conclusion: All you have to do is edit the interface, and you don't have to write a date math line.** and "big order" just happens to be the station on the subway map at 6.

### So the M3's hard constraints

1. Sorts UI **with only two fields**: `Node.dependsOn` (order) and `Node.effort` (days), plus `Node.phase` (large sorting belonging).
2. **UI cannot write any date field at all.** Change `applySchedule()` to allow `schedule.ts` to recalculate three dates. This is the iron law of `AGENTS.md` 3 rule 3.
3. Real-time update of the right subway map = rerun `computeSchedule()` + `metro.ts` layout, **not storage coordinates**.
4. Do not change `src/engine/` for this function.

## 10.3 Conflict 3 `dependencyMode: "any"` - Juanxi empowers me to decide

**Decision: Only `all` is accepted at the time of import, `any` expressly rejects and tells the user not to change the engine.**

Rationale: `topoOrder()` and `computeSchedule()` are the closest and most prosthesis-value codes tested throughout the project (`engine.test.ts` for illustrative activity 20 step by step to assert three dates). For a DP3 to modify it with characteristics that have been used but never required by the main application, risks are much greater than benefits. When there is a real need for "any upstream completion is sufficient", it can be expressed in a condensed node, without the need to change the algorithm.

## 10.4 people, rule, sector level: change to "human"

Juanxi: Each member has its own account number, logs it in; Remember assigned position, position belonging to department. The **level is dominated by "persons", not positions.** sends a link to members, members register with their own account code, not a common account number.

### This one has to be broken in two.

**1 Data modelling (can be done now, low risk)**

Target level: `Person` — `Role/Position` — `Department`

Status: `Person.roleId` has pointed to `Role`, so "people have roll" has been established. What's missing is:
- `Role` does not have `departmentId` (DP3 has 6 departments, just to add, see 9.41)
- `Role.holderId` and `Person.roleId` are **two-way redundant**, which is easily inconsistent. **`Person.roleId` is the only truth.**, `Role.holderId` should be changed to derivative value or deleted.

This is part of **M3**, and onboarding.

**2 Live Account Password Login**

"Each member registers with its own account number and password" means:
- Live Identification
- Live user account on server
- That's the kind of work that was postponed (section 10 of the audit report, line D of the execution programme)

And the earlier decision of Juanxi 10/27 was: **Phase 3 using field data, not Supabase, participants using false information we have provided**.

The **decisions are in conflict with each other.** needs to be clear:
- **A：Phase 3Still using false information**, live account number to v1. 5♪ M3 Just do one, level becomes man-centred and doesn't log in
- **B: Phase 3 takes live account**  →  Reboot of the D line (Supabase+ authentication) and **IRB scope needs to be changed to**, conflicting time with his 10/29 submission

• Recommendation A of **.** Level Modelling and Certification is two things: modeling is done first, and certification can be added at any time.

## 10.5 M2 changed to two steps: pre-prompt strategy, audit and then implementation

Juanxi requests that M2 first repeat the strategy and structure of Prompt, which he will verify before it is implemented.

- **M2a (Research and Programs, No Code Change)**: Read `docs/PRODUCT_PLAN.md`, section 2 "Interview Conclusions: Determination of 8 Assumptions" (repository's only live pain record); In accordance with `AGENTS.md`, section 3 rule 1, the original research materials are not and cannot be found in the report) together with the four-tier diagnosis of 9.5, produce a prompt strategy document for review by Juanxi.
- **M2b (execution)**: `chatCards.ts`/ `commands.ts`/ `changeReview.ts` after approval.
