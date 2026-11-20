> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-22 Flowchart nodes: `transform` + spring placement

- Stage 4; size M; risk medium; rollback R2; depends DX-01; parallel DX-20,21.
- Branch `design/dx-22-flow-motion`; styles `src/styles/dx-22-flow-motion.css`; details D46 D47.

## Why
**Read:** `.metro .m-node { transition: left .3s ease, top .3s ease }`; `left/top` relayout with standard easing, while lines jump immediately, so moving nodes/lines are unsynchronized. Emil §11: animate only `transform`/`opacity`.
**Keep these strengths (do not rewrite):** `setPointerCapture`, 6px drag threshold, edge autoscroll, Alt+arrows, context menu, undo.

## Work
1. Node positioning: replace `.m-node` inline `left/top` in `MetroChart.tsx` with CSS `--x`, `--y` (ESLint permits `--` variables); CSS `left: 0; top: 0; transform: translate(var(--x), var(--y))`. Zero-size node anchors retain relatively positioned dots/labels unchanged.
2. Placement: `transition: transform var(--dur-slow) var(--spring-ui)` (placement is the only position-change source); no transition with `prefers-reduced-motion`.
3. Lines: fade `<svg>` paths out/in over 150ms during placement (or keep SVG `opacity: .6` throughout `--dur-slow`), making lines/dots move together rather than jumping lines/sliding dots. Choose and explain in report.
4. Drag snap `.m-gap.is-near`: `transform: scale` transition `var(--dur-press)`; replace direct `width/height` jumps with fixed size + scale.
5. No `metro.ts` layout or `data-testid` changes.

## Allowed files
`src/components/flow/MetroChart.tsx` (position/style variables only), `src/styles/dx-22-flow-motion.css`. Exclusive ownership of `.m-node`, `.m-gap`, `.m-ghost`, `.metro`.

## Acceptance
- Desktop+mobile `flow-edit.spec.ts`, `events.spec.ts`, `feel.spec.ts` (flow hover cards), `a11y.spec.ts`, `src/test/flowEdit.test.ts`, metro layout unit tests green; **retain actual curve-hit clicks in graph tests (just fixed by WP10)**.
- New `e2e/dx-22-flow.spec.ts`: after dragging a step into another gap, intermediate node `transform` differs from endpoint; correct settled position; immediate reduced-motion placement.
- Juanxi: Events → Edit flow, drag dot elsewhere; smooth settling, no line jump.

## Rollback
R2.
