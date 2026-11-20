# DX-19 Toggle Cross Fade + Leak Page

- Stage 3 size S Risk R2 Reliance: DX-01, **DX-09** (they have to be in the same batch after DX-09) Parallel partners: DX-15 - 18
- Branch: `design/dx-19-detail-swap` Style File: `src/styles/dx-19-detail-swap.css` Corresponding Details: D14 D15

## Something to do.
1. **The details of the right bar are changed to** (`DetailView` for `Rail.tsx`): 120ms were faded when changes occurred in `key` (transparency only); Do not exit, do not move layouts, do not affect rolling position replacement and focus shifts (existing `scrollTo` and `focus()` logical maintenance).
2. The **page fades into** (`Layout.tsx` `<main>`): when the route changes, the direct sub-elements of `main` fade into 140ms. **does nothing less, doesn't slide, doesn't quit**, doesn't "slow" the navigation (Apple `motion.md`: Common operations don't make people animated).
   - Means of implementation: Remount as `key` with a path, or give `main > *` a class that is only added when the route changes. **Don't** write permanent animations of all `main > *` (and flash when conditionally rendered cards appear inside the page).
3. Reduction of kinetic effects: neither move.
4. Keep: `<main id="main" tabIndex={-1}>`, jump to focus management of main content, `lastPath` right bar closes the logic.

## Files that can be changed
`src/components/Layout.tsx`, `src/components/rail/Rail.tsx` (`DetailView` only), `src/styles/dx-19-detail-swap.css`.

## Acceptance
- `smoke`, `today`, `tasks`, `events`, `a11y`, `recovery` desktop + mobile phone green; Any page with fast link points is uncracked and white.
- New test `e2e/dx-19-swap.spec.ts`: `opacity` for switching the content of new pages after navigation to 1 in transition, 300ms; The right column details are diluted when you point a different task in Today.
- Juanxi Test: Point left navigation page change, new pages appear softly (not slide); Point different tasks, right column down.

## Rollback
R2。
