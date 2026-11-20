# DX-08 Animated "minus kinetic" protection already available

- Phase 1 Size S Risk Low R Level **R1 Available** Dependence: DX-01 Parallel Partners: DX-03 ~ 07
- Branch: `design/dx-08-motion-guards` Style File: `src/styles/dx-08-motion-guards.css` Corresponding Details: D37

## Why?
**Read**：`.typing i`and `.ai-wait-mark i`It's... `blink`It's an infinite loop. Only in the main style sheet. 2Branch `prefers-reduced-motion`（`.spin`、`.m-node`）。 Apple `accessibility.md › Be cautious with fast-moving and blinking animations`: Turned on "reduced kinetic effects" to reduce repeat animation.

## Something to do.
1. `@media (prefers-reduced-motion: reduce)`: `.typing i`, `.ai-wait-mark i` stopped as static (`animation: none; opacity: .6`), and the texttip "Platypus is working" (available in `AskPanel.tsx`) remains visible.
2. Replace these old transitions with token (almost constant appearance): `.switch input` (15s  →  `--dur-fast`), `.board-col` (12s  →  `--dur-fast`). **Do not touch** `.hover-card`, `.m-card` (S3 Decision), `.m-node` (DX-22).
3. `e2e/dx-08-reduced-motion.spec.ts`: Using `reducedMotion: "reduce"` through Today, Events, Tasks, Ask waiting status, no `iterations === Infinity` animation can be found in `document.getAnimations()`; `blink` still exists when using `no-preference` (evidence of no injury).

## Files that can be changed
`src/styles/dx-08-motion-guards.css`, `e2e/dx-08-reduced-motion.spec.ts` (new).

## Acceptance
- (a) Green new tests; `feel.spec.ts` (suspension card zero delay) green.
- Juanxi how to test: "Reducing Dynamic Effects" by setting the computer, leaving Ask to wait for a reply and not flashing the dots.

## Rollback
R1 or R2.
