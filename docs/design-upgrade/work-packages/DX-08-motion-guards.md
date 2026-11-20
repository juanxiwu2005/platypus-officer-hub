> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-08 Add reduced-motion protection to existing animations

- Stage 1 · Size S · Risk low · R level **R1 available** · Depends on: DX-01 · Parallel partners: DX-03–07
- Branch: `design/dx-08-motion-guards` · Stylesheet: `src/styles/dx-08-motion-guards.css` · Detail: D37

## Why
**Observed:** `.typing i` and `.ai-wait-mark i` `blink` infinitely; main stylesheet has only 2 `prefers-reduced-motion` rules (`.spin`, `.m-node`). Apple `accessibility.md › Be cautious with fast-moving and blinking animations`: reduce repetition when reduced motion enabled.

## Work
1. Under `@media (prefers-reduced-motion: reduce)`, make `.typing i`, `.ai-wait-mark i` static (`animation: none; opacity: .6`); keep "Platypus is working" text (already in `AskPanel.tsx`) visible.
2. Replace old transition durations with tokens (almost unchanged appearance): `.switch input` (.15s → `--dur-fast`), `.board-col` (.12s → `--dur-fast`). **Do not touch** `.hover-card`, `.m-card` (S3 decisions), `.m-node` (DX-22).
3. New `e2e/dx-08-reduced-motion.spec.ts`: under `reducedMotion: "reduce"`, visit Today, Events, Tasks, Ask waiting; no animation in `document.getAnimations()` may have `iterations === Infinity`; under `no-preference`, `blink` remains (proves no unintended suppression).

## Permitted files
`src/styles/dx-08-motion-guards.css`, `e2e/dx-08-reduced-motion.spec.ts` (new).

## Acceptance
- New test and `feel.spec.ts` (zero hover-card delay) green.
- Juanxi: set computer reduced motion, make Ask wait; dots stop blinking.

## Rollback
R1 or R2.
