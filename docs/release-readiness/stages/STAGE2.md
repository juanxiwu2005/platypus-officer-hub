# Second stage entrance - accessibility, word-barrel and tool chain security

## Full text for stage master

Second phase of preparation for the launch of DP8 at GitHub repository `juanxiwu2005/platypus-officer-hub`. Using GPT-6.1 High; XHigh can be used when the large version of the tool chain is complex.

1. Read `AGENTS.md`, release-readines README, manifest and the latest handoff of phase I at `docs/PROGRESS.md`.
2. Read the three full work packages of the second stage of a manifest: WP05, WP06, WP08.
3. `git fetch origin`, reporting complete/short SHA using only the latest `origin/integration/v1.0`. Confirms that the first six `[RR-WPxx]` work package has been integrated; If incomplete, stop and report without speculation.
4. Creates three sub-agents and three separate worktrees:
   - `codex/rr-wp05-a11y`
   - `codex/rr-wp06-words`
   - `codex/rr-wp08-toolchain`
5. Three worktrees were created from the same latest remote SHA. Each agent executes only the corresponding work package, does not update `docs/PROGRESS.md`, does not update other branches and does not use `main`.
6. Wait for and review the diff, committee and acceptance evidence. It is prohibited to falsify results by banning Axe, increasing word/package limits, audit ignore, kip or timeout.
7. Create an independent integrated worktree from the most recent remote, in the order of WP05 → WP06 → WP08 chrry-nick; Conflict resolution on a case-by-case basis and running target testing after each package.
8. When all are integrated, at least:
   - `npm ci`
   - Node 22Down `npm run lint`、`npm run build`、`npm test`
   - `npm run words`
   - `e2e/a11y.spec.ts` desktop/mobile
   - Rules/Events/smoke related Playwright
   - `npm audit --omit=dev` and Complete `npm audit`
   - `git diff --check`
9. `docs/PROGRESS.md` is updated centrally by the master of the phase, which records the second stage of submission, testing, audit results and any justified exceptions.
10. Put it out front, fetch. Only `HEAD:integration/v1.0` can be sent when safe and fast progress is passed; Never force push, never push. Keep branch and report when failure occurs.
11. Don't call live Air. At the end, report on a new remote SHA, three packages, test results and whether conditions for entering WP10 are in place.
