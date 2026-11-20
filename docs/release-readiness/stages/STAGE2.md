> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Stage 2 entry — accessibility, word gates, toolchain security

## Complete stage-lead prompt

Execute DP8 release-readiness stage 2 in GitHub `juanxiwu2005/platypus-officer-hub`. Use GPT-6.1 High; XHigh allowed for complex major toolchain migrations.

1. Read `AGENTS.md`, release-readiness README, manifest, latest stage 1 handoff in `docs/PROGRESS.md`.
2. Read full stage 2 packages from manifest: WP05, WP06, WP08.
3. `git fetch origin`, use only latest `origin/integration/v1.0`, report full/short SHA. Verify all six stage 1 `[RR-WPxx]` packages integrated; if incomplete, stop/report, no guessed completion.
4. Create three subagents/independent worktrees/branches:
   - `codex/rr-wp05-a11y`
   - `codex/rr-wp06-words`
   - `codex/rr-wp08-toolchain`
5. All from same latest remote SHA. Each agent only its package, no `docs/PROGRESS.md`, other-branch merges, or `main`.
6. Wait/review each diff, commit, evidence. No fake results via disabled Axe, raised word/bundle limits, audit ignore, skip, timeout.
7. Independent integration worktree from latest remote, cherry-pick WP05 → WP06 → WP08; resolve conflicts individually, target tests after each.
8. After all integrated, at least:
   - `npm ci`
   - Node 22 `npm run lint`, `npm run build`, `npm test`
   - `npm run words`
   - `e2e/a11y.spec.ts` desktop/mobile
   - Rules/Events/smoke Playwright
   - `npm audit --omit=dev`, full `npm audit`
   - `git diff --check`
9. Stage lead centrally updates `docs/PROGRESS.md`: stage 2 commits, tests, audit, evidenced exceptions.
10. Fetch before push. Only safe fast-forward plus acceptance permits `HEAD:integration/v1.0`; never force-push/main push. On failure retain branch/report.
11. No real AIR. End with new remote SHA, three package commits, test results, readiness for WP10.
