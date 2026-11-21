# DP8 stage 2 integration acceptance

2026-11-01 (UTC). Final evidence after integrating three independent packages; source-branch counts, versions, bundle sizes in individual evidence are pre-integration records.

## Baseline, isolation, commits

First `git fetch origin`; default fetch refspec covered only default branch, so explicitly fetched `refs/heads/integration/v1.0:refs/remotes/origin/integration/v1.0`. Sole baseline latest remote **1975bc122f5823e033c29493a5d20ce84b85ec23 /1975bc1**. Ancestry checks confirmed all six stage 1 packages present:

| Stage 1 package | Integrated commit |
| --- | --- |
| WP01 | 2f3c922787fccf12ad4144e8d1c829c2486027c8 |
| WP02 | a653a4c290ed5c5d819e8bbfa1526030076ddc15 |
| WP03 | 7819d87c02fd89917dbc10ad2f25ae77a8b675dc |
| WP04 | f329ba68c6cadfa6fc7875d6e9c2638f574b7a16 |
| WP07 | 707eb195d1423557d622362d49cc0228f52ee129 |
| WP09 | 83a699521fac28fb4c4a597e7ef3b7abab3c8243 |

Read AGENTS, README, manifest, STAGE2, latest stage 1 handoff fully as required; discovered WP05/06/08 via manifest. Three subagents used independent worktrees, branches, source commits from same baseline, one commit/package; lead cherry-picked -x in fourth worktree, WP05 → WP06 → WP08.

| Package | Source branch/worktree | Independent source commit | Integration commit |
| --- | --- | --- | --- |
| WP05 | codex/rr-wp05-a11y / rr-wp05-a11y | a383c06738011b4ea5660d6e024ba5f8aff51038 | 76f3f2a3bbc131bdfecc9db49a4daf8ab1147ee7 |
| WP06 | codex/rr-wp06-words / rr-wp06-words | 4a23825e57e6f56067178f141ce96e5b6402414a | 817582daf44d7b1bd001e2e287ab868d5285dc1c |
| WP08 | codex/rr-wp08-toolchain / rr-wp08-toolchain | 85687dccfe10917f1eba849ef5aa5c45a8f56a60 | 5540c66bda560c2ab2826cae4e662b68b09922e6 |

Integration branch `codex/rr-stage2-integration`, worktree `rr-stage2-integration`. Only MetroChart conflict resolved line-by-line, retaining WP05 touch/keyboard distinction/focus management and WP06 on-demand tooltip/aria-describedby, never whole-file overwrite. Per-package verification: WP05 a11y/flow-edit/m2b 90 passed, 6 existing device exclusions; WP06 Rules/Events/wp5/smoke/word-budgets 62 passed, words passed; after WP08, full stage gates below.

Lead also found/fixed read-only Budget focus trap: candidate selection uses native :disabled (including disabled fieldsets), includes summary; Sam/Jordan bidirectional Tab/Escape covered desktop/mobile. Included in final WP05 source commit before reintegration.

Axe 4.14 exposed genuine brand/Handoff label-content-name-mismatch. Lead commits **ccaf517fd54cccd629927eba74e428c2eafe49c4** and **6e9be85292554cebd978b818e40c237f5bf31616** remove redundant aria-label overriding visible content, use native content names; brand adds text space, handoff card adds screen-reader “handbook” while retaining avatar/progress/stage. 6 brand checks passed: renamed organization, raw Axe, keyboard home navigation; 4 Handoff scan/full signing-flow checks passed, plus WP05 agent read-only review.

## Final gates

Environment: Node **v22.23.4**, `/usr/bin/chromium` (154). npm via `npm exec --yes --package=node@22 -- sh -c '…'`. Production build finished before browser start; no dist rebuild during tests. Original Playwright config unchanged, workers=2, retries=0.

| Gate | Final result |
| --- | --- |
| npm ci | Passed, 439 packages; lockfile matches independent source package |
| npm run lint | Passed; Stylelint, ESLint, plus 20 JSX/style samples, 4 existing exclusions, 66 matcher API assertions |
| npm run build | Passed; TypeScript/Vite, no bundle-threshold increase |
| npm test -- --maxWorkers=2 | 56 files / **809 passed**, 0 failed, 0 skip |
| npm run typecheck:netlify | Passed, strict retained |
| npm run words | All 9 actual routes passed; Funding redirects Events, duplicate alias removed, no threshold/counting changes |
| a11y desktop/mobile | **63 passed**, 3 existing device exclusions, 0 raw Axe violations (66 cases) |
| Stage target E2E | **350 passed / 10 existing device exclusions / 0 failed / 0 flaky / 0 retries**, 360 total, 4.6 minutes |
| npm audit --omit=dev | critical/high/moderate/low all 0 |
| Full npm audit | critical/high/moderate/low all 0 (baseline 17→0) |
| Playwright --list | **464 cases / 28 files**, baseline 440 cases / 27 files, no deleted tests |
| git diff --check | Passed |

Final word counts (visible/all, thresholds unchanged): Today 109/404, Events 149/171, Rules 50/166, Tasks 56/56, Team 129/259, Handoff 39/71, Partners 79/99, Settings 120/120, Help 442/442 (existing information-page allowance). All 64 original Rules sources remain accessible via search, categories, real pagination; new test traverses All/9 categories, 27 paginated views, widest 74/268, below 170/560. Event owner/status/three dates/rule sources retained in on-demand hover/focus cards/details, no CSS-hidden full text to game counts.

Final entry `index-NvA6n9JZ.js` **364,430 bytes**(local gzip 115,194), react-runtime **142,530**(gzip 45,815), two initial JS files total **506,960**. 500,000-byte gate applies to entry, total not misreported as entry. Rollup AST: entry statically references runtime only, runtime has no import/export-from back-reference. Actual desktop/mobile network attachments confirm only these two JS requests, no early PhaseOne/OnlineSetup/PDF. Retains lazy loading, visible loading, single main, polite status, direct access/refresh/Back/Forward, PDF implementation/worker requested only after choosing PDF.

Final matrix fully ran a11y, word-budgets, smoke, recovery, safety, m2b, bts, today, events, flow-edit, feel, touch, wp5, tasks, rehearsal, setup-team, workflow-setup, phase1, production-security, bundle-performance, bundle-organization-setup; also targeted organization-setup sources, real PDF/Word/TXT reading/archive, draft recovery/navigation/save failures/conflicts. Projects: desktop=162, mobile=162, desktop-storage=18, mobile-storage=18. All API calls offline mocks, 0 real paid AIR.

All 10 exclusions preexisting explicit device applicability: a11y 3 (desktop omits mobile full-page case, mobile omits 2 tablet cases), feel 2 (mobile omits hover/desktop focus), flow-edit 3 (mobile omits mouse drag/wide-layout links), touch 2 (desktop omits mobile touch). No new skip/fixme, deleted assertions, force clicks, timeout increases, Axe disable/filter, word/bundle-limit increase, audit ignore. Removed old flow-edit target-size filter.

Local `/tmp/rr-stage2-final-{lint-build,unit-backend,words,e2e}.log`, `final-e2e.json`, full/production audit JSON, bundle JSON, E2E inventory, browser network attachments retained. Failed runs retained too: new Axe brand issue; then 347 pass / 10 existing exclusions / 3 failed (Handoff desktop/mobile and one HTTP navigation error during concurrent rebuild). Fixed naming, stopped concurrent rebuild, reran entire suite; final conclusions use latest successful run only, no whole-stage pass from failure-only rerun. Mistyped nonexistent typecheck:backend returned Missing script; correct repository typecheck:netlify passed isolated/final reruns, command error never counted as success.

## Remaining risks/stage 3 conditions

- Three minimatch 11.0.3 overrides for ESLint, config-array, typescript-estree in WP08 are actual upgrades, not ignored vulnerabilities. Remove individually once upstream uses safe versions, rerun matcher comparisons/lint. Production dependency runtime versions unchanged, only two React type packages updated; two existing OpenTelemetry deprecation notices remain, audit 0.
- This is stage 2 target acceptance; full 464-case/four-project certification, fsck, secret/private-key scans, current GitHub Checks, real AIR manual smoke checklist belong to **WP10**. Some old storage graph tests excluded here still use force click; stage 3 must review/fix operability under no-shortcuts rules, not reuse forced passes.
- Local Chromium desktop/emulated mobile only; physical devices, Safari, online DP8 preview/deployment not newly accepted; no real AIR, no live-AI/final-release certification claim. Local backup needs synchronization.
- All stage 2 gates passed, ready for stage 3 WP10; not yet final release certification or merge-request conclusion. Fetch again before push; only if remote remains baseline and safe fast-forward, `git push origin HEAD:integration/v1.0`. Never use, modify, push, merge main or force-push.

## Reproduce final browser matrix

First complete `npm ci && npm run build` in Node 22; ensure no other process rebuilds dist during tests. Run below in Node 22 shell, official four-project config/existing timeouts:

```sh
CI=1 PW_CHROMIUM=/usr/bin/chromium npx playwright test \
  e2e/a11y.spec.ts e2e/word-budgets.spec.ts e2e/smoke.spec.ts \
  e2e/recovery.spec.ts e2e/safety.spec.ts e2e/m2b.spec.ts e2e/bts.spec.ts \
  e2e/today.spec.ts e2e/events.spec.ts e2e/flow-edit.spec.ts e2e/feel.spec.ts \
  e2e/touch.spec.ts e2e/wp5.spec.ts e2e/tasks.spec.ts e2e/rehearsal.spec.ts \
  e2e/setup-team.spec.ts e2e/workflow-setup.spec.ts e2e/phase1.spec.ts \
  e2e/production-security.spec.ts e2e/bundle-performance.spec.ts \
  e2e/bundle-organization-setup.spec.ts e2e/organization-setup.spec.ts \
  --grep '(a11y|word-budgets|smoke|recovery|safety|m2b|bts|today|events|flow-edit|feel|touch|wp5|tasks|rehearsal|setup-team|workflow-setup|phase1|production-security|bundle-performance|bundle-organization-setup)\.spec\.ts|source screen|reads and archives real|saved drafts resume|leaving within the autosave|real browser Back and Forward|real browser Back stays|shell veto and setup save|a failed navigation save|a conflicting online revision|unsent assistant and new-role|direct hash navigation saves|failed direct hash navigation|unsent inputs block Home|local recovery storage failure' \
  --workers=2 --retries=0 --reporter=line,json
```
