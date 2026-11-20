# DP8 release-readiness repair plan

Canonical repair tasks before `integration/v1.0` (Deploy Preview 8) enters `main`. Splits 2026-10-31 review findings into 10 independently executable, verifiable packages and provides three stage entry points.

## Automatic discovery

Every new Codex/ChatGPT session reads, in order:

1. Repository-root `AGENTS.md`
2. `docs/release-readiness/manifest.json`
3. Current stage:
   - Stage 1: `docs/release-readiness/stages/STAGE1.md`
   - Stage 2: `docs/release-readiness/stages/STAGE2.md`
   - Stage 3: `docs/release-readiness/stages/STAGE3.md`
4. Package prompts listed by stage

`manifest.json` is the machine-readable index; full package scope/acceptance criteria come only from corresponding `work-packages/` files.

## Stages/dependencies

| Stage | Packages | Parallel work |
| --- | --- | --- |
| 1 | WP01, WP02, WP03, WP04, WP07, WP09 | Six isolated worktrees |
| 2 | WP05, WP06, WP08 | Three isolated worktrees after stage 1 integration |
| 3 | WP10 | One release-certification worktree |

All stages may modify only `integration/v1.0`. `main` is Production; no agent may modify, push, merge `main` without Juanxi's separate explicit approval.

## Shared hard rules

- Start with `git fetch origin`, latest `origin/integration/v1.0` baseline, report short SHA.
- Do not override GitHub facts with old worktrees, agent branches, chat memory.
- Parallel tasks require distinct worktrees/branches.
- Never manufacture green results through `skip`, `fixme`, deleted assertions, blind timeout increases, `force` click, raised word/bundle limits, audit ignore.
- No automatic real paid AIR calls; real AI acceptance remains manual.
- One clearly scoped commit per package; run required tests and `git diff --check` before commit.
- Subagents do not update `docs/PROGRESS.md`; lead updates centrally after integration to avoid conflicts.
- Lead may fast-forward push `origin/integration/v1.0` only after stage acceptance; on failure retain branch/report, never push partial integration.
