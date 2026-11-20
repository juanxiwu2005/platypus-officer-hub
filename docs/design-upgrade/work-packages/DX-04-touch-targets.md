> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-04 Touch targets ≥44px

- Stage 1; size S; risk low; rollback **R1 available**; depends DX-01; parallel DX-03,05…08.
- Branch `design/dx-04-touch-targets`; styles `src/styles/dx-04-touch-targets.css`; details D04 D05.

## Why
**Measured:** mobile `.icon-btn` height 32px; code implies `.btn` about 33px, `.chip` about 28px. Apple mobile default target 44, minimum 28 (`accessibility.md`); existing `a11y.spec.ts` requires only 24px (WCAG 2.5.8).

## Work
All inside `@media (pointer: coarse)`; **desktop unchanged by even one pixel**:
1. Main controls minimum height 44px: `.btn`, `.chip`, `.icon-btn` (both width/height), `.seg button`, `.crm-seg button`, `.sidenav a`, form `input`/`select` (not checkboxes), `.demo-pill`.
2. Dense table/card controls ≥32px: `.tbl .btn.small`, `.board-card` buttons, `.owner-chip button`.
3. Tiny controls get transparent pseudo-element targets ≥32px, visually unchanged: `.swatch` (20px), `.info` (16px), `.chain-btn`; entire checkbox `label` row clickable.
4. Adjacent clickable elements ≥8px apart.
5. After each change verify no horizontal scroll at 390px (`noOverflow` 0), and unchanged `word-budgets.spec.ts` results.

## Allowed files
Only `src/styles/dx-04-touch-targets.css`. Do not touch `.ask-fab`, `.rail` (DX-09).

## Acceptance
- New mobile-only `e2e/dx-04-targets.spec.ts`: Today/Tasks/Events/Team/Partners, measure `getBoundingClientRect` for all `button, a, select, input:not([type=checkbox]), [role=tab]`; main ≥44, others ≥32; list/explain exceptions individually.
- Mobile `a11y.spec.ts`, `touch.spec.ts` green. Desktop screenshots byte-identical.
- Juanxi: open preview on phone/mobile emulation; buttons easier to tap, page no wider.

## Rollback
R1: comment DX-04 import in `index.css`. R2: `git revert -m 1 dx/dx-04-merged`.

## Notes
- Some `.tbl td` rows already 44px; buttons must not increase row height.
- Do not use `min-height` that misaligns `select` with adjacent buttons.
