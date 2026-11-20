# DX-24 board pointer drag + Jean + spring + keyboard

- Stage 5 Size L Risk **High** R Level R2 Dependence: DX-16 Parallel Partners: DX-23, 25
- Branch: `design/dx-24-board-drag` Style File: `src/styles/dx-24-board-drag.css` Corresponding Details: D43 D44

## Why?
**Read**: Taks board drag-and-drop (`draggable`, `onDragStart`, `onDrop`), with only a semi-transparent shadow; No animation, no other cards; Can you drag **on your cell phone for**? Emil § 2 (1:1 follow hands, remember grab points), § 10 (8– 10px is a drag).

## Something to do.
1. New `src/lib/dragSort.ts`: A small drag tool (Hook), the **data layer remains unchanged**: the existing `move(id, status, beforeId)` in `Tasks.tsx` is still called when falling, **does not change store or `SCHEMA_VERSION`**.
2. Touch:
   - `pointerdown` moves after  ≥ 8px starts to drag (avoiding and clicking conflicts); Use `setPointerCapture`; The card follows the pointer 1:1, keeps the grab point deflected and does not jump to the center of the card.
   - (b) Leave an empty slot for the card to be dragged, and the other cards will be moved by 150ms; Targetbar Highlights the border.
   - Loose hands: Use springs for `--spring-ui`, block 1.0 -- there is no "rolling" here, so don't bounce back; `Esc` Cancel and get back on the way.
   - Automatically roll horizontally when close to the port margin (reference `MetroChart.tsx` practice: edge 40px, 18px per frame).
3. **tentacles**: The long press of approximately 250 ms starts to drag, avoid and roll conflicts; `touch-action` only sets to `none` when drag. The original `select` method on the cell phone is retained and not removed.
4. **Keyboard**: `Alt + ←/→` moved to neighbouring columns (consistent with flowchart `Alt + arrow key`) after the cards were given focus; Move and broadcast "Moved X to Y" with `aria-live="polite"`.
5. Convergence with the empty column of DX-16: A narrow column must be capable of being placed as a target (detected by pointer location, not `onDragEnter`).
6. Maintain: lists of missions (who can hold whose card), `data-testid="board-card"`, `aria-label`.

## Files that can be changed
`src/pages/Tasks.tsx` (the part where the board drags and drops), `src/lib/dragSort.ts` (new), `src/styles/dx-24-board-drag.css`, `src/test/dragSort.test.ts` (new, unit sets of pure logic).

## Acceptance
- `dragTo`, which is now available in `tasks.spec.ts` miles, asserts that it will continue to pass. (The `dragTo` from Playwright was a mouse event and the new achievement had to be responded to); `activity-workspace.spec.ts`, `a11y.spec.ts`, `touch.spec.ts`, `word-budgets.spec.ts` desktop + mobile phone green. **cannot relax assertions or add to the test `force: true`** (WP10 has just cleared out such mandatory hits).
- New test `e2e/dx-24-drag.spec.ts`: 1 `transform` changes with the pointer of the dragged card; 2 Other cards moved when dragged; 3 `Esc` No change in data after cancellation; 4 Keyboard `Alt+→` changed state and was broadcast; 5 Drags to a narrow column can also be dropped.
- Juanxi How to do this: the computer drags a card to another row, the cards follow the mouse, the other cards move away from one position and loose their hands; Keyboard can also be moved.

## Rollback
R2。DX-26 Reliance on its tools and withdraw DX-26.

## Attention.
- If you find that it has to be changed to store, **stops** and writes the report to the integration person.
