# DX-04 Touch Screen Click Area  ≥ 44px

- Phase 1Size S Risk Low R Level **R1 Available**Dependence: DX- 01Parallel partners: DX- 03、05…08
- Branch: `design/dx-04-touch-targets` Style File: `src/styles/dx-04-touch-targets.css` Corresponding Details: D04 D05

## Why?
**to**: mobile phone `.icon-btn` high 32px; The code calculates `.btn` about 33px, `.chip` about 28px. Apple port default click area 44, minimum 28 (`accessibility.md`). Only 24 px (WCAG 2.5.8) is required for the current `a11y.spec.ts`.

## Something to do.
Write all in `@media (pointer: coarse)`, **desktop with one pixel unchanged**:
1. The primary controls have a minimum height of 44px: `.btn`, `.chip`, `.icon-btn` (for all), `.seg button`, `.crm-seg button`, `.sidenav a`, `input`/ `select` (non-check box), `.demo-pill`.
2. The dense little controls in tables and cards are no less than the buttons in 32px: `.tbl .btn.small`, `.board-card`, `.owner-chip button`.
3. A very small control extends the thermal area to  ≥ 32px, without changing its appearance: `.swatch` (20px), `.info` (16px), `.chain-btn`, and `label` rows where the check box is located.
4. Neighborhood element spacing ~8px.
5. For each change, check 390px has no horizontal roll (`noOverflow` is 0) and `word-budgets.spec.ts` is not affected.

## Files that can be changed
Only `src/styles/dx-04-touch-targets.css`. No contact with `.ask-fab`, `.rail` (DX-09).

## Acceptance
- New test `e2e/dx-04-targets.spec.ts` (run only on cellular items): for Today, Tasks, Events, Team, Partners, all `getBoundingClientRect` of `button, a, select, input:not([type=checkbox]), [role=tab]`, main control < 44 and the rest < 32; Exceptions are listed and explained on a case-by-case basis in the report.
- `a11y.spec.ts`, `touch.spec.ts` mobile phone project green. The screenshot of the desktop item is consistent bytes.
- Juanxi Test: Open previews in mobile phone or browser mode, buttons are obviously better and the page is not wide.

## Rollback
R1: Comment on line DX-04 in `index.css`. R2：`git revert -m 1 dx/dx-04-merged`。

## Attention.
- Some of the table row heights are already 44px (`.tbl td`), and the buttons inside are no longer high.
- Don't use `min-height` to keep `select` off the button next to it.
