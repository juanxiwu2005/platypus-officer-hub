> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-09 Rail Slide Motion + Ask Button + Safe Area + dvh

- Stage 2; size L; **high** risk; R2; depends DX-01, DX-02; parallel DX-10–14
- Branch `design/dx-09-rail-motion`; CSS `src/styles/dx-09-rail-motion.css`; details D03 D07 D08 D09

## Why
**Read:** Layout.tsx uses `{rail.open && <Rail />}`, instantly mounting/unmounting; below 1200px its right overlay also appears abruptly. This is the app's largest moving surface and major interaction-feel factor. Emil §3 interruptibility, §7 same entry/exit path; Apple motion.md: "if someone reveals a view by sliding it down from the top, they don't expect to dismiss the view by sliding it to the side".

## Work
1. **Entry/exit** (Layout.tsx, Rail.tsx, RailContext.tsx):
   - Do not unmount immediately on close; set data-state closing, wait for transitionend, with fallback --dur-base + 50ms timer. Reduced-motion duration 1ms, near-immediate unmount.
   - **≤1199px overlay:** translateX(100%) → 0, var(--dur-base) + var(--ease-out); reverse path on exit, shadow fading with it.
   - **≥1200px side-by-side:** fade + 8px movement. Center column **changes width immediately**, no grid-column transition/reflow each frame. If measured width transition is smooth, report as A/B choice for Juanxi; immediate is default.
   - **Interruptible:** close during opening reverses from current position. CSS data-state transitions do this naturally; no @keyframes.
2. **Circular Ask `.ask-fab`:** fade/slight scale up when rail closes, fade out when opened; `:active` shrink; bottom `calc(18px + env(safe-area-inset-bottom))`.
3. **100vh → 100dvh** for rail height `calc(100vh - var(--topbar-h) - 28px)`.
4. **Preserve high-risk behavior, regress individually:**
   - Below 1200px: focus enters rail on open/returns to trigger on close; Tab trap; Escape; inert background; outside/page dismissal on tablet.
   - **Remove inert as closing starts**, not after exit, so page stays clickable during 200ms exit.
   - Preserve data-testid="rail", tab-ask, tab-details, ask-toggle, .ask-fab.

## Allowed files
`src/components/Layout.tsx`, `src/components/rail/Rail.tsx`, `src/components/rail/RailContext.tsx`, `src/styles/dx-09-rail-motion.css`.
This package exclusively owns `.ask-fab`, `.rail`, `.rail-*` styles.

## Acceptance
- Full desktop/phone regression: smoke, today, tasks, events, touch, a11y, m2b, feel, bts, recovery, **including rail-visibility assertions**; default reduced-motion behavior matches before.
- New `e2e/dx-09-rail.spec.ts`, `reducedMotion: "no-preference"`: ① Intermediate rail transform is neither none nor final. ② Closing mid-open unmounts with no inert residue. ③ Tablet page responds during closing. ④ Reduced motion appears immediately.
- Juanxi: desktop "Ask Platypus" opens smoothly; narrow/mobile circular button slides rail from right, ✕ slides back.

## Rollback
R2: `git revert -m 1 dx/dx-09-merged`; revert dependent DX-19/DX-20 first.

## Notes
- Most failure-prone package. If many test changes seem necessary, **stop**, document why for integrator, and do not force tests through.
