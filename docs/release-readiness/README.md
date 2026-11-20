# DP8 Release of pre-repair plan

This directory is the original restoration task before `integration/v1.0` (Deploy Preview 8) entered `main`. It breaks down the 2026-10-31 audit findings into 10 work package that can be independently executed and accessible, and provides a three-stage portal.

## Automatically discover entrances

Any new Codex/ChhatGPT sessions should be read in the following order:

1. Repository Root Directory `AGENTS.md`
2. `docs/release-readiness/manifest.json`
3. Document for the current phase:
   - Phase I: `docs/release-readiness/stages/STAGE1.md`
   - Phase II: `docs/release-readiness/stages/STAGE2.md`
   - Phase III: `docs/release-readiness/stages/STAGE3.md`
4. Work package proposal listed in phase files

`manifest.json` is a machine readable index; The complete scope of the work package and criteria for acceptance are based only on the corresponding document under `work-packages/`.

## Stages and dependency

| Phase | Work package | Parallel |
| --- | --- | --- |
| 1 | WP01、WP02、WP03、WP04、WP07、WP09 | Six separate worktree parallels. |
| 2 | WP05、WP06、WP08 | After the first stage of integration, three worktree in parallel |
| 3 | WP10 | Single release authentication worktree |

Only `integration/v1.0` can be modified at all stages. `main` is Production and no agent can modify, push or send merge `main` without the specific approval of Juanxi alone.

## Common hard rules

- `git fetch origin`, with the latest `origin/integration/v1.0` as a baseline and short SHA.
- Do not overwrite GitHub facts with old worktree, old agent branch or chat memory.
- Parallel tasks must use different worktrees and different branches.
- It is prohibited to falsify green results with `skip`, `fixme`, delete assertions, blindly improve timeout, `force` click, raise the word/pack threshold or audit ignore.
- Do not automatically call live fee AIR; Live AI as manual step.
- Each work package produces only one clear-range submission, the test and `git diff --check` to execute the package requirements prior to submission.
- Sub-agent does not update `docs/PROGRESS.md`, is updated uniformly by phase masters after integration has been completed and avoids parallel conflicts.
- `origin/integration/v1.0` for fast-tracking only after the stage is adopted; In case of failure, the branch of work is retained and reported without semi-completed integration.
