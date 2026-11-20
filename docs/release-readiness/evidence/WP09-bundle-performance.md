# WP09 Subcontract evidence

> For the most recent results, see “First Phase I Integration Review” at the end of the document: WP07 security upgrades combined with entry 371.05 kB (gzip 117.25 kB), actual JS on the first page totaling 514,197 bytes. The following measurement was originally part of the WP09 independent branch.

2026-11-01, Baseline `origin/integration/v1.0` = `5d005072c927a12551636788048fb83ee7be2bca`. Visible Fetch `integration/v1.0`and validation of the approved baseline `7d84fa4`Ancestry;  Task branch `codex/rr-wp09-performance`. No main visited, modified or pushed, no live AIR called.

## Change & Package

Today, Ask, Task Details, Reminders Keep Synchronized Loading. (a) Other top-level pages and right-bar auxiliary editors are loaded on an access basis; The organizational settings and workspaces in PhaseOne are still loaded through existing dynamic import. The PDF/Word dynamic import reservation for two document readers is not pre-empted on route access.

Share `RouteLoading` to provide visibility status, `role=status`, print notification and minimum content height; The top-level stand-alone page uses main, and there is already a load state in main using section. There are no changes to the save/navigation coordinater and storage protection logic.

The following are the same Node 22/ original lockfile construction display values, units kB (decimal); Vite displays a slightly different length from the UTF-8 response bytes.

| Resources | Before optimizing | Optimize after | Optimize gzip |
| --- | ---: | ---: | ---: |
| Main entrance | 722.65（gzip 222.23） | 354.91 | 111.62 |
| React Basic Operating Library | Include in the entrance | 142.78 | 45.72 |
| PhaseOne | Include in the entrance | 52.28 | 15.33 |
| OnlineSetup | 83.47, the original step block | 83.49 | 25.95 |
| PDF Implementation | 483.74, the original step block | 483.74 | 144.81 |

`chunkSizeWarningLimit` not adjusted; The JS chunk warning is ultimately constructed with no more than 500 kB. PDF worker is still about 1,264 kB, only requested when selecting a PDF.

`manualChunks` only matches `node_modules/(react|react-dom|scheduler)/`. The ultimate React operating library module AST does not have an import, and the only static entry is the running library, so there is no loop dependency on running the reticulation application. Other dependencies and applications are processed by Rollup on a static/dynamic import map.

## Evidence of production networks

Open `http://localhost:4903/#/` on the new Chromium page, waiting for Today and network free, actually initial JS requests only:

| Request | Reply Positive Text Section | Locally calculate gzip bytes |
| --- | ---: | ---: |
| `/assets/index-CErJPj86.js` | 355,659 | 111,624 |
| `/assets/react-runtime-D6l9FsUX.js` | 142,782 | 45,721 |
| Total | **498,441** | **157,345** |

gzip is the local calculation value for the final file, not the transfer encoding of this local server. The size of the main portal does not equal the total number of downloads on the first page after a React is removed; Both are reported here separately.

`e2e/bundle-performance.spec.ts` Check all desktop/mobile:

- The original script request on the first page does not include PhaseOne, OnlineSetup, PDF realization or worker; Retrieve access to text and assert that it is less than 500,000bytes, the attachment records all initial scripts and totals.
- Pages can be found at least 320px content height when the answer is paused and checked through WCAG 2A/2AAaxe; Normal display of workspace after release response, no pageerror.
- Direct access to `/#/phase1`, refresher, browser Back/Forward is normal.
- Access `/setup` without downloading PDF; Select the field PDF in repository before downloading PDF realization and worker, and successfully displays read files. The check intercepts all API, doesn't need AI.

`e2e/bundle-organization-setup.spec.ts` naturally matches the file name rules for existing projects. It pauses the OnlineSetup response to check that shell navigation is still visible, polite status, only main and axe are free, the editor is properly shown after release and the PDF has not yet been downloaded. API All Offline Simulation.

## Authentication and recurrence

Environment: Node `v22.23.4`, independent `npm ci`, Chromium `/usr/bin/chromium`, workers=1, key returned ordinary/storage construction using stand-alone port 4903/4904, resulting in additional checking and sustainability evidence reusing 4905/4906; Do not change timeout, assertion, kip or click.

- `npm run build`: adopted.
- `npm run lint`: adopted.
- `npm test -- --maxWorkers=1 --minWorkers=1`: The 55 file / 765 test was passed, including the assertion that there will be no double counting of projections during page switching.
- `git diff --check`: adopted.
- WP09 New browser check: ordinary item 8 + target project 2 was adopted.
- smoke / phase1 / Organization set key returns: 94 passing out of 100, 6 failing, 0skip; 6 failed once each of the three types of cross-cutting tests below. Organisation sets all selected 34 items through.
- Final addition of a check to write the network JSON and loading PNG into outputDir for each test to facilitate direct review; The standing evidence position for running in parallel is `.scratch/wp09-final-results/`.

Standard configuration to run a new check directly:

```sh
npm run build
PW_CHROMIUM=/usr/bin/chromium npm run e2e -- e2e/bundle-performance.spec.ts e2e/bundle-organization-setup.spec.ts --workers=1
```

Parallel phases use unsubmitted temporary config, copy `playwright.config.ts` and change ports only to 4903/4904, `reuseExistingServer=false`, workers=1. The full selection order for this key return is:

```sh
PW_CHROMIUM=/usr/bin/chromium npx playwright test -c playwright.wp09.config.ts \
  e2e/bundle-performance.spec.ts e2e/smoke.spec.ts e2e/phase1.spec.ts e2e/organization-setup.spec.ts \
  --grep '(bundle-performance|smoke|phase1)\.spec\.ts|source screen|reads and archives real|saved drafts resume|leaving within the autosave|real browser Back and Forward|real browser Back stays|shell veto and setup save|a failed navigation save|a conflicting online revision|unsent assistant and new-role|direct hash navigation saves|failed direct hash navigation|unsent inputs block Home|local recovery storage failure'
```

Select to include live PDF/Word/TXT parsing, accessible source pages, save restoration, Back/Forward success and failure, shell veto, conflict version, no input recovery, direct Hash navigation and failure, and leave protection when storage is not available. Organizes the existing graphic editing scene with force click and part of mobileskip; These non-WP09 scenarios have not been implemented and the original spec has not been modified.

## WP09 Historical Integration Limits for Independent Branches (Settled)

The smoke of the independent branch baseline still expects `/funding` header Funding to apply redirected Events; Another scene reads the deleted `my-tasks` tesid, and currently Board actually shows Maya's task correctly. These two types of tests are transferred to WP01. The phonologue B scene is still looking for the old "Meet the spokeer or partner" task, and the existing standard playbook has been replaced with 38 steps and shown on page-by-page; Leave it to WP04 to migrate according to the functional contract. WP09 Retains these three categories of failures and does not create passage by weakening assertions.

The package at that time needed to be re-evaluated after the WP07 security upgrade had been added. The final results are shown in the following section. Live AIR, online Depoy Preview, live identity and cross-organizational data are not part of this offline subcontracting.

## Phase I integrated review

2026-10-31（America/Phoenix；The executive log uses UTC, which has passed over to 2026-11-01), and the main agent completes six packages of reviews, one by one, and acceptance at an independent worktree `codex/rr-stage1-integration`. The most recent remote baseline is `5d005072c927a12551636788048fb83ee7be2bca` (`5d00507`), and the review of the `7d84fa405e89ec62f4e5b712e0b08409c38caa7c` ancestral relationship has been validated. (b) Six sub-branchs are created from the same baseline and each package is submitted by only one source; In the order of WP01 → WP02 → WP04 → WP07 → WP09 chrry-nick, do not use overall ours/theirs overwrite.

| Work package | Independent work package submission | Integrating submission |
| --- | --- | --- |
| WP01 | `455ddb6b982bbd690d97dde70c82b787295d230c` | `2f3c922787fccf12ad4144e8d1c829c2486027c8` |
| WP02 | `bbf0c218abc5e6b85b262f8ee6ea166cfb4a42c3` | `a653a4c290ed5c5d819e8bbfa1526030076ddc15` |
| WP03 | `eaeaeacd8162cd16daf5950ab1e3ac73bbcbce72` | `7819d87c02fd89917dbc10ad2f25ae77a8b675dc` |
| WP04 | `304b7b79ff425744f3a260d18b558c512a04c3e0` | `f329ba68c6cadfa6fc7875d6e9c2638f574b7a16` |
| WP07 | `eab4b1a4b864eeaae169676a1a2e74f55cacc8d1` | `707eb195d1423557d622362d49cc0228f52ee129` |
| WP09 | `99513f174eaa92fb79d63a85a1f80524af65f9da` | `83a699521fac28fb4c4a597e7ef3b7abab3c8243` |

The shared files are automatically reviewed from place to place: Rail keeps Escape, Reset cleanup and supporting details lazyly loaded; Styles to keep both Rolls and Budget to draw boundaries and rowing; The prediction test retains live navigation and full calculation number assertions, and removes the old Future parameter of Router 6.

### Final phase 1 lockdown

Node `v22.23.4`, Chromium `/usr/bin/chromium`, using original `playwright.config.ts`, browsers = 2, retries = 0:

- Re-assemble `npm ci` after all integration; `npm run lint`, `npm run build`, `npm run typecheck:netlify` and `git diff --check` were adopted.
- `npm test -- --maxWorkers=2 --minWorkers=1`: **56 file/ 808 test passed**.
- `npm audit --omit=dev`: **0 Leaks**, high/critical/moderate/low are 0.
- Phase I browser matrix: 20 files, 288, **281 failed through / 7 application exclusions / 0 / 0 flaky**, no retry. Disktop/ mobile each 126, desktop-storage/mobile-storage each 18.
- WP01 76/76, WP02 59 and 7 original equipment removal, WP03 26/26, WP04 72/72 on a package-by-pack integration basis; The 79 target units and the 4 route browsers of WP07 are checked. The new 10 checks for WP09 are included in the final matrix. WP01/WP04 has eliminated six old contracts from the former WP09 branch.
- Live 375/390/ 768px clicks/touch screens, saves failed, requests for privacy, manual process approvals, tasks permissions, date recalculations, Undo/Reset, export status and refreshing durability are all validated in the matrix.
- Import construction display value **722.65  →  371.05 kB**, gzip **222.23 § 117.25 kB**. The entry response is **371,806 byte**, less than 500,000; React rantime is **142,391 byte**. Only two JSs are requested on the desktop and on the front page of the cell, with a combined **514,197 byte**; No PhaseOne, OnlineSetup or PDF requested. Runtime AST does not have an import, the only static import is runtime and no reverse application depends on it. The package threshold has not been raised and the JS chunk warning is ultimately constructed without exceeding 500 kB.

Browser selection command (executed in Node 22 environment):

```sh
CI=1 PW_CHROMIUM=/usr/bin/chromium PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/rr-stage1-final-e2e.json npm run e2e -- \
  e2e/smoke.spec.ts e2e/recovery.spec.ts e2e/safety.spec.ts e2e/m2b.spec.ts e2e/bts.spec.ts e2e/today.spec.ts \
  e2e/events.spec.ts e2e/flow-edit.spec.ts e2e/feel.spec.ts e2e/touch.spec.ts e2e/wp5.spec.ts \
  e2e/tasks.spec.ts e2e/rehearsal.spec.ts e2e/setup-team.spec.ts e2e/workflow-setup.spec.ts e2e/phase1.spec.ts \
  e2e/production-security.spec.ts e2e/bundle-performance.spec.ts e2e/bundle-organization-setup.spec.ts e2e/organization-setup.spec.ts \
  --grep '(smoke|recovery|safety|m2b|bts|today|events|flow-edit|feel|touch|wp5|tasks|rehearsal|setup-team|workflow-setup|phase1|production-security|bundle-performance|bundle-organization-setup)\.spec\.ts|source screen|reads and archives real|saved drafts resume|leaving within the autosave|real browser Back and Forward|real browser Back stays|shell veto and setup save|a failed navigation save|a conflicting online revision|unsent assistant and new-role|direct hash navigation saves|failed direct hash navigation|unsent inputs block Home|local recovery storage failure' \
  --workers=2 --retries=0 --reporter=line,json
```

The full log is `/tmp/rr-stage1-final-{ci,lint-build,unit,backend,e2e}.log`, the production audit was `/tmp/rr-stage1-final-audit.json`, the browser was originally reported as `/tmp/rr-stage1-final-e2e.json`, network and equipment exclusions were aggregated to `/tmp/rr-stage1-final-summary.json` and static package checks were `/tmp/rr-stage1-final-bundle.json`. These local run products are not submitted as repository source files.

### Known issues left to phase II

In accordance with STAGE1 Article 10, the following retention threshold, if recorded, does not count as first stage repaired:

- After **WP05:** mobile tasksheets Owners enter `Jordan, Treas` and Enter, Escape will still bubble and close the whole of Rail and only the candidate list should be collected. Unexecuted organization setup image-editing scenes that rely on force click in old tests; Full keyboard/accessible certification remains to be followed up. Seven devices excluded the application of the original mouse suspension/trawl to a mobile phone touch screen, without adding sskip.
- **WP06:** Complementary check `npm run words` Exited 1, four routes out of range: Events all 614/420; Rules visible 324/170、all 1671/560；Team visible 138/130；`/funding` Redirected to Events all 614/160. Could not close temporary folder: %s
- **WP08:** Cymmetric check-up of `npm audit` development dependent 1 exits with a total of 17 (2 criminal, 1 high, 13 model, 1 low); The production-dependent audit remains at 0. The development dependency statement has not been upgraded and there is no audit signature.

Phase I adoption can begin with WP05/WP06/WP08. All repository release WP10, live mobile phone/Safari, online Deploy Preview and Live Air manual Acceptance is not yet complete; Live Air calls **0**, no push or merge main. Could not close temporary folder: %s
