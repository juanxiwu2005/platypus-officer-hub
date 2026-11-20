> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-16 Tasks board layout: narrow empty columns, visible Done, card hover

- Stage 3 · Size M · Medium risk · Rollback R2 · Depends on: DX-01 · Parallel partners: DX-15,17–19
- Branch: `design/dx-16-board-layout` · Styles: `src/styles/dx-16-board-layout.css` · Details: D20 D21

## Why
**Observed: ** at 1440 width with rail open, only 5 of 6 board columns are visible, pushing the rewarding Done column offscreen; most "My tasks" columns are empty, leaving large blank areas.
**Constraints: ** all 6 task statuses/colors are consistent site-wide (`AGENTS.md`7.6); retain every column and each "+ Add task" entry.

## Tasks
1. **Narrow empty columns: ** columns with 0 cards become about 56px strips (vertical title +0); others share remaining width so all 6 fit onscreen. Expand on drag passing through (`onDragEnter`), keyboard focus entering, or strip-title button click. Use `var(--dur-base)` + `var(--ease-out)` `flex`/`grid` column-width transitions (width only, no content animation).
2. A strip does not disappear: use a Tab-reachable `<button>` with `aria-expanded` and a name including status + "0 tasks".
3. **Column minimum height: ** `min-height: min(60vh, 520px)` for sufficient drop targets.
4. **Card hover: ** `.board-card:hover` border becomes `--accent` (only `@media (hover: hover)`), using `var(--dur-fast)`.
5. Mobile (<860px) retains 78vw horizontal snap layout, **no** narrow empty columns (already viewed one column at a time).
6. Do not change drag/drop logic (DX-24): preserve `draggable`, `onDragStart`, `onDrop`; narrow columns must still accept drops.

## Allowed files
`src/pages/Tasks.tsx` (board section), `src/styles/dx-16-board-layout.css`. **Forbidden: ** `.board-col > header` (DX-21), drag/drop handlers.

## Acceptance
- `tasks.spec.ts` (includes `dragTo`), `activity-workspace.spec.ts`, `a11y.spec.ts`, `word-budgets.spec.ts`, `touch.spec.ts` green.
- New `e2e/dx-16-board.spec.ts`: all 6 columns within 1440 viewport with rail open; dragging to a narrow empty column succeeds and expands it; Tab to strip + Enter expands.
- Juanxi: all 6 columns including Done visible at a glance; empty columns are narrow strips expanding on click/drag. **If you dislike it, tell me and roll back DX-16.**

## Rollback
R2. DX-21, DX-24, DX-26 depend on it; revert them first.
