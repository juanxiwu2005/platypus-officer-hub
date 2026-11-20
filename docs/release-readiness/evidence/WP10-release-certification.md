# DP8 Phase III. Final release of the certification

2026-10-31（America/Phoenix；The implementing environment is 2026-11-01 UTC. This report certifies only the release of integration/v1. 0; Live AI Manual Results are listed separately.

## Baseline and scope

Execute `git fetch origin` first. The original refspec track only the default branch, so perform `git fetch origin refs/heads/integration/v1.0:refs/remotes/origin/integration/v1.0` in a more visible way. Create a new, clean worktree `dp8-stage3-certification-20261101` from the far side; The start-up complete IS **1e19af560daaf9ca10ee40670877c5c1b41665d8**, short SHA **1e19af5**, HEAD equals orogen/integration/v1. 0. The working branch is `release/dp8-final-certification`.

Read the last two phases of AGENTS, release-readines README, manifest, STAGE3, WP10 and PROGRESS in full order; Reconciling two stages of evidence. Execute `git merge-base --is-ancestor <commit> HEAD` for each of the following nine items and withdraw from 0:

| Bag. | Submitted as integrated |
| --- | --- |
| WP01 | 2f3c922787fccf12ad4144e8d1c829c2486027c8 |
| WP02 | a653a4c290ed5c5d819e8bbfa1526030076ddc15 |
| WP03 | 7819d87c02fd89917dbc10ad2f25ae77a8b675dc |
| WP04 | f329ba68c6cadfa6fc7875d6e9c2638f574b7a16 |
| WP05 | 76f3f2a3bbc131bdfecc9db49a4daf8ab1147ee7 |
| WP06 | 817582daf44d7b1bd001e2e287ab868d5285dc1c |
| WP07 | 707eb195d1423557d622362d49cc0228f52ee129 |
| WP08 | 5540c66bda560c2ab2826cae4e662b68b09922e6 |
| WP09 | 83a699521fac28fb4c4a597e7ef3b7abab3c8243 |

This package amends only five mandatory hits in two old version tests: sharing `clickCurve` to find a shot-in position on the live SVG curve, normal click to keep Playwright operational check and to assert that it is selected. The reporting relationship test first drags to the parent ' s node to establish a relationship and then drags back to the blank position, adding new relationships without any further assertions, and subsequently retains reconnecting, deleting, significant Fields, circular rejections and Undo checks. No product behaviour changes, no affirmations, timeout additions, force click, liberalization of thresholds or new skip were deleted.

A read-only agent is responsible for analysing and reviewing the above test changes; All file changes, repeats and final submission are certified worktree.

## Outcomes by category

| Category | Evidence and boundaries |
| --- | --- |
| Bottom logic | Node 22 unit tests 56 files/ 809 were adopted, containing date engines, v2 workflows, missions, forecasts, AI date filtering and task status; The model date was not used as the basis for Scheduling.  |
| Data | The complete four-project matrix covers general local presentations and visual start-up simulation structure; Includes saving/recovering, 409 conflicts, non-covering unsaved content, archiving, approval of snapshots, export and CRM visibility. Test using field data and simulation API; The hidden server is not stored as an official multi-person database.  |
| Frontend | Stylelint, ESLint, TypeScript/Vite Build, nine practical ways through Words; Keep Router reoriented, abnormally restored, page as required and moving.  |
| Backend | `npm run typecheck:netlify` Adopted; `tsc --showConfig -p tsconfig.netlify.json` Confirms rule=true over 18 Operations and 15 backend library files.  |
| Security | Production/complete audit 0 leaks; Gitleaks scans the current source file and HEAD up to 267 historical submissions, except for public localStoreage misreported in the following section; Additional private key tag check is 0. Keeps input size, white list, internal redirection and hidden endpoint boundaries.  |
| Interactive | The actual mouse/keyboard/touch screens, forms, budgets, Owner selection, Escape, menus, Undo, Reset, refresh and reset/delete are checked. Five historical forced clicks removed.  |
| Accessibility | Full matrix execution Axe With keyboard scenes，Includes normal/Read-only Budget Focus、All phones on screen. Rail、Flatbed、Name of brand and manual、Lazy load. status。a11y.spec.ts Yes. 63 Through / 3 Exclusion of existing equipment，Original Axe Infringement As 0；Other figures/Lazy load./Set accessibility check to do the same.。Original Axe Infractions are not filtered。 |
| Performance | Main entrance 364,430 bytes (gzip 115,194), below 500,000; React rantime 142,530 (gzip 45,815), front page JS total 506,960. AST confirms that the entrance is static only with reference to rantime, runtime and no rebuttal for import/export-from. Browser check not to request PhaseOne/OnlineSetup/PDF for the first time, select PDF before requesting implementation and worker; No change to the package threshold.  |
| Test and CI | The final complete four projects 451 by / 13 failed / 0 / 0 flaky / 0 retry; 28 files, 464 items, 6.1 minutes. For the current remote Checks see next section.  |
| Live AI manual | **Not implemented, 0 live fee AIR call**. [ DP8 manual list ](WP10-ai-smoke-checklist.md) has been provided to distinguish live model responses, local routes, simulations and fallback; Do not treat offline results as live AI quality authentication.  |

## Execute command and complete lockdown

Environment: Node **v22. 23.4**, Chromium `/usr/bin/chromium`. All npm/ Playwright commands are executed through `npm exec --yes --package=node@22 -- sh -c '…'`. The browser is activated after completion of the production construction and is not reconstructed during operation; Use formal playwright.config.ts to specify only workers=2, records=0 and log reporter.

| Command / Check | Final result |
| --- | --- |
| `npm ci` | Adopted, 439 packages; No change to package.json/lockfile.  |
| `npm run lint` | Adopted; Includes 20 JSX/style sample, 4 original exclusion and 66 matcher check.  |
| `npm run build` | Adopted; TypeScript/Vite, production source maps off.  |
| `npm test -- --maxWorkers=2` | 56 File/ 809 passed, 0 failed, 0skip.  |
| `npm run typecheck:netlify` | Pass, block reserves.  |
| `PW_CHROMIUM=/usr/bin/chromium npm run words` | All live route passes, as detailed in the table below.  |
| `CI=1 PW_CHROMIUM=/usr/bin/chromium PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/rr-stage3-final-e2e.json npx playwright test --workers=2 --retries=0 --reporter=line,json` | **451 Failed by excluding / 13 equipment / 0 / 0 flaky / 0 retesting**, 28 files / 464, 363.9 seconds.  |
| `npm audit --omit=dev` / `npm audit` | Both are 0 for information/low/moderate/ high/critical/total.  |
| `git diff --check HEAD` | Adopted; Final submission and subsequent review.  |
| `git fsck --no-reflogs --connectivity-only` | Pass, exit 0.  |
| Gitleaks 8.24.3/ private-key scan | See the original results and findings in the following section.  |
| Build volume / AST / live first load | (a) Static inspection pass; Live network check is contained in two specs of the complete matrix.  |

| Words Route | visible / all | Unchanged threshold |
| --- | --- | --- |
| Today | 109 / 404 | 160 / 450 |
| Events | 149 / 171 | 180 / 420 |
| Rules | 50 / 166 | 170 / 560 |
| Tasks | 56 / 56 | 130 / 130 |
| Team | 129 / 259 | 130 / 290 |
| Handoff | 39 / 71 | 120 / 120 |
| Partners | 79 / 99 | 120 / 120 |
| Settings | 120 / 120 | 150 / 150 |
| Help | 442 / 442 | Original message page width 9999/ 9999 |

Funding is the reorientation of Events, continuing WP06 with only one-time statistics.

## Scret/ private-key scan original results

- `gitleaks git --log-opts=HEAD --redact --report-format json …`: 267 can be submitted by approximately 5.19 MB, original **1 warning and withdrawal from 1**.
- `gitleaks dir … --redact --report-format json …` after exporting the current source file using `git ls-files --cached --others --exclude-standard`: original **1 alerts and exits 1**. The unscanned third-party packages or construction products to mix irrelevant test evidence.
- Both are `generic-api-key` erroneously reported to the public `LOG_KEY` constant (value `platypus.v1.log`). The historical location is `d1e80c72cfebc193432b4e82ddfb90f832243df2:src/data/store.tsx:250`; Currently is line 442 of this document. The context is clearly used only for reading and writing the localStorage interactive log, not as API support or private key. The **confirmed leak is 0**; Do not pretend to be the original zero alarm for scanners, or add ignore/allowlist or rewrite history.
- Check extra `BEGIN … PRIVATE KEY` tags per source file, resulting in 0. Scanning output allergies; There is no environment secret or output document to read.

## Failed classification and uncertified part

The target map test 3 failed after the first forced click replacement / 2 with the original exclusion / 1 because the test placed two nodes in exactly the same position, and the link had no hits; Classify as old test steps drifting. Target matrix after adding live move back to the blanks and relationship no change **4Adopted / 2Original exclusion / 0Failed**。 (b) Rerun the Lint/Build/unit/strict/words/types audit and complete four project doors; Keeps failed rotation logs.

No live Air generation, physical equipment/Safari, manual on-line operation, rules source text manual review or Phase 3 study acceptance; These cannot be replaced by chromium simulation or mock. Netlify access protection was not closed, nor was online server storage enabled.

All local hard doors have passed; Allow normal `HEAD:integration/v1.0` fast-forwards after the feed confirms that the remote is not moving. This package is submitted using a `[RR-WP10][Codex]` and contains test amendments, authentication reports, manual lists and harmonized handoff. The remote final complete SHA and the pushed Checks state is given by the main agent in the final chat report and verified that the workspace is clean and the HEAD is consistent with the latest orgin/integration/v1. 0; This document does not advance the claim for adoption of the uncompleted remote CI.

Main is undetected, modified, pushed or merged; No force push. Could not close temporary folder: %s

## Four projects, exclusion of reasons and Checks snapshot

| Item | Passed | Existing equipment conditions excluded | Failed/Retry |
| --- | ---: | ---: | ---: |
| desktop | 169 | 3 | 0 / 0 |
| mobile | 165 | 7 | 0 / 0 |
| desktop-storage | 60 | 0 | 0 / 0 |
| mobile-storage | 57 | 3 | 0 / 0 |
| Total | 451 | 13 | 0 / 0 |

13 exclusions already exist in the baseline and no new or modified package:

- a11y 3: desktop does not run the full screen of cell phones
- feel 2: The cell does not repeat the mouse over and desktop Ask focus style.
- Slow-edit 3: The mobile phone does not perform mouse drag and wide layout connections; Touch screen/keyboard path is also overwrite.
- Touch 2: Desktop does not perform mobile phone touch behavior.
- (a) orniation-setup 3: mobile-storage does not repeat the desktop extra sidebar history entry with two mouse links/retakes; Normal Back/Forward, selections and accessibility connections run in both dimensions.

GitHub Checks for reading baseline `1e19af560daaf9ca10ee40670877c5c1b41665d8`: Netlify deploy-preview **access**; [ CI #205 ](https://github.com/juanxiwu2005/platypus-officer-hub/actions/runs/41261214605) **in_progress**, step npm ci/lint/build/unit/ browser installed with access, E2E is still active. The local successful or old submission cannot be marked as the final new submission of CI successfully; A new SHA has to be retraced after the push.

## Log & Recover attachment

`/tmp/rr-stage3-ci.log`, `/tmp/rr-stage3-final-gates.log`, `/tmp/rr-stage3-final-e2e.log`, `/tmp/rr-stage3-final-e2e.json`, `/tmp/rr-stage3-final-summary.json`, `/tmp/rr-stage3-audit-{production,full}.json`, `/tmp/rr-stage3-bundle.json`, `/tmp/rr-stage3-fsck.log`, `/tmp/rr-stage3-secrets-{current,history}.{json,log}`, `/tmp/rr-stage3-private-keys.json`. For the first time, the curve failed and for the successful rounds. `/tmp/rr-stage3-curves*`and `/tmp/rr-stage3-curves-final*`。 The browser tracks/ network-by-line attachment at worktree `test-results/`, and these generated files are not submitted to the source code.

Desktop/Cell Phone Intical-Network.json only requests entrances and two JSs for 506,960 bytes; PDF late loads and two schedule drawing attachments are kept with the complete matrix. Max 437,615 bytes, source cap 0 of the production catalogue 33 jS chink; PDF worker is a stand-alone mjs resource that has been selected for loading and does not duplicate the main entry.
