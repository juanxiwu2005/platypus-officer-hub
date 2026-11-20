# DX-05 risk point plus shape (no longer only color)

- Phase 1 size S Risk Low R Level R2 Dependence: DX-01 Parallel Partners: DX-03, 04, 06 ... 08
- Branch: `design/dx-05-risk-shapes` Style File: `src/styles/dx-05-risk-shapes.css` Corresponding Details: D26

## Why?
**Sees the entire column of**:Today's "Needs a nudge" are red points, and the point on the right side of the line is color only. (a) The lack of a distinction between red and green users in color blindness; The reason is not to be able to see the card on the phone. Apple Lens 1: Message cannot be conveyed by color alone.

## Something to do.
1. Modify `RiskDot` in `src/components/ui/index.tsx` (this function only):
   - Three different shapes in three states (with an internal SVG, `currentColor`, without text: **On track**: a pair in the circle;  **Watch**: An exclamation mark in the triangle; **At rsk**: One fork in a rounded square.
   - Point size from 11px to 14 px; Colours are still available `--good`, `--risk-yellow` and `--late` token.
   - Keeps all existing class (`risk red|yellow|green`), `data-testid="forecast"`, `aria-label`, `withWord` parameters.
2. Do not add any visible text (word budget). `withWord` Stay the same.
3. Styles are written in your own little file to cover the `.risk i` appearance.
4. The contrast is also checked in dark mode (figure  ≥ 3:1).

## Files that can be changed
`src/components/ui/index.tsx` (`RiskDot` only), `src/styles/dx-05-risk-shapes.css`.
**Do not touch**: `Chain` (for DX-25), `Hover` (for DX-12), any page file.

## Acceptance
- `today.spec.ts`, `wp5.spec.ts` (which contains assertions about `.risk.red`), `a11y.spec.ts`, `events.spec.ts` desktop + mobile phone green.
- New test `e2e/dx-05-shapes.spec.ts`: Three states render three different SVG shapes (comparable path for `outerHTML`).
- Converts the `dx-shots` Today image to a greyscale, which can still be divided into three states (the practice is posted in the report).
- `npm run words` No increase.

## Rollback
R2：`git revert -m 1 dx/dx-05-merged`。DX-25 Depends on it, first withdraws DX-25.

## Attention.
- The word in the color block (state block `StatusPill`) does not change; it has text.
