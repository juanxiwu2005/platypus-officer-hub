# DX-23 Semitransparent Topbar + Shadow Level token

- Stage 5 Size M Risks R **R1 Available** Dependence: DX-01, DX-02 (including bottom bar if metge 20b) Parallel partners: DX-24, 25
- Branch: `design/dx-23-glass-topbar` Style File: `src/styles/dx-23-glass-topbar.css` Corresponding Details: D34 D35 D36

## Why?
**Read**: The top bar is solid `--surface` plus 1px bottom line; At least 6 types of handwritten rgba shadow with only one `--shadow` token. Emil § 12: The navigation and toolbars use semi-transparent material, the content slips from below, replacing the hard partition line with edge gradients; "The bigger side is thicker: a stronger shadow of blurry and deeper darkness." Apple `materials.md`: Only for **floating functional layer**, not on content or translucent semi-transparent.

## Something to do.
1. **Top column material**: `.topbar { background: color-mix(in srgb, var(--surface) 80%, transparent); backdrop-filter: blur(16px) saturate(1.4); }`. Bottom line `border-bottom` appears only after page scrolling (`is-scrolled`: with a 1px sentry element plus `IntersectionObserver`, or `animation-timeline: scroll()` when supported; It's easy to pick and write in the report.
2. **fallback**:
   - `@supports not (backdrop-filter: blur(1px))`: Solid `--surface`.
   - `@media (prefers-reduced-transparency: reduce)`: Solid, not fuzzy.
   - `@media (prefers-contrast: more)`: Solid + Visible Border (`--ink`'s 30%).
3. **shadow token** (`:root` in small files, without hex, with `rgb(0 0 0 / .x)`): `--elev-1` (card lifts, light), `--elev-2` (menu, suspension card), `--elev-3` (right column float, Toast, dialogue box). Darker patterns cast a heavier shadow and less transparent.
4. **Replaces only the shadow of**: `.menu`, `.m-menu`, `.owner-suggest`, `.toast`, `.rail` (surface state), `.panel`. **Non-replacement of** `.ask-fab` (for DX-09), `.hover-card` (Dark colour solid card, maintained).
5. **Do not allow** to blur menus, suspension cards, content cards (they are solid and avoid overlaying).
6. If 20b bottom navigation is already merge: it uses the same material.
7. Dark mode check: Blank text contrast still  ≥  4.5:1 (crypted by scrolling to the middle of a page with colored blocks below the top bar).

## Files that can be changed
`src/components/chrome/TopBar.tsx` (rolling only), `src/styles/dx-23-glass-topbar.css`. The background and bottom line of `.topbar` is only this package.

## Acceptance
- `a11y.spec.ts` (conversation), `smoke`, `today`, `touch` desktop + mobile phone green.
- (a) New test `e2e/dx-23-glass.spec.ts`: pre-roll `.topbar` without bottom line, after scrolling; The background of `emulateMedia({ reducedTransparency: "reduce" })` (if Playwright is supported otherwise checked with style) is solid.
- Juanxi How to Test: Today rolls down, the card slips under the semi-transparent top bar and there is a fine line in the top. The system turned the top of the "detransparent" bar into reality.

## Rollback
R1 or R2.
