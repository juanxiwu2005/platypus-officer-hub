# DX-16 Tasks board layout: empty line narrow, Done column visible, card suspended

- Stage 3 size M Risk Medium R2 Reliance: DX-01 Parallel Partners: DX-15, 17 ~ 19
- Branch: `design/dx-16-board-layout` Style File: `src/styles/dx-16-board-layout.css` Corresponding Details: D20 D21

## Why?
**saw**: 1440 wide + right column open, and 6 row board could only see 5 columns, with the most fulfilling line being squeezed out of the screen; Most of the columns under "My tasks" are empty, and a lot of blanks down there.
**Constraint**: 6 task status harmonized with color-wide station (`AGENTS.md` 7.6); Each column should be retained and cannot be deleted; Each column of "+Add task" must be accessible.

## Something to do.
1. **empty column with a narrow**: The card count is 0, the narrow line of about 56px (vertical heading + digital 0), while the remaining column divides the remaining space equally and ensures that the 6 column is in both screens. Automatically expands when the mouse drags past (`onDragEnter`), the keyboard focus enters the column, and clicks a narrow title button. Starts the wide transition of `flex`/ `grid` column (only on column width and not animated by column content) with `var(--dur-base)` + `var(--ease-out)`.
2. Narrow bars are not "disappeared": it's a `<button>` with `aria-expanded`, name with status and 0 tasks, Tab can reach.
3. **Column Minimum height**: `min-height: min(60vh, 520px)`, so that the drop target is large enough.
4. **Card Suspended**: `.board-card:hover` Border Change `--accent` (`@media (hover: hover)` only), with `var(--dur-fast)`.
5. The mobile phone (<860px) maintains 78vw horizontal adsorbing layout, **does not do** empty column narrow (a line is always shown on the cell phone).
6. Do not change the drag-and-drop logic (for DX-24): `draggable`, `onDragStart`, `onDrop` do not move and narrow columns must also be acceptable.

## Files that can be changed
`src/pages/Tasks.tsx` (board that part), `src/styles/dx-16-board-layout.css`. **No contact with**: `.board-col > header` (for DX-21) or towed events.

## Acceptance
- `tasks.spec.ts` (with `dragTo`), `activity-workspace.spec.ts`, `a11y.spec.ts`, `word-budgets.spec.ts`, `touch.spec.ts` green.
- When the new test `e2e/dx-16-board.spec.ts`: 1440 wide right bar is opened, 6 columns are in view; Drag a card to a narrow collection bar that can be dropped and expanded; Keyboard Tab to a narrow bar and press Enter to expand.
- Juanxi How to Test: Tasks can see all the 6 columns at once, including Done; The empty column is a narrow line that points or drags things up in the past. **Tell me if you don't like it, rollback DX-16.**

## Rollback
R2。DX-21, DX-24, DX-26 depend on it and withdraw first.
