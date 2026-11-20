# Phase I entrance -- restoration of core compacts, interactions, security and performance in parallel

## Full text for stage master

First phase of preparation for the launch of DP8 at GitHub repository `juanxiwu2005/platypus-officer-hub`. Using GPT-6.1 High; WP07 Use XHigh if available separately.

1. Read root catalogues `AGENTS.md`, `docs/release-readiness/README.md` and `docs/release-readiness/manifest.json`.
2. Read the six full work packages of the first phase in manifest: WP01, WP02, WP03, WP04, WP07, WP09. It is important not to rely on summaries that may be out of date in chatting.
3. Execute `git fetch origin` using only the latest `origin/integration/v1.0`. The report is complete and short, and validates that the approved baseline `7d84fa4` is its ancestors. It is prohibited to use, modify or transmit `main`.
4. Explicit use of multiagents: create six sub-agents, each responsible for only one work package. Create independent worktrees and branches for each agent:
   - `codex/rr-wp01-contract`
   - `codex/rr-wp02-events`
   - `codex/rr-wp03-tasks`
   - `codex/rr-wp04-setup`
   - `codex/rr-wp07-prod-security`
   - `codex/rr-wp09-performance`
5. Six worktrees must be created from the same latest remote SHA. Hand over the absolute path of worktree and corresponding work package files to each agent; They are prohibited from sharing root folders to modify files or intermege with each other.
6. The stage master does not modify the files for which they are responsible during the sub-agent's work. Sub-agent does not update `docs/PROGRESS.md` or send `main`.
7. Waiting for six things to finish. Reviews diff, submission of SHA, test evidence and work package standards. Revert original agent fixes when there is no evidence available or when the decomposition test has passed.
8. Creates a separate worktree from the latest `origin/integration/v1.0`, in the order of WP01 → WP02 → WP03 → WP04 → WP07 → WP09 The use of `ours/theirs` to cover conflict resolution as a whole is prohibited; Addressed on a case-by-case basis under the current product contract.
9. Each package runs its target test. When all are integrated, at least:
   - `npm ci`
   - Node 22Down `npm run lint`、`npm run build`、`npm test`
   - Playwright spec (desktop/mobile)
   - `npm audit --omit=dev`
   - bindle size check
   - `git diff --check`
10. Phase I does not require the early completion of WP05/WP06/WP08 and therefore do not allow them to be greened by tampering with a11y, Word Budget or developing audit standards; If so, so far as the record is concerned.
11. After the adoption of acceptance, the master agent adds a first stage Handoff record to `docs/PROGRESS.md` and creates a submission containing only necessary integration/document updates.
12. Before being pushed again, feel; `HEAD:integration/v1.0` can only be moved fast if the remote is still an integrated baseline or safe rebase. Never force push. If an unknown new submission or any stage fails, no semi-finished product is sent, branches are retained and reported.
13. Do not automatically call live Air. Closing Report: New Remote SHA, six work package timescales, test results, unresolved risks and whether phase II can be started.
