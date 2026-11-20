# DX-26 Partners board drag (with DX-24 tool)

- Stage 6 size M Risk Medium R2 Reliance: DX-24 Parallel Partners: None (and DX-27)
- Branch: `design/dx-26-crm-drag` Style File: `src/styles/dx-26-crm-drag.css` Corresponding Details: D45

## Something to do.
1. `src/pages/Partners.tsx`_Other Organiser `draggable` + `onDragStart` + `onDrop`For DX- 24It's... `useDragSort`（**Call only, do not modify** `dragSort.ts`； If you lack the capacity to do so, you will report it to an integrated person.
2. Keep missions: Only `canEditContact(state, c)` can be dragged for real cards; `visibility: "leads"` contacts are still visible only to those who have persons (AI also sees them).
3. The "Phase `select`" (`crm-card-foot select`) that already exists on the card is retained as a back-up path for keyboards and mobile phones.
4. This follows the DX-24 touch: giver, spring drop, `Esc` cancelled, `Alt+←/→` and `aria-live` broadcast.

## Files that can be changed
`src/pages/Partners.tsx` (Board drag-and-drop), `src/styles/dx-26-crm-drag.css`.

## Acceptance
- `crm.spec.ts`, `a11y.spec.ts`, `word-budgets.spec.ts`, `touch.spec.ts` desktop + mobile phone green, claiming not to relax.
- New test `e2e/dx-26-crm-drag.spec.ts`: drag change stage; Cards without permissions cannot be dragged; `Esc` Canceled.
- Juanxi How to Test: Partners  →  Board, drag a contact into another phase with the same sense of Tasks board.

## Rollback
R2。
