> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-17 Ask panel: centered empty state, new-message entry

- Stage 3; size S; risk low; rollback R2; depends DX-01; parallel DX-15,16,18,19.
- Branch `design/dx-17-ask-panel`; styles `src/styles/dx-17-ask-panel.css`; details D17 D24.

## Work
1. **Empty state** (no messages): group greeting ("Hi Alex. What do you need?") and suggestion chips, vertically centered in conversation area; after messages restore bottom-aligned layout. **No copy changes**.
2. **New messages:** animate only bubbles **added after panel is already open**: `translateY(6px)→0` + fade, `var(--dur-fast)`. Reopening, tab changes, remount **must not replay** history (track previously rendered message count in component, not blanket CSS on `.bubble`).
3. **AI wait card `.ai-wait`** fades in; answer replaces it with 120ms crossfade, no jump.
4. Reuse DX-03 send-button feedback, no duplication.
5. Reduced motion: fade only or none.
6. Add **no new copy** beyond existing English interface text; rail is outside page word budgets, but still avoid additions.

## Allowed files
`src/components/rail/AskPanel.tsx`, `src/styles/dx-17-ask-panel.css`.

## Acceptance
- Desktop+mobile `m2b.spec.ts`, `today.spec.ts`, `smoke.spec.ts`, `a11y.spec.ts` (rail focus) green; send via `ask()` helper and see answer.
- New `e2e/dx-17-ask.spec.ts`: new bubble enters; close/reopen, historical bubbles do not.
- Juanxi: greeting/suggestions centered on opening Ask; sending gently raises bubble.

## Rollback
R2.
