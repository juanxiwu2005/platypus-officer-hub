# DX-15 Events: narrow list, edge tip, white audit

- Stage 3 size M Risk Medium R Level R2 Dependence: DX-01 Parallel Partner: DX-16 ~ 19
- Branch: `design/dx-15-events-layout` Style File: `src/styles/dx-15-events-layout.css` Corresponding Details: D18 D19

## Why?
**Sees four columns (navigation 196+ active list 220 + content + right column 380) when**: 1440 is wide and the right bar is open, leaving a flow chart of about 550 px with the right label cut off.
**Constraint (indefensible)**: 1 **activity name list must be maintained** (the explicit requirement of Juanxi 2026-10-31); 2 The text left at the top of the flow chart is from **intended for** (PROGRESS 2026-10-31), which cannot be deleted directly; 3 Do not move the default behaviour of the AI right column (see `DETAIL_LIST.md` K-3).

## Something to do.
1. The **list narrows**: `.events-layout` receives about 168 px from 220px when it is "opened in the right bar and seen at mouth < 1500px" (renumber only in width, the name remains readable, too long with an ellipsis + `title`).
2. **Flowchart "There's more" hint**: When `.metro` is rolling horizontally, add a shade to the right edge (with `mask-image`, without color) and roll to the end automatically disappears. A small script is required to detect the rolling position (change only the shell of the `Events.tsx` milelow view, not `MetroChart.tsx`, which belongs to DX-22).
3. **Leave White Audit** (measured only, determined): The height of the top needed to eject a suspended card (`.m-card`, wide 250, `bottom: 18px`); If the top leaves more white than it does now > 24px, take away the excess; **Unsurely does not change** to write the measurements in the report. Which rule does the distance ~58px come from between the random switch (Flow/List/Budget) and the graph?
4. Use `100dvh`Replace `.event-nav`It's... `max-height: calc(100vh - …)`。
5. The mobile phone (<860px) active selector remains unchanged.

## Files that can be changed
`src/pages/Events.tsx` (move list/Flow shell), `src/styles/dx-15-events-layout.css`. **No contact with**: `MetroChart.tsx`, `metro.ts`, `.m-*` selections.

## Acceptance
- `events.spec.ts`, `flow-edit.spec.ts`, `feel.spec.ts` (flow chart suspension card), `today.spec.ts`, `a11y.spec.ts`, `word-budgets.spec.ts` desktop + mobile phone green.
- New test `e2e/dx-15-events.spec.ts`: When the wide right column of 1440 is opened, the active list has a width of  ≤ 180 and all active names are visible; The flow chart appears to be gradually masked to the right, rolling to the right and disappearing.
- `dx-shots`: 1440 Wide Events (right bar on/off) contrasts before and after.
- Juanxi Test: The middle flow chart is wider when the right bar on Events page is opened; There's a hint on the right edge that you can still drag to the right. The active list is still in place.

## Rollback
R2。
