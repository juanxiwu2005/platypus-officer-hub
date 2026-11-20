> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Stage 3 entry — Final release certification

## Complete prompt for the stage lead agent

Execute DP 8 release-readiness Stage 3 in GitHub repository `juanxiwu2005/platypus-officer-hub`. Use GPT-6.1 XHigh.

1. Read `AGENTS.md`, release-readiness README, manifest, full WP 10 prompt, and previous two stages' handoffs in `docs/PROGRESS.md`.
2. `git fetch origin`; in a clean worktree, check out only latest `origin/integration/v1.0`. Report full/short SHA, confirm WP 01–WP 09 stage commits integrated. Do not use/modify `main`.
3. Strictly perform all WP 10 checks. Subagents may do read-only reviews/parallel test analysis, but one release-certification worktree owns final conclusions/fixes, avoiding renewed branch divergence.
4. Classify failures first: product defect, test drift, environment limit, external-service limit. Fix only first two. No skip, increased timeout, deleted assertions, weakened gates, force click, audit ignore.
5. For integration regressions, make minimal fixes/add regression tests on current certification branch, commit `[RR-WP10][Codex]`, rerun affected checks/full release gate.
6. No automatic live AIR. Prepare a manual live-AI smoke checklist for Juanxi on Deploy Preview 8, and explicitly state it was not automatically completed.
7. Only after every WP 10 hard gate passes, update `docs/PROGRESS.md` together, fetch to confirm remote unchanged, then fast-forward push `HEAD:integration/v1.0`. Never force push, push/merge main.
8. Final report must classify foundational logic, data architecture, frontend, backend, security, interaction, accessibility, performance, listing commands, counts, skip reasons, GitHub Checks, final remote SHA.
9. Conclusion may say only “may request Juanxi's approval to merge main” or “still not ready to merge”; this stage has no authority to merge main.
