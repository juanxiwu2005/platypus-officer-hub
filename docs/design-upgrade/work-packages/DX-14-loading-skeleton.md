# DX-14 Load Bone + Delay Display

- Stage 2 size S Risk Low R Level R2 Dependence: DX-01 Parallel Partner: DX-09 ~ 13
- Branch: `design/dx-14-loading-skeleton` Style File: `src/styles/dx-14-loading-skeleton.css` Corresponding Details: D16

## Something to do.
1. `src/components/RouteLoading.tsx`：
   - When you can't load 150ms, you don't show anything. More than 150ms only show.
   - Displays contents: Grey bones similar to the page structure (a title bar + 3 card bars), without text. The `role="status"` text (`label`) given to read screens is changed to visual concealment (`.sr-only` already exists), and the **reading screen can still read "Loading..."**.
   - Bones are static. Apple reminder to avoid slow loops. If you want a little sense of life, only one 1. 2s cycle is allowed to change transparency and stop when the action is reduced.
2. Keep: `fullPage` parameters, `aria-label`, two uses ( "Loading details..." for the whole page, right column details).

## Files that can be changed
`src/components/RouteLoading.tsx`、`src/styles/dx-14-loading-skeleton.css`。

## Acceptance
- `e2e/bundle-performance.spec.ts`, `e2e/bundle-organization-setup.spec.ts` (they check lazy loads) the desktop is green, see if there's a "Loading..." in it. If there's a "read screen" to rewrite, **does not relax another claim**.
- Manually authenticated with the network current (Playwright `route` delay 800ms): 150 ms first blank and then bone bones; Quick load does not flash.
- Juanxi Test: Open Events with a cell phone network (or browse stream) with gray skeletons instead of one line of text.

## Rollback
R2。
