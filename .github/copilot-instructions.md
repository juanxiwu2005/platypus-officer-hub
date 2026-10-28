# Platypus Copilot instructions

Read `AGENTS.md` first; it is the canonical instruction file for every AI. Then read `docs/PROGRESS.md` and the relevant sections of `docs/PRODUCT_PLAN.md`. If the task is part of Night Mode, also read `docs/NIGHT_MODE.md` and `.nightmode/TASK.md`.

- Never work directly on, push to, or merge `main` without Juanxi's explicit approval.
- Never add secrets, `.env` contents, research data, participant information, or real member data.
- Use fictional demo data only.
- Preserve deterministic date calculations and human approval gates for consequential AI changes.
- Add tests for behavior changes; do not weaken existing assertions to make checks pass.
- Keep UI text in English and repository documentation in Chinese.
- Treat `READY_FOR_CLAUDE` as an automated-gate result, not permission to merge or deploy.

Do not duplicate the full project rules here. If this file conflicts with `AGENTS.md`, follow `AGENTS.md` and flag the conflict.
