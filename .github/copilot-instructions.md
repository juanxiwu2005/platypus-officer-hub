# Platypus Copilot instructions

Read `AGENTS.md` first, then `docs/PROGRESS.md` and relevant product-plan sections. These are the shared sources of truth; this file is an entrypoint.

- **Write all repository content and GitHub collaboration in English**, including documentation, code comments, TODOs, commits, issues, PRs, reviews, and discussion notes. The earlier Chinese-documentation policy is superseded. See `CONTRIBUTING.md`.
- Preserve functional multilingual parser/test data and explain exceptions in English.
- Never directly modify, push to, merge, or deploy `main` without Juanxi's explicit approval.
- Use fictional examples. Never add secrets, `.env` contents, research records, participant information, or real membership lists.
- Preserve deterministic scheduling, visibility filtering, and applicable human approval gates.
- Add meaningful tests for changed behavior; do not weaken guards or raise budgets to obtain a passing result.
- Treat `READY_FOR_CLAUDE` as a check result, not release approval. Read `docs/NIGHT_MODE.md` for automation work; Night Mode is paused.

If an older file conflicts with the current English policy or `AGENTS.md`, follow the current rule and record the conflict in English.
