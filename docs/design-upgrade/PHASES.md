# Phases, work package and dependencies

Size: S = less than half a day, M = about one day, L = more than one day. Risk: Low/ Medium/ High.
"R level" in `README.md` 's rollback table: **R1** = pure style, can be noted for line `@import` to be turned off immediately; **R2** = must use `git revert`. All work package supports R2.

## Overview

| Phase | Theme | Bag. | We can get a couple of worktree at the same time. |
| --- | --- | --- | --- |
| **0** | The foundations. | DX-01、DX-02 | 2 |
| **1** | Hand: Press feedback, touch screen, font, protection | DX-03 … DX-08 | 6 |
| **2** | Space sense: Right bar, menu, hint, fold, load | DX-09 … DX-14 | 6 |
| **3** | Layout: Events, Tasks, Ask, empty state, details to switch | DX-15 … DX-19 | 5 |
| **4** | Cellular casings, columns, flow chart dynamics | DX-20 … DX-22 | 3 |
| **5** | Material, drag, time to finish. | DX-23 … DX-25 | 3 |
| **6** | End: Partners drag, documents and merge style | DX-26, DX-27 (first 26 and then 27) | 1 + 1 |

The **phase is a series of**: the last stage comes with merge, integration acceptance and Juanxi noding before starting the next phase. The **phase is parallel**: the same package is not changed from one document to another.

## Work package

| Bag. | Name | Phase | Size | Risk | R Level | Reliance (must first be met) |
| --- | --- | --- | --- | --- | --- | --- |
| DX-01 | Foundation: Style split files, effects token, test ports, screenshot scripts, style guards | 0 | M | Medium | R2 | — |
| DX-02 | Put it on. `Layout.tsx` Dismantled into stand-alone documents (pure moving) | 0 | M | Medium | R2 | — |
| DX-03 | Press feedback to transition to suspension | 1 | S | Low | R1 | DX-01 |
| DX-04 | Touch screen click area  ≥ 44px | 1 | S | Low | R1 | DX-01 |
| DX-05 | Risk point plus shape (no longer only color) | 1 | S | Low | R2 | DX-01 |
| DX-06 | Font Details: Length, Equivalent Numbers, Cellular Small, Wrap | 1 | S | Low | R1 | DX-01 |
| DX-07 | Page meta-information, click Highlights, scroll through | 1 | S | Low | R2 | DX-01、DX-03 |
| DX-08 | Animated "reduce effect" protection already exists. | 1 | S | Low | R1 | DX-01 |
| DX-09 | Right bar slides out + Ask button + safe zone + `dvh` | 2 | L | High | R2 | DX-01、DX-02 |
| DX-10 | Menu Access (Demo menu, bell) | 2 | S | Low | R2 | DX-01、DX-02 |
| DX-11 | Toast In and Out | 2 | S | Low | R2 | DX-01、DX-02 |
| DX-12 | Animation of the inner layer of a mobile suspension card. | 2 | S | Low | R1 | DX-01 |
| DX-13 | Expand Animation in Collapse Zones | 2 | S | Low | R1 | DX-01 |
| DX-14 | Load Bones + Delay Display | 2 | S | Low | R2 | DX-01 |
| DX-15 | Events board: narrow list, edge tip, white audit | 3 | M | Medium | R2 | DX-01 |
| DX-16 | Tasks board layout: empty line narrow, Done column visible, card suspended | 3 | M | Medium | R2 | DX-01 |
| DX-17 | Ask Panel: Empty Center, New Message In | 3 | S | Low | R2 | DX-01 |
| DX-18 | Empty Status Document and Next (except Tasks, Events) | 3 | S | Low | R2 | DX-01 |
| DX-19 | Toggle Cross Fade + Fade Page | 3 | S | Medium | R2 | DX-01、DX-09 |
| DX-20 | Cellular top bar thin (20a) + bottom navigation (20b, approval required) | 4 | L | High | R2 | DX-02、DX-09、DX-10 |
| DX-21 | board row header saturation | 4 | S | Medium | R1 | DX-16 |
| DX-22 | Flowchart Node Change `transform` + Spring Falling Position | 4 | M | Medium | R2 | DX-01 |
| DX-23 | Semi-transparent topbar + shadow level token | 5 | M | Medium | R1 | DX-01、DX-02；20b with bottombar if the merge is gone |
| DX-24 | Board pointer drag + Jean + spring + keyboard | 5 | L | High | R2 | DX-16, **DX-22** (with `src/lib/motion.ts`）|
| DX-25 | Time to finish: progress chain growth, dots, loops, corner signs | 5 | M | Medium | R2 | DX-02, DX-05, **DX-22** (with its `src/lib/motion.ts`）|
| DX-26 | Partners board drag (with DX-24 tool) | 6 | M | Medium | R2 | DX-24 |
| DX-27 | Document shut-up + style guard completion + merge small style files (subject to approval) | 6 | M | Low | R2 | All |

## Rollback Order Table

| Get out of here. | Do you want to withdraw first (if merge already) |
| --- | --- |
| DX-01 | All the other bags (it's the foundation. In general, there is no withdrawal; That's the whole thing. |
| DX-02 | DX-09、10、11、20、23、25 |
| DX-05 | DX-25 |
| DX-09 | DX-19、DX-20 |
| DX-10 | DX-20 |
| DX-16 | DX-21、DX-24、DX-26 |
| DX-22 | **DX-24, DX-25** (they're important) `src/lib/motion.ts`；Without them, without DX-22, there will be no conflict but **will fail to build**, 2026-11-01) |
| DX-24 | DX-26 |
| DX-20 | DX-23 (if it contains parts of the bottom bar) |
| The rest | None |

## Documentation Table (who can change what in parallel)

One file is only for **a** package in the same period. There's no file in the table. Don't touch it.

| File/ Selector | Who's it for? | Annotations |
| --- | --- | --- |
| `src/styles.css`、`src/styles/index.css` | **No one** (DX-01 only) `index.css` (once) | DX-27 is possible |
| `package.json`、`playwright.config.ts`、`.stylelintrc.json`、`scripts/word-count.mjs` | DX-01 | |
| `src/main.tsx` | DX-01 | Add only one line for introduction |
| `src/components/Layout.tsx` | DX-02 (several) →  DX-09 (right bar, button) →  DX-19 (light page) →  DX-20 (cellular shell) | Serial by Phase |
| `src/components/chrome/TopBar.tsx` | DX-02 → DX-20 → DX-23 | |
| `src/components/chrome/SideNav.tsx` | DX-02 → DX-20 → DX-25 | |
| `src/components/chrome/DemoMenu.tsx`、`Bell.tsx` | DX-02 → DX-10 → DX-20 | |
| `src/components/chrome/Toast.tsx` | DX-02 → DX-11 | |
| `src/components/rail/Rail.tsx`、`RailContext.tsx` | DX-09 → DX-19 | |
| `src/components/rail/AskPanel.tsx` | DX-17 | |
| `src/components/ui/index.tsx` | `RiskDot`：DX-05；`Hover`: DX-12 (default does not change it; If so, write the report first; `Chain`、`Ring`：DX-25 | Different stages, different functions |
| `src/components/RouteLoading.tsx` | DX-14 | |
| `src/components/flow/MetroChart.tsx`、`metro.ts` | DX-22 | |
| `src/pages/Events.tsx` | DX-15 | |
| `src/pages/Tasks.tsx` | DX-16 → DX-24 | board part |
| `src/pages/Today.tsx`、`Team.tsx`、`Funding.tsx`、`Handoff.tsx`、`Rules.tsx`、`Settings.tsx` | DX-18 (lines converted to empty only) | |
| `src/pages/Partners.tsx` | DX-18 (empty) →  DX-26 (trawl) | |
| `src/lib/dragSort.ts`(new) | DX-24 | DX-26 Reuse, do not change it |
| `index.html` | DX-07 | |
| `.ask-fab`、`.rail`、`.rail-*` Selector | DX-09 | Don't write them styles for the rest of the bags. |
| `.menu`、`.menu-wrap`、`.badge`(bell rings) | DX-10 (active effects); DX-23 Write only shadows | Properties do not overlap |
| `.toast` | DX-11 | |
| `.hover-card`(desktop) | **No one** | Only DX-12 `(hover: none)` Part |
| `.board-col`、`.board-card`、`.board` | DX-16 ( layout, suspension); DX-21 (head) `> header`）；DX-24 (trawl status) | |
| `.m-node`、`.m-gap`、`.m-ghost`、`.metro` | DX-22 | |
| `.topbar` | DX-20 (size); DX-23 (background, blurry, bottom line) | Properties do not overlap |

## How each stage begins

### Before stage begins (integrated, once)

```bash
git fetch origin
git switch claude/determined-johnson-yrdxwf && git pull
git merge origin/main               # main New submissions are frequently made, and each phase is combined (use)  mergeNo, I'm fine.  rebase）
npm ci && npm run check             # The starting point must be completely green; If it's not green, stop and tell.  Juanxi
git tag dx/phase-N-before
git push origin claude/determined-johnson-yrdxwf --tags
node scripts/dx-shots.mjs before-pN http://localhost:<Port >   # Phase  0 Then I got this script.
```

Then each package at this stage is given a worktree (see `README.md` for orders) and a "start password" is issued.

### Password for integration (one at each stage)

```
You're integrating people. Phase  N。Read it.  AGENTS.md、docs/design-upgrade/README.md、docs/design-upgrade/PHASES.md。
1. Confirm  claude/determined-johnson-yrdxwf Already Mege  origin/main，npm run check It's all green.  dx/phase-N-before。
2. Open for each work package at this stage  worktree(branch)  design/dx-NN-<Short name >The port is different.
   Start execution in parallel  agent( password template in )  README.md）。
3. When they're all sending their branches and...  reports/DX-NN.md。One by one.  diff: Just moving. "Files that can be changed "I'm sorry.
   Did you weaken the test? Did you write about naked milliseconds or naked color? Unqualified revert, don't change yourself.
4. Numbered from small to large  --no-ff One at a time.  dx/dx-NN-merged Label, register.  ROLLBACK_LOG.md。
5. One run at the end of the phase.  npm run check（Node 22Run again.  dx-shots（after）。Red: with  dx/dx-NN-merged Two points for the label,
   Find out which bag. Use it.  R2 Get rid of it. Tell me.  Juanxi。Don't fix one. "Do it. "Something to cover the red.
6. Yes.  docs/PROGRESS.md Write a stage: what has been done, where to preview the web site and highlights, what to know, how to rollback each package.
   Write. "Need to sync local backup "。Push  claude/determined-johnson-yrdxwf。It's not open.  PR（Juanxi You'll say it when you want to preview. No touching.  main。
7. Stop! Wait!  Juanxi Acceptance.
```

### Preview of the Web site

When you need to look at the effect on Netlify, Juanxi says to session "open a Draw PR for preview". The title reads "[ preview: do not merge ]" and the base is `main` (like PR #8). The same preview site will be automatically updated every time a `claude/determined-johnson-yrdxwf` is sent. **Do not delete or rename this branch**, otherwise the preview number will be invalidated (`AGENTS.md` section 8.2).
