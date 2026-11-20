# DX-11 Toast In and out

- Phase 2 size S Risk Low R Level R2 Dependence: DX-01, DX-02 Parallel Partners: DX-09, 10, 12 ~ 14
- Branch: `design/dx-11-toast-motion` Style File: `src/styles/dx-11-toast-motion.css` Corresponding Details: D11

## Something to do.
1. `src/components/chrome/Toast.tsx`（DX-02Do it. `useToast`): Change to "Shows stay  →  2400ms  →  leaves 150ms {unloaded".  The new tast arrives when the old ones don't disappear, reset the count and not fold the two.
2. Styles: Enter `translateY(8px)→0`+ Fade (`var(--dur-fast)`, `var(--ease-out)`); Get out of the way. `bottom: calc(20px + env(safe-area-inset-bottom))`。
3. Cell phone: Maximum width `calc(100vw - 96px)`, avoids covering round buttons at the lower right corner (52px + 18px margin).
4. Check `--z-toast: 50` and `--z-rail: 55`: When the right bar is full screen on a mobile phone, it will be covered. If this happens (e.g. triggers toast in the right column), explain it in the report and give it to the integrationer, **do not change** to z-index token.
5. Maintain: `role="status"`, file, 2400ms of stay time.

## Files that can be changed
`src/components/chrome/Toast.tsx`、`src/styles/dx-11-toast-motion.css`。`.toast` is only for this bag.

## Acceptance
- `smoke.spec.ts` (Reset demo later asserted "Demo data reset") desktop + mobile phone green.
- The new test `e2e/dx-11-toast.spec.ts`: `opacity` was in transition when it appeared; 2. 4s after 200ms is not in DOM; Two consecutive triggers with only one toast.
- Juanxi How to Test: Reset demo in Demo menu, bottom tip up and fade out.

## Rollback
R2。
