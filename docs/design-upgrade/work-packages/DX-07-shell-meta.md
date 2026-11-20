# DX-07 page meta-information, click highlight, scroll through

- Phase 1 S Risk Low R2 Reliance: DX-01, **DX-03** (reflex to remove system highlights) Parallel partners: DX-04 ~ 06, 08
- Branch: `design/dx-07-shell-meta` Style File: `src/styles/dx-07-shell-meta.css` Corresponding Details: D06 D41 D42

## Something to do.
1. `index.html`: plus `<meta name="color-scheme" content="light dark">`; Add two `<meta name="theme-color">`s with `media="(prefers-color-scheme: light)"` and `dark`, colour **equal to light color of** `--bg` #fbfaf7 and dark colour #0f1312 (`index.html` not in style check range, can write text).
2. unit tess `src/test/dx-07-meta.test.ts`: Read `index.html` and `src/styles.css`, asserting that two `theme-color` and two `--bg` values are identical. After who changed `--bg` and forgot to change here, the test will be red.
3. Small Style File:
   - `html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }`
   - `button, a, [role="tab"], select, summary { touch-action: manipulation; }`
   - `-webkit-tap-highlight-color: transparent` (only for those with feedback: list with DX-03).
   - `.ask-list, .detail-scroll, .menu.wide, .m-menu { overscroll-behavior: contain; }`

## Files that can be changed
`index.html`, `src/styles/dx-07-shell-meta.css`, `src/test/dx-07-meta.test.ts` (new).

## Acceptance
- The new green test in `npm test`; `smoke.spec.ts`, `touch.spec.ts` green.
- Opens a preview under dark system settings and the top colour of the mobile browser corresponds to the bottom color of the page.
- Juanxi Test: Cell phone open, dot buttons without grey flash frames; Dark mode no longer has white flash screens.

## Rollback
R2 (modified `index.html`, not just annotated styles).

## Attention.
- If DX-03 is down by rollback, take this bag off too, or the click will be "no sense."
