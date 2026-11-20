> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-15 Events layout: narrower list, edge cue, whitespace audit

- Stage 3 · Size M · Medium risk · Rollback R2 · Depends on: DX-01 · Parallel partners: DX-16–19
- Branch: `design/dx-15-events-layout` · Styles: `src/styles/dx-15-events-layout.css` · Details: D18 D19

## Why
**Observed: ** at 1440 width with rail open, Events has four columns (navigation 196 + event list 220 + content + rail 380), leaving about 550px for the chart and clipping right-hand labels.
**Constraints (mandatory): ** ① **Keep the event-name list** (Juanxi explicitly requested on 2026-10-31); ② top whitespace above the chart is **intentional** space for hover cards (PROGRESS 2026-10-31), so do not simply delete it; ③ preserve default AI-rail behavior (see `DETAIL_LIST.md` K-3).

## Tasks
1. **Narrow list: ** when rail is open and viewport<1500px, reduce `.events-layout`'s event-list column from 220px to about 168px (column width only; names remain fully readable, excessively long ones use ellipsis + `title`).
2. **Chart "more content" cue: ** when `.metro` scrolls horizontally, add a right-edge fade mask (`mask-image`, no color) that disappears at the end. A small script detects scroll position (change only Flow wrapper in `Events.tsx`, not `MetroChart.tsx`, owned by DX-22).
3. **Whitespace audit** (measure before deciding): measure top space needed by `.m-card` (width 250, `bottom: 18px`); if current space exceeds it by>24px, remove excess; **if uncertain, leave unchanged** and report measurements. Also identify the rule causing the roughly 58px Flow/List/Budget switcher-to-chart gap.
4. Replace `.event-nav`'s `max-height: calc(100vh - …)` with `100dvh`.
5. Mobile (<860px) event selector unchanged.

## Allowed files
`src/pages/Events.tsx` (list/Flow wrapper only), `src/styles/dx-15-events-layout.css`. **Forbidden: ** `MetroChart.tsx`, `metro.ts`, `.m-*` selectors.

## Acceptance
- `events.spec.ts`, `flow-edit.spec.ts`, `feel.spec.ts` (flowchart hovers), `today.spec.ts`, `a11y.spec.ts`, `word-budgets.spec.ts`, desktop/mobile green.
- New `e2e/dx-15-events.spec.ts`: at 1440 width with rail open, list≤180 wide with all event names visible; chart right-edge fade disappears when fully scrolled right.
- `dx-shots`: before/after Events at 1440, rail open/closed.
- Juanxi: Events with rail open has a wider central chart; right-edge fade indicates more horizontal content; event list remains.

## Rollback
R2.
