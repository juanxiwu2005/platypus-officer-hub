> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-23 Translucent top bar + elevation shadow tokens

- Stage 5 · Size M · Risk medium · R level **R1 available** · Depends on: DX-01, DX-02 (include bottom bar if 20b merged) · Parallel partners: DX-24, 25
- Branch: `design/dx-23-glass-topbar` · Stylesheet: `src/styles/dx-23-glass-topbar.css` · Details: D34 D35 D36

## Why
**Observed:** Top bar is solid `--surface` plus 1px bottom line; at least 6 hand-authored rgba shadows, only one `--shadow` token. Emil§12: translucent navigation/toolbars, content scrolling beneath, edge gradient instead of hard separators; “larger surfaces are thicker: stronger blur, deeper shadows.” Apple `materials.md`: only on **floating functional layers**, not content; do not stack translucency.

## Work
1. **Top-bar material:** `.topbar { background: color-mix(in srgb, var(--surface) 80%, transparent); backdrop-filter: blur(16px) saturate(1.4); }`. `border-bottom` appears only after scrolling (`is-scrolled`:1px sentinel + `IntersectionObserver`, or `animation-timeline: scroll()` where supported; choose simplest, explain in report).
2. **Fallbacks:**
   - `@supports not (backdrop-filter: blur(1px))`: solid `--surface`.
   - `@media (prefers-reduced-transparency: reduce)`: solid, no blur.
   - `@media (prefers-contrast: more)`: solid + clear border (30% `--ink`).
3. **Shadow tokens**(small file `:root`, no hex, use `rgb(0 0 0 / .x)`): `--elev-1` (subtle raised cards), `--elev-2` (menus, hover cards), `--elev-3` (rail overlays, Toast, dialogs). Stronger, higher-opacity shadows in dark mode.
4. **Replace shadows only for:** `.menu`, `.m-menu`, `.owner-suggest`, `.toast`, `.rail` (overlay), `.panel`. **Do not replace** `.ask-fab` (DX-09), `.hover-card` (solid dark card, retain).
5. **Do not** blur menus, hover cards, or content cards (they are solid; avoid stacking).
6. If 20b bottom navigation merged, use same material there.
7. Dark mode: text contrast after blur still≥4.5:1 (verify screenshots mid-scroll with colored content beneath top bar).

## Permitted files
`src/components/chrome/TopBar.tsx` (scroll state only), `src/styles/dx-23-glass-topbar.css`. `.topbar` background/bottom border exclusively this package.

## Acceptance
- `a11y.spec.ts` (including contrast), `smoke`, `today`, `touch` desktop+mobile green.
- New `e2e/dx-23-glass.spec.ts`: `.topbar` has no bottom border before scroll, has one after; solid background under `emulateMedia({ reducedTransparency: "reduce" })` (if Playwright supports, otherwise inspect styles).
- Juanxi: scroll Today, cards pass beneath translucent top bar and thin line appears. System reduced transparency makes top bar solid.

## Rollback
R1 or R2.
