# DX-21 board row header saturation

- Stage 4 size S Risk Medium R **R1 Available** Dependence: DX-16 Parallel Partners: DX-20, 22
- Branch: `design/dx-21-board-headers` Style File: `src/styles/dx-21-board-headers.css` Corresponding Details: D22

## Why?
**saw**: 6 saturated on top of the board, and the product called "Mille Line" (Apple Craft lens: "Courage is spent only in one place."

## Something to do.
1. `.board-col > header`: The background is changed to `--surface` (or `--surface-2`), the text is used as `--ink`, a coloured dot on the left (the color still comes from `--pill` in each column, i.e. the user-set colour in Settings  →  Board) and the digital logo is used at the bottom of `--surface-2`.
2. **Stuck** keeps a little warning: the dots add a circle of `--late-soft` light dizziness and the text remains unchanged.
3. **`StatusPill` (state) does not change**, which remains a tannery block of monday style in tables and cards.
4. The **dark color mode has to recalculate contrast**: the user state colour does not have a dark color version (`DESIGN_TOKENS.md` 5.2). A dot is a graphic that requires  ≥ 3:1. I estimate that #5f6763 of Not filmed presses on dark `--surface-2` (#1d2322) about 2.8:1, **not meeting the target**. Method: The dot plus the 1. 5px light-coloured edge, or keep the original solid line in dark mode. Writes the calculation (light 6 + dark 6) into the report.

## Files that can be changed
Only `src/styles/dx-21-board-headers.css`.

## Acceptance
- `tasks.spec.ts`, `a11y.spec.ts` (colour contrast) desktop + cellular green.
- Juanxi: The top of the board is no longer a row of colored blocks, it's well-listed and only small dots are coloured. **doesn't like to rollback DX-21 without prejudice to others.**

## Rollback
R1: Comment on line DX-21 in `index.css`.
