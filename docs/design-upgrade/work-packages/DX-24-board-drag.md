> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-24 Board pointer dragging + displacement + spring + keyboard

- Stage 5; size L; risk **high**; rollback R2; depends DX-16; parallel DX-23,25.
- Branch `design/dx-24-board-drag`; styles `src/styles/dx-24-board-drag.css`; details D43 D44.

## Why
**Read:** Tasks uses native browser drag/drop (`draggable`, `onDragStart`, `onDrop`), only a translucent ghost; no drop animation or displaced cards; mobile dragging **requires measurement**. Emil §2 (1:1 following, retain grab point), §10 (8–10px threshold).

## Work
1. New `src/lib/dragSort.ts`, small drag Hook; **data layer unchanged**: drop still invokes existing `move(id, status, beforeId)` in `Tasks.tsx`; **no store or `SCHEMA_VERSION` changes**.
2. Feel:
   - Start only after ≥8px movement from `pointerdown` (avoid click conflict); `setPointerCapture`; card follows 1:1 with grab offset, no jump to center.
   - Leave original-position placeholder; other cards shift over 150ms; destination column border highlights.
   - Release uses `--spring-ui` (damping 1.0, no fling here, so no overshoot); `Esc` cancels/returns.
   - Autoscroll near horizontal board edges (as `MetroChart.tsx`: 40px edge, 18px/frame).
3. **Touch:** about 250ms long press before drag, avoiding scroll conflict; `touch-action: none` only while dragging. Keep existing mobile status `select` alternative.
4. **Keyboard:** focused card `Alt + ←/→` moves adjacent status (consistent with flowchart Alt+arrows); `aria-live="polite"` announces "Moved X to Y".
5. DX-16 narrowed empty columns remain drop targets (pointer hit detection, not `onDragEnter`).
6. Preserve permissions (whose cards may be moved), `data-testid="board-card"`, column `aria-label` names.

## Allowed files
`src/pages/Tasks.tsx` (board drag section), new `src/lib/dragSort.ts`, `src/styles/dx-24-board-drag.css`, new pure-logic `src/test/dragSort.test.ts`.

## Acceptance
- Existing `tasks.spec.ts` `dragTo` assertions pass (Playwright `dragTo` emits mouse events; new code must respond); desktop+mobile `activity-workspace.spec.ts`, `a11y.spec.ts`, `touch.spec.ts`, `word-budgets.spec.ts` green. **No weaker assertions or `force: true`** (WP10 just removed forced clicks).
- New `e2e/dx-24-drag.spec.ts`: ①dragged transform follows pointer; ②other cards displace; ③Esc cancellation leaves data unchanged; ④Alt+→ changes status/announces; ⑤drop into narrowed empty column works.
- Juanxi: drag card to another desktop column; follows pointer, others make space, settles gently; keyboard works too.

## Rollback
R2. Revert dependent DX-26 first.

## Notes
- If implementation requires store changes, **stop** and document for integrator.
