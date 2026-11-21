# Stages, work packages, and dependencies

Size: S = up to half a day, M = about one day, L = more than a day. Risk: low / medium / high.
"R level" refers to the rollback table in `README.md`:**R1** = CSS only, disable immediately by commenting one `@import`; **R2** = requires `git revert`. All packages support R2.

## Overview

| Stage | Theme | Packages | Concurrent worktrees |
| --- | --- | --- | --- |
| **0** | Foundation (must finish before parallel work) | DX-01, DX-02 | 2 |
| **1** | Interaction feel: press feedback, touch, typography, protections | DX-03 … DX-08 | 6 |
| **2** | Spatial motion: rail, menus, toasts, disclosures, loading | DX-09 … DX-14 | 6 |
| **3** | Layout: Events, Tasks, Ask, empty states, detail switching | DX-15 … DX-19 | 5 |
| **4** | Mobile shell, column headers, flowchart motion | DX-20 … DX-22 | 3 |
| **5** | Materials, dragging, completion moments | DX-23 … DX-25 | 3 |
| **6** | Closeout: Partners dragging, documentation, stylesheet consolidation | DX-26, DX-27 (26 before 27) | 1 + 1 |

**Stages are sequential**: merge the previous stage, complete integration acceptance, and obtain Juanxi's agreement before starting the next. **Within a stage, packages run in parallel**: no two edit the same file.

## All work packages

| Package | Name | Stage | Size | Risk | R level | Dependencies (must merge first) |
| --- | --- | --- | --- | --- | --- | --- |
| DX-01 | Foundation: split stylesheets, motion tokens, test ports, screenshot script, style guards | 0 | M | Medium | R2 | — |
| DX-02 | Split `Layout.tsx` into separate files (move only) | 0 | M | Medium | R2 | — |
| DX-03 | Press feedback and hover transitions | 1 | S | Low | R1 | DX-01 |
| DX-04 | Touch targets ≥44px | 1 | S | Low | R1 | DX-01 |
| DX-05 | Add shapes to risk points (not color alone) | 1 | S | Low | R2 | DX-01 |
| DX-06 | Typography: letter spacing, tabular numerals, mobile small text, wrapping | 1 | S | Low | R1 | DX-01 |
| DX-07 | Page metadata, tap highlight, scroll bleed | 1 | S | Low | R2 | DX-01, DX-03 |
| DX-08 | Add reduced-motion protection to existing animations | 1 | S | Low | R1 | DX-01 |
| DX-09 | Rail entrance/exit + Ask button + safe area + `dvh` | 2 | L | High | R2 | DX-01, DX-02 |
| DX-10 | Menu entrance/exit (Demo, bell) | 2 | S | Low | R2 | DX-01, DX-02 |
| DX-11 | Toast entrance/exit | 2 | S | Low | R2 | DX-01, DX-02 |
| DX-12 | Mobile hover-card bottom-sheet motion | 2 | S | Low | R1 | DX-01 |
| DX-13 | Disclosure expansion animation | 2 | S | Low | R1 | DX-01 |
| DX-14 | Loading skeleton + delayed display | 2 | S | Low | R2 | DX-01 |
| DX-15 | Events layout: narrower list, edge hints, whitespace audit | 3 | M | Medium | R2 | DX-01 |
| DX-16 | Tasks board layout: narrow empty columns, visible Done, card hover | 3 | M | Medium | R2 | DX-01 |
| DX-17 | Ask panel: center empty state, new-message entrance | 3 | S | Low | R2 | DX-01 |
| DX-18 | Empty-state copy and next steps (except Tasks, Events) | 3 | S | Low | R2 | DX-01 |
| DX-19 | Detail-switch crossfade + page fade-in | 3 | S | Medium | R2 | DX-01, DX-09 |
| DX-20 | Slim mobile top bar (20a) + bottom navigation (20b, approval required) | 4 | L | High | R2 | DX-02, DX-09, DX-10 |
| DX-21 | Desaturate board headers | 4 | S | Medium | R1 | DX-16 |
| DX-22 | Flowchart nodes use `transform` + spring settling | 4 | M | Medium | R2 | DX-01 |
| DX-23 | Translucent top bar + elevation shadow tokens | 5 | M | Medium | R1 | DX-01, DX-02; include bottom bar if 20b merged |
| DX-24 | Board pointer dragging + displacement + springs + keyboard | 5 | L | High | R2 | DX-16, **DX-22** (uses its `src/lib/motion.ts`) |
| DX-25 | Completion moments: chain growth, dot pop, progress ring, badge | 5 | M | Medium | R2 | DX-02, DX-05, **DX-22** (uses its `src/lib/motion.ts`) |
| DX-26 | Partners board dragging (reuse DX-24 tools) | 6 | M | Medium | R2 | DX-24 |
| DX-27 | Documentation closeout + complete style guards + consolidate small stylesheets (approval required) | 6 | M | Low | R2 | All |

## Rollback order (revert dependents first)

| Revert target | Revert first (if merged) |
| --- | --- |
| DX-01 | Every other package (foundation; normally retain; reverting means undoing everything) |
| DX-02 | DX-09, 10, 11, 20, 23, 25 |
| DX-05 | DX-25 |
| DX-09 | DX-19, DX-20 |
| DX-10 | DX-20 |
| DX-16 | DX-21, DX-24, DX-26 |
| DX-22 | **DX-24, DX-25** (import `src/lib/motion.ts`; without reverting these first, DX-22 alone has no conflict but **breaks the build**, verified in 2026-11-01 rehearsal) |
| DX-24 | DX-26 |
| DX-20 | DX-23 (if it includes bottom-bar changes) |
| Others | None |

## File ownership (parallel editing boundaries)

Each file belongs to **one** package within a stage. Do not touch unlisted files.

| File / selector | Owner | Notes |
| --- | --- | --- |
| `src/styles.css`, `src/styles/index.css` | **Nobody** (DX-01 changes `index.css` once) | Consolidation possible only in DX-27 |
| `package.json`, `playwright.config.ts`, `.stylelintrc.json`, `scripts/word-count.mjs` | DX-01 | |
| `src/main.tsx` | DX-01 | Add one import only |
| `src/components/Layout.tsx` | DX-02 (split) → DX-09 (rail, button) → DX-19 (page fade) → DX-20 (mobile shell) | Sequential by stage |
| `src/components/chrome/TopBar.tsx` | DX-02 → DX-20 → DX-23 | |
| `src/components/chrome/SideNav.tsx` | DX-02 → DX-20 → DX-25 | |
| `src/components/chrome/DemoMenu.tsx`, `Bell.tsx` | DX-02 → DX-10 → DX-20 | |
| `src/components/chrome/Toast.tsx` | DX-02 → DX-11 | |
| `src/components/rail/Rail.tsx`, `RailContext.tsx` | DX-09 → DX-19 | |
| `src/components/rail/AskPanel.tsx` | DX-17 | |
| `src/components/ui/index.tsx` | `RiskDot`: DX-05; `Hover`: DX-12 (leave unchanged by default; document first if necessary); `Chain`, `Ring`: DX-25 | Different stages, functions |
| `src/components/RouteLoading.tsx` | DX-14 | |
| `src/components/flow/MetroChart.tsx`, `metro.ts` | DX-22 | |
| `src/pages/Events.tsx` | DX-15 | |
| `src/pages/Tasks.tsx` | DX-16 → DX-24 | Board section |
| `src/pages/Today.tsx`, `Team.tsx`, `Funding.tsx`, `Handoff.tsx`, `Rules.tsx`, `Settings.tsx` | DX-18 (empty-state lines only) | |
| `src/pages/Partners.tsx` | DX-18 (empty state) → DX-26 (dragging) | |
| `src/lib/dragSort.ts` (new) | DX-24 | DX-26 reuses, does not edit |
| `index.html` | DX-07 | |
| `.ask-fab`, `.rail`, `.rail-*` selectors | DX-09 | Other packages must not style these |
| `.menu`, `.menu-wrap`, `.badge` (bell) | DX-10 (motion); DX-23 shadows only | Nonoverlapping properties |
| `.toast` | DX-11 | |
| `.hover-card` (desktop) | **Nobody** (S3 decided zero delay) | Only DX-12 `(hover: none)` portion |
| `.board-col`, `.board-card`, `.board` | DX-16 (layout, hover); DX-21 (headers `> header`); DX-24 (drag states) | |
| `.m-node`, `.m-gap`, `.m-ghost`, `.metro` | DX-22 | |
| `.topbar` | DX-20 (dimensions); DX-23 (background, blur, bottom border) | Nonoverlapping properties |

## Starting each stage

### Before the stage (integrator, once)

```bash
git fetch origin
git switch claude/determined-johnson-yrdxwf && git pull
git merge origin/main               # main changes frequently;merge before each stage(use merge,not rebase)
npm ci && npm run check             # Baseline must be all green;otherwise stop and tell Juanxi
git tag dx/phase-N-before
git push origin claude/determined-johnson-yrdxwf --tags
node scripts/dx-shots.mjs before-pN http://localhost:<port>   # Script exists only after stage 0
```

Then create one worktree per package in the stage (commands in `README.md`) and send each its start prompt.

### Integrator prompt (one per stage)

```
You are the integrator. Stage N. Read AGENTS.md, docs/design-upgrade/README.md, docs/design-upgrade/PHASES.md.
1. Confirm claude/determined-johnson-yrdxwf includes origin/main, npm run check is green, and dx/phase-N-before is tagged.
2. Open a worktree per package(branch design/dx-NN-<short-name>, distinct ports),
   launch execution agents in parallel(prompt template in README.md).
3. Wait for all branches and reports/DX-NN.md to be pushed. Review each diff:only permitted files changed?
   Weakened tests?Bare millisecond/color values?Return deficient work; do not silently fix it yourself.
4. Merge ascending package numbers with --no-ff, tag each dx/dx-NN-merged, and record ROLLBACK_LOG.md.
5. At stage end, run full npm run check(Node 22), then dx-shots(after). On failure, bisect using dx/dx-NN-merged tags,
   identify package, revert it via R2, and tell Juanxi. Do not cover a failure with an incidental fix.
6. Record stage handoff in docs/PROGRESS.md:changes, preview URL/acceptance clicks, known issues, rollback per package.
   Write "Local backup needs synchronization." Push claude/determined-johnson-yrdxwf. No PR unless Juanxi requests preview. Do not touch main.
7. Stop for Juanxi acceptance.
```

### Preview URL

When a Netlify preview is needed, Juanxi tells the session “open a Draft PR for preview.” Title “[Preview · Do not merge],” base `main` (same approach as PR #8). Subsequent pushes to `claude/determined-johnson-yrdxwf` automatically update that URL. **Do not delete or rename this branch**, or the preview number becomes invalid (`AGENTS.md` section 8.2).
