> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-01 Foundation: split styles, motion tokens, test ports, screenshots, style guards

- Stage 0; size M; risk medium; rollback R2; dependencies none; parallel partner DX-02.
- Branch: `design/dx-01-foundation`; details D38 D39 D40 D51 D56 D57 D58.

## Why
The next 25 packages change the interface concurrently. Editing one `styles.css` and shared test configuration guarantees conflicts and prevents feature-specific rollback. This package changes no visuals, only the foundation. **Pages must remain pixel-identical.**

## Work
1. **Split styles**
   - Create `src/styles/index.css` `@import` of these in order, each new file containing only a comment header: `dx-00-tokens.css`, then `dx-NN-<short-name>.css`, taking NN/name from `PHASES.md` branch names: 03 press-feedback, 04 touch-targets, 05 risk-shapes, 06 type-details, 07 shell-meta, 08 motion-guards, 09 rail-motion, 10 menu-motion, 11 toast-motion, 12 touch-hover-sheet, 13 details-motion, 14 loading-skeleton, 15 events-layout, 16 board-layout, 17 ask-panel, 18 empty-states, 19 detail-swap, 20 mobile-shell, 21 board-headers, 22 flow-motion, 23 glass-topbar, 24 board-drag, 25 done-moment, 26 crm-drag.
   - Add `import "./styles/index.css"` after `./styles.css` in `src/main.tsx` (the plan's only edit to this file).
2. **Motion tokens** (`:root` in `dx-00-tokens.css`, no hex)
   - Durations: `--dur-press: 100ms; --dur-fast: 150ms; --dur-base: 220ms; --dur-slow: 320ms`.
   - Easing: `--ease-out` (entry, fast then slow), `--ease-in-out` (movement).
   - Springs: `--spring-ui` (damping 1.0, no overshoot, settles about 0.35 seconds), `--spring-pop` (about 0.8 damping, slight overshoot, about 0.4 seconds). CSS `linear(...)`, **script-generated values** (sample spring formula at 30–40 points), script `scripts/spring-linear.mjs`, generation parameters commented in file. Do not handwrite numbers.
   - Reduced motion: `@media (prefers-reduced-motion: reduce) { :root { --dur-press: 1ms; --dur-fast: 1ms; --dur-base: 1ms; --dur-slow: 1ms; --spring-ui: linear; --spring-pop: linear } }`.
3. **Style checks**
   - `package.json`: `"lint:css": "stylelint \"src/styles.css\" \"src/styles/*.css\""`.
   - `.stylelintrc.json` `overrides` entry for `src/styles/*.css` only: prohibit `transition: all`; prohibit transitions on `left|top|right|bottom|width|height|margin|padding`; no raw ms/s in `transition` or `animation` (use `var(--dur-*)`); retain `color-no-hex`.
   - Three deliberately invalid samples verify guards fail (fast tests in `src/test/` or `scripts/`, never product styles).
4. **Test ports and default reduced motion**
   - `playwright.config.ts`: `PW_PORT` default 4173, `PW_STORAGE_PORT` default 4174; `webServer` uses both; default `use.reducedMotion` `"reduce"`.
   - `package.json` preview uses `PW_PORT`, default 4173, retaining `--strictPort`.
   - `scripts/word-count.mjs` uses `WORDS_PORT`, default 4177.
   - Without environment variables, behavior remains identical (CI unaffected).
5. **Screenshot script** `scripts/dx-shots.mjs`: `node scripts/dx-shots.mjs <label> <base-url>`. 1440×900 and 390×844 (2×) × light/dark × `/`, `/events`, `/tasks`, `/team`, `/rules`, `/partners`, `/handoff`, `/settings`, plus right rail closed/open. Output `dx-shots/<label>/`; add `dx-shots/` to `.gitignore`; support `PW_CHROMIUM`; disable animations (`reducedMotion: "reduce"`).
6. **Rollback registration:** `ROLLBACK_LOG.md` exists; do not create. Tag baseline `dx/baseline` at initial `claude/determined-johnson-yrdxwf` position.

## Allowed files
`package.json`, `playwright.config.ts`, `.stylelintrc.json`, `.gitignore`, `scripts/word-count.mjs`, new `scripts/dx-shots.mjs`, new `scripts/spring-linear.mjs`, `src/main.tsx` (one added line only), new `src/styles/*`, new guard tests in `src/test/`.
**Forbidden:** `src/styles.css`, any `.tsx` component.

## Acceptance
- Full `npm run check` green; before/after `dx-shots` PNGs **byte-identical** (explain each difference, usually timestamps/random data that script should fix deterministically).
- Run same test concurrently in two worktrees using `PW_PORT=5101 PW_STORAGE_PORT=5201`, without interference (describe verification in report).
- All 3 deliberately invalid samples blocked by style checks.
- What Juanxi sees: **nothing changed**. Correct.

## Rollback
R2. Reverting restores single-file styles; all later packages must revert too (dependency table).

## Notes
- Small files load after `styles.css`, overriding equal-specificity old rules. Import order follows numbering.
- `no-duplicate-selectors` works per file only; cross-file duplicates require manual ownership-table control.
