# DX-25 Time to finish: progress chain growth, dots, circle progress, corner sign

- Stage 5 size M Risk Medium R2 Reliance: DX-02, DX-05 Parallel Partners: DX-23, 24
- Branch: `design/dx-25-done-moment` Style File: `src/styles/dx-25-done-moment.css` Corresponding Details: D27 D48 D49 D50

## Why?
**is the only "surprise"** in the plan: the moment when the task is marked as Done. The result of getting the other seven right, not concerned tacked on top." Emil § 4: The user takes the initiative and you can take a little bounce back (blocking approximately 0.8).

## Something to do.
1. **`Chain` (progress chain)** (`ui/index.tsx` function `Chain`):
   - One of them standing there. **In this session,**From non-finished to finished: its left line "brows out" from left to right. `transform: scaleX(0→1)`, the original point on the left, `var(--dur-base)`), dot `--spring-pop`Play it. `scale 1→1.2→1`）。
   - **pages are loaded, routed to switch or reloaded without playing** (ref judging by the "last status" and comparing changes in the same case only).
   - At the same time, the "risk" dots are marked with shape (a small exclamation sign using SVG without text), and the problem of restoring the risk points in the progress chain is merely a red ring.
2. **`Ring`**：`stroke-dasharray`Yes. **If the value changes**Transition 400ms, first rendering still.
3. **Navigator Corner** (unreaded by `chrome/SideNav.tsx` lilies tasks): a light play when the number changes (120ms).
4. Reduction of kinetic effects: Only colour changes, no displacement, scaling, growth.
5. No ribbons, no sound, no vibrations, no circulation.
6. The bright **when the board card falls on the Done column is not in this bag** (Tasks.tsx to DX-24), which is included as a follow-up recommendation in the report.

## Files that can be changed
`src/components/ui/index.tsx` (`Chain`, `Ring` only), `src/components/chrome/SideNav.tsx`, `src/styles/dx-25-done-moment.css`.

## Acceptance
- `today.spec.ts`, `events.spec.ts`, `tasks.spec.ts`, `wp5.spec.ts`, `touch.spec.ts`, `a11y.spec.ts` desktop + mobile phones green.
- New test `e2e/dx-25-done.spec.ts`: 1 did not have these animations in `document.getAnimations()` when the page was just loaded; 2 Animation of the section of the progress chain in Today following the designation of a task as Done; 3 Not when the effect is reduced.
- Juanxi: Tasks marked a task as Done, back to Today, where the line was "long" ahead of a section with a dot; Can not delete folder: %s: No such folder

## Rollback
R2。
