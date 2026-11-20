> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-25 Completion Moment: Growing Chain, Dot Pop, Ring, Badge

- Stage 5; size M; medium risk; R2; depends DX-02, DX-05; parallel DX-23,24
- Branch `design/dx-25-done-moment`; CSS `src/styles/dx-25-done-moment.css`; details D27 D48 D49 D50

## Why
The plan's **only delight moment** is marking a task Done. Apple Delight: "The result of getting the other seven right, not confetti tacked on top". Emil §4: deliberate user actions may have a little bounce (damping about 0.8).

## Work
1. **Chain** (ui/index.tsx):
   - A stop changing from incomplete to complete **during this session** grows its left connection left-to-right (`transform: scaleX(0→1)`, left origin, var(--dur-base)); dot pops via --spring-pop (scale 1→1.2→1).
   - **Never play on initial load, route changes, or remounts**; compare prior-state ref only within the same instance.
   - Give at-risk dots a small SVG exclamation shape, without text, fixing color-only red rings.
2. **Ring:** stroke-dasharray transitions 400ms **on value changes**, static initially.
3. **Tasks unread badge** (chrome/SideNav.tsx): subtle 120ms pop when number changes.
4. Reduced motion: color changes only, no movement/scaling/growth.
5. No confetti, sound, vibration, or loops.
6. Done-column card-drop highlight **excluded** (Tasks.tsx belongs DX-24); list as future suggestion.

## Allowed files
`src/components/ui/index.tsx` (Chain/Ring only), `src/components/chrome/SideNav.tsx`, `src/styles/dx-25-done-moment.css`.

## Acceptance
- today.spec.ts/events.spec.ts/tasks.spec.ts/wp5.spec.ts/touch.spec.ts/a11y.spec.ts pass desktop/phone.
- New `e2e/dx-25-done.spec.ts`: ① None of these animations in document.getAnimations() on load. ② Mark task Done and corresponding Today chain animates. ③ None under reduced motion.
- Juanxi: mark task Done in Tasks, return to Today; chain grows and dot pops, without replay on refresh.

## Rollback
R2.
