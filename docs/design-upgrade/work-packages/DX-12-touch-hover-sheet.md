# DX-12 Mobile Phone Suspension Card

- Stage 2 Size S Risk Low R Level **R1 Available** Dependence: DX-01 Parallel Partners: DX-09 ~ 11, 13, 14
- Branch: `design/dx-12-touch-hover-sheet` Style File: `src/styles/dx-12-touch-hover-sheet.css` Corresponding Details: D12

## Why?
On the cell phone, it's on the bottom layer of the bullet, but "Pick." The suspension card on the **desktop cannot move**: S3 (2026-10-27) has decided on a zero delay and `e2e/feel.spec.ts` is guarded.

## Something to do.
1. **Only in `@media (hover: none)`** added to `.hover[data-open="true"] > .hover-card` animated: `translateY(12px)→0`+ Fade, `var(--dur-fast)`, `var(--ease-out)`; Back off.
2. (a) without mask (i.e. a description, not a model); Emil §12 "separate to keep flow"）。
3. Reduction of kinetic effects: Only fade out.
4. Do not change the logic of `Hover` components (`ui/index.tsx`). If it is necessary to change (e.g. to allow exits to be aired) to send the needs into the report to the integrated person, do not move on its own.

## Files that can be changed
Only `src/styles/dx-12-touch-hover-sheet.css`.

## Acceptance
- `touch.spec.ts` (cell phone), `feel.spec.ts` (desktop, especially "suspension card without delay"), `bts.spec.ts` green.
- The computation of `.hover-card` in the desktop item `transition-delay` is still `0s, 0s`.
- Juanxi How to Test: A small dot in the progress chain on a mobile phone, which shows that the card slides from the bottom of the screen.

## Rollback
R1 or R2.
