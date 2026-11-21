# WP 08 Toolchain security acceptance evidence

2026-11-01. Separate branch `codex/rr-wp08-toolchain`, worktree `rr-wp08-toolchain`; after explicit `git fetch origin integration/v1.0`, HEAD/FETCH_HEAD both `1975bc122f5823e033c29493a5d20ce84b85ec23`. No PROGRESS/main/other-package edits, no push, 0 live AIR calls.

## Upgrades and compatibility migration

All production dependency declarations unchanged. Actual lockfile versions below; development dependencies pinned exactly, Node minimum explicitly `^22.13.0 || >=24.0.0`, matching ESLint 10/jsdom. CI retains Node 22, ubuntu-24.04, existing gates; only runner comment mentioning old Playwright updated.

| Tool | Original | Final |
| --- | --- | --- |
| Vite |5.4.11|7.3.7|
| @vitejs/plugin-react |4.3.4|5.2.0|
| Vitest / @vitest/mocker |2.1.8|4.1.12|
| tinypool |1.1.1|Removed; new Vitest no longer depends on it|
| esbuild |0.21.5|0.28.2|
| Rollup |4.65.0|4.65.0|
| ESLint |9.14.0|10.14.0|
| eslint-plugin-react |7.37.2|Migrated to eslint-plugin-react-x 5.28.8|
| typescript-eslint |8.14.0|Only @typescript-eslint/parser 8.72.1 used|
| minimatch (all paths) |3.1.5 /9.0.9|11.0.3|
| Stylelint |16.10.0|17.16.0|
| TypeScript |5.6.3|5.9.3|
| jsdom |25.0.1|29.1.1|
| @netlify/functions |2.8.2|6.0.3|
| @playwright/test |1.56.1|1.64.1|
| @axe-core/playwright |4.10.2|4.14.0|
| @testing-library/react |16.1.0|16.3.3|
| @types/node |22.10.2|22.20.5|
| @types/react |18.3.12|18.3.31|
| @types/react-dom |18.3.1|18.3.7|

Use Vite 7 security updates/matching React plugin, retaining Rollup/WP09 manualChunks. Lazy imports, chunk limits, warnings unchanged. Shared Vite/Vitest config imports defineConfig from `vitest/config`. Vitest 4 removed `--minWorkers`; use `--maxWorkers=2`, without timeout changes.

TypeScript 5.9 distinguishes ArrayBuffer/SharedArrayBuffer views: archive download chunks explicitly `Uint8Array<ArrayBuffer>[]`, still from `Uint8Array.from`; production-security tests similarly tighten byte/reader types. Adapt spyOn overloads with structured `mock.calls` argument types. Runtime, test inputs, assertions unchanged; strict backend types passed.

### Lint guardrails and minimatch

ESLint 9.39.5 is marked unsupported on npm; original React plugin 7.37.5 still excludes ESLint 10 peers and needs callable minimatch 3. Migrate to ESLint 10-compatible react-x;`react-x/no-missing-key` preserves collection-key checking from `react/jsx-key`. Both `no-restricted-syntax` selectors, messages, severity, all exclusions unchanged; Stylelint config untouched.

Compare original ESLint 9.14.0/React plugin 7.37.2 in a separate temporary dependency tree with final tools across 20 examples: existing map, block return, conditional/logical, Array.from, array, Fragment violations remain caught; keyed cases/legal styles pass. New rule also catches default omissions flatMap/`<>`. Add `scripts/lint-guardrails.mjs` to lint: js to continuously check 20 examples, 4 original exclusions, 66 matcher API assertions below.

minimatch advisory [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) affects `<11.0.1`. Latest registry 3.x was 3.1.5,10.x10.2.6, both affected. After checking each consumer, add explicit 11.0.3 overrides only for:

- `eslint@10.14.0 → minimatch@11.0.3`
- `eslint → @eslint/config-array@0.23.5 → minimatch@11.0.3`
- `@typescript-eslint/parser → @typescript-eslint/typescript-estree@8.72.1 → minimatch@11.0.3`

All three use retained named `Minimatch`/`minimatch` APIs; no forced replacement of consumers needing old callable API. Besides repository lint, persistent script checks globstar, brace, dot, path exclusions, flipNegate per chain, 66 assertions. Compare 10.2.6/11.0.3 over project's9 globs, 12 paths, 4 option sets: all 432 function/constructor results identical. `npm ls --all` has no dependency errors;`npm ls minimatch --all` shows only these three 11.0.3 paths.

Remove an override when its direct upstream releases a fixed minimatch dependency, then rerun matcher comparison/full lint. No audit ignore, legacy-peer-deps, forced audit fix.

## Audit and gates

| Audit | critical | high | moderate | low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full, before |2|1|13|1|17|
| Full, after |0|0|0|0|0|
| Production, before |0|0|0|0|0|
| Production, after |0|0|0|0|0|

No vulnerability exceptions. `npm ci` still reports two deprecations from existing production chain `@netlify/blobs → @netlify/otel → @opentelemetry/sdk-trace-node / sdk-trace-base@2.12.0`; these are not audit vulnerabilities, and warnings were not suppressed. Production dependency versions unchanged.

Environment: Node **v22.23.4**, system Chromium `/usr/bin/chromium`, separate node_modules. Commands wrapped under Node 22:

```sh
npm exec --yes --package=node@22 -- sh -c 'node --version && npm ...'
```

Final results:

- `npm ci`: passed, 439 installed packages, no peer conflict.
- `npm run lint`: passed, Stylelint/ESLint/new guards; no relaxed rules, exclusions, severity.
- `npm run build`: passed, all JS chunks below original 500kB warning, no hidden warnings.
- `npm run typecheck:netlify`: passed, strict preserved.
- `npm test -- --maxWorkers=2 --reporter=json --outputFile=/tmp/rr-wp08-unit-final.json`: **56 files/808 tests passed, 0 failed/0 skipped**, same baseline 808.
- `npm exec playwright test -- --list`: **440 cases/27 files** before/after, full lists byte-identical, no e2e/formal-config deletion/edits.
- Browser matrix below: **44 passed, 0 failed, 0 skipped, 0 flaky, 0 retries**.
- `git diff --check`: passed.

Browser uses uncommitted temporary `playwright.wp08.config.ts` derived from formal config, changing only independent ports 4805/4806, result directories, reuseExistingServer=false; tests/webServer timeouts unchanged. CI=1, workers=2, retries=0; selection:

```sh
CI=1 PW_CHROMIUM=/usr/bin/chromium \
PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/rr-wp08-e2e-final.json npm run e2e -- \
  -c playwright.wp08.config.ts \
  e2e/smoke.spec.ts e2e/production-security.spec.ts e2e/bundle-performance.spec.ts \
  e2e/bundle-organization-setup.spec.ts e2e/organization-setup.spec.ts \
  --grep '(smoke|production-security|bundle-performance|bundle-organization-setup)\.spec\.ts|reads and archives real' \
  --workers=2 --retries=0 --reporter=line,json
```

Matrix fully runs smoke, route security, both bundle checks, and reads/archives fictional PDF, Word, TXT repository examples on desktop-storage/mobile-storage. APIs mocked offline, no live AIR; old storage-graph force-dependent cases not run. Lead verifies WP 05/06 full-page a11y, words, business regressions after integration; this package does not claim all 440 passed.

## New Vite bundle and initial load

| Asset | Final bytes | Local gzip bytes |
| --- | ---: | ---: |
| Main index-CixrRcaG.js |363,606|114,889|
| react-runtime-B_WGhzlv.js |142,530|45,815|
| Initial JS total |**506,136**|**160,704**|

Main entry shrank from Stage 1's371,806 to 363,606 bytes, strictly below original 500,000 assertion. Actual desktop/mobile initial network requests only these two JS files, no PhaseOne, OnlineSetup, PDF implementation/worker. gzip values locally computed for final files, not preview transfer encoding.

Rollup AST confirms sole static entry import is react-runtime; runtime has no import/export-from or cycle back to app. Retain visible loading, unique main, polite status, lazy-route Axe, direct navigation/refresh/Back/Forward, and PDF implementation/worker loaded only after PDF selection. PDF JS 437.62kB; worker separate asynchronous asset about 1,264.34kB, not initial load, no thresholds raised/warnings hidden.

Raw local artifacts:`/tmp/rr-wp08-{ci,lint-final,build-final,backend-final,unit-final,e2e-final}.log`, full/production `audit-after.json`/`audit-prod-after.json`,`unit-final.json`,`e2e-final.json`,`lint-comparison.json`,`bundle-static.json`, before/after Playwright lists, network attachments under `browser-results/` (all `/tmp/rr-wp08-` prefixed). Source commit contains dependencies, necessary config/type compatibility, guards, this evidence only, no temporary configs/run artifacts.
