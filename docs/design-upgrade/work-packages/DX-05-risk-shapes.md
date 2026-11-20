> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-05 risk indicators gain shapes (no longer color alone)

- Stage 1 · SizeS · Low risk · R levelR 2 · Dependency: DX-01 · Parallel: DX-03/04/06…08
- Branch: `design/dx-05-risk-shapes` · Styles: `src/styles/dx-05-risk-shapes.css` · Detail: D26

## Why
**Observed:** Today's entire Needs a nudge column uses red dots; event-row indicators also convey only color. Color-blind users cannot distinguish red/green; mobile requires tapping hover cards for reasons. Apple Lens 1: do not convey information by color alone.

## Work
1. Change only `RiskDot` in `src/components/ui/index.tsx`:
   - Three states, three inline-SVG shapes, `currentColor`, no hex: **On track:** check in circle; **Watch:** exclamation in triangle; **At risk:** cross in rounded square.
   - Size 11 px→14 px; existing `--good`, `--risk-yellow`, `--late` tokens.
   - Retain classes (`risk red|yellow|green`), `data-testid="forecast"`, `aria-label`, `withWord`.
2. No new visible text (word budget). `withWord` unchanged.
3. Dedicated small stylesheet overriding `.risk i` appearance.
4. Check dark-mode contrast too (graphics ≥ 3:1).

## Allowed files
`src/components/ui/index.tsx` (`RiskDot` only), `src/styles/dx-05-risk-shapes.css`.
**Do not touch:** `Chain` (DX-25), `Hover` (DX-12), any page files.

## Acceptance
- `today.spec.ts`, `wp5.spec.ts` (asserts `.risk.red`), `a11y.spec.ts`, `events.spec.ts` green desktop/mobile.
- New `e2e/dx-05-shapes.spec.ts`: three states render distinct SVG shapes (compare paths in `outerHTML`).
- Convert `dx-shots` Today to grayscale; three states remain distinguishable (document method in report).
- `npm run words` count does not increase.

## Rollback
R2: `git revert -m 1 dx/dx-05-merged`. DX-25 depends on it; revert DX-25 first.

## Note
- Do not change text in status blocks (`StatusPill`); it already contains text.
