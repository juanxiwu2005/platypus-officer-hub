# DX-20 mobile phone topbar thin (20a) + bottom navigation (20b, approval required)

- Phase 4 size L Risk **High** R Level R2 Dependence: DX-02, DX-09, DX-10 Parallel Partners: DX-21, 22
- Branch: `design/dx-20-mobile-shell` Style File: `src/styles/dx-20-mobile-shell.css` Corresponding Details: D23
- **20a and 20b are two separate submissions of**, which can be withdrawn separately. **20b Default not to do**, only Juanxi explicitly approves it.

## Why?
**to**: 390 x 844 mobile phone, top bar 185px, plus navigation strips to 247px. The text does not start until 271 px (% of screen 32). The top bars are brands, Demo minibars, View ass, AI switches, bells.

## 20a: Top bar thin (doed by default)
1. Only in `max-width: 860px`: a row of harvests (approximately `var(--topbar-h)` 56px) - left brand (Logo + standard organization, too long omitted), right bell + "More" button.
2. The menu opened by " ⋯ " (following the `.menu` style and animated by DX-10): the content of the Demo subscript (date, clock, Riplay setup, Behind the scenes, Reset demo), **View as**, **AI Features** switch.
3. **All `data-testid` remain unchanged at** (`demo-menu`, `view-as`, `ask-toggle` ...). Two steps to update `openDemoMenu` in `e2e/helpers.ts` and get the test used for `view-as` through a new assistant `openViewAs(page)`; None of the test assertions can be relaxed.
4. Desktop (>860px) **is completely unchanged**.
5. Existing horizontal navigation protocols are retained (20b if not approved).

## 20b: Bottom navigation (Juanxi approval required, default not done)
1. Today, Events, Tasks, Team, More (More placed Handoff, Partners, Rules, Settings, Help).
2. Respect for the safe zone; Circle Ask buttons move up to the navigation bar; `body` sets the altitude of the navigation bar at the bottom.
3. The current page is highlighted and the unread number of Tasks remains; Each click area  ≥ 44px.
4. The phone goes up to the top and drops a horizontal line to avoid two sets of navigation.
5. If Juanxi does not approve, **don't write any 20b code**.

## Files that can be changed
`src/components/Layout.tsx`、`src/components/chrome/TopBar.tsx`、`DemoMenu.tsx`、`SideNav.tsx`、`src/styles/dx-20-mobile-shell.css`、`e2e/helpers.ts`(adds/changes only assistants) and tests used for them. **Call with**。

## Acceptance
- The return of the full mobile phone project (`smoke`, `today`, `tasks`, `events`, `touch`, `a11y`, `recovery`, `m2b`, `wp5`); Desktop item `dx-shots` is bytes consistent.
- Volume: 390 x 844, 20a after text starting at 130px (Status 271px); Write in the report.
- Juanxi How to Test: There's only one line left on the top of the cell phone, and the dot " ⋯ " can find View as well as AI switches; (20b) There is a navigation bar at the bottom.

## Rollback
R2: Withdrawal of 20b submission (if any), then 20a, or direct evacuation of the entire merge. DX-23 Depends on the bottom of 20b.
