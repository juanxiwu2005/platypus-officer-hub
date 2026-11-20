# DX-17 Ask Panel: Empty Center, New Message In

- Stage 3 size S Risk Low R Level R2 Dependence: DX-01 Parallel Partners: DX-15, 16, 18, 19
- Branch: `design/dx-17-ask-panel` Style File: `src/styles/dx-17-ask-panel.css` Corresponding Details: D17 D24

## Something to do.
1. **Empty Status** (when there is no news): Grouping greeting notes ("Hi Alex. What do you need?") and sub-recommendations of chip into dialogue areas vertically; I'll get back to the original "post-down" layout after news. **does not change any case**.
2. **New Message Enter**: Only bubbles added after the panel has been opened will be played: `translateY(6px)→0`+ Fade in, `var(--dur-fast)`. Reopen the panel, switch tabs, reload **without replaying** historical messages (in components, judging by "number of rendered messages", do not use CSS animation to take effect for all `.bubble`).
3. **AI Waiting for Card `.ai-wait`**: Fade when appearing; When the answer is replaced 120ms cross-drawn, do not jump.
4. The feedback on the buttons sent is followed by DX-03 and does not repeat.
5. Reduction of kinetic effects: Fade or do not move.
6. New output only **without any new text** in English interface text; The right column is not included in the page word budget, but does not add.

## Files that can be changed
`src/components/rail/AskPanel.tsx`、`src/styles/dx-17-ask-panel.css`。

## Acceptance
- `m2b.spec.ts`, `today.spec.ts`, `smoke.spec.ts`, `a11y.spec.ts` (right column focus) desktop + mobile phone green; Send a question with the `ask()` assistant, the answer is clear.
- `e2e/dx-17-ask.spec.ts`: Send a message that the new bubble is in transition; Turn off and open the panel, and history bubbles are not in transition.
- Juanxi How to Test: Welcome Words and Suggestions on New Ask are in the middle of the panel; Send a message that the bubbles rise lightly.

## Rollback
R2。
