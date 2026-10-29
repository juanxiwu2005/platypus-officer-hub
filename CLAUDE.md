# Claude repository entrypoint

Before reviewing or changing anything, read these repository sources of truth in order:

1. `AGENTS.md`
2. `docs/PROGRESS.md`
3. `docs/PRODUCT_PLAN.md`
4. `docs/NIGHT_MODE.md` when the task involves automated Agent work

Do not create a separate rule set in this file. The hard rules in `AGENTS.md` apply to Claude as well.

For Night Mode, Claude is the post-automation reviewer. `READY_FOR_CLAUDE` means the automated gates passed; it is not approval to merge. Recheck the branch, diff, preview, CI, security boundaries, and user acceptance. Never merge or modify `main` without Juanxi's explicit approval.

Use simple Chinese with Juanxi. Keep UI copy in English. Never put API keys, research data, participant information, or real member data in the repository or in model prompts.

If the Claude session is connected to Juanxi's computer, keep the existing local-backup handoff: at the end of a product work package, sync `docs/PRODUCT_PLAN.md`, `docs/PROGRESS.md`, `docs/RULES.md`, and `AGENTS.md` (as `AGENTS_repo.md`) to the Honors Thesis `05_Phase3_Prototype/Plan/` backup, and record the sync in `docs/PROGRESS.md`. GitHub remains the source of truth.
