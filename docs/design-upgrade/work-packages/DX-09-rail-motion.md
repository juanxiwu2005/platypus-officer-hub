# DX-09 Right Bar Slide Out + Ask Button + Safe Zone + `dvh`

- Phase 2 Size L Risk **High** R Level R2 Dependence: DX-01, DX-02 Parallel Partners: DX-10 ~ 14
- Branch: `design/dx-09-rail-motion` Style File: `src/styles/dx-09-rail-motion.css` Corresponding Details: D03 D07 D08 D09

## Why?
**read**: `Layout.tsx` is `{rail.open && <Rail />}`, which is directly mounted and unmounted; Less than 1200 px when it's fixed to the right of the float, and it's "beep" a little bit. It's the biggest piece of the application that moves, and it's the one that most affects the feeling. Emil § 3 (interruptible), § 7 (in and out of the same path); Apple `motion.md`（"if someone reveals a view by sliding it down from the top, they don't expect to dismiss the view by sliding it to the side"）。

## Something to do.
1. **In and out of** (`Layout.tsx`, `Rail.tsx`, `RailContext.tsx`);
   - Do not unload immediately when closing: set `data-state` as `closing` and then unmount `transitionend` (`--dur-base`+50ms timer). Reduction of the dynamic effect is 1 ms long and almost immediately unloaded.
   - **§ 1199px (troop)**: From right `translateX(100%)` to 0, `var(--dur-base)` + `var(--ease-out)`; Get out of the field and slide back along the same path. The shadow fades.
   - **~1200px (coherent)**: Right Bar Lighting + 8px Offset; Intermediate content column **Directly changes width** (no grid transition, avoids rehearsing the entire page). If a wide-cut transition is measured, it can be proposed in the report as an A/B option to be selected by Juanxi; By default, the width is changed directly.
   - **Interrupts**: Do not finish playback from the current position. The CSS transition to `data-state` is naturally possible. Do not use `@keyframes`.
2. **Ask round button `.ask-fab`**: Fade when closing right bar + slightly magnified; Fade out when you open the right bar. Add `:active` shrinks. Change bottom position to `calc(18px + env(safe-area-inset-bottom))`.
3. **`100vh` Replace `100dvh`**: `.rail` height (`calc(100vh - var(--topbar-h) - 28px)`).
4. **Conduct that remains constant (high risk point, return article by article)**：
   - Focus treatment less than 1200 px: Focus on open in the right bar and return to the button that opens it when closed; Tab traps; Escape closes; Page background `inert`; The point page is closed (plate).
   - **Disables background `inert`** from the start and does not wait for animation to be finished, otherwise 200ms of the exit page do not move.
   - `data-testid="rail"`, `tab-ask`, `tab-details`, `ask-toggle` and `.ask-fab` remain unchanged.

## Files that can be changed
`src/components/Layout.tsx`、`src/components/rail/Rail.tsx`、`src/components/rail/RailContext.tsx`、`src/styles/dx-09-rail-motion.css`。
The `.ask-fab`, `.rail`, `.rail-*` style **only** is included in this package.

## Acceptance
- Full return: `smoke`、`today`、`tasks`、`events`、`touch`、`a11y`、`m2b`、`feel`、`bts`、`recovery`On desktop + cellular items are completely green, **That includes claims that concern whether the right column is visible.**(The conduct must be consistent with the previous one in the default mode of reduction of kinetic effects).
- New test `e2e/dx-09-rail.spec.ts` (`reducedMotion: "no-preference"`): 1 `transform` after `.rail` has been opened is not a `none` or the end value in the transition median; 2 Opens a halfway point to close, eventually unmounting and no residual `inert`; 3 The closing of the process point page under the flat-bed width is also responsive; 4 Direct effects when reduced.
- Juanxi How to Test: Top right corner of the top of the computer "Ask Platypus" with a smooth surface in the right bar; Narrow windows or mobile phones, circle buttons open the backboard from the right, dots slide back.

## Rollback
R2：`git revert -m 1 dx/dx-09-merged`。DX-19, DX-20 rely on it and withdraw them first.

## Attention.
- This is the most problematic package of the whole plan. If it turns out that a lot of tests have to be changed in order to pass, **stop** and send the reason into the report to the integrated person. Don't change the test.
