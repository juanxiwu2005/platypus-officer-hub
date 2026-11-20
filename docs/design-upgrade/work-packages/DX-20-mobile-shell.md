> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-20 Slimmer mobile top bar (20a) + bottom navigation (20b, approval required)

- Stage 4 · Size L · **High** risk · Rollback R2 · Depends on: DX-02, DX-09, DX-10 · Parallel partners: DX-21,22
- Branch: `design/dx-20-mobile-shell` · Styles: `src/styles/dx-20-mobile-shell.css` · Detail: D23
- **20a and 20b are separate commits**, independently revertible. **20b is excluded by default**; begin only with Juanxi's explicit approval.

## Why
**Measured: ** on 390×844 mobile, top bar 185px and navigation through 247px push content down to 271px (32% of screen). Top bar packs brand, Demo pill, View as, AI toggle, bell.

## 20a: Slimmer top bar (included by default)
1. Only at `max-width: 860px`: one row (about `var(--topbar-h)`, 56px), brand (Logo + organization name, ellipsis if long) left, bell + "⋯" ("More") right.
2. "⋯" menu (reuse `.menu` styles and DX-10 motion) holds Demo content (date, clock, Replay setup, Behind the scenes, Reset demo), **View as**, **AI features** toggle.
3. **All `data-testid` unchanged** (`demo-menu`, `view-as`, `ask-toggle`…). For two-step access (open "⋯", then choose), update `openDemoMenu` in `e2e/helpers.ts`; tests using `view-as` use new `openViewAs(page)` helper. Do not weaken any assertion.
4. Desktop (>860px) **entirely unchanged**.
5. Keep existing horizontal navigation (still used without 20b approval).

## 20b: Bottom navigation (Juanxi's approval required; excluded by default)
1. Fixed mobile bottom navigation: Today, Events, Tasks, Team, More (More contains Handoff, Partners, Rules, Settings, Help).
2. Respect safe areas; move circular Ask above navigation; reserve its height at `body` bottom.
3. Highlight current page, retain Tasks unread count; hit areas≥44px.
4. Remove mobile top horizontal navigation to avoid duplicate navigation.
5. Without approval, **write no 20b code**.

## Allowed files
`src/components/Layout.tsx`, `src/components/chrome/TopBar.tsx`, `DemoMenu.tsx`, `SideNav.tsx`, `src/styles/dx-20-mobile-shell.css`, `e2e/helpers.ts` (helpers only), and **call sites** in tests using them.

## Acceptance
- Full mobile regression (`smoke`, `today`, `tasks`, `events`, `touch`, `a11y`, `recovery`, `m2b`, `wp5`) green; desktop `dx-shots` byte-identical before/after.
- Measure 390×844: after 20a, content starts≤130px (currently 271px); record in report.
- Juanxi: mobile top is one row, "⋯" reveals View as and AI; (20b) navigation at bottom.

## Rollback
R2: revert 20b first (if present), then 20a, or revert whole merge. DX-23 depends on 20b's bottom bar.
