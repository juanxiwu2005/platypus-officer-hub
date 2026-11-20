> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-11 Toast entrance/exit

- Stage 2 · Size S · Risk low · R level R2 · Depends on: DX-01, DX-02 · Parallel partners: DX-09, 10, 12–14
- Branch: `design/dx-11-toast-motion` · Stylesheet: `src/styles/dx-11-toast-motion.css` · Detail: D11

## Work
1. `src/components/chrome/Toast.tsx` (`useToast` from DX-02): “show → remain 2400ms → exit 150ms → unmount.” A new toast before the old disappears resets the timer; never stack two.
2. Entrance: `translateY(8px)→0` + fade (`var(--dur-fast)`, `var(--ease-out)`); fade out on exit. `bottom: calc(20px + env(safe-area-inset-bottom))`.
3. Mobile: max width `calc(100vw - 96px)` to avoid covering lower-right circular button (52px +18px margin).
4. Check `--z-toast: 50` vs `--z-rail: 55`: fullscreen mobile rail may cover toast. If possible (e.g.toast from rail), record in report for integrator decision; **do not** change z-index tokens.
5. Preserve `role="status"`, copy, 2400ms dwell.

## Permitted files
`src/components/chrome/Toast.tsx`, `src/styles/dx-11-toast-motion.css`. `.toast` exclusively this package.

## Acceptance
- `smoke.spec.ts` ("Demo data reset" after Reset demo), desktop+mobile green.
- New `e2e/dx-11-toast.spec.ts`: entrance `opacity` transitioning; after 2.4s +200ms absent from DOM; two successive triggers yield only one toast.
- Juanxi: Reset demo in Demo menu, bottom toast rises and fades.

## Rollback
R2.
