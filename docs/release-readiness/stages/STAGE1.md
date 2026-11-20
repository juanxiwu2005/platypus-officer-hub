> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Stage-1 entry — parallel core-contract, interaction, security, performance fixes

## Complete prompt for the stage lead agent

Execute DP8 release-readiness stage 1 in `juanxiwu2005/platypus-officer-hub`. Use GPT-6.1 High; WP07 XHigh if individually configurable.

1. Read root `AGENTS.md`, `docs/release-readiness/README.md`, `docs/release-readiness/manifest.json`.
2. Read all six complete stage-1 packages: WP01, WP02, WP03, WP04, WP07, WP09; do not rely on potentially stale chat summaries.
3. `git fetch origin`; use only latest `origin/integration/v1.0`. Report full/short SHA, verify audit baseline `7d84fa4` ancestor. Do not use/modify/push `main`.
4. Explicitly use six subagents, one package each, separate worktrees/branches:
   - `codex/rr-wp01-contract`
   - `codex/rr-wp02-events`
   - `codex/rr-wp03-tasks`
   - `codex/rr-wp04-setup`
   - `codex/rr-wp07-prod-security`
   - `codex/rr-wp09-performance`
5. All six from the same latest remote SHA; provide absolute worktree/package paths. No shared-root edits or mutual merges.
6. Lead does not edit agent-owned files while they work; subagents do not update `docs/PROGRESS.md` or push main.
7. Wait for all; review diffs/SHAs/test evidence/acceptance individually. Return missing evidence or weakened-test passes to original agent for correction.
8. Separate integration worktree from latest `origin/integration/v1.0`; cherry-pick WP01 → WP02 → WP03 → WP04 → WP07 → WP09. No blanket `ours/theirs`; resolve each conflict against current product contracts.
9. Run each package's targets after integration, then at least:
   - `npm ci`
   - Node 22 `npm run lint`, `npm run build`, `npm test`
   - Relevant desktop/mobile Playwright specs
   - `npm audit --omit=dev`
   - Bundle-size checks
   - `git diff --check`
10. WP05/WP06/WP08 need not finish early; do not alter a11y/word/dev-audit standards for false green. Report incidental passes accurately.
11. After acceptance, lead adds stage-1 `docs/PROGRESS.md` handoff and one commit containing necessary integration/docs only.
12. Fetch before push; fast-forward `HEAD:integration/v1.0` only if remote remains baseline or safe rebase is possible. Never force push. Unknown remote commits/any acceptance failure: retain branch and report, no unfinished push.
13. No automatic real AIR. Report new remote SHA, six package commits, tests, unresolved risks, whether stage 2 may start.
