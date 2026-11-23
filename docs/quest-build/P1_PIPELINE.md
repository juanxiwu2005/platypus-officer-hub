# P1: guarded Quest pipeline

Maintainer changes authorized by Juanxi on November 22, 2026. This supersedes the dated legacy runtime instructions for the new Quest branch only. The old queue remains paused. P0-01–07 and their 33-rule library are preserved.

## Prepare and run one card

1. A maintainer prepares an exact card, `pipeline.json`, and matching project `opencode.json` read/edit/command permissions. Commit these maintenance files before starting. Agents cannot change them.
2. Use Node 22 with dependencies already installed, authenticated GitHub CLI and OpenCode on PATH. Keep the worktree clean. An open Draft PR must match the approved feature branch and `main` base.
3. Run `node --test scripts/night-mode.test.mjs` and `bash -n scripts/night-queue.sh`.
4. Run `node scripts/night-mode.mjs --doctor`.
5. Run `node scripts/night-mode.mjs`. To select another approved manifest, pass `--config <repository-relative-file>` to both commands.

The committed sample manifest approves one test-only card: add coverage for missing/blank handbook section labels. It explicitly lists local pipeline regressions, quest tests, frontend TypeScript and complete lint. These focused local checks are appropriate for this source-data test; the full existing GitHub CI (check, all six browser shards and e2e-result) remains mandatory. For a broader card, use `checks: [["npm", "run", "check"]]` and the applicable additional checks. Do not remove failed assertions or omit an affected check.

Each role gets one verified repository-bound OpenCode session, an explicit exact model override and a 20-minute watchdog. At most three local coding/check/review cycles run. Actual failed output is supplied for repair. CI registration waits up to 30 minutes for the exact source SHA; a CI failure or timeout stops with its own evidence rather than feeding an old successful run back as a code defect.

## Fixed failure classes

| Previous failure | Current behavior | Regression evidence |
| --- | --- | --- |
| Large generic document preamble | Only the short brief, exact card and listed source/test files; card and complete diff are inline | Prompt inspection and real run evidence |
| Hard-coded legacy branch | Manifest selects a guarded feature branch; main, detached and old paused branch are rejected | Branch/config tests |
| Alternate execute entrypoint | Default deny; verify effective wildcard-action rules for coder and critic, including inherited resource patterns | Permission and extra-grant rejection tests |
| CLI silently selects outer workspace | Create session by API with explicit repository location; verify role/model/location before and after each run | Wrong-location/model/role tests and live metadata |
| New files and earlier commits omitted from review | Intent-to-add allowed files, then diff from immutable run baseline through current worktree; verify unchanged reviewed bytes before commit | Real temporary-Git complete-diff test |
| Critic cannot read patch file | Entire diff is inline; scoped optional source reads only; critic has no shell or edit permissions | Fixture integration and live review |
| Old/no checks misreported | Wait for registration, ignore other SHAs, inspect required jobs on the exact run; retrieve failure logs only from that run | CI state and fixture registration-delay tests |
| Commit plus remaining dirty work contaminates queue | Save remaining dirty work on a fresh WIP branch even after a commit; stop subsequent tasks when a controller commit is unverified | Real Git recovery tests |
| macOS Bash 3.2 variable behavior | Minimal Bash entrypoint delegates queue logic to Node; no legacy variable interpolation | Native Bash 3.2 syntax/help checks |

## Evidence and publication

Every controller step is immediately appended to Git-ignored `.nightmode/runs/<timestamp>/events.jsonl`. Prompts, raw JSON events, actual model/location/token/time summaries, check output, complete diff and exact-SHA CI receipt live beside it. Keep tracked `TRIAL_LOG.md` unchanged during the run so it cannot enter the worker diff or violate the clean-tree gate. The maintainer imports the full journal into TRIAL_LOG afterward and copies evidence to the local deliverable folder.

Only the controller stages approved task files and publishes a normal feature-branch commit. Push rejection stops without force-push or an automatic rebase; retain the reviewed commit for maintainer triage. The ready note is saved locally; no GitHub comment is sent automatically. A Draft PR and passing CI are proposals for human review, never adoption, merge or production-deployment approval.

## Queue boundaries

`bash scripts/night-queue.sh` consumes only JSON manifests from the new `.nightmode/quest-queue` directory, never the legacy Markdown queue. Optional `dependsOn` lists manifest filenames. Every manifest needs matching maintainer-prepared permissions and all controller gates. The queue does not grant broader permissions or infer missing task scope. Queue and controller locks prevent concurrent instances. Pre-existing dirty files stop before execution; failed-task WIP is preserved without reset, clean, force-branch replacement or deletion. A failed task with controller commits stops the queue after preserving remaining work.

## Remaining scope

No dependency, GitHub Actions, product UI, date engine, real user data or production configuration change is needed. The Node pipeline regressions run locally as an authoritative controller check; the existing CI workflow continues its complete application suite. Future storyboard/game decisions remain gated by HANDOFF. User-level OpenCode defaults are unchanged. Thesis backup synchronization remains pending.

## Verified live result — November 22, 2026

Draft PR [#19](https://github.com/juanxiwu2005/platypus-officer-hub/pull/19); repair commit `9b2a69b`; live card commit `a9bee777823e00b7c34403bb24ae810ce034c4a1`. Doctor passed 341 permission assertions. Fifteen pipeline regressions and six quest tests passed, plus frontend types and full lint. GLM 5.3 completed in 188.97 seconds; DeepSeek APPROVED in 146.64 seconds. One cycle, no repairs, denied requests or timeouts. The controller committed/pushed the new test and verified all eight existing CI jobs on its exact SHA ([run](https://github.com/juanxiwu2005/platypus-officer-hub/actions/runs/45059244617)). Isolated missing-handbook-label verification fails only the new test. Original rule data and all five earlier tests remain byte-identical. Main and user-level defaults are unchanged; owner acceptance and thesis backup synchronization remain pending.
