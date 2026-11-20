> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-07 Page metadata, tap highlighting, scroll containment

- Stage 1; size S; risk low; rollback R2; depends DX-01, **DX-03** (press feedback before removing native highlight); parallel DX-04–06,08.
- Branch `design/dx-07-shell-meta`; styles `src/styles/dx-07-shell-meta.css`; details D06 D41 D42.

## Work
1. `index.html`: add `<meta name="color-scheme" content="light dark">`; two `<meta name="theme-color">` with `media="(prefers-color-scheme: light)"` and dark, colors **equal** to light `--bg` #fbfaf7 and dark #0f1312 (`index.html` outside style checks, hex allowed).
2. `src/test/dx-07-meta.test.ts`: read `index.html`, `src/styles.css`; assert both `theme-color` values match respective `--bg`. Later changing `--bg` without metadata fails.
3. Small stylesheet:
   - `html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }`
   - `button, a, [role="tab"], select, summary { touch-action: manipulation; }`
   - `-webkit-tap-highlight-color: transparent` only where press feedback exists (DX-03 list).
   - `.ask-list, .detail-scroll, .menu.wide, .m-menu { overscroll-behavior: contain; }`

## Allowed files
`index.html`, `src/styles/dx-07-shell-meta.css`, new `src/test/dx-07-meta.test.ts`.

## Acceptance
- New `npm test` test, `smoke.spec.ts`, `touch.spec.ts` green.
- With dark system theme, phone browser chrome matches page background.
- Juanxi: mobile buttons have no gray flash; dark mode no white flash.

## Rollback
R2 (`index.html` changed, commenting styles insufficient).

## Notes
- If reverting DX-03, revert this first; otherwise taps lose feedback.
