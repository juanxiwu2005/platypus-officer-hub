# WP08 Tool Chain Security

2026-11-01。Independent branch `codex/rr-wp08-toolchain`, worktree `rr-wp08-toolchain`; Both HEAD and FETCH_HEAD are `1975bc122f5823e033c29493a5d20ce84b85ec23` after `git fetch origin integration/v1.0`. Unchanged PROGRESS, main or other work package, not pushed, live Air calls to 0.

## Upgrade and compatible migration

All production dependence statements remain the same. The following is the actual version of Lockfile; Develops a precise version that relies on the use of Node, which is clearly `^22.13.0 || >=24.0.0`, consistent with ESLint 10/ jsdom. CI continues to use Node 22, ubuntu-24.04 and existing door locks, updating only the runner notes that quote old Playwright versions.

| Tools | Original version | Final version |
| --- | --- | --- |
| Vite | 5.4.11 | 7.3.7 |
| @vitejs/plugin-react | 4.3.4 | 5.2.0 |
| Vitest / @vitest/mocker | 2.1.8 | 4.1.12 |
| tinypool | 1.1.1 | New Vitest is not dependent, remove |
| esbuild | 0.21.5 | 0.28.2 |
| Rollup | 4.65.0 | 4.65.0 |
| ESLint | 9.14.0 | 10.14.0 |
| eslint-plugin-react | 7.37.2 | Move to eslint-plugin-react-x 5.28.8 |
| typescript-eslint | 8.14.0 | Use only its @typescript-eslint/parser 8.72.1 |
| Minimatch (All Paths) | 3.1.5 / 9.0.9 | 11.0.3 |
| Stylelint | 16.10.0 | 17.16.0 |
| TypeScript | 5.6.3 | 5.9.3 |
| jsdom | 25.0.1 | 29.1.1 |
| @netlify/functions | 2.8.2 | 6.0.3 |
| @playwright/test | 1.56.1 | 1.64.1 |
| @axe-core/playwright | 4.10.2 | 4.14.0 |
| @testing-library/react | 16.1.0 | 16.3.3 |
| @types/node | 22.10.2 | 22.20.5 |
| @types/react | 18.3.12 | 18.3.31 |
| @types/react-dom | 18.3.1 | 18.3.7 |

React plugin using Vite 7 security update and matching, continuing with old manualChunks from Rollup and WP09; There is no change to lazy import, chunk restriction or warning settings. The Vite/Vitest common configuration is changed to import defineConfig from `vitest/config`. Vitest 4 Cancelled `--minWorkers`, this package uses `--maxWorkers=2` and does not change the test timeout.

TypeScript 5.9 separates the view type of ArrayBuffer from SharedArrayBuffer: chunks downloaded by anarchive are clearly `Uint8Array<ArrayBuffer>[]`, and the actual source is still `Uint8Array.from`; The production safety test also tightens the byte and reader type. Vitest's spyOn reload changes are compatible with the structured `mock.calls` parameter type. No change in operation, test input or assertion at running time; Strict backend type check passed.

### lint guardrail and minimatch

ESLint 9.39.5 marked off support on npm; The original React plugin 7.37.5's peer range still does not contain ESLint 10 and relies on the callable form of minimatch 3. React-x plugin that eventually moves to support ESLint 10: The corresponding collection key check for `react/jsx-key` is retained by `react-x/no-missing-key`. Two `no-restricted-syntax` selectors, message, gravity and all exclusion routes are completely preserved; Stylelint configuration unchanged.

The original EsLint based on temporary independence of the tree 9.14.0/ React Plugin 7.37.2, compared to the final tool tree 20Example: Map expression, block return, condition/logical expression, Array.from, array and Fragment all continue to be caught with key and legal style;  The new rule captures flatMap and `<>` additionally missing from the original default. `scripts/lint-guardrails.mjs` Add Lint: js, continuously checking this 20 sample, 4 original exclusion path and the following 66 matcher API assertion.

Minimatch address is [ GHSA-g3hv-75wg-m249 ](https://github.com/advisories/GHSA-g3hv-75wg-m249), impact `<11.0.1`. At that time, the latest 3. x 3.1.5, 10. x 10.2.6 were still in range. After examining consumers on a case-by-case basis, only the following dependence is added 11.0.3 override：

- `eslint@10.14.0 → minimatch@11.0.3`
- `eslint → @eslint/config-array@0.23.5 → minimatch@11.0.3`
- `@typescript-eslint/parser → @typescript-eslint/typescript-estree@8.72.1 → minimatch@11.0.3`

All three uses reserved `Minimatch` or `minimatch` API; There is no forced replacement of consumers who need old callable API. With the exception of full compliance lint, sustainable scripts check globstar, brace, dot, route removal and flipnegate on each chain of dependence with a total of 66 assertions. Also Minimatch 10.2.6and 11.0.3Comparison items 9A glob, 12A path, a path. 4Group options: 432Group function/constructor results are all the same.  `npm ls --all` no reliance error, `npm ls minimatch --all` only has these three 11.0.3 paths.

Disable condition for override: remove the article after direct upstream release containing a restored minimatch, then perform match marker with all Lint; There are no audit ignore, Legacy-peer-deps or forced audit fix.

## Audit and closure

| Audit | critical | high | moderate | low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Complete before upgrade | 2 | 1 | 13 | 1 | 17 |
| Complete after upgrade | 0 | 0 | 0 | 0 | 0 |
| Pre-upgrade production audit | 0 | 0 | 0 | 0 | 0 |
| Upgrade production audit | 0 | 0 | 0 | 0 | 0 |

There are no loopholes. `npm ci` still shows two drop hints for the production chain `@netlify/blobs → @netlify/otel → @opentelemetry/sdk-trace-node / sdk-trace-base@2.12.0`; The dependency chain existed and was not an audit gap, nor was it hidden with a closing hint. Production dependence version unchanged.

Environment Node **v22. 23.4**, System Chromium `/usr/bin/chromium`; Use independent node_modules. The order is run under Node 22 through the following packaging:

```sh
npm exec --yes --package=node@22 -- sh -c 'node --version && npm ...'
```

Final result:

- `npm ci`: Through, 439 installation packages without peer conflicts.
- `npm run lint`: adopts, with Styllint, ESLint and additional guardrail authentications; There is no rule, no scope or severity.
- `npm run build`: Through, all JS chunks are smaller than the original 500 kB warning threshold and are not hidden.
- `npm run typecheck:netlify`: Through, keep track.
- `npm test -- --maxWorkers=2 --reporter=json --outputFile=/tmp/rr-wp08-unit-final.json`: **56 Document / 808 test passed, 0 failed, 0 skip**, same as baseline 808.
- `npm exec playwright test -- --list`: **440 item/ 27 file**; The two complete lists correspond to bytes, and the e2e file is not deleted or modified to formally configured.
- The following browser matrices: **44 passed, 0 failed, 0 skip, 0 flaky, 0 retest**.
- `git diff --check`: adopted.

The browser uses temporary `playwright.wp08.config.ts` from the official configuration of derivatives, which have not been submitted, to a stand-alone port 4805/4806, result directory and useExisting Server=file; The original test is maintained with webServer timeout. CI=1、workers=2、retries=0；Select the command to be:

```sh
CI=1 PW_CHROMIUM=/usr/bin/chromium \
PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/rr-wp08-e2e-final.json npm run e2e -- \
  -c playwright.wp08.config.ts \
  e2e/smoke.spec.ts e2e/production-security.spec.ts e2e/bundle-performance.spec.ts \
  e2e/bundle-organization-setup.spec.ts e2e/organization-setup.spec.ts \
  --grep '(smoke|production-security|bundle-performance|bundle-organization-setup)\.spec\.ts|reads and archives real' \
  --workers=2 --retries=0 --reporter=line,json
```

This matrix is fully run smoke, route safety and two sub-checks, as well as reading and archiving the PDF, Word and TXT sample files in repository. API offline simulation, no live Air; The scene that relied on force in the old map is not implemented. The full page accessibility of WP05/06, the number of words and the return of its operations were validated by the master of stage agent integration, and this package does not claim to have been fully 440 running through.

## A new package and first screen for Vite

| Resources | Final bytes | Local gzip bytes |
| --- | ---: | ---: |
| Main entrance index-CixrRcag.js | 363,606 | 114,889 |
| react-runtime-B_WGhzlv.js | 142,530 | 45,815 |
| First Screen JS Total | **506,136** | **160,704** |

The main entrance is from Phase One. 371,806Bytes Down 363,606Bytes, still less than original 500,000Byte assertion.  The actual initial network of desktops and mobile phones requests only the above-mentioned two JS, not PhaseOne, OnlineSetup, PDF realization or worker. gzip is the local calculation value for the final file and does not represent a local preview transfer code.

Rollup AST check confirms that the only static port at the entrance is react-runtime; Runtime does not have an import or export-from, no loops to quote applications. Keep visible loading, single main, polite status, delayed Axe check, direct access/paint/backup/ Back/Forward, and the strategy for loading and working with PDF only after selection. PDF JS to 437.62 kB; Worker remains an asymmetric asset of about 1,264.34 kB, which is independent and does not enter the screen, raises the threshold or hides warnings.

Local Original is `/tmp/rr-wp08-{ci,lint-final,build-final,backend-final,unit-final,e2e-final}.log`Complete/production audit `audit-after.json` / `audit-prod-after.json`、`unit-final.json`、`e2e-final.json`、`lint-comparison.json`、`bundle-static.json`Playwright List and `browser-results/`Network attachments (all used) `/tmp/rr-wp08-`Prefix).  Source submission contains only dependency, necessary configuration/type compatibility, guardrail scripts and this evidence and does not include temporary configuration or running products.
