# DX-01 Foundation: Style Subfile, Active Token, Test Port, Screen Script, Style Guard

- Stage 0 size M Risk Medium R Level R2 Dependence: No Parallel Partner: DX-02
- Branch: `design/dx-01-foundation` Corresponding Details: D38 D39 D40 D51 D56 D57 D58

## Why?
The later 25 packages have to be changed at the same time. If everyone changes the `styles.css` and the same test configuration, there's a conflict. Rollback can't cut by function either. This bag doesn't change anything but the foundation. After **, the page must be fixed in pixels.**

## Something to do.
1. **Style Subfile**
   - New `src/styles/index.css`, sequenced `@import`: These documents below; New these files, each with only one line of comment: `dx-00-tokens.css`and `dx-NN-<short-name>.css`, n and short name from `PHASES.md`_Other Organiser 03 press-feedback、04 touch-targets、05 risk-shapes、06 type-details、07 shell-meta、08 motion-guards、09 rail-motion、10 menu-motion、11 toast-motion、12 touch-hover-sheet、13 details-motion、14 loading-skeleton、15 events-layout、16 board-layout、17 ask-panel、18 empty-states、19 detail-swap、20 mobile-shell、21 board-headers、22 flow-motion、23 glass-topbar、24 board-drag、25 done-moment、26 crm-drag。
   - Yes. `src/main.tsx`Lee. `./styles.css`After that add `import "./styles/index.css"`This is the only time this document has been changed in the plan.
2. **action token** (`:root` written on `dx-00-tokens.css`, not add)
   - Duration: `--dur-press: 100ms; --dur-fast: 150ms; --dur-base: 220ms; --dur-slow: 320ms`
   - Curve: `--ease-out` (entry, fast-tracking), `--ease-in-out` (diversion)
   - Springs: `--spring-ui` (stopping 1.0, no bouncer, approximately 0.35 seconds in place), `--spring-pop` (blocking around 0.8, light replay, about 0.4 seconds). Written in CSS `linear(...)`, the **value is derived from script** (showing the spring formula for 30–40 points), which puts `scripts/spring-linear.mjs` on script and explains the parameters to be generated in the file. Don't make up numbers.
   - `@media (prefers-reduced-motion: reduce) { :root { --dur-press: 1ms; --dur-fast: 1ms; --dur-base: 1ms; --dur-slow: 1ms; --spring-ui: linear; --spring-pop: linear } }`
3. **Style Check**
   - `package.json`：`"lint:css": "stylelint \"src/styles.css\" \"src/styles/*.css\""`。
   - `.stylelintrc.json` plus one `overrides`, which only enters into force for `src/styles/*.css`: `transition: all` is prohibited; Prohibition of trade in `left|top|right|bottom|width|height|margin|padding`; `transition` and `animation` are not allowed to appear naked milliseconds or seconds (must be `var(--dur-*)`); `color-no-hex` is effective as usual.
   - Write 3 small samples of "deliberate violation" to check that the guards are really red. (Quick test in `src/test/` or `scripts/`, do not stay in product style).
4. **Test port and default reduction effect**
   - `playwright.config.ts`: Port reading `PW_PORT` (default 4173), `PW_STORAGE_PORT` (default 4174); The `webServer` command uses these two ports; `use.reducedMotion` Default `"reduce"`.
   - `preview` script port for `package.json` read `PW_PORT`, default 4173, keep `--strictPort`.
   - `scripts/word-count.mjs` port read `WORDS_PORT`, default 4177.
   - When there is no environmental variable, the behaviour remains exactly the same (CI is not affected).
5. **Screen Script** `scripts/dx-shots.mjs`: Usage `node scripts/dx-shots.mjs <label> <base-url>`. 1440 x 900 and 390 x 844 (2 times) x Light/ Dark x `/`, `/events`, `/tasks`, `/team`, `/rules`, `/partners`, `/handoff`, `/settings`, plus "right column closed" and "right bar open". Output to `dx-shots/<label>/`. Add `dx-shots/` to `.gitignore`. Support `PW_CHROMIUM`. Animation is always closed (`reducedMotion: "reduce"`).
6. **rollback Register**: `ROLLBACK_LOG.md` is available and not built. Set the baseline label `dx/baseline` (pointing to initial `claude/determined-johnson-yrdxwf` position).

## Files that can be changed
`package.json`, `playwright.config.ts`, `.stylelintrc.json`, `.gitignore`, `scripts/word-count.mjs`, `scripts/dx-shots.mjs` (new), `scripts/spring-linear.mjs` (new), `src/main.tsx` (with only one line), `src/styles/*` (new), `src/test/` (new) for additional security tests.
**Do not touch**: `src/styles.css`, any `.tsx` components.

## Acceptance
- `npm run check` Full green; `dx-shots` Comparison of changes: PNG **bytes consistent** (discrepancies are explained on a case-by-case basis, usually time stamped or random data that need to be fixed in scripts).
- Using `PW_PORT=5101 PW_STORAGE_PORT=5201` to run the same test simultaneously in two worktrees without prejudice to each other (a validation process is written in the report).
- 3 samples of intentional violations were stopped by a style check.
- Juanxi saw something: **nothing changed**. That's right.

## Rollback
R2。When removed, the style returns to a single file and all packages behind are withdrawn together (see dependency table).

## Attention.
- Small files are loaded after `styles.css`, so they cover the old rules under the same priority. Introduction order is the numbering order.
- `no-duplicate-selectors` only takes effect in a single document; The cross-file repeater is manually managed by the "documentation table".
