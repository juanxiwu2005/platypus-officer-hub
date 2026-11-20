> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-26 Partners board dragging (reuse DX-24 tools)

- Stage 6 · Size M · Medium risk · Rollback R2 · Depends on: DX-24 · Parallel partners: none (sequential with DX-27)
- Branch: `design/dx-26-crm-drag` · Styles: `src/styles/dx-26-crm-drag.css` · Detail: D45

## Tasks
1. Board in `src/pages/Partners.tsx`: replace `draggable` + `onDragStart` + `onDrop` with DX-24's `useDragSort` (**call only, never modify** `dragSort.ts`; report missing capabilities to the integrator).
2. Preserve permissions: only `canEditContact(state, c)` cards drag; `visibility: "leads"` contacts remain visible only with permission (same for AI).
3. Retain existing stage `select` (`crm-card-foot select`) as keyboard/mobile fallback.
4. Reuse DX-24's feel: make room, spring settling, `Esc` cancel, `Alt+←/→`, `aria-live` announcements.

## Allowed files
`src/pages/Partners.tsx` (Board drag/drop section), `src/styles/dx-26-crm-drag.css`.

## Acceptance
- `crm.spec.ts`, `a11y.spec.ts`, `word-budgets.spec.ts`, `touch.spec.ts`, desktop/mobile green; assertions unchanged.
- New `e2e/dx-26-crm-drag.spec.ts`: drag changes stage; unauthorized cards cannot drag; `Esc` cancels.
- Juanxi: Partners → Board, drag a contact to another stage; feels like Tasks.

## Rollback
R2.
