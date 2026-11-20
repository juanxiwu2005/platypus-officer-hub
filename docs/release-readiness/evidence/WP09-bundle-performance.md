# WP09 code-splitting acceptance evidence

> Latest results are under "Stage-1 integrated review" below: after WP07 security integration, entry is 371.05 kB (gzip 117.25 kB), actual initial-page JS totals 514,197 bytes. Earlier measurements below belong to the standalone WP09 branch.

2026-11-01, baseline `origin/integration/v1.0` = `5d005072c927a12551636788048fb83ee7be2bca`. Explicitly fetched `integration/v1.0`, verified audit baseline `7d84fa4` is an ancestor; branch `codex/rr-wp09-performance`. No access/modification/push to main, no real AIR.

## Changes and bundle sizes

Today, Ask, task details, reminders remain synchronous. Other top-level pages/rail auxiliary editors load on access; organization setup/workspace within PhaseOne retain dynamic imports. Both document readers retain PDF/Word dynamic imports, without route-entry prefetch.

Shared `RouteLoading` provides visible status, `role=status`, polite announcements, minimum content height; standalone top-level pages use main, loading within existing main uses section. Setup-save/navigation coordination and storage protection unchanged.

Same Node 22/original lockfile Vite display values below, decimal kB; Vite displayed lengths differ slightly from UTF-8 response bytes.

| Asset | Before | After | After gzip |
| --- | ---: | ---: | ---: |
| Entry | 722.65 (gzip 222.23) | 354.91 | 111.62 |
| React runtime | Included in entry | 142.78 | 45.72 |
| PhaseOne | Included in entry | 52.28 | 15.33 |
| OnlineSetup | 83.47, existing async chunk | 83.49 | 25.95 |
| PDF implementation | 483.74, existing async chunk | 483.74 | 144.81 |

No `chunkSizeWarningLimit` adjustment; final build has no JS chunk warning above 500 kB. PDF worker remains about 1,264 kB, requested only on PDF selection.

`manualChunks` matches only `node_modules/(react|react-dom|scheduler)/`. Final React runtime module AST has no import; entry's only static import is runtime, so no runtime→app circular dependency. Rollup handles other dependencies/app code through static/dynamic import graphs.

## Production-build network evidence

Fresh Chromium at `http://localhost:4903/#/`, waiting for Today/network idle, requests only:

| Request | Response-body bytes | Locally calculated gzip bytes |
| --- | ---: | ---: |
| `/assets/index-CErJPj86.js` | 355,659 | 111,624 |
| `/assets/react-runtime-D6l9FsUX.js` | 142,782 | 45,721 |
| Total | **498,441** | **157,345** |

Gzip is calculated locally from final files, not measured server transfer encoding. With React split out, entry size differs from total initial download; both reported separately.

`e2e/bundle-performance.spec.ts` checks desktop/mobile:

- No initial PhaseOne, OnlineSetup, PDF implementation/worker requests; entry response <500,000 bytes; attaches all initial scripts/total.
- Paused PhaseOne response yields visible loading, polite status, one main, ≥320px content height, WCAG 2A/2AA axe pass; released response opens workspace without pageerror.
- Direct `/#/phase1`, refresh, Back/Forward work.
- `/setup` does not download PDF until selecting fictional repository PDF, then implementation/worker load and file reads successfully. All APIs intercepted, no AI required.

`e2e/bundle-organization-setup.spec.ts` naturally matches existing storage-project filename rules. Pauses OnlineSetup; shell navigation visible, polite status, one main, no axe violations; release displays editor, still no PDF. All APIs offline-mocked.

## Validation and reproduction

Node `v22.23.4`, isolated `npm ci`, Chromium `/usr/bin/chromium`, workers=1. Ordinary/storage critical regression builds on separate 4903/4904; final new checks/persistent-evidence recheck 4905/4906. No timeout/assertion/skip/click-method changes.

- Build passed.
- `npm run lint` passed.
- `npm test -- --maxWorkers=1 --minWorkers=1`: 55 files/765 passed, including no forecast recalculation during page switches.
- `git diff --check` passed.
- New WP09 browser checks: ordinary 8 + storage 2 passed.
- smoke/phase1/organization-setup critical regression: 100 total, 94 passed/6 failed/0 skipped; 6 failures from the three old cross-package classes below, once per desktop/mobile. All 34 selected organization-setup cases passed.
- Final new checks save network JSON/loading PNG to test outputDir; concurrent persistent evidence `.scratch/wp09-final-results/`.

Run new checks with standard configuration:

```sh
npm run build
PW_CHROMIUM=/usr/bin/chromium npm run e2e -- e2e/bundle-performance.spec.ts e2e/bundle-organization-setup.spec.ts --workers=1
```

Parallel stage used uncommitted temporary config copied from `playwright.config.ts`, changing only ports 4903/4904, `reuseExistingServer=false`, workers=1. Full critical selection:

```sh
PW_CHROMIUM=/usr/bin/chromium npx playwright test -c playwright.wp09.config.ts \
  e2e/bundle-performance.spec.ts e2e/smoke.spec.ts e2e/phase1.spec.ts e2e/organization-setup.spec.ts \
  --grep '(bundle-performance|smoke|phase1)\.spec\.ts|source screen|reads and archives real|saved drafts resume|leaving within the autosave|real browser Back and Forward|real browser Back stays|shell veto and setup save|a failed navigation save|a conflicting online revision|unsent assistant and new-role|direct hash navigation saves|failed direct hash navigation|unsent inputs block Home|local recovery storage failure'
```

Covers real PDF/Word/TXT parsing, accessible source screen, save/recovery, Back/Forward success/failure, shell veto, conflicting revisions, unsent-input recovery, direct hash navigation/failure, unavailable-storage leaving guards. Existing organization graph tests use force click/some mobile skips; unrelated WP09 cases were not run, original specs unchanged.

## Historical standalone WP09 integration limits (resolved)

Baseline smoke expected Funding at `/funding`, already redirected to Events; another used removed `my-tasks` testid, though Board correctly showed Maya's tasks. WP01 owns both migrations. phase1 Organization B still sought old "Meet the speaker or partner"; current standard playbook has 38 paginated steps; WP04 migrates to responsibility contracts. WP09 retains these three failure classes without weakened assertions.

Bundle needed remeasurement after WP07 Router security integration; final results below. Real paid AIR, online Deploy Preview, real identity/cross-organization data excluded from offline splitting acceptance.

## Stage-1 integrated review

2026-10-31 (America/Phoenix; UTC logs crossed into 2026-11-01), lead reviewed/integrated/accepted six packages in separate worktree `codex/rr-stage1-integration`. Latest remote baseline `5d005072c927a12551636788048fb83ee7be2bca` (`5d00507`), ancestry of audit baseline `7d84fa405e89ec62f4e5b712e0b08409c38caa7c` verified. Six branches share baseline, one source commit/package; cherry-picked WP01 → WP02 → WP03 → WP04 → WP07 → WP09 without blanket ours/theirs.

| Package | Standalone commit | Integrated commit |
| --- | --- | --- |
| WP01 | `455ddb6b982bbd690d97dde70c82b787295d230c` | `2f3c922787fccf12ad4144e8d1c829c2486027c8` |
| WP02 | `bbf0c218abc5e6b85b262f8ee6ea166cfb4a42c3` | `a653a4c290ed5c5d819e8bbfa1526030076ddc15` |
| WP03 | `eaeaeacd8162cd16daf5950ab1e3ac73bbcbce72` | `7819d87c02fd89917dbc10ad2f25ae77a8b675dc` |
| WP04 | `304b7b79ff425744f3a260d18b558c512a04c3e0` | `f329ba68c6cadfa6fc7875d6e9c2638f574b7a16` |
| WP07 | `eab4b1a4b864eeaae169676a1a2e74f55cacc8d1` | `707eb195d1423557d622362d49cc0228f52ee129` |
| WP09 | `99513f174eaa92fb79d63a85a1f80524af65f9da` | `83a699521fac28fb4c4a597e7ef3b7abab3c8243` |

Automatically merged shared files reviewed individually: Rail retains Escape, Reset cleanup, lazy auxiliary details; styles retain Roles, Budget rendering bounds, loading; forecast tests retain real navigation/all computation-count assertions, removing old Router 6 future options.

### Final stage-1 gates

Node `v22.23.4`, Chromium `/usr/bin/chromium`, original `playwright.config.ts`, browser workers=2/retries=0:

- Reran `npm ci` after all integration; `npm run lint`/build/`npm run typecheck:netlify`/`git diff --check` passed.
- `npm test -- --maxWorkers=2 --minWorkers=1`: **56 files/808 passed**.
- `npm audit --omit=dev`: **0 vulnerabilities**, all high/critical/moderate/low 0.
- Browser matrix: 20 files/288 cases, **281 passed / 7 existing device-applicability exclusions / 0 failed / 0 flaky**, no retries. 126 each desktop/mobile, 18 each desktop-storage/mobile-storage.
- Per-package retests: WP01 76/76, WP02 59 passed/7 existing exclusions, WP03 26/26, WP04 72/72; WP07 79 target units/4 routing browser checks passed. WP09's 10 new checks included in final matrix. WP01/WP04 eliminate six old-contract failures above.
- Matrix covers actual click/touch at 375/390/768px, save failures, privacy requests, manual workflow approval, denied task permissions, date recalculation, Undo/Reset, export state, refresh persistence.
- Entry display **722.65 → 371.05 kB**, gzip **222.23 → 117.25 kB**. Entry response **371,806 bytes** <500,000; React runtime **142,391 bytes**. Desktop/mobile initially request only these two JS files, **514,197 bytes** total, no PhaseOne/OnlineSetup/PDF. Runtime AST no imports; entry's sole static import runtime, no reverse app dependency. No budget increases or final JS chunk warnings >500 kB.

Browser selection (Node 22):

```sh
CI=1 PW_CHROMIUM=/usr/bin/chromium PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/rr-stage1-final-e2e.json npm run e2e -- \
  e2e/smoke.spec.ts e2e/recovery.spec.ts e2e/safety.spec.ts e2e/m2b.spec.ts e2e/bts.spec.ts e2e/today.spec.ts \
  e2e/events.spec.ts e2e/flow-edit.spec.ts e2e/feel.spec.ts e2e/touch.spec.ts e2e/wp5.spec.ts \
  e2e/tasks.spec.ts e2e/rehearsal.spec.ts e2e/setup-team.spec.ts e2e/workflow-setup.spec.ts e2e/phase1.spec.ts \
  e2e/production-security.spec.ts e2e/bundle-performance.spec.ts e2e/bundle-organization-setup.spec.ts e2e/organization-setup.spec.ts \
  --grep '(smoke|recovery|safety|m2b|bts|today|events|flow-edit|feel|touch|wp5|tasks|rehearsal|setup-team|workflow-setup|phase1|production-security|bundle-performance|bundle-organization-setup)\.spec\.ts|source screen|reads and archives real|saved drafts resume|leaving within the autosave|real browser Back and Forward|real browser Back stays|shell veto and setup save|a failed navigation save|a conflicting online revision|unsent assistant and new-role|direct hash navigation saves|failed direct hash navigation|unsent inputs block Home|local recovery storage failure' \
  --workers=2 --retries=0 --reporter=line,json
```

Full logs `/tmp/rr-stage1-final-{ci,lint-build,unit,backend,e2e}.log`; production audit `/tmp/rr-stage1-final-audit.json`; raw browser report `/tmp/rr-stage1-final-e2e.json`; network/device-exclusion summary `/tmp/rr-stage1-final-summary.json`; static bundle check `/tmp/rr-stage1-final-bundle.json`. Local artifacts are not committed as repository sources.

### Known stage-2 work

Under STAGE1 item 10, retain original thresholds and report accurately; not fixed in stage 1:

- **WP05:** mobile Owners `Jordan, Treas` + Enter leaves Escape bubbling to close entire Rail instead of suggestion list. Old force-click graph scenarios not run; full keyboard/accessibility certification pending. Seven existing exclusions distinguish mouse hover/drag from mobile touch; no new skips.
- **WP06:** extra `npm run words` exits 1, four routes exceed: Events all 614/420; Rules visible 324/170, all 1671/560; Team visible 138/130; redirected `/funding` all 614/160. No raised limits/report-only masking.
- **WP08:** full dev-inclusive `npm audit` exits 1: 17 (2 critical, 1 high, 13 moderate, 1 low); production remains 0. Dev declarations not upgraded, no audit ignore.

Stage 1 accepted; WP05/WP06/WP08 may start. WP10 whole-repository release certification, real mobile/Safari, online Deploy Preview, real AIR human acceptance unfinished. **0** real AIR calls, no push/merge to main. Local backup needs synchronization.
