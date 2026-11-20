# DX-22 Flowchart Node Reposition `transform`+ Springfall

- Stage 4 size M Risk Medium R2 Reliance: DX-01 Parallel Partners: DX-20, 21
- Branch: `design/dx-22-flow-motion` Style File: `src/styles/dx-22-flow-motion.css` Corresponding Details: D46 D47

## Why?
**reads**: `.metro .m-node { transition: left .3s ease, top .3s ease }` - `left/top` triggers a re-programming, normal buffer; And the connection is straight, so the nodes are slipping, the lines are jumping, they're not synchronizing. Emil § 11: Only `transform` and `opacity`.
**Strengths to retain (do not rewrite)**: `setPointerCapture`, 6px drag threshold, edge autorolling, Alt+ arrow key movement, right-key menu, unrevoke.

## Something to do.
1. Node positioning: The inner condensed style of `.m-node` in `MetroChart.tsx` is changed from `left/top` to CSS variables `--x`, `--y` (ESLint allows the beginning of `--`); CSS `left: 0; top: 0; transform: translate(var(--x), var(--y))`. The node itself is wide as 0, and the points and labels are not affected by its positioning.
2. `transition: transform var(--dur-slow) var(--spring-ui)` (change of position in node is only a source of "fall position"); No transition for `prefers-reduced-motion`.
3. Connection: The path within `<svg>` over time is faded by 150ms (or the whole svg keeps `opacity: .6` in the drop slot `--dur-slow`) so that the line and the dot "convert at the same time" instead of the slider. Choose one option, with reasons given in the report.
4. Draging `.m-gap.is-near` adsorption: `transform: scale` transition `var(--dur-press)`, no more instantaneous size (now `width/height` is changed to fixed size + `scale`).
5. Do not change `metro.ts` layout calculations; Do not change any `data-testid`.

## Files that can be changed
`src/components/flow/MetroChart.tsx` (only positioning and style variables), `src/styles/dx-22-flow-motion.css`. `.m-node`, `.m-gap`, `.m-ghost` and `.metro` only belong to this package.

## Acceptance
- `flow-edit.spec.ts`, `events.spec.ts`, `feel.spec.ts` (flow chart suspension card), `a11y.spec.ts`, `src/test/flowEdit.test.ts` and unit tests + mobile phone green on layout `metro`; **"live curve hit" in the image test must keep**.
- `e2e/dx-22-flow.spec.ts`: After dragging one step to another, node in transition `transform` is not the end value; The position is right after stabilization; Directly in place when operational effects are reduced.
- Juanxi How to Test: Events  → Edit follow, drag one dot to another position and smooth it down a bit after you let go, the line doesn't "jump."

## Rollback
R2。
