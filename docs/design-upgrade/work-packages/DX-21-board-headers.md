> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-21 Desaturate Board column headers

- Stage 4　Size S　Risk medium　Rollback level **R1 available**　Dependency: DX-16　Parallel partners: DX-20, 22
- Branch: `design/dx-21-board-headers`　Style file: `src/styles/dx-21-board-headers.css`　Detail: D22

## Why
**Observed:** 6 saturated blocks across Board compete with the product's signature "metro line" (Apple Craft lens: "spend boldness in one place").

## Work
1. `.board-col > header`: background `--surface` (or `--surface-2`), text `--ink`, colored dot at left (still each column's `--pill`, user color from Settings → Board); count badge background `--surface-2`.
2. **Stuck** retains some warning: dot gets a `--late-soft` halo, text unchanged.
3. **Leave `StatusPill` unchanged**: solid monday-style status blocks remain in tables/cards.
4. **Recalculate dark-mode contrast:** user status colors have no dark variants (`DESIGN_TOKENS.md` 5.2). Dots are graphics requiring ≥3:1. Estimated Not claimed #5f6763 on dark `--surface-2` (#1d2322) is about 2.8:1, **failing**. Add a 1.5px light outline, or retain solid column headers in dark mode. Report calculations for all 6 light + 6 dark colors.

## Allowed files
Only `src/styles/dx-21-board-headers.css`.

## Acceptance
- `tasks.spec.ts`, `a11y.spec.ts` (including contrast) green on desktop/mobile.
- Juanxi: Board no longer has a row of large colored blocks; clean column names, only small dots colored. **If disliked, revert DX-21 independently.**

## Rollback
R1: comment the DX-21 line in `index.css`.
