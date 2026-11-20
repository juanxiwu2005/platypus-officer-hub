# Platypus execution plan (post-audit)

**Written: ** 2026-10-27 (Tuesday)
**Based on: ** `docs/AUDIT_2026-10-27.md`
**Prerequisites: ** Juanxi's three decisions on 2026-10-27 (see Section 1)
**Status: ** Awaiting Juanxi's confirmation before execution

---

## Section 1 · Juanxi's three answers and what they change

### 1.1 "What I miss most about the second version is its response speed. It was really fast; there was no waiting."

**→ This moves performance from "later" to the top priority and identifies the exact cause.**

Section 9 of the audit originally stated that "the 1000 iterations in `forecast.ts` are not a problem at the current scale; optimizing them now would waste time." **That conclusion now needs correction**: it holds only for "whether the machine computes quickly, " not for "whether it feels quick to a person."

Two verified causes:

**① Every hover requires a 300-millisecond wait**

```css
/* src/styles.css:471 (hover card) and :572 (flowchart node card) */
transition: opacity .12s ease .3s, visibility 0s linear .42s;
                              ↑ 300ms delay
```

Hover → **wait 300ms** → another 120ms fade-in → a total of **420ms** before anything is visible. Moving away also takes 420ms before it disappears.

All transitions in the second version (v0.1, the one you liked) were `.15s` / `.2s`, with **no delays at all**:

```
$ grep transition public/legacy/index.html
transition: background .15s
transition: opacity .2s, transform .2s
transition: transform .15s
transition: none
```

`git log -S` confirms that the 300ms delay was introduced by **`5bde479`, "v1.1 simplification redesign"**: **exactly the version you began to dislike**.

**This is a 1-line CSS fix.**

**② Forecasts are recalculated 3–5 times**

```
src/pages/Today.tsx:19     useMemo(() => computeForecast(state), [state])
src/pages/Events.tsx:28    useMemo(() => computeForecast(state), [state])   ← separate caches
src/lib/aiContext.ts:18    computeForecast(s)        ← every Ask message
src/lib/assistant.ts:72    computeForecast(s)        ← within the same answer
src/lib/assistant.ts:82    computeForecast(s)        ← once again
```

There are 5 call sites with no shared cache. Each first runs the entire schedule, then performs 1,000 simulations. **Sending one Ask message = 3 complete forecasts.** On top of that, every store change runs `JSON.stringify` on the entire data bundle and writes it to browser storage.

Fix: consolidate into one `useForecast()` so the entire app calculates it only once per state change.

### 1.2 "The blue outline draws too much attention, like Guided Access. Remove it first."

**→ Confirmed after Juanxi supplied a screenshot on 2026-10-27: we did not draw that outline; it is the browser's native focus ring.**

Screenshot: the numeric input for `Submit budget request` on Settings has a bright blue ring around it when focused.

Key evidence: **that blue is not one of this project's colors**:

```css
/* src/styles.css:53 — the project's only focus style */
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
/* --accent = #0f766e, teal, not blue */
```

Also verified: **the entire repository contains no focus styles for input / select / textarea and no code handling
native browser focus rings** (`grep -n "webkit|focus-ring|outline: *none" src/styles.css`
only matches `.task-detail h2:focus`, `.panel h2:focus`, and two unrelated `-webkit-` properties).

→ Conclusion: this is the browser's native focus ring for form controls. When Juanxi calls it "Apple's," he may mean that literally:
  macOS / Safari draws its own blue focus ring on form controls, which the author's `outline` does not override.

⚠️ **To confirm: whether Juanxi uses Safari or Chrome.** The fixes differ slightly; ask before starting S3.

### This rule cannot simply be deleted

v0.1 (including its use of `:focus-visible`) is exactly the same as today, and Juanxi likes both. Also:
- `:focus-visible` **appears only for keyboard users**; mouse clicks do not trigger it (text/number inputs are an exception:
  the specification also matches them on click, which is exactly what appeared in the screenshot).
- It is a hard requirement of WCAG 2.4.7 "Focus Visible"; removing it immediately fails `e2e/a11y.spec.ts`.
- ASU has an accessibility policy; the thesis cannot say "we removed keyboard focus visibility."

### Correct fix

```css
/* 1. Remove native rings from form controls */
input:focus, select:focus, textarea:focus { outline: none; }

/* 2. Replace it with our own subtle ring (only for keyboard and text input) */
input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--accent);   /* Teal, not blue */
  outline-offset: 1px;
}
```

Safari may also need handling for `-webkit-appearance` / number-input spinners. Use Juanxi's
actual browser test as the reference.

### Also address the "selected state"

These two additions in v1.1 are also heavy and conflict with Juanxi's request for "simple and refined":

| Location | Code | Problem |
|---|---|---|
| `styles.css:560` | `.m-node.is-selected .m-dot { outline: 3px solid var(--accent); outline-offset: 3px }` | A 20px dot has a 3px-thick ring 3px away; the ring is almost as large as the dot |
| `styles.css:686` | `.heat-cell.all { outline: 2px solid var(--accent-ink); outline-offset: -1px }` | Team heatmap |
| `styles.css:240` | `.flow-step.is-selected { box-shadow: ... }` | **Dead code** (the swimlane diagram was removed); delete it |

→ Replace the thick outer ring with a subtle background + 1px border (as Linear / Notion / monday do).

### 1.3 "Use fictional data; do not add Supabase yet"

**→ Cancel all of Track D (the data layer). This saves substantial work and makes IRB much simpler.** This is the right decision.

But three consequences must be addressed:

**① Browser data protection now has higher priority.** Since localStorage is the only storage, audit item A7 ("one data-structure change silently wipes every user's data") changes from a "potential issue" to "everything a participant did in a 60-minute session could disappear after one code push." **A7 must be done, before Thursday.**

**② The clock no longer needs fixing.** The demo clock fixed at `2026-10-22` originally looked like a problem, but your plan already says "every Phase 3 participant sees the same date" (10/22 decision record). **So this is a feature, not a bug; leave it unchanged.** (The calendar expiring on 2027-05-08 still needs extending, though. That takes half an hour, and doing it now is cheaper than doing it later.)

**③ You can still have data governance without a server.** Here is an approach I just thought of:

Add an **append-only event log in the same localStorage** at the reducer integration point (`store.tsx:104-245`, one switch covering all 40 action types). At the end of a session, the participant clicks "Export session" and gives you the JSON.

You then have: who did what, at which second, and the value before the change. **Zero servers, zero Supabase, zero databases, but real evidence for the thesis's claim that "data governance is the foundation."**

⚠️ **This must be included in the IRB materials submitted on Thursday.** The export contains no real names (participants use the fictional details you provide), but "collecting participants' interaction logs" is itself data collection and must appear in the protocol. **Adding it now costs nothing; adding it after approval requires an amendment that could derail your plan to begin testing on 11/9.**

### 1.4 [Correction, 2026-10-27] Juanxi likes **the current version**, not the old one

Juanxi sent a screenshot saying, "This is the version I like." Checking each element shows that it is **dark mode in v1.2 (the version currently
running on main)**:

| Element in the screenshot | Code location | Introduced in |
|---|---|---|
| Right-rail `Ask \| Details` tabs and "Looking at: Today ×" | `src/components/rail/AskPanel.tsx` | v1.1 |
| Plan/Prep/Money/Promo/Run/Wrap dot chain | `Chain` (`ui/index.tsx`) | v1.1 |
| Purple "Waiting" / gray "Not claimed" | 6 colors in `ui/statusDefaults.ts` | v1.1 |
| "Demo · Thu, Oct 22" pill | `DemoMenu` | v1.1 |
| Horizontal line between Rules and Settings | Empty group div in `Layout.tsx:79` | v1.1 |
| Semester goals ring | `Ring` (`ui/index.tsx`) | v1.1 |

Neither v0.1 nor WP0–WP5 **had** a right rail, Chain, or StatusPill, so those two generations can be ruled out.

**→ The inference in audit section 7.4 ("he misses the second version's card layout with headings and explanatory text") has been disproved.**
That statement was marked as an "inference" in the report. We now have contrary evidence and should follow it.

### What this changes

| Original plan | Change to | Reason |
|---|---|---|
| C4 Return navigation to an action-oriented structure | ❌ **Remove** | He likes the current navigation |
| C5 Restore the Gantt chart | ❌ **Remove** | He never requested it |
| C1 Behind-the-scenes switch | ✅ Retain, **with a different rationale** | No longer "recovering something he misses, " but ① the thesis's explainability argument and ② touch users cannot see hover-card content |
| C2 Turn questions into visible subtitles | ⚠️ **Downgrade to asking Juanxi first** | He has not complained that he cannot understand it; this is an improvement, not a bug fix |
| S5's purpose | ⚠️ **Change from "establish a design system" to "formalize the current appearance"** | See below |

### Change in S5's purpose (important)

Juanxi can **like this dark green appearance** while the underlying code **really is a mess**—those two things do not conflict.

23 font sizes, 4 color systems, and 19.7% dead CSS are a problem of "no one can safely change it," beyond simply "it looks ugly."

**S5 therefore needs to express the current appearance through a consistent set of rules, rather than redesign it. The interface should
look almost identical afterward**, changing only from "23 arbitrary font sizes" to "6 levels." The S5 prompt must make
this explicit, or Opus will be tempted to "improve" the visuals.

### 1.5 [Further correction, 2026-10-27] Juanxi actually prefers **light mode**, and currently cannot select it

Juanxi added: "Actually, I don't really like dark mode. I still prefer light mode."

So the screenshot in §1.4 is dark simply because **his computer's system theme is dark, and this app gives him
no choice**. His “dark green version” refers to the brand's teal (`--accent #0f766e`), not
dark mode.

**→ The previous plan's "S5: treat dark mode as the primary context" is superseded. Light mode comes first.**

### Verified: the theme switch is missing, but the CSS has long been ready

```css
src/styles.css:27   color-scheme: light;                              /* Light by default */
src/styles.css:29   @media (prefers-color-scheme: dark) {
src/styles.css:30     :root:not([data-theme="light"]) { ... }          /* Follow the system unless light is forced */
src/styles.css:39   :root[data-theme="dark"] { ... }                   /* Force dark */
```

The CSS **fully supports** both forced overrides, `data-theme="light"` / `data-theme="dark"`.

**But no line of code anywhere in the repository sets `data-theme`.**
(`grep -rn "theme|Theme" src/components/ src/pages/Settings.tsx` returns zero matches.)

→ Consequence: **this app can only follow the operating system; the user cannot choose.** Juanxi's Mac uses dark mode,
  so he has only ever been able to see the dark version.

→ Fix: set `document.documentElement.dataset.theme` on `<html>` and save it to localStorage.
  **No CSS changes are needed**; the hook is already there. About 20 lines.

→ Ownership: this only requires changes to `Layout.tsx` and `main.tsx`, both **S1 files**,
  without touching `styles.css` (exclusive to S3). Assign it to S1 as **A11**.

### How this affects Phase 3 (more than it appears)

Participants will see a theme determined by **their own computer's system settings**. If half use dark and half light:
- Research conditions differ (while the decision in section 16 of the plan specifies "every participant sees the same dates" precisely for consistency).
- Audit section 8.2 also found that **6 status colors have no dark variants**, with only 2.96–3.65:1 against surface on a dark background,
  and `--line` only 1.30:1. Dark mode looks noticeably worse.

→ **Recommend forcing light mode by default for Phase 3**, but this is a product decision for Juanxi.
→ S5 must still fix those dark-mode contrast issues (they are objectively broken), but **after light mode**;
  they are no longer the primary focus.

---

---

## Section 2 · Revised schedule

| Date | Day | Event | What must be completed |
|---|---|---|---|
| **10/27** | Tuesday | Today | Confirm this plan; submit the audit report to GitHub |
| 10/28 | Wednesday | Implementation | **Stage 1** (3 parallel chats) |
| **10/29** | **Thursday** | **Submit IRB** | Complete functionality, no obvious bugs, fast response. **Include interaction-log export in the IRB materials** |
| 10/30–11/1 | Friday–Sunday | Waiting for IRB | **Stage 2** (design system, executed sequentially) |
| **11/2–11/3** | Monday–Tuesday | IRB approval | Continue Stage 2 |
| **11/4** | **Wednesday** | Send recruitment email | Disable Netlify access protection (**rate limiting must be completed first**) |
| 11/5–11/8 | Thursday–Sunday | Final work | **Stage 3** (explainability) + finalize |
| **11/9** | **Monday** | Begin real testing | Freeze and tag v1.0 |

**The boundaries between the three stages are firm:**

- **Stage 1 (today → Thursday) = usable, no data loss, feels fast.** Leave the visual system alone.
- **Stage 2 (Thursday → Sunday) = design system.** Change only CSS and lint configuration in this stage; add no features.
- **Stage 3 (11/5 → 11/8) = restore comprehensibility.** The part with the most thesis value comes last because it depends on the first two stages.

**11/4 has a hard dependency:** sending recruitment emails means disabling Netlify access protection, at which point your AI key is exposed to the public internet. **So A8 (rate limiting + removal of redundant endpoints) must be completed before 11/4**. It cannot slip.

---

## Section 3 · Session list (9 sessions)

### Answer to "how many chats will this take?": **9**, in three batches.

| # | Session name | Stage | Model | Branch | Can run in parallel? | Exclusively owned files |
|---|---|---|---|---|---|---|
| **S1** | Permissions and entry-point fixes | 1 | **Sonnet 5.5** | `fix/s1-ux-bugs` | ✅ With S2/S3 | `NodePanel.tsx` `Tasks.tsx` `board.ts` `Layout.tsx` `main.tsx` `TaskDetail.tsx` |
| **S2** | Security, engine, and data protection | 1 | **Sonnet 5.5** | `fix/s2-safety` | ✅ With S1/S3 | `netlify/**` `calendar.ts` `schedule.ts` `store.tsx` `seed.ts` `public/legacy/` |
| **S3** | Responsiveness and polish | 1 | **Opus 5.5** | `fix/s3-perf` | ✅ With S1/S2 | `styles.css` `Today.tsx` `Events.tsx` `aiContext.ts` `assistant.ts` `forecast.ts` |
| **S4** | Remove dead code | 2 | **Sonnet 5.5** | `design/s4-deadcode` | ❌ Only after S3 merges | `styles.css` `helpers.tsx` |
| **S5** | Token table (design system) | 2 | **Opus 5.5** | `design/s5-tokens` | ❌ After S4 | `styles.css` `statusDefaults.ts` `MetroChart.tsx` `Handoff.tsx` |
| **S6** | Guardrails (lint + CI + accessibility) | 2 | **Sonnet 5.5** | `design/s6-guardrails` | ❌ After S5 | `package.json` `.stylelintrc` `.eslintrc` `ci.yml` `a11y.spec.ts` `word-count.mjs` |
| **S7** | Explainability toggle + visible subtitles | 3 | **Opus 5.5** | `feat/s7-explain` | ❌ After S6 | `Page.tsx` `Layout.tsx` `routes.ts` + explanatory insertion points in each page |
| **S8** | Touch fallback + navigation reorganization | 3 | **Sonnet 5.5** | `feat/s8-touch-nav` | ❌ After S7 | `ui/index.tsx` `Layout.tsx` `styles.css` |
| **S9** | Finalize, document, merge, and launch | 3 | **Opus 5.5** | `release/v1.0` | ❌ Last | `README.md` `AGENTS.md` `PROGRESS.md` `PRODUCT_PLAN.md` |

### Why this division

**S1/S2/S3 can run in parallel because their file sets were checked and do not overlap at all.** This is not a guess: I listed each exclusively owned file, and the prompts will explicitly say "do not touch other sessions' files." The sole potential overlap is `styles.css`: **only S3 may modify it**, so S1 must reuse the existing `.btn .btn-primary` when adding buttons and may not write new styles.

**S4 must precede S5. This reverses the audit report's order; I have changed it.** The original report specified B1 (tokens) → B2 (remove dead code). **Removing before building is less work**: once the 19.7% unused CSS is gone, S5 has far fewer font sizes and spacing values to map. Also, in most of the 23 "conflicting duplicate declarations" found by the audit, one duplicate is already unused; removing it resolves the conflict automatically.

**Stages two and three are sequential because both edit `styles.css`.** Two agents editing the same 714-line CSS file at once inevitably creates merge conflicts, and you do not write code or resolve those conflicts. **Sequential work is much safer here.**

### Answer to "which model should we use?"

Principle: **choose for the nature of the task, not on the assumption that more expensive is better.**

- **Use Opus 5.5 where judgment is required** (S3 S5 S7 S9):
  - S3 must determine "which box he means by the blue box" and "what change would feel simple and polished": aesthetic judgment and tradeoffs
  - S5 must map 23 font sizes into 6 levels; each mapping needs judgment (does this 13px belong in xs or sm?)
  - S7 designs a new interaction from scratch
  - S9 decides whether the product can launch
- **Use Sonnet 5.5 where specifications are clear** (S1 S2 S4 S6 S8): exact files, line numbers, and acceptance criteria; follow the specification
- **Haiku** is not recommended; all these tasks are relatively demanding

---

## Section 4 · Answering "how to use git worktree"

### First, a judgment that can save you work

**If you open a new chat on the web (a cloud session such as claude.ai/code), you do not need a worktree.**

Each cloud session starts a fresh container and clones a fresh copy of the code. **Isolation is already free**: two sessions physically cannot overwrite each other's files. Worktrees solve "multiple agents competing for the same folder on one machine, " which is not a problem you have.

**So you only need branches, not worktrees.** Each session can check out its branch at the start. You do not need to learn what a worktree is.

### Option A (recommended) · Cloud sessions + branches

One-time setup (do this today):

```bash
git checkout main && git pull
git checkout -b integration/v1.1-fix
git push -u origin integration/v1.1-fix
```

`integration/v1.1-fix` is the **integration point**. All sessions merge their work here first; **merge to `main` only at the two checkpoints, Thursday and 11/9** (following AGENTS.md Section 3, rule 4: main is the production site and requires your approval).

The first statement in each chat (already included in the prompts):

```bash
git fetch origin
git checkout -b fix/s1-ux-bugs origin/integration/v1.1-fix
```

At the end of each chat: push its own branch; **do not merge it yourself**. You review it on GitHub, then click the merge button.

Merge order (**one at a time; wait for green CI before merging the next**):

```
S1 → S2 → S3  →  Merge integration/v1.1-fix into main (Thursday, with your approval)
S4 → S5 → S6
S7 → S8
S9                →  Merge into main + tag v1.0 (11/9, with your approval)
```

### Option B · If you run local Claude Code on your own Mac

This is where worktrees become useful: each of the three agents gets a separate working directory while sharing the same `.git`, avoiding interference without cloning three copies:

```bash
cd ~/platypus-officer-hub
git fetch origin && git checkout -b integration/v1.1-fix origin/main && git push -u origin integration/v1.1-fix

# Create one working directory for each of the three Stage 1 sessions
git worktree add ../pl-s1 -b fix/s1-ux-bugs integration/v1.1-fix
git worktree add ../pl-s2 -b fix/s2-safety  integration/v1.1-fix
git worktree add ../pl-s3 -b fix/s3-perf    integration/v1.1-fix

# Install dependencies separately in each directory (node_modules is not shared)
cd ../pl-s1 && npm ci
cd ../pl-s2 && npm ci
cd ../pl-s3 && npm ci
```

Then run `cd ../pl-s1` in each of the three terminals and start Claude Code.

Clean up when finished:

```bash
git worktree remove ../pl-s1    # Commit or discard changes first
git worktree list               # See which worktrees remain
```

**Two pitfalls:**
1. `node_modules` is not shared; each worktree needs its own `npm ci` (three copies of dependencies, consuming disk space)
2. The same branch cannot be checked out in two worktrees at once; git will refuse

**My recommendation: use option A.** Since you do not code, the benefit of a worktree (saving one clone) is far smaller than its cognitive cost.

---

## Section 5 · Nine prompts (ready to copy)

> Usage: open a new chat → confirm the model → paste the corresponding complete prompt below. Each already includes branch operations, file boundaries, acceptance criteria, and handoff requirements; you need not add anything.

---

### S1 · Permissions and entry-point fixes | Sonnet 5.5 | Can run alongside S2/S3

```
You are implementing a clearly scoped repair package in the Platypus Officer Hub repository. This is a
Phase 3 prototype for an ASU honors thesis; the project lead, Juanxi, does not code.

Read first (required, in order):
1. AGENTS.md: hard rules for all AI assistants, especially Sections 3 and 7.
2. docs/AUDIT_2026-10-27.md: the code audit report; all issues you must fix are in Sections 5 and 6.
3. Section 3 of docs/EXECUTION_PLAN_2026-10-27.md: you are S1.

Before starting:
  git fetch origin
  git checkout -b fix/s1-ux-bugs origin/integration/v1.1-fix
  npm ci

## Your six tasks

A1. src/styles.css: 472 — pointer-events is not restored when the hover card appears, so its
    buttons cannot be reached by mouse or keyboard. This makes the contribution leaderboard
    drill-down in src/pages/Team.tsx: 39 100% unusable.
    ⚠️ Exception: styles.css is exclusive to S3; you must not edit it.
    → Solve this at the TSX layer, or document it in the handoff for S3 and add
      an expected-failure marker (test.fixme) in e2e to pin down the problem. Choose one and explain why.

A2. src/components/NodePanel.tsx:52,62,85,92,96,103,105,106: these editing controls
    render for everyone, but updateNode at src/data/store.tsx:155 immediately
    returns state when !canLead(state). Users make changes with no effect or explanation.
    → Use disabled={!canLead(state)} and add an explanatory sentence to the panel.
    → Copy and interaction must exactly match src/components/rail/ChangeCard.tsx:111-113
      (the only place in the repository that handles this correctly; follow it).
    ⚠️ Do not edit store.tsx (exclusive to S2); edit only NodePanel.tsx.

A3. src/pages/Tasks.tsx:28-32 — The site's only "+ Add task" button is at :125, at the very bottom
    of each column in Board view. The default is Table (:20), so users opening Tasks see
    no creation entry and may assume they lack permission.
    → Add a primary "+ New task" button to PageHead actions, visible in all three views.
    → Reuse the existing dispatch({ type: "addTask", title, status }).
    → Note that addBoardTask at src/data/board.ts:60-71 already has no permission check, so this
      button should be available to all roles.
    ⚠️ Reuse the existing .btn .btn-primary classes; do not add any CSS.

A4. src/data/board.ts:64-67 — Two bugs:
    (a) When a non-lead creates a task in "Not claimed", the card silently appears in "To do".
        → Explicitly tell the user what happened (use English copy; all interface text must be English, see AGENTS.md §7).
    (b) :69 Creating a task in "Done" immediately produces status=done and completedOn=today.
        Any officer can invent a "completed" task, while canMoveTask(:22) requires the president's approval
        to reopen a completed task: the creation path bypasses the approval model.
        → Close this loophole. Newly created tasks must not start as done.
    → Add unit tests for both.

A5. src/components/Layout.tsx:123—Reset demo clears all data in one click without any confirmation,
    right beside "+1 day / +3 days / +10 days" in the top-bar menu. There are 0 confirm() calls in the repository.
    → Add confirmation. Do not use native confirm() (blocked by Playwright and mobile browsers); use
      a two-click action (the first click changes it to "Click again to reset", reverting after 3 seconds).
    → Update the affected e2e tests.

A6. src/main.tsx—there are 0 ErrorBoundary instances in the repository. Any rendering error = a blank app,
    and corrupt localStorage data will cause a blank screen on every refresh. Participants will be completely stuck.
    → Add an ErrorBoundary around App.
    → On error, show one sentence in English + two buttons (Reload / Reset demo data).
    → The Reset button must work even when the store is broken (clear localStorage directly,
      without using a store action).

A11 [Added 2026-10-27] Light / dark theme switching.
    Verified: the CSS in src/styles.css **already fully supports** theme overrides:
      :27  color-scheme: light                      (light by default)
      :30  :root:not([data-theme="light"])          (follow the system unless light is forced)
      :39  :root[data-theme="dark"]                 (force dark)
    **But no line of code in the entire repository sets data-theme**
    (grep -rn "theme|Theme" src/components/ src/pages/Settings.tsx returns zero matches).
    → Consequence: the app can only follow the operating system; users cannot choose. Juanxi's Mac uses dark mode,
      so he has only ever seen the dark version, although he says he prefers light.
    → Approach: set document.documentElement.dataset.theme on <html> and persist it in localStorage.
      Three settings: Auto (follow the system, omit data-theme) / Light / Dark.
    → ⚠️ **No CSS changes are needed**; the hooks already exist. styles.css belongs exclusively to S3; do not touch it.
    → Placement: the top bar already has 5 controls (audit Section 8.6 says 60% are demo scaffolding); do not add
      a sixth. Consider Settings or the Demo menu. Use your judgment and explain your reasoning in the report.
    → Prevent a "dark flash before switching to light" on initial load (set data-theme in main.tsx before
      mounting React).
    → Add a test: after switching to Light and refreshing, it remains Light.
    → Ask Juanxi in the handoff record: **Should Phase 3 force light mode by default?**
      Reason: participants otherwise see themes determined by their own systems; half dark and half light creates
      inconsistent study conditions. The 6 status colors also lack dark variants (dark-mode contrast is only
      2.96–3.65:1). This is a product decision for him; do not decide it yourself.

## File boundaries (mandatory)

You may modify only:
  src/components/NodePanel.tsx
  src/components/TaskDetail.tsx
  src/pages/Tasks.tsx
  src/data/board.ts
  src/components/Layout.tsx
  src/main.tsx
  The corresponding tests in src/test/** and e2e/**
  docs/PROGRESS.md (handoff entries only)

You must never modify:
  src/styles.css        ← Exclusively owned by S3
  src/data/store.tsx    ← Exclusively owned by S2
  netlify/**            ← Exclusively owned by S2
  src/engine/**         ← Exclusively owned by S2/S3
  src/lib/assistant.ts, src/lib/aiContext.ts, src/pages/Today.tsx,
  src/pages/Events.tsx  ← Exclusively owned by S3

If something requires modifying another session's files, do not modify them: put it in the handoff entry in docs/PROGRESS.md,
explaining "S1 found X; S3/S2 needs to do Y in <file>."

## Acceptance

- npm run check must be entirely green (tsc + vitest + playwright)
- Do not delete or weaken any existing test. If your changes legitimately require a test to change,
  explain each such change and its reason in the handoff entry.
- All new behavior needs tests
- Do not modify AGENTS.md, PRODUCT_PLAN.md, or RULES.md

## At completion

1. Add a row at the top of the handoff log in docs/PROGRESS.md, following its existing format:
   completed / remaining / acceptance steps (where to click) / known issues / next owner
2. Commit message format: [S1][Claude] Short description
3. git push -u origin fix/s1-ux-bugs
4. Do not merge into any branch. Do not touch main. Juanxi will merge on GitHub himself.
5. Finally, report to Juanxi in simple Chinese [historical instruction; superseded by the current English policy]: what changed, where to click for acceptance, and what remains unfinished.
   Explain one step at a time without jargon.
```

---

### S2 · Security, engine, and data protection | Sonnet 5.5 | Can run alongside S1/S3

```
You are implementing a clearly scoped repair package in the Platypus Officer Hub repository. This is a
Phase 3 prototype for an ASU honors thesis; the project lead, Juanxi, does not code.

Read first (in order, all required):
1. AGENTS.md — especially the hard rules in section 3
2. docs/AUDIT_2026-10-27.md — your repairs are in section 3 (three urgent items) and section 10
3. docs/EXECUTION_PLAN_2026-10-27.md sections 1.3 and 3 — you are S2

Important context: Juanxi has decided that Phase 3 will not use Supabase, and participants will use fictional information we provide.
localStorage is therefore the only storage, raising the priority of data protection (A7).

Before starting:
  git fetch origin
  git checkout -b fix/s2-safety origin/integration/v1.1-fix
  npm ci

## Four things you need to do

A7 [Most important] Data protection. src/data/store.tsx:247-258:
    A schemaVersion mismatch directly calls seedDemo(), with no migration, backup, notice, or export.
    This version has changed 3 times already (3→4→5), each silently erasing all user input.
    The same catch (: 254-256) also swallows JSON parsing failures.
    Save failures (QuotaExceededError) at : 260-266 are silent too.
    → (a) On a version mismatch, preserve the old data unchanged under a separate versioned key; do not discard it.
    → (b) Explicitly show save failures in the interface (never silently).
    → (c) Add an “Export my data” button to download the current state as JSON.
         Put it on Settings, not the top bar.

A7b [Added by Juanxi's 2026-10-27 decision] Interaction log.
    src/data/store.tsx:104-245 is one switch covering approximately 40 action types, the only write point.
    → Add an append-only event log here, stored in the same localStorage:
      { seq, at (real timestamp from Date.now()), actor (viewerId), type (action type),
        payload (trimmed parameters), before (old values of changed fields, only for actions with old values) }
    → Note: this is the only place in the repository allowed to use the real clock. Dates displayed
      in the interface must still use state.today (the fixed demo clock); do not mix them.
    → Limit: retain the latest 2000 entries, dropping the oldest when exceeded (localStorage has limited capacity).
    → Include this log in the export from A7(c)'s Export button above.
    → This is evidence for data governance in Juanxi's thesis, so preserve every field and allow the order to be reconstructed.
    → Add a unit test: perform 5 different actions and assert 5 log entries, correct order, and correct before values.

A8 Server-side containment. Netlify access protection is due to be disabled on 11/4 to send recruitment emails. At that point /api/* becomes
    public, with no authentication, no rate limiting, and requests accepting 400KB.
    → (a) Change the body limit at netlify/functions/chat.mts:29 from 400_000 → 40_000.
    → (b) Delete these four endpoints: netlify/functions/pool.mts (entirely dead code, never called by the SPA),
          parse-brief.mts, plan-draft.mts, classify.mts (called only by the abandoned /legacy/).
    → (c) Delete the entire public/legacy/ directory. It is already partly broken (calling 6 nonexistent endpoints),
          yet remains publicly accessible and can incur charges against the same AI key.
          ⚠️ Before deleting, confirm its complete history remains in git log (Juanxi may need the v0.1 design
          as a reference; S7 will use it). State in the handoff that "v0.1 code can be recovered with
          `git show 49b0b89:public/index.html`" and verify that this command actually works.
    → (d) Add per-IP rate limiting. Prefer Netlify's built-in capability (declared in netlify.toml);
          if the current plan does not support it, add a simple in-process limiter in netlify/lib/http.mts
          and honestly document its limitations in the handoff (counters reset when the function instance restarts).
    → (e) In netlify/lib/ai.mts, log one usage line for each call:
          provider / model / input and output token counts (if returned by the provider) / duration / endpoint name.
          ai.mts:110,118,131 already measures duration.
          ⚠️ Logs must never contain keys, credential tokens, or user content.

A9 Calendar expiry. ASU academic-year data in src/engine/calendar.ts:15-60 ends on 2027-05-08.
    Beyond that, studentOffReason(:80-86) classifies every day as "between semesters," making the backward
    date calculation keep jumping backward. Recalculation verified that subtracting 14 student working days
    from an event on 2027-10-15 returns 2027-04-13 (the correct answer is 2027-09-27, a full 6-month error),
    without reporting any error.
    → (a) Add TERMS / FINALS / HOLIDAYS / BREAKS for the 2027–2028 academic year.
          Every entry needs an official source URL; update the calendar-source section at the end of
          docs/RULES.md as well (AGENTS.md Section 4 requires rules and documentation to change together).
          If the official 2027-2028 calendar cannot be found, do not invent it: do only (b) and explain in the handoff.
    → (b) [Required] Add a new error-level issue to the issue lists in src/engine/schedule.ts
          (:290-324, :326-343): explicitly report an error whenever a calculation involves a date outside
          the known calendar range. Make the failure visible rather than silent.
    → (c) Add a unit test: move a date outside the known calendar and assert that the issue appears.

## File boundaries (mandatory)

You may modify only:
  src/data/store.tsx, src/data/seed.ts, src/data/types.ts
  src/engine/calendar.ts, src/engine/schedule.ts
  netlify/**
  netlify.toml
  public/legacy/ (delete)
  src/pages/Settings.tsx (only to add the Export button; reuse the existing .btn class, with no new CSS)
  docs/RULES.md (calendar-source section only)
  Corresponding tests in src/test/** and e2e/**
  docs/PROGRESS.md (append handoff record only)

You must not change:
  src/styles.css           ← S3 exclusive ownership
  src/components/**        ← S1 exclusive ownership (except a button in Settings.tsx; adding a button only)
  src/pages/Tasks.tsx, src/data/board.ts, src/main.tsx  ← S1 exclusive ownership
  src/lib/assistant.ts, src/lib/aiContext.ts, src/engine/forecast.ts,
  src/pages/Today.tsx, src/pages/Events.tsx             ← S3 exclusive ownership

## Acceptance

- npm run check all green
- Do not delete any existing test or loosen its assertions
- A7 tests must cover: preserving old data on version mismatch, and showing a notice on save failure
- A9(b) tests must cover: an error when outside the calendar range
- After deleting endpoints, remove and explain any e2e tests that reference them

## At completion

1. Add a handoff entry to docs/PROGRESS.md (what is complete / what remains / how to accept / known issues).
2. Commit message: [S2][Claude] Brief description
3. git push -u origin fix/s2-safety
4. Do not merge. Do not touch main.
5. Report to Juanxi in simple Chinese (historical instruction; repository and GitHub reporting must now use English under the current policy). Be especially clear about:
   (a) What the exported interaction-log format looks like (he needs it for Thursday's IRB materials).
   (b) What the rate limiting actually achieves and its limitations.
```

---

### S3 · Responsiveness and polish | Opus 5.5 | Can run in parallel with S1/S2

```
You own a work package in the Platypus Officer Hub repository that requires judgment: make the interface “feel fast,”
and address a visual requirement explicitly raised by project owner Juanxi. Juanxi does not code.

Read first (in order, mandatory):
1. AGENTS.md — especially section 7, interface rules.
2. docs/AUDIT_2026-10-27.md — all of it, especially sections 4 and 8.
3. Sections 1.1 and 1.2 of docs/EXECUTION_PLAN_2026-10-27.md — Juanxi's own words and
   verified evidence. You are S3.

Juanxi's exact words: "What I miss most about the second version is its response speed. It was really fast, with no waiting."
Also: "The blue border is too directive; it feels like Guided Access or an accessibility feature. Remove it first. I need something simpler,
more polished, and error-free."

Before starting:
  git fetch origin
  git checkout -b fix/s3-perf origin/integration/v1.1-fix
  npm ci

## P1 · Remove the 300-millisecond hover delay [confirmed work; 1 line]

src/styles.css:471 and :572:
  transition: opacity .12s ease .3s, visibility 0s linear .42s;
Hovering waits 300ms before fading in, and 420ms total before it is visible. Moving away also takes 420ms.

Verified: all transitions in v0.1 (the version Juanxi liked) were .15s / .2s, with no delays.
git log -S confirms that this delay was introduced by 5bde479, "v1.1 simplification redesign":
exactly the version he started to dislike.

→ Set the delay to 0 or very short (≤80 ms to prevent accidental activation), and align the fade-in duration with v0.1's .15 s.
→ Check the entire repository for other transition-delay values or overly long animations and address them too.
→ Note that e2e hover tests may depend on this delay (hardcoded waits). Update them as well.

## P2 · Calculate the forecast only once [Confirmed]

computeForecast has 5 call sites with no shared cache:
  src/pages/Today.tsx:19     useMemo(..., [state])
  src/pages/Events.tsx:28    useMemo(..., [state])
  src/lib/aiContext.ts:18
  src/lib/assistant.ts:72
  src/lib/assistant.ts:82    ← calculated twice within the same AI answer
Each first runs a full computeSchedule, then 1000 simulations. One Ask message = 3 calculations.

→ Consolidate into one source (suggestion: expose it through the store context and memoize once per state).
→ Pure-function call sites (assistant.ts / aiContext.ts are outside the React tree) must reuse the same
  result too; do not fix only the two React sites.
→ Also measure the JSON.stringify cost on every store change (full serialization at store.tsx:262,278).
  If significant, throttle it (without losing data: persist before the page closes).
→ ⚠️ forecast.ts is a pure function with a fixed seed. Its output must remain bit-for-bit identical.
  Determinism assertions in src/test/forecast.test.ts must keep passing. Change only the call pattern, not the algorithm.
→ Add a test showing that one state change triggers computeForecast only once (a spy counter is acceptable).

## P3 · Blue border [Juanxi supplied a screenshot; located]

Screenshot: the numeric input for `Submit budget request` on Settings has a bright blue ring around it when focused.

⚠️ Verified facts: understand these before making changes:

**That blue is not a project color.**
  src/styles.css:53 is the project's only focus style:
    : focus-visible { outline: 2 px solid var(--accent); outline-offset: 2 px; border-radius: 6 px; }
  --accent = #0 f766 e, teal, not blue.
  And there are no focus styles for input / select / textarea anywhere in the repository, nor any code handling
  native browser focus rings (grep webkit|focus-ring|outline: *none matches only two h2: focus locations).

Exhaustive checks already performed (2026-10-27):
  - Across all *.css files, only 13 rules concern :focus/outline/accent-color, and **every color is
    var(--accent) (#0f766e teal) or var(--late)/var(--accent-ink)**; there are no blue focus rings.
  - No focus styles specifically target input / select / textarea.
  - The sole blue, #3a6fd8, appears in only 4 places: the "To do" status in statusDefaults.ts,
    the PALETTE palette, .chain .dot.now, and .m-dot.now. All are **background colors**, not focus rings.
  - No commit-history entry mentions Apple or HIG (including the Chinese name for Apple).

→ Juanxi believes we added this while "following Apple's design guide." The evidence does not support that, but **there is
  no need to settle the argument first**: the change below works in either case because it explicitly controls form-control focus styles.

**First: ask Juanxi whether he uses Safari or Chrome** (the fixes differ slightly), and ask him to perform a
10-second check: open the same input in another browser. If the blue ring's color or shape changes, the browser
is drawing it; if it is identical, we missed something and need to investigate again.

### Do not simply delete focus styles

- : focus-visible is displayed for keyboard users; mouse clicks do not trigger it (text/number inputs are exceptions in the specification:
  they also match on click — exactly what happened in the screenshot)
- It is required by WCAG 2.4.7; removing it makes e2e/a11y.spec.ts fail immediately
- ASU has an accessibility policy; the thesis cannot say "we removed keyboard focus visibility"

### How to change it

  /* 1. Remove native rings from form controls */
  input: focus, select: focus, textarea: focus { outline: none; }

  /* 2. Replace them with our own understated ring */
  input: focus-visible, select: focus-visible, textarea: focus-visible {
    outline: 2px solid var (--accent);
    outline-offset: 1px;
  }

Safari may also require handling -webkit-appearance / number-input spinners. Use actual checks in Juanxi's browser
as the authority — after the change, ask him to click that input again in his own browser to confirm.

### Also soften the heavy selected state

  styles.css:560  .m-node.is-selected .m-dot { outline: 3px solid var(--accent); outline-offset: 3px }
                  ← A 20px dot with a 3px-thick ring offset by 3px; the ring is almost as large as the dot
  styles.css:686  .heat-cell.all { outline: 2px solid var(--accent-ink); outline-offset: -1px }
  styles.css:240  .flow-step.is-selected { box-shadow: ... }   ← Dead code (the swimlane diagram was removed); delete it

→ Replace the thick outer ring with a subtle background + 1px border (as Linear / Notion / monday do).

### Verification (required)

After the change, use only Tab to go through Today / Tasks / Events / Settings. The focus must be visible at every step.
If it is not, the change is broken. Then rerun e2e/a11y.spec.ts.

## P4 · Additional polish (only if capacity remains after the three items above)

- styles.css:340 contains dead code, .forecast { margin: .5rem 0 }, from a deleted component,
  giving every current risk dot 8px top and bottom margins. Delete it.
- styles.css:489 references --st-now, a variable never defined anywhere in the repository, so the flowchart's "current"
  dot always falls back to hardcoded blue; changing colors in Settings has no effect.
  ⚠️ The formal fix belongs to S5 (token table). Document it clearly in the handoff; do not change it.

## File boundaries (mandatory)

You have exclusive ownership of src/styles.css — S1 and S2 are both prohibited from editing it. If they leave
styles.css requests in their handoffs (such as S1's A1 pointer-events), you take them over.

You may edit only:
  src/styles.css
  src/pages/Today.tsx, src/pages/Events.tsx
  src/lib/assistant.ts, src/lib/aiContext.ts
  src/engine/forecast.ts (change only calling patterns/memoization, not the algorithm)
  forecast-context-related portions of src/data/store.tsx
    ⚠️ store.tsx is exclusive to S2. If you must edit it, first check whether S2 has pushed;
       if there is a conflict, record it in the handoff and let Juanxi arrange the order. Do not force the change.
  Corresponding tests in src/test/** and e2e/**
  docs/PROGRESS.md (add handoff notes only)

You must not modify:
  src/components/NodePanel.tsx, src/pages/Tasks.tsx, src/data/board.ts,
  src/components/Layout.tsx, src/main.tsx   ← exclusively owned by S1
  netlify/**, src/engine/calendar.ts, src/engine/schedule.ts  ← exclusively owned by S2
  src/components/ui/statusDefaults.ts        ← exclusively owned by S5 (token unification)

## Acceptance

- npm run check fully passes
- Forecast determinism tests must pass bit for bit
- Add a test showing that forecast computes only once per state change
- Manual: walk through Today / Events / Tasks on desktop and phone; hover must respond immediately
- ⚠️ Juanxi normally uses **dark mode**; repeat every manual check in dark mode
- Focus remains visible throughout keyboard Tab navigation

## At completion

1. Add a handoff entry to docs/PROGRESS.md
2. Commit message: [S3][Claude] Brief description
3. git push -u origin fix/s3-perf
4. Do not merge. Do not touch main.
5. Report to Juanxi in simple Chinese. [Historical language instruction; current English repository/collaboration policy supersedes it.] Be especially clear about:
   (a) How much faster hover/click is now (specific milliseconds)
   (b) What you found about the blue border, what you changed, and why you did not remove :focus-visible
```

---

### S4 · Remove dead code | Sonnet 5.5 | Must follow the S3 merge

```
You are doing a cleanup-only task in the Platypus Officer Hub repository. This is a Phase 3
ASU honors thesis prototype; project owner Juanxi does not code. This work package changes no user-visible behavior.

Read first:
1. AGENTS.md
2. docs/AUDIT_2026-10-27.md §§4.1, 4.2 (complete dead-code list)
3. docs/EXECUTION_PLAN_2026-10-27.md §3—you are S4

Background: src/styles.css was built through 11 commits, each with a "+N / −0" diff. Not a single CSS line
had ever been deleted. The commit called "simplification redesign" (5bde479) added 341 lines and removed 0 —
it deleted the React code for the swimlane and Gantt charts but left all their styles.

⚠️ First confirm that S3's fix/s3-perf has merged into integration/v1.1-fix, otherwise your changes will conflict
with it in styles.css. If it has not merged, stop and tell Juanxi.

Before starting:
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # Confirm that [S3] commits are present
  git checkout -b design/s4-deadcode origin/integration/v1.1-fix
  npm ci

## What to do

1. Measure dead code again yourself; do not copy the audit report's list (S1–S3 may have changed the code).
   Method: extract every class selector from src/styles.css, then search for each with word boundaries in src/**/*.{ts, tsx} and
   public/**/*.html. Keep the script under scripts/ so it can be rerun.

2. Delete rule blocks confirmed to have no references. The audit measured 62 dead classes / 84 rule blocks /
   329 declarations (about 16% of the CSS), by generation:
     - v1 swimlane (flow-* / react-flow*, 14)—FlowChart.tsx deleted
     - v1 Gantt (gantt-*, 10)—Gantt.tsx deleted
     - v1 first-generation status colors (st-*, 9)—replaced by StatusPill
     - WP0/WP2 leftovers (coming / demo-strip / step-strip / star-card, etc., 14)
     - WP3/WP4/WP5 leftovers (task-list / board-column / funding-pipeline, etc., 12)
     - 3 others
   ⚠️ If Juanxi later asks to restore the Gantt chart (execution plan C5), gantt-* styles may still be useful.
     → Do not delete gantt-* directly. Move the entire section to the end of the file inside a
       /* ---- Retained: Gantt styles, pending the C5 decision ---- */ comment block, and explain this in the handoff.
     → Delete the rest as planned.

3. Remove these unreferenced dead exports from src/pages/helpers.tsx:
   STATUS_LABEL(:6-13), statusOf(:16), statusClass(:21), personName(:33),
   initials(:35). First search for each to confirm it truly has zero references.
   Note that statusOf/statusClass are the "second generation of status semantics"; deleting them removes
   color language 2 of the 4 in Section 4.3 of the audit.

4. The reverse problem: 7 classes appear in TSX but have no CSS rules at all:
   card-text (src/components/rail/AskPanel.tsx:123, the container for every AI text reply,
   completely unstyled), nudge-panel, task-gantt, info-wrap, todo, m-start, m-end.
   → Assess each: is styling missing (a bug; record it in the handoff for S5), or is the class unnecessary
     (remove it from TSX)? Do not add new styles yourself; that belongs to S5.

5. src/components/ui/index.tsx:93 exports an Empty component, but 16 pages all handwrite
   <p className="empty">.
   → Replace these handwritten instances with <Empty>. Locations: Today.tsx:41,81 / Tasks.tsx:70,136 /
     Events.tsx:34 / Funding.tsx:67,76 / Partners.tsx:58,68 / Rules.tsx:38 /
     Handoff.tsx:73 / Settings.tsx:126 / rail/Rail.tsx:61 / FollowupPanel.tsx:18 /
     BoardSettings.tsx:18
   → Make only this replacement; do not change anything else along the way.

## Hard requirements

- **Do not change any user-visible behavior.** This is deletion only + one equivalent replacement.
- Run npm run check after deleting each group. Continue to the next only when all checks are green.
- Make separate commits, one per group, for easy rollback if problems arise.
- After deletion, report: how many lines styles.css has after starting at 714, and how many conflicting duplicate declarations were eliminated
  (the audit found 23; most of the duplicate halves are dead, so a number should disappear automatically).
- ⚠️ Run npm run build && npx playwright test before deleting anything and record the baseline. Compare afterward.
- ⚠️ Visual regression: this project has no visual regression tests. After deletion, you must manually compare screenshots of
  10 pages (desktop + mobile). Use the existing screenshot capability at scripts/word-count.mjs:30,
  or write a temporary script (in scratchpad; do not commit it). Any visual change means something was deleted incorrectly.

## File boundaries

You may change only:
  src/styles.css
  src/pages/helpers.tsx
  The lines in pages and components replacing <p className="empty"> with <Empty>
  TSX lines containing classes determined to be redundant
  scripts/ (add a dead-code detection script)
  docs/PROGRESS.md (add handoff entries only)

Do not change: any logic, any netlify/**, any src/engine/**, or any test assertions

## At completion

1. Add a handoff entry to docs/PROGRESS.md, including:
   - How many lines were removed and from which generations.
   - Where gantt-* remains.
   - The "missing styles" list found in item 4 (for S5).
2. Commit message: [S4][Claude] Brief description
3. git push -u origin design/s4-deadcode
4. Do not merge. Do not touch main.
5. Report to Juanxi in simple Chinese (historical instruction; repository and GitHub reporting must now use English under the current policy). Emphasize: the interface should look unchanged; if he sees a change,
   I removed something incorrectly, and he should identify the page.
```

---

### S5 · Token table (design system) | Opus 5.5 | Must follow S4

```
In the Platypus Officer Hub repository, add something this project has never had: the minimum
deliverables for a design system. This is a Phase 3 prototype for an ASU honors thesis. Project owner Juanxi does not code
or understand design terminology.

Read first (all required):
1. AGENTS.md — especially Section 7, interface rules
2. docs/AUDIT_2026-10-27.md — all of it. Section 4 defines your work; Section 8 contains contrast data
3. docs/EXECUTION_PLAN_2026-10-27.md Section 1.2 — Juanxi's only explicit visual requirement
4. The S4 handoff entry at the top of docs/PROGRESS.md — it leaves you a list of "missing styles"

## Why this is needed

This project skipped step 3 (visual direction) and step 4 (design system and component specifications) of the standard process.
The six "interface rules" in AGENTS.md section 7 were added retroactively on 2026-10-23 after all pages were written.
They list only things such as "three columns / 5 components / word limits," with no color scale, type scale, spacing scale, or hierarchy.

Results (measured in the audit): 23 font sizes, 22 spacing values, 14 border radii, and 14 raw z-index values,
with no tokens at all for typography, spacing, or layers. The same data uses 4 disconnected status-color systems.

Juanxi says he "cannot say what is good or bad" because the interface really has no rule that can be
stated clearly. Your job is to give it those rules.

Juanxi's only explicit visual requirements: **simple, refined, and reliable.** Avoid overly directive elements.

⚠️ First confirm that S4's design/s4-deadcode has merged into integration/v1.1-fix. Stop if it has not.
   Removing dead code before creating tokens saves more than half the work (19.7% of the CSS is dead and needs no mapping).

Before starting:
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # Confirm [S4] commits exist
  git checkout -b design/s5-tokens origin/integration/v1.1-fix
  npm ci

## ⚠️ Most important constraint: preserve the current appearance

On 2026-10-27, Juanxi sent a screenshot confirming **he likes the current appearance** (v1.2 dark mode).
See section 1.4 of this plan.

Your task, therefore, is **to express the current appearance through a consistent set of rules, rather than redesign it**.
Afterward, the interface should look **almost identical**, with "23 random font sizes" replaced by "6 levels."

- Do not "improve" the palette, change layout density, replace fonts, or change the corner-radius style
- Every mapping should use the closest existing tier, not the tier you personally prefer
- Noticeable visual changes are allowed only for failing contrast (item 3) and
  undersized text such as 10px / 10.5px (AGENTS.md §7.4 requires at least 14px, currently violated extensively)
- If a mapping would visibly change the interface, **show Juanxi a screenshot and ask first**; do not decide yourself

## ⚠️ Second rule: light mode comes first, dark mode second

[2026-10-27 correction; see section 1.5 of this plan] Juanxi said, "Actually, I don't like dark mode very much;
I still prefer white mode." His earlier dark screenshots simply reflected his system theme, because the app
had no theme switch at that point (S1's A11 will add it).

→ Review each group of changes **in light mode first**, then dark mode.
→ Still fix the dark-mode contrast problems (audit Section 8.2): 6 status colors lack dark variants,
  with only 2.96–3.65:1 contrast against the surface on dark backgrounds; --line is only 1.30:1.
  Phase 3 participants may use dark mode. These are objective defects, simply lower priority than light mode.

## What to do

### 1. Complete the three missing scales and layers

The existing : root (styles.css: 3-27 and :357) already has 18 color tokens, 3 font families, 1 shadow,
1 radius, and 3 layout widths. What is missing:

- **6-level type scale**: --fs-xs: 12 / --fs-sm: 13 / --fs-base: 15 / --fs-lg: 17 / --fs-xl: 20 / --fs-2 xl: 26
  Map the existing 23 font sizes (10 / 10.5 / 11 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 /
  15 / 16 / 17 / 18 / 19 / 20 / 21 / 22 / 26 / 28 px / clamp / .8 rem / .95 rem)
  individually. Each requires judgment, not mechanical rounding—10 px and 10.5 px
  are already too small (AGENTS §7.4 requires at least 14 px, a rule now heavily violated);
  raise them to --fs-xs rather than adding another level.
  ⚠️ This item changes the visuals. Afterward, send Juanxi screenshots of every page.

- **6 spacing levels**: --s1:4 / --s2:8 / --s3:12 / --s4:16 / --s5:24 / --s6:32
  Snap the 22 existing values (1,2,3,4,5,6,7,8,9,10,11,12,14,16,18,19,20,22,24,28,40,48)
  to the nearest level. Pay special attention to 5/7/9/11/19, which break the 4px grid.
  There are 69 distinct padding forms and 24 gap forms; consolidate these together.

- **3 corner-radius tiers**: --r-sm:8 / --r-md:12 / --r-lg:14 (+ 999px pills + 50% circles)
  Eliminate 3/4/5/6/9/10px. The only existing --radius token is used just 7 times, while 8px is hardcoded
  16 times and 10px 15 times.

- **5 layer levels**: --z-sticky: 20 / --z-overlay: 40 / --z-rail: 55 / --z-menu: 60 / --z-tip: 70
  The existing 14 raw numbers (0, 1, 2, 3, 4, 5, 6, 20, 40, 45, 50, 55, 60, 70) rely on human memory.

### 2. Unify status colors [the most important item]

Audit Section 4.3: brand tokens and status colors are two unrelated palettes, with 3 pairs of "same meaning, different color":

| Meaning | Brand token | Status color |
|---|---|---|
| Late/stuck | --late #b42318 | blocked #c0362f |
| Done | --good #1a7f37 | done #237a42 |
| Caution/in progress | --warn #8f5206 | in_progress #b25c00 |
| To do | (absent) | accepted #3a6fd8 ← blue is absent from the entire token table |

Also, git show 3d68221 shows that these 6 status colors originally used monday.com's
#7d8682 #d97b06 #d23f37 #2b9550, then were individually darkened on 2026-10-23 to pass contrast checks.
**They were copied from another product and adjusted afterward; they were never aligned with this project's palette (teal #0f766e).**

→ (a) Remove these 3 duplicate pairs: retain one value per meaning.
   ⚠️ Do not simply choose one arbitrarily: all 6 status colors currently pass WCAG AA (4.72–5.82:1;
   measured values are in audit section 8.1), whereas the three brand colors may not. Recalculate contrast
   for every changed color and list the numbers in the handoff. Values below 4.5:1 are prohibited.
→ (b) Add a token for blue (--info or similar), rather than leaving #3a6fd8 outside the system.
   The same blue is hardcoded in 4 places: statusDefaults.ts:7, styles.css:489, :554, :556.
→ (c) Add a dark-mode variant for each of the 6 status colors. They currently provide only
   2.96–3.65:1 against surface in the dark interface (audit section 8.2): dark solid blocks designed for white backgrounds.
→ (d) Define --st-now (referenced at styles.css:489 but never defined anywhere in the repository), and make
   src/components/flow/MetroChart.tsx use useStatusStyles() for dot colors instead of CSS.
   Currently, when Juanxi changes the "To do" color in Settings → Board, neither Today's progress-chain dots
   nor the flowchart dots change. This is a demonstrable bug.
→ (e) src/pages/Handoff.tsx:61 hardcodes #237a42 / #3a6fd8 / #5f6763 in inline styles,
   so name/color changes do not reach the handoff relay cards. Use tokens instead.

### 3. Fix failing contrast

Audit section 8.2 measured one failing text-color combination:
  --good #1a7f37 on --good-soft #e3f4e7 = 4.44:1 (short by 0.06)
  Used in .tag.good (ChangeCard's "Approved" label) and .save-status.ok
  styles.css:707 already patches one .days.good instance with hardcoded #146c2e:
  **This is exactly how the 23 duplicate declarations arose: fixing the symptom instead of the token.**
→ Fix the token, then remove the one-off patch at :707.

There are 5 non-text failures (WCAG 1.4.11, 3:1 required):
  Yellow risk dot #e3a008 on white = 2.26:1   ← Only yellow fails in the three-color risk system,
                                             and yellow is the level users with impaired color vision rely on most.
  Team medium-workload bar = 1.74:1
  Metro main line, incomplete segment = 1.85:1
  Chain/Metro hollow-dot border = 2.59:1
  Sitewide 1px border --line on white = 1.29:1
→ The first four must reach ≥3:1.
→ Treat the last (--line) carefully: darkening it makes the entire interface feel "heavy," conflicting with
  Juanxi's request for "simple and refined." Recommendation: keep borders light, but wherever a border conveys
  status/interactivity, add a non-color cue (thickness, background, icon). Explain the tradeoff in the handoff.

### 4. Write human-readable token documentation

Create docs/DESIGN_TOKENS.md (historically requested in Chinese for Juanxi; that language instruction is superseded by the current English policy):
- The levels in each scale and when to use each.
- The meanings, values, and contrast ratios of the 6 status colors.
- One rule: "All new styles must use tokens; do not hardcode values."
This document is the project's missing "stage 4 deliverable." Every future AI must read it before changing the interface.

## Hard requirements

- ⚠️ This work package changes the visuals. **Take screenshots page by page after each group of changes** (10 pages × desktop/mobile ×
  light/dark), then give Juanxi the before/after comparison. He is the sole acceptance reviewer.
- Change CSS only as a rule. The exceptions are statusDefaults.ts / MetroChart.tsx / Handoff.tsx, which
  must change to route colors through tokens. Do not refactor other TSX along the way.
- Do not change layout structure, component hierarchy, or copy.
- npm run check must be fully green, and a11y tests must continue to pass.
- Use multiple commits: one per scale/category (type / spacing / radius / stacking / status colors / contrast),
  making rollback easier if something goes wrong.

## File boundaries

You may change only:
  src/styles.css
  src/components/ui/statusDefaults.ts
  src/components/flow/MetroChart.tsx (color sources only)
  src/pages/Handoff.tsx (only the three hardcoded colors on line 61)
  docs/DESIGN_TOKENS.md (new)
  docs/PROGRESS.md (add handoff entries only)
  "Missing styles" identified in S4's handoff (such as AskPanel's card-text)

Do not change: any logic, netlify/**, src/engine/**, src/data/**, or test assertions.

## At completion

1. Add a handoff row to docs/PROGRESS.md; it must include the post-change contrast figures in a table
2. Commit message: [S5][Claude] brief description
3. git push -u origin design/s5-tokens
4. Do not merge. Do not touch main.
5. Report to Juanxi in simple Chinese, including before/after screenshots. Ask one specific question:
   "Does this look more consistent now, or merely different?" If he says "merely different, " the mapping
   is wrong and needs adjustment. [Historical reporting-language instruction; current repository and GitHub policy requires English.]
```

---

### S6 · Guardrails (lint + CI + accessibility) | Sonnet 5.5 | Must follow S5

```
You are installing guardrails in the Platypus Officer Hub repository. This is the most important package in the plan —
because it prevents the next AI from repeating what happened over the past three days, regardless of the changes it makes.

Read first:
1. AGENTS.md.
2. Section 4.1 (stylesheet history) and sections 8.3 and 8.4 of docs/AUDIT_2026-10-27.md.
3. docs/DESIGN_TOKENS.md (just written by S5; this is what you must enforce).
4. Section 3 of docs/EXECUTION_PLAN_2026-10-27.md — you are S6.

## Why this is needed

src/styles.css was built through 11 commits, each with a "+N / −0" diff, without ever deleting
one line. Five AIs each appended their generation's styles to the end, overriding earlier layers by appearing lower down.
The result is 23 repeated selector declarations, 62 dead classes, and 4 color systems.

S4 and S5 have just cleaned this up. **Without guardrails, the next AI will undo that work within a week.**

Current CI cannot enforce any of this: .github/workflows/ci.yml runs only build / test / e2e,
with no ESLint or Stylelint. GitHub Actions and Netlify are still independent pipelines:
pushing main deploys it, even when tests fail.

⚠️ First confirm that S5's design/s5-tokens has been merged into integration/v1.1-fix.
   Without the token table, there is no basis for writing the linter rules.

Before starting:
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # Confirm [S5] commits are present
  git checkout -b design/s6-guardrails origin/integration/v1.1-fix
  npm ci

## What to do

### 1. Stylelint + 3 rules

Install stylelint and configure at least these three rules:
- font-size / border-radius / z-index **must use tokens**
  (declaration-property-value-allowed-list or equivalent).
- **Prohibit hex colors** outside :root (color-no-hex with an exception).
- **Prohibit duplicate selectors** (no-duplicate-selectors), directly preventing those 23 conflicts from returning.

→ Run it once to see how many violations remain. S5 should have left things quite clean; fix any leftovers
  instead of bypassing them with ignore.
→ For a truly justified exception (such as a data-driven inline variable), use an inline disable comment and explain why.

### 2. ESLint + ban inline style

The audit found 21 inline style={{...}} instances, about 8 of which are temporary patches overriding earlier CSS
(Help.tsx:23, NodePanel.tsx:125, AskPanel.tsx:144, TaskDetail.tsx:34,
Team.tsx:39, BoardSettings.tsx:27, etc.).

→ Install eslint + typescript-eslint + eslint-plugin-react
→ Prohibit inline style, **but allow legitimate CSS variable injection** (--pill / --tag / --a / --label-w /
  data-driven left/width are legitimate uses, about 10 locations)
→ Convert the remaining 8 ad hoc patches into real classes.
  ⚠️ This requires changing styles.css, where S5 just established tokens. New classes must use tokens exclusively.

### 3. Make word limits a real constraint

scripts/word-count.mjs is not in CI, so the word limits in AGENTS.md §7.5 currently have no
automated enforcement.

More significantly, scripts/word-count.mjs:13-15 explicitly says “skip hidden hover cards and closed
details.” **So part of the “60% fewer words per page” result is a product of the measurement method—
the amount of information did not decrease; it moved somewhere touch-screen users cannot see.**

→ (a) Remove this skipping behavior and count all text
→ (b) Add it to npm run check and CI
→ (c) ⚠️ Afterward, word counts will almost certainly exceed AGENTS.md §7.5 limits
      (Today ≤160 / Events ≤180 / Rules ≤170 / Tasks ≤130 / Team ≤130 /
       Settings ≤125 per section).
      **Do not delete text just to pass**—that is why explanations were hidden in the first place, while Juanxi's current
      complaint is “I cannot tell what each section is.”
      → Correct approach: measure the real counts, record them in the handoff, and suggest Juanxi raise the limits or
        change the measurement definition. This is a product decision, not a technical one; let him decide.

### 4. Cover accessibility blind spots

e2e/a11y.spec.ts currently has two blind spots:
- : 7 uses only wcag 2 a + wcag 2 aa tags, **excluding wcag 21 aa**, so “1.4.11 Non-text Contrast”
  and “2.5.8 Target Size” have never run—all 5 contrast failures and 6 undersized touch targets
  found in the audit fall in this blind spot
- : 9 has test.skip(project !== "desktop"), **so mobile has never been scanned**, even though mobile is precisely
  where hover is unavailable and layouts are most likely to break

→ (a) Add wcag 21a / wcag 21aa tags
→ (b) Remove the mobile skip
→ (c) Fix the issues found. At minimum, fix these 6 touch targets (all must be ≥24×24):
      .m-dot 20×20 (styles.css:552, the primary interaction in Events)
      .heat-cell height 14px (:685, Team heatmap)
      .swatch 20×20 (:615, 60 color-picker buttons)
      .move-menu max-width 26px (:605, the only way keyboard users can change status)
      .info ≈20×20 (:476)
      .chain .dot 16×16 / compact 12×12 (:487,493)
      ⚠️ Enlarging the visible elements conflicts with "simplicity." Prefer expanding the transparent hit area
        (:: after pseudo-element / padding + negative margin), keeping the visible element small and the hit area large.
→ (d) Keyboard tests currently check only 3 things (/ focuses Ask, Enter opens a node, Escape closes it).
      Add: Tab order, focus management when the right rail opens, and keyboard status changes on the board.
      ⚠️ Right-rail focus management is currently incomplete (audit Section 4): only 3 of the 7 detail types move focus;
        there is no focus trap or focus restoration on close, and at ≤1199px the rail becomes an overlay,
        while Tab can reach obscured content. **Fixing all of this may exceed this work package's scope**:
        write the tests first (pin failing ones with test.fixme), fix what you can, and record the rest in the handoff.

### 5. CI gates

Currently, pushing main → immediate Netlify deployment, while GitHub Actions runs tests in parallel; **failures do not block deployment**.

→ Add stylelint / eslint / word-count to npm run check and ci.yml
→ In the handoff, give Juanxi clear steps to enable
  branch protection + required status checks in the GitHub repository settings (he must click them himself; you lack permission).
  Write step-by-step “where to click” instructions, without jargon.

## Hard requirements

- npm run check must be entirely green (it should now contain 5 checks)
- Do not bypass real problems with ignore / disable. Justify any unavoidable exceptions individually
- Do not change any logic or copy

## File boundaries

You may modify only:
  package.json, package-lock.json
  .stylelintrc*, .eslintrc* (new files)
  .github/workflows/ci.yml
  scripts/word-count.mjs
  e2e/a11y.spec.ts and other e2e tests
  src/styles.css (only to replace inline styles with classes and fix touch targets)
  The 8 components with temporary inline styles (only remove style attributes and replace them with classes)
  docs/PROGRESS.md (handoff entries only)

Do not modify: any business logic, netlify/**, src/engine/**, src/data/**

## At completion

1. Add a handoff row in docs/PROGRESS.md that includes:
   - Actual word counts vs. AGENTS.md §7.5 limits, and your recommendation
   - Right-rail focus-management fixes and issues pinned with test.fixme
   - Branch protection setup steps for Juanxi
2. Commit message: [S6][Claude] Short description
3. git push -u origin design/s6-guardrails
4. Do not merge. Do not touch main.
5. Report to Juanxi in simple Chinese [historical instruction; superseded by the current English policy]. Emphasize: from now on, if any AI tries to hardcode
   a value or color in CSS, CI will block it.
```

---

### S7 · Explainability switch + visible subtitles | Opus 5.5 | Must follow S6

```
You are restoring one of the interactions with the greatest thesis value in the Platypus Officer Hub repository.
Project owner Juanxi does not code.

Read first (all required):
1. AGENTS.md
2. docs/AUDIT_2026-10-27.md sections 7.3 and 7.4 — the 3 good v0.1 designs that were discarded
3. docs/DESIGN_TOKENS.md — you must follow the token rules established by S5
4. docs/EXECUTION_PLAN_2026-10-27.md — you are S7

## Background: what you are restoring

The v0.1 prototype (Juanxi's favorite version) had a global **"Behind the scenes"** toggle
(old code: public/legacy/index.html : 396 input, : 925 bts() helper,
: 1669 html.show-bts toggle).

When enabled, **every number, every date, and every AI output in the interface is labeled with its source in place**:

  "Rule engine / startBy = finish-by date minus 2–3 business days"
  "Computed / sum(task.minutes) for open tasks starting within 14 days"
  "AIR Verdicts / choice: done|waiting|help|other · POST /api/replies/classify"

Today, this single mechanism has been scattered across 15 details collapsibles, dozens of hover cards, and a Help page.

**For an honors thesis arguing for AI explainability, the lost interaction is precisely the one with the greatest thesis value.**

⚠️ [Correction, 2026-10-27; required reading] The audit originally inferred that "Juanxi misses the old layout." He later
sent screenshots confirming that **he likes the current version** (see Section 1.4 of this plan), disproving that inference.

→ The rationale for C1 therefore changes: **it is not about "bringing back what he misses,"** but:
   ① The thesis needs evidence of explainability.
   ② Touchscreen users cannot see hover-card content (audit section 8.4: 4 hover-only locations).
→ C1 is therefore **an addition**, not a rollback. Do not change any visual aspect of the current layout.

⚠️ S2 may already have deleted public/legacy/. Retrieve a reference with git:
    git show 49b0b89:public/index.html > /tmp/v01-reference.html
  (First verify this commit and path; if incorrect, use git log --all --oneline -- public/
   to find them. S2's handoff should contain the correct command.)

## Good news: all the material already exists

Today's data structures already contain all explanation text; it need not be regenerated:
  node.why
  sched.nodes[id].explain.{latestStart, club, official}   ← schedule.ts:44; every date has a "why" sentence
  forecast.reasons + FORECAST_ASSUMPTIONS (forecast.ts:6-12)
  change.source
  rule.sources + rule.checkedOn
  Contribution sources
You only need to display them in place.

Before starting:
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # Confirm [S6] commits exist
  git checkout -b feat/s7-explain origin/integration/v1.1-fix
  npm ci

## C1 · Global Behind-the-scenes toggle

→ Add a toggle to the top bar (src/components/Layout.tsx).
  ⚠️ The top bar already has 5 controls, 3 of which are demo scaffolding (Demo menu, View as, AI features).
    Audit section 8.6 notes that "60% of the global interface is demo tooling." Do not make this a sixth control.
    Suggestion: group it with the AI features toggle in one menu, or place it in the Demo badge. Use your judgment.
→ When enabled, show each number/date/AI output's source in place (source + one-line algorithm explanation).
  Refer to v0.1's bts() implementation, using current tokens and components.
→ When disabled, it must take no space and be absent from the DOM (do not merely use visibility: hidden;
  screen readers would still read it and word-count would still include it).
→ Persist the toggle state in localStorage across refreshes.

**This addresses three problems at once:**
1. Touch users cannot see hover-card content (audit section 8.4, 4 hover-only locations)
2. Juanxi said, "I can't tell what each part is"
3. The thesis's explainability argument

## C2 · Make the 10 "questions" visible text [Downgraded: ask Juanxi first]

⚠️ Juanxi never complained that he “could not understand the pages”—this is an auditor's improvement suggestion, not a bug fix.
And he has confirmed that he likes the current appearance.

→ **Ask him before doing this**: show a mockup with subtitles (a sketch or a one-page implementation is fine),
  and ask whether he wants it. Proceed if he says yes; otherwise skip it and do only C1.
→ Do not start by default.

src/routes.ts:13-24 defines “the one question this page answers” for every page, forming the backbone of the project's IA.
But the comment at src/components/Page.tsx:4 says “The page's question is the nav tooltip,”
and src/components/Layout.tsx:75, 81 puts it in title={p.question}—**a native browser tooltip
that takes 1 second of hovering to appear and does not exist on touch screens.**

The IA framework was reduced to an invisible attribute. Meanwhile, Page.tsx:9 renders only a one-word page title.

→ Turn question into a visible subtitle: one line beneath the PageHead title.
→ Use --fs-sm + --muted; do not compete with the main heading.
→ ⚠️ This adds words and may exceed the word limits S6 just added to CI.
  S6's handoff should recommend how to adjust the limits. If this is still undecided, **stop and ask Juanxi**;
  do not change the figures in AGENTS.md §7.5 yourself (he approved that rule, and changing it needs his agreement).
→ Also fix one IA problem: 3 pages in routes.ts actually ask 2–3 questions instead of "one question"
  (/team's "who is overloaded, who deserves recognition, and when can we meet" = 3 unrelated cards on the page;
   /funding and /events have the same issue).
  → Do not restructure the pages. Just rewrite each question into one genuinely single question and tell Juanxi
    in the handoff that these 3 pages should eventually be split.

## Hard requirements

- Follow docs/DESIGN_TOKENS.md. Do not hardcode any values or colors (S6's stylelint will block them)
- npm run check all green, including the new stylelint / eslint / word-count
- New interactions need e2e tests: toggle on, toggle off, persistence after refresh, content absent from the DOM when off
- Accessibility tests must continue to pass on both desktop and mobile
- Do not change AGENTS.md / PRODUCT_PLAN.md / RULES.md (ask Juanxi first if changes are needed)

## File boundaries

You may modify only:
  src/components/Layout.tsx, src/components/Page.tsx
  src/routes.ts
  src/styles.css (add bts-related styles, using tokens only)
  Lines in individual pages / components that add in-place annotations
  src/test/** and e2e/**
  docs/PROGRESS.md (append handoff record only)

Do not modify: netlify/**, src/engine/** (except to read explain fields), or the structure of src/data/**

## At completion

1. Add a line to the handoff record in docs/PROGRESS.md
2. Commit message: [S7][Claude] Brief description
3. git push -u origin feat/s7-explain
4. Do not merge. Do not touch main.
5. Report to Juanxi in simple Chinese and tell him: turn on the switch, then look at Today —
   each date will explain how it was calculated. Ask him whether this is the
   feeling he misses.
```

---

### S8 · Touch fallback + navigation reorganization | Sonnet 5.5 | Must follow S7

```
Make two final interaction improvements in the Platypus Officer Hub repository. Project owner Juanxi does not code.

Read first:
1. AGENTS.md—especially §7
2. docs/AUDIT_2026-10-27.md §8.4 (hover-only list) and §7.4 (v0.1 navigation)
3. docs/DESIGN_TOKENS.md
4. docs/EXECUTION_PLAN_2026-10-27.md—you are S8

Before starting:
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # Confirm there is an [S7] commit
  git checkout -b feat/s8-touch-nav origin/integration/v1.1-fix
  npm ci

## C3 · Fall back to tap-to-expand hover cards on touch screens

The "three-level interaction" in AGENTS.md §7.3 is: look (color) → pause (hover card) → click (right-rail details).
**Level 2 is completely absent on touchscreens**, because touchscreens have no hover.

Using : focus-within works only if the trigger itself is focusable. The audit identified 4 locations that
cannot even be reached by keyboard (strictly hover-only):
  src/pages/Funding.tsx: 54, 60   6-station logistics chain — no onClick; rendered as <span role="img">
                                 On mobile, a row of 6 unlabeled 12px dots with no text
                                 or tappable explanation. **This is the worst case.**
  src/pages/Handoff.tsx: 33-37, 46  Leadership-transition season progress chain
  src/pages/Handoff.tsx: 116       First-week checklist sources
  src/pages/Funding.tsx: 54        Stage hint (showLabels={false} compact)

→ Under @media (hover: none), render the Hover component as a tappable disclosure.
→ ⚠️ S7 just added the Behind-the-scenes switch, using the same explanatory text.
  **Reuse S7's mechanism; do not build a second one.** Read S7's handoff and code first.
→ The Events flowchart has a related issue (audit section 8.4): on touchscreens, a tap immediately opens the right rail,
  so the hover card never appears, while information unique to that card (ASU official deadline + rule ID,
  scheduling conflicts, and whom the task is waiting on) is buried inside a details disclosure in the right rail.
  → Mobile users need 2 extra taps to see what desktop users see on hover. Address this too.

## C4 · Navigation [Cancelled 2026-10-27; one small item retained]

⚠️ **The original plan to "restore action-oriented navigation" is canceled.** Juanxi's 2026-10-27 screenshots confirmed that he likes
this version, including its current navigation (see section 1.4 of this plan). **Do not change any navigation labels.**

Retain only two small, uncontroversial items:

→ (a) src/components/Layout.tsx:79 has an empty, unlabeled group divider:
     <div className="group" aria-hidden="true" />
     Meanwhile .sidenav .group in styles.css retains styles for an uppercase label, but never has content.
     → Give it a title (such as "Reference"; UI text must be English). This completes unfinished work
       rather than changing the design.
     → At ≤860px it is currently display:none and navigation becomes a horizontally scrolling pill strip. Keep this:
       omitting group headings on narrow screens is reasonable.

→ (b) Restore unread counts on navigation items. v0.1 had them; today they are gone (even .sidenav .count
     styles are gone from styles.css). Source: unread notifications for the current role, already calculated in Layout.tsx:132.
     → ⚠️ This adds visual elements. Implement one first, take a screenshot, and ask Juanxi whether to extend it to other items.

**Do not** change navigation labels, navigation order, navigation icons, or add secondary navigation.

## Hard requirements

- Follow docs/DESIGN_TOKENS.md.
- npm run check must be fully green (including stylelint / eslint / word-count / desktop+mobile a11y).
- Touch fallbacks require mobile e2e tests.
- Do not modify AGENTS.md / PRODUCT_PLAN.md (ask Juanxi first if a change is needed).

## File boundaries

You may modify only:
  src/components/ui/index.tsx (Hover component)
  src/components/Layout.tsx
  src/components/flow/MetroChart.tsx
  src/pages/Funding.tsx, src/pages/Handoff.tsx
  src/styles.css (tokens only)
  src/test/** and e2e/**
  docs/PROGRESS.md (append handoff record only)

## At completion

1. Add a line to the handoff record in docs/PROGRESS.md
2. Commit message: [S8][Claude] Brief description
3. git push -u origin feat/s8-touch-nav
4. Do not merge. Do not touch main.
5. Report to Juanxi in simple Chinese, including a before/after comparison of navigation labels for him to choose from.
   Also ask him to open Funding on his phone and confirm that the 6 dots now open explanations when tapped.
```

---

### S9 · Finalize, document, merge, and launch | Opus 5.5 | Last

```
You are responsible for finalizing Platypus v1.0. This is the last work package for the ASU honors thesis Phase 3 prototype;
real participants will use it afterward. Project owner Juanxi does not code.

Read first (all mandatory):
1. AGENTS.md — in full.
2. docs/AUDIT_2026-10-27.md — in full.
3. docs/EXECUTION_PLAN_2026-10-27.md — in full.
4. docs/PROGRESS.md — all S1 through S8 handoff records. These are your checklist.
5. docs/DESIGN_TOKENS.md.

Before starting:
  git fetch origin
  git checkout -b release/v1.0 origin/integration/v1.1-fix
  npm ci
  npm run check     # Continue only if everything passes

## 1. Check the S1–S8 handoff records

Review each item and list:
- Things promised but not actually done.
- Things marked with test.fixme.
- Things requiring Juanxi's decision that he has not decided yet.
Give Juanxi this list so he can decide what must be resolved before Phase 3 and what can remain.

## 2. Fix documentation (stale items in the audit appendix)

- README.md:7 still describes v0.1 ("the whole app in one file",
  "Data storage is still in-memory"). Update it to reflect the current implementation.
- AGENTS.md:81 still says "the production site is still v0.1", although v1 was merged and launched on 10/23.
- AGENTS.md:76 says the Feedback queue is at the bottom of Rules; it has moved to Settings.
- AGENTS.md sections 6/6b are outdated overall (swimlane/Gantt charts and endpoints removed; token table
  and lint added). Replace them with the current code map.
- AGENTS.md section 7: add "Read docs/DESIGN_TOKENS.md before interface changes;
  use tokens only."
  ⚠️ AGENTS.md contains Juanxi-approved rules. Show him the diff and obtain agreement before changing it.
- docs/PRODUCT_PLAN.md: the interface description in section 6 and architecture diagram in section 11 may need updates
  (the data layer remains localStorage; Juanxi deferred Supabase on 2026-10-27).
  His agreement is also required.
- ⚠️ Figures quoted in docs/PROGRESS.md, such as "253 unit tests + 107 page tests," **have not been verified
  by running them** (audit section 9 appendix). Run them once and replace the figures with actual results.
  **These numbers may appear in the thesis; they must not be estimates.**

## 3. Clean up leftovers

- Delete ax.tmp.mjs (an 11-line temporary debugging file in the repository root, hardcoding one machine's browser path;
  its functionality is covered by e2e/a11y.spec.ts)
- sourcemap: true at vite.config.ts: 8 — publishes full source maps in production.
  Recommend disabling it (the code itself is in a public repository, so this is not a vulnerability, but the setting should not be enabled by default).
- Locations that generate IDs from array length (report:${length} at store.tsx: 107,
  taskWorkflow.ts: 79, store.tsx: 205) — deletions will cause ID collisions once supported. Use stable IDs.
- Confirm whether the default AI_TIMEOUT_MS of 25000ms in netlify/lib/ai.mts exceeds Netlify's synchronous-function
  execution limit (marked as an inference in audit section 4.5; requires actual testing). Adjust if it does.

## 4. Required pre-launch checks

- [ ] npm run check is fully green; record actual test counts.
- [ ] Manually check: 10 pages × desktop/mobile × light/dark.
- [ ] Keyboard walkthrough: use only Tab / Enter / Escape to "claim a task → change status → complete."
- [ ] Rehearse the participant flow: Reset demo → five-step setup → create an event → create a task →
      ask AI a rules question → export data. No stalling or blank screens anywhere.
- [ ] S2 interaction log: perform 10 actions, export, and verify all 10 JSON entries exist in the correct order.
- [ ] S2 rate limiting: confirm it takes effect and record the actual threshold.
- [ ] Test real DeepSeek (not mocks): Ask panel + WP5's 40-question rules evaluation.
      ⚠️ docs/AI_TESTS.md explicitly prohibits presenting mocked results or local fallbacks as real AI acceptance.
      If access protection prevents the run, **record it honestly as incomplete**; do not be vague.

## 5. Netlify access protection (before 11/4; requires action by Juanxi)

The entire official site currently returns 401; only someone logged into his Netlify account can open it. This must be disabled before recruitment emails go out.
**But at that moment, /api/* becomes exposed to the public internet.**

→ Confirm S2's rate limiting is effective before asking him to turn protection off.
→ Write step-by-step "where to click" instructions for him (you do not have his Netlify access).
→ Also remind him to check that AI_API_KEY is set for Production / Deploy Previews / Branch deploys
  (docs/PROGRESS.md records that it was set only for Production, leaving previews with simulated responses).

## 6. Merge and tag (requires Juanxi to explicitly say "approved to merge")

AGENTS.md section 3, rule 4: main is the production site; merging requires Juanxi's approval.

→ Give him the check results
→ After he says "approve the merge": merge release/v1.0 into main and tag v1.0
→ Confirm Netlify deployed successfully and /api/health shows the live provider is connected
→ Write the final handoff entry in docs/PROGRESS.md

## At completion

Report to Juanxi in simple Chinese [historical instruction; superseded by the current English policy]:
- Which checks passed and which failed
- What he must do himself (Netlify settings, branch protection), with step-by-step click instructions
- Actual figures that may be cited in the thesis (test counts, contrast, performance)
- What remains unfinished and is recommended for v1.5
```

---

## Section 6 · What you need to do now

### Today (10/27, Tuesday)

1. **Confirm this plan**, especially: are the session divisions reasonable, and is the timetable achievable?
2. **Send me a screenshot showing the blue border** (click a flowchart node or Board card, then capture the full screen). S3 needs it to fix the right thing.
3. **Commit the audit report and this plan to GitHub**, or the next 9 sessions cannot read them.
   Both are documentation only and do not affect the site. I can help, but AGENTS.md rule 4 requires you to say “yes.” [Historical approval rule; current owner policy supersedes it.]
4. **Create the integration branch** (I can help):
   ```
   git checkout -b integration/v1.1-fix main && git push -u origin integration/v1.1-fix
   ```

### Wednesday (10/28)

Open three sessions, **S1 / S2 / S3** (they may run simultaneously). Paste the entire corresponding prompt from section 5 into each.

### Thursday (10/29) · Submit IRB

- Merge S1 → S2 → S3 into `integration/v1.1-fix`, then merge into `main`
- **Add “collect and export participant interaction logs” to the IRB materials** (see §1.3 ③). Adding it now costs nothing; adding it after approval requires an amendment and could block your 11/9 testing plan.

### After Thursday

Proceed S4 → S5 → S6 → S7 → S8 → S9, opening one session at a time. **Confirm S2 rate limiting works before 11/4**, then disable Netlify access protection and send recruitment emails.

---

## Section 7 · My assessment of this schedule

Frankly, **the goal of having "all features working" by Thursday (2 days away) itself needs clarification.**

The functionality is actually **already complete** — all five work packages from WP0 to WP5 were completed in one day on 10/22. The work before Thursday is **to make existing features presentable**: discoverable buttons, responsive changes, no blank screens, no data loss, and no waiting after a click.

That is exactly the scope of S1 + S2 + S3. **Finishing in 2 days is realistic**, because the three sessions can run in parallel and every item has exact files and line numbers.

One reminder: **real DeepSeek has never been tested.** Both `docs/PROGRESS.md` and `docs/AI_TESTS.md` explicitly record this gap—the Netlify preview key was configured only for Production, so previews have always used mocked responses, and the 40-question rule evaluation has only run against a mock provider.

If AI is to actually answer student questions in Phase 3 sessions, **this must be tested live before 11/9; mock results cannot stand in for it** (`AI_TESTS.md` itself sets this rule). I placed it in S9, but **it may need a separate session**, because it depends on you configuring the key in Netlify and redeploying, and it may uncover new issues.

→ Recommendation: **test the real AI immediately after disabling access protection on 11/4**; do not leave it until 11/8. If response quality is poor, you will still have 4 days to tune the prompts.

---

# Section 8 · DP3 × DP4 merge (added 2026-10-27; Juanxi's designated current priority)

## 8.1 What the two previews are

**Deploy Preview number = PR number.**

| | PR | Branch | Contents | Relative to `main` |
| --- | --- | --- | --- | --- |
| **DP4** | #4 | `integration/v1.1-fix` | main + S1/S2/S3 fixes (permission entry points, security/data, performance/polish) | +2,446 lines |
| **DP3** | #3 | `feat/organization-setup-ai` | v1 + `src/phase1/` + `src/organization/` (Setup v3) + `src/workspace/` | +29,773 lines |

DP3 is "pure white" because its 4,567 lines of separate CSS (`phase1.css` / `organization.css` / `setupV3.css`) **do not implement dark mode**. Juanxi said he prefers light mode (section 1.5), so this is an accidental advantage, not a design decision.

`v1` has the same content as `main`, so **main is the common ancestor of DP3 and DP4**.

## 8.2 Actual trial-merge results (run on 2026-10-27)

Merge DP3 into DP4:

```
130 files merged automatically
 11 files conflicted
```

**All conflicts are minor.** Check them individually:

| File | Conflict blocks | Nature | Effort |
| --- | --- | --- | --- |
| `netlify/functions/{ask,chat,command,handbook-draft,nudge-draft}.mts` | 1 each | **Two names for the same parameter**: S2's `endpoint: "ask"` (usage logging) vs DP 3's `task: "ask"` (model routing) | One line each |
| `netlify/functions/{classify,parse-brief,plan-draft}.mts` | 0 | **Delete/modify conflict**: S2 deleted them; DP 3 only changed the line above. Verified that DP 3's `src/` and `public/` **do not reference** any of these three endpoints | Accept deletion directly |
| `netlify/lib/ai.mts` | 2 | DP 3's `ChatJSONArgs` / `ChatJSONResult` are **strict supersets** of S2's versions | Use DP 3's types and reattach S2's logging calls |
| `src/main.tsx` | 1 | S1's ErrorBoundary + theme switching vs DP 3's `phase1` route import. **Keep both; interleave them** | 10 minutes |
| `docs/PROGRESS.md` | 1 | Each side appended its own handoff entry | Keep both |

## 8.3 A finding about combining their strengths

When S2 implemented A8 (e) usage logging, it could record only provider / model / elapsed time, because `ChatJSONResult` did not include token counts then.

**DP3's `ChatJSONResult` already has every field S2 wanted but could not obtain:**

```ts
inputTokens, outputTokens, finishReason, headersMs,
requestedModel, reasoningEffort, servedReasoningEffort, routingVersion,
inputChars, outputChars
```

→ **After merging, S2's cost monitoring will become complete automatically**, without extra work. This is one way DP3 fills a gap in DP4.

Conversely, DP 4 adds what DP 3 lacks: ErrorBoundary, data export and interaction logging, rate limiting, theme switching, zero-delay hover, computing forecasts only once, and form focus styles. DP 3 has none of these.

## 8.4 Conclusion: this merge can be completed in one session; it is not a multiday project

Of the 11 conflicts, **8 are one line or zero lines**. Only `ai.mts` (two type definitions) and `main.tsx` (interleaving two code blocks) require real thought.

**Estimated 2–4 hours, one session.**

⚠️ Merging resolves only the **code**. After merging, DP3's interface still uses its own 4,567 lines of CSS and differs visually from the main application. Visual unification is separate; see 8.6.

## 8.5 Prompt for the merge session (M1)

```
You are responsible for combining Platypus's two Deploy Previews into one version. Project owner Juanxi does not write code.

Read first (required):
1. AGENTS.md: in full, especially Section 3's hard rules and **Section 8's branch conventions**.
2. Section 8 of docs/EXECUTION_PLAN_2026-10-27.md: the complete trial-merge results and your work instructions.
3. docs/AUDIT_2026-10-27.md: background.
4. docs/organization/V3_CHANGELOG.md (on the DP3 branch): what DP3 did.

## Background

DP4 = integration/v1.1-fix (PR #4) = main + S1/S2/S3 fixes
DP3 = feat/organization-setup-ai (PR #3) = v1 + src/phase1/ + src/organization/ + src/workspace/

A trial merge was actually run: 130 files merged automatically, with 11 conflicts, all small.

⚠️ Section 8.2 explains each conflict and how to resolve it. Follow those directions rather than reassessing them yourself.

Before starting:
  git fetch origin
  git checkout -b integration/dp3-dp4-merge origin/integration/v1.1-fix
  npm ci
  git merge --no-ff origin/feat/organization-setup-ai

⚠️ Never rename or delete these four branches: integration/v1.1-fix, feat/organization-setup-ai,
  feat/ai-native-phase1, and v1. They support PR #2/#3/#4;
  changing them would close the PRs and permanently destroy Deploy Preview URLs (AGENTS.md §8.2).

## Resolve the conflicts individually

1. `endpoint:` vs `task:` in 5 Netlify functions —
   **Standardize on DP3's `task`** (it uses the AiTask type, participates in model routing, and carries more information),
   then update S2 usage logging to read `task`.

2. Delete/modify conflicts in classify.mts / parse-brief.mts / plan-draft.mts:
   **Accept S2's deletions.** Verified: DP3's src/ and public/ do not reference these three endpoints at all.
   After deletion, search the whole repository again to confirm no references remain.

3. netlify/lib/ai.mts —
   **Take DP3's ChatJSONArgs / ChatJSONResult** (a strict superset of S2's version),
   then reconnect S2's usage-log call.
   → Complete the logs as well: DP3 returns inputTokens / outputTokens /
     finishReason / headersMs, which S2 could not obtain originally. Log them now.
   → ⚠️ Logs must never contain keys, token strings, or user content.

4. src/main.tsx —
   Keep **both** S1's ErrorBoundary + clearSavedDemo + theme switching (A11) and DP 3's phase 1 routes.
   Interleave them; do not choose one side.
   → ErrorBoundary must wrap the phase 1 routes (DP 3 has no ErrorBoundary of its own).

5. docs/PROGRESS.md — retain both sets of handoff records, in reverse chronological order.

## Required after merging

- npm run check must be fully green. ⚠️ DP3 includes its own tests (organization.test.ts, setupV3.test.ts,
  phase1.test.ts, server.test.ts, etc.); these must all pass too.
- Manually walk through **both paths**:
  (a) Main application: Today / Events / Tasks / Team / Funding / Handoff / Partners / Rules / Settings.
  (b) DP3: five-chapter onboarding at /#/phase1/ (constitution → team → responsibilities → event workflow → Review).
- ⚠️ Juanxi prefers **light mode**. Check both paths in light mode.
- Confirm S1's theme switch also works at /#/phase1/. If it does not (DP3 has its own CSS and
  may not connect to the data-theme hooks), **record it in the handoff**; do not fix it now. That belongs to visual unification.

## Three things to report to Juanxi

1. **Server storage**: DP3 has netlify/lib/organization/storage.mts (stores organization configuration
   server-side, with private workspaces retained for 7 days). This differs from the main application's "browser-only data" premise.
   → Tell Juanxi clearly: **this has IRB implications, and he must know before submitting Thursday's materials.**
2. **Two coexisting onboarding flows**: the main application has src/pages/Setup.tsx (five-step setup),
   while DP3 has five-chapter onboarding, with overlapping functionality. **Phase 3 participants cannot see both.**
   List the differences and let Juanxi choose one.
3. **AI provider**: DP3's modelPolicy routes among Gemma 4 31B / Muse / GLM 5.3,
   while the main application uses DeepSeek. Which will actually be used after merging? How should environment variables be configured?
   → Establish this and document it in docs/AI_SETUP.md.

## At completion

1. Add a handoff row in docs/PROGRESS.md
2. Commit message: [M1][Claude] Short description
3. git push -u origin integration/dp3-dp4-merge
4. **Open a new draft PR** (base: main), giving Juanxi a new Deploy Preview
   where he can see the combined result. **Do not close or modify PR #2 / #3 / #4.**
5. Do not merge into main.
6. Report to Juanxi in simple Chinese [historical instruction; superseded by the current English policy], giving him the new preview URL and the three decisions listed above.
```

## 8.6 What remains after merging (visual consistency)

The merge only makes the code coexist. DP3's interface still uses its own 4,567 lines of CSS.

**Lower-cost approach (recommended):** Once S5's token table is complete, make DP3's three CSS files consume the same tokens
(font sizes, spacing, radii, status colors, light/dark modes). Do not touch those 5,200 lines of TSX. The result will not be pixel-identical, but will
clearly look like the same product. Schedule this as **S5b**, after S5.

**Higher-cost approach (discuss after Phase 3):** Write an adapter from DP3 organization configuration → the main application's `DemoState`,
and rebuild the five-chapter onboarding using the main application's 5 components. That is v1.5-scale work.

---

# Section 9 · Juanxi's four decisions and DP3→DP4 integration (evening of 2026-10-27)

## 9.1 Four decisions

| # | Decision | Impact |
| --- | --- | --- |
| 1 | **Keep DP3's server storage, but hide it** | Retain `netlify/lib/organization/storage.mts` and `org-*` functions, but make them unreachable from participant paths. **See IRB requirements in 9.2** |
| 2 | **Unify the two onboarding flows**: integrate DP3's onboarding into DP4 | Largest piece of work; see 9.4 |
| 3 | **Replace DeepSeek with DP3's AI routing** (Gemma 4 31B / Muse / GLM 5.3). Juanxi: already tested; fastest responses | See 9.3 |
| 4 | **Keep DP4's metro map**, rather than DP3's flowchart. Juanxi: "Very neat, like a metro map; better than DP3's" | Directly determines how one conflict in 9.4 is resolved |

Juanxi's future plan (**not for now**): use the same metro-map style for setting and onboarding, and let users edit it themselves.

## 9.2 ⚠️ Define "hidden" precisely to avoid IRB problems

"Hidden" cannot mean merely "no entry point in the interface." As long as endpoints such as `org-setup.mts` / `org-archive.mts` remain live on the public internet, this is still a **server capable of receiving and storing data**.

**Hidden = all three conditions met together:**

1. **No interface path reaches it** (participants cannot navigate to it)
2. **Endpoints reject requests in production**: read an environment variable (for example, `ORG_SETUP_ENABLED`); if disabled, return 404 or 403 without running any storage logic
3. **Keep all code and tests**, ready to re-enable at any time

With these three conditions met, Juanxi's IRB materials **do not need** to state "organization configuration is stored on the server," because participant data genuinely will not reach the server.

❌ Item 1 alone is insufficient. In that case, the protocol must describe server storage, or the protocol will not match actual behavior.

**This must be confirmed complete before Thursday's IRB submission.**

## 9.3 Switch AI provider routing to DP3's

DP3's `src/organization/modelPolicy.ts` defines three routing tiers:
- **Gemma 4 31B** — longer structured setup tasks
- **Muse** — short conversations and edits
- **GLM 5.3** — only when the user explicitly requests Deeper review

⚠️ DP3's own documentation (`docs/organization/V3_CHANGELOG.md`) says: “This selection is not a proven performance ranking.” Juanxi says it returned fastest in his tests; **use his actual results as the reference**, but do not describe it in the thesis as a “validated performance ranking.”

**Work needed:**
- Route all main-app `/api/chat`, `/api/ask`, `/api/nudge/draft`, and `/api/handbook/draft` calls through DP3's routing.
- Wire the `task` parameter (`AiTask`) into these four endpoints so routing selects the right model.
- Update `docs/AI_SETUP.md`: environment-variable configuration and switching back to DeepSeek.
- ⚠️ Rule 5 in section 3 of `AGENTS.md` states, "Use DeepSeek during development; Phase 3 with real participants must use ASU AIR (or an IRB-approved provider)."
  **Before switching providers, confirm whether the new model is covered by IRB approval. Juanxi must confirm this with Marcie; AI cannot decide.**

## 9.4 ⭐ Core question: can the two data models actually align?

Juanxi asked, “The key question is whether those variables and components can really be adapted properly during the merge.” Field-by-field findings:

### ✅ Clean matches (direct mapping)

| DP3 | Main application | Notes |
| --- | --- | --- |
| `OrgRole.id` | `Role.id` | DP3 specifically implemented stable role IDs, which fits perfectly |
| `OrgRole.title` | `Role.displayName` | ✅ |
| `OrgRole.description` | (new field) | Low risk |
| `RaciRow.responsible` | `Node.ownerId` | ✅ |
| `RaciRow.accountable` | `Node.approverRoleId` | ✅ |
| `RaciRow.consulted` | `Node.consultedRoleIds` | ✅ |
| `RaciRow.informed` | `Node.informedRoleIds` | ✅ |
| `FlowNode.dependsOn` | `Node.dependsOn` | ✅ |
| `FlowNode.title` | `Node.title` | ✅ |

**The RACI fields map almost one-to-one; that is the best news.**

### ⚠️ Five actual conflicts, each requiring a decision

**① `departmentId` vs `RoleFunction`: two different classification axes**

DP3 groups by **department** (Programs & Planning / Event Logistics / Finance / Marketing & Communication / Outreach & Partnerships / Leadership & Records; 6 total).
The main app groups by **function enum** (`RoleFunction`: president / vice_president / treasurer / …).

The main application's **workflow templates, flowchart swimlanes, and role-handbook table of contents** all depend on `RoleFunction`.

→ **There is no one-to-one correspondence**; a mapping table is needed, with some many-to-one mappings.
→ Decision: **keep `RoleFunction` as the primary key** (the engine depends on it), and store `departmentId` as an additional tag for grouped display and colors. Keep both; do not choose one over the other.

**② Manual `FlowNode.position{x,y}` coordinates vs automatic subway-map layout—Juanxi has already chosen**

The main application's Metro diagram, `src/components/flow/metro.ts`, is a **pure layout algorithm** (with unit tests); it does not store coordinates.
DP3's `FlowEditor.tsx` (397 lines) lets users drag nodes and stores x/y in the data.

**Juanxi explicitly said he likes the metro map and does not want DP 3's flowchart.**

→ Decision: **discard `position` on import and use `metro.ts` for automatic layout**. Do not migrate DP3's `FlowEditor.tsx`.
→ His request to "let users edit it themselves in the future" should mean **letting users change order and dependencies while layout is still computed automatically**, rather than returning to manual coordinates. Record this in the future plan; do not implement it now.

**③ `dependencyMode: "all" | "any"`: the engine does not recognize "any"**

The main app's `topoOrder()` and `computeSchedule()` support only "start after all upstream tasks are complete."

→ Decision: **accept only `all` on import**. Reject `any` with a clear explanation; do not silently treat it as `all`.
→ ⚠️ **Do not change the engine for this.** `src/engine/` has the project's densest test coverage and greatest thesis value; changing it carries far more risk than benefit.

**④ Dates: `FlowNode.timing` vs the hard rule that "only the engine computes dates"**

Rule 3 in Section 3 of `AGENTS.md` is the entire project's core principle. DP3's `timing: RelativeTargetSchema` represents relative targets.

→ Decision: DP3's `timing` may only be translated into the main app's **`Node.anchor` (rule/target/fixed/followup) + lead times in the workflow template**, then passed to `schedule.ts` for calculation.
→ **DP3 timing must never be written directly into the three date fields.**

**⑤ DP3 has no concept of a "person"**

DP3 onboarding produces **roles** (`OrgRole`), not people.
The main app's permissions (`canLead`), notifications, workload, reminders, and contribution leaderboard **all attach to `Person`**.

→ Decision: integrated onboarding must **add a "who holds each role" step**. Reuse the main application's existing five questions in `Join.tsx`, or add a screen after DP3's "Team" chapter.
→ This step cannot be omitted: without it, Tasks / Team / Today have no data.

### ❌ What will not be migrated

| DP3 item | Why it will not migrate |
| --- | --- |
| `FlowEditor.tsx` (manually dragged flowchart) | Juanxi chose the metro diagram |
| `phase1.css` / `organization.css` / `setupV3.css` (4,567 lines) | A third design system. Rebuild the UI using the main app's 5 components |
| `src/workspace/` (Activity workspace) | Juanxi never requested it, and its responsibilities overlap Events/Tasks. **Leave it untouched on the branch for now** |
| `OrgAction` → `Node` | Different concepts: Action is a responsibility item without dates; Node is a task with three deadlines. An Action fits better as a **workflow template**, not a task |

## 9.5 The exact reason AI is “unintelligent” (identified)

Juanxi: "I wanted to set up an executable task, but it couldn't understand me and applied the entire event workflow instead."

**There are three layers of causes, all in prompts and regular expressions; this is not a model-capability problem.**

**① The system prompt is heavily biased toward events** (`src/lib/chatCards.ts`)

```
{"kind":"form","intent":"plan_event", ...} whenever the user wants to
   plan, host or organize a NEW event.
```
The word "organize" is too broad. Meanwhile, `add_node` (create a single task) is buried in the "Shown for approval first" list, with **no explanation of when to use it versus the event form**.

**② None of the four examples creates a single task**

The very first example is "I want to plan a mixer" → event form. Every example the model sees teaches it "the user wants to do something = organize an event."

**③ The local regex cannot handle it** (`src/lib/commands.ts:143`)

```js
/^(?:add|create) (?:a )?(?:task|node|step)\s*[:\uFF1A]?\s*(.+)/i
```
It must begin with `add` or `create`, immediately followed by task/node/step.
So `I want to set up an executable task…` **does not match** and goes straight to the AI, whose prior assumption is an event. The `\uFF1A` escape preserves the full-width colon from the original pattern.

**④ Another hidden hurdle**: `src/data/changeReview.ts:18` requires an `add_node` without an `eventId` to **have a confirmed date first**, but the default date is empty. Even if AI understands correctly, clicking Apply still produces an error.

### Fixes (all inexpensive)

1. Add an **explicit choice between two cases** to the prompt:
   - The user wants **an event with a date, venue, and budget** → `plan_event` form.
   - The user wants **a standalone task** (not part of any event) → `add_node`, `eventId: null`.
   - Uncertain → ask one question under rule 2; do not guess.
2. **Add two `add_node` examples** to the prompt, one explicitly showing a standalone task.
3. **Broaden local regexes** to handle `set up a task` / `I want to create a task` / `new task` / `make a task` / `add an executable task`.
4. **Give standalone tasks a default date** (for example, `addDays(today, 7)`), instead of presenting an empty required field.

## 9.6 Use three sessions; do not do everything at once

| Chat | Work | Model | When |
| --- | --- | --- | --- |
| **M1** | Mechanical merge + switch AI routing + hide server storage | **Opus 5.5** | Now, before Thursday |
| **M2** | Improve AI understanding (standalone task vs event) | **Opus 5.5** | After M1, before Thursday |
| **M3** | Unify onboarding (write adapter + rebuild UI with main-application components) | **Opus 5.5** | **After Thursday**, while waiting for IRB |

**Why M3 is scheduled after Thursday:** it requires an adapter spanning two data models, resolution of the five conflicts in 9.4, and rebuilding all five onboarding chapters using main-app components. This is more than two days' work; rushing would produce something worse than either current version.

IRB materials describe **how the research is conducted**, not every pixel. After M1 + M2, the prototype will be functionally complete, presentable, and responsive enough to submit the materials.

---

# Section 10 · Juanxi's second round of guidance, evening of 2026-10-27

## 10.1 AI provider: the issue is clarified, but rule 5 in `AGENTS.md` is outdated

Juanxi: all API calls go directly through ASU AIR; data is stored on ASU's servers and databases, and we only choose the model. This project will no longer use DeepSeek in the future.

**Repository records support this claim**: DP3's `AGENTS.md` already records `muse-glimmer-30b`, `glm-5-3`, and routing v3 (Gemma for long structured tasks / Muse for short edits / GLM for explicitly requested deeper review), and mentions "no AIR quota used": these models are called through AIR.

**→ The data-processing layer is no longer an open question. Stop bringing it up repeatedly.**

### ⚠️ But there is one real problem: `AGENTS.md` contradicts itself

```
Line 23 (both branches):
  5. **AI provider:** Use DeepSeek during development, with fictional data only;
     Phase 3 sessions involving real participants must use ASU AIR (or an IRB-approved provider).

Lines 128 / 137 / 140 (DP3 only):
  The new speed-first default model is muse-glimmer-30b; glm-5-3 is used only when the user explicitly selects…
  Muse by default; use GLM only for explicit Deeper review.
  Routing v3: Gemma for long structured tasks, Muse for short edits, GLM for explicitly requested depth.
```

**Line 23 was never updated.** In the same file, the hard rule in section 3 says "use DeepSeek," while the code map in section 6 says "use Muse/GLM/Gemma." AGENTS.md section 1 requires every incoming AI to **read section 3 first**.

→ **M1 must change line 23**, or the next AI will follow outdated rules.

## 10.2 ⭐ Ranking interaction and date variables: the good news is **all date logic already exists**

Juanxi's proposed interaction design:
- Do not drag nodes on the roadmap (too difficult).
- Use a survey-style ranking question: a three-line drag handle on the left; drag the entire row to reorder.
- Two levels: **major ordering** (large workflows that need their own groups) / **minor ordering** (nested within major groups; one major group can contain 5 minor items).
- Show "days needed to process" to the right of every major and minor option.
- The roadmap on the right recalculates automatically and updates live.
- Dates cannot be a single deadline; split them into official deadline / club deadline / each person's individual latest start.
- The organization's required N-day lead time → a variable applied to all tasks.
- Organization reminder lead days + processing time → latest start date.
- Users can adjust relative to latest start (such as "remind me 2 days earlier") → produce a new reminder date.

### Existing code checked item by item: **every part of this logic is already in the engine, without exception**

| Juanxi's description | Already in the code |
| --- | --- |
| Days needed to process | `Node.effort`; original comment: "Working days of effort, used for the latest start date" |
| Organization requires N days of lead time | `OrgSettings.clubBufferBusinessDays` (default: 3 business days) |
| Official deadline | `Node.officialDeadline` |
| Club deadline | `Node.clubDeadline` |
| Each person's individual latest start | `Node.latestStart` |
| How latest start is computed | `schedule.ts` documentation: "Latest start = club deadline minus effort days and the owner's personal buffer, on the owner's working days" |
| User adjustments to latest start | `Person.personalBufferDays` + `personalBufferEnabled` |
| Work backward from target date | Backward pass in `schedule.ts` |
| Sequence affects dates | `Node.dependsOn` + using "the working day before the downstream latest start" in the backward pass |
| **Major / minor ordering** | **`Phase` (plan / prepare / money / marketing / run / close, 6 total) = major ordering; `Node` within the same Phase = minor ordering** |

**→ Conclusion: only the editing interface needs work; no date mathematics needs to be written.** And the "overall ordering" is precisely those 6 stops on the metro map.

### Therefore, M3's hard constraints

1. The ordering UI **may write only two fields**: `Node.dependsOn` (sequence) and `Node.effort` (days), plus `Node.phase` (major-group membership).
2. **The UI must never write any date field.** After editing, call `applySchedule()` so `schedule.ts` recalculates all three dates. This is the hard requirement of rule 3 in `AGENTS.md` Section 3.
3. Live updates to the right-hand metro map = rerun `computeSchedule()` + `metro.ts` layout, **not saved coordinates**.
4. Do not modify `src/engine/` for this feature.

## 10.3 Conflict ③ `dependencyMode: "any"`—Juanxi authorized me to decide

**Decision: accept only `all` on import; explicitly reject `any` and tell the user. Do not change the engine.**

Reason: `topoOrder()` and `computeSchedule()` are the project's most thoroughly tested code and have the greatest thesis value (`engine.test.ts` asserts all three dates individually for the example event's 20 steps). Changing them for a feature used by DP3 but never needed by the main application brings far more risk than benefit. If "any upstream completion is sufficient" is truly needed, a join node can express it without changing the algorithm.

## 10.4 People, roles, and departments: make people the primary focus

Juanxi: each member has their own account and signs in themselves; members are assigned positions, and positions belong to departments. **The hierarchy centers on people, not positions.** Send members a link; they register with their own username and password, rather than sharing one account.

### This point needs to be considered in two parts

**① Data modeling (can be done now, low risk)**

Target hierarchy: `Person` → `Role/Position` → `Department`

Current state: `Person.roleId` already references `Role`, so "people have roles" is already implemented. What is missing:
- `Role` has no `departmentId` (DP3 has 6 departments that fill this gap; see 9.4①)
- `Role.holderId` and `Person.roleId` are **redundant references in opposite directions**, risking inconsistency. A people-first model means **`Person.roleId` is the single source of truth**; derive or remove `Role.holderId`

→ This belongs to **M3**, alongside onboarding.

**② Real account/password login (⚠️ an entirely different scale of work, requiring another decision from Juanxi)**

"Each member registers with their own account and password" implies:
- Real authentication
- Real user accounts stored on the server
- The kind of Supabase work previously deferred (audit Section 10, execution plan Track D)

But Juanxi's decision earlier on 10/27 was: **Phase 3 uses fictional data, no Supabase, and participants use the fake information we provide**.

**These two decisions conflict.** He must clarify:
- **A: Phase 3 still uses fictional information**, with real accounts deferred to v1.5 → M3 implements only ①, reorganizes the hierarchy around people, and adds no login.
- **B: Phase 3 requires real accounts** → restart track D (Supabase + authentication), and **change the IRB scope**, conflicting with his 10/29 submission date.

→ **Recommend A.** Hierarchical modeling and authentication are separate; get the modeling right first, and authentication can be added later.

## 10.5 Split M2 into two steps: propose the prompting strategy, then implement after review approval

Juanxi requires the prompt strategy and structure to be reviewed before M2, with implementation beginning only after his approval.

- **M2a (research and planning, no code changes)**: read `docs/PRODUCT_PLAN.md` section 2, "Interview findings: assessment of 8 hypotheses" (the repository's only record of actual pain points; under `AGENTS.md` section 3, rule 1, raw research material is neither present nor allowed in the repository). Combine it with the four-layer diagnosis in 9.5 and produce a prompt-strategy document for Juanxi's review.
- **M2b (implementation)**: change `chatCards.ts` / `commands.ts` / `changeReview.ts` only after approval.
