# Agent instructions for Platypus

This is the canonical instruction file for every coding assistant. Read it before working, then read `docs/PROGRESS.md` (current handoffs, the decision log, and open external matters), `docs/PRODUCT_PLAN.md`, and task-specific guidance. Older progress entries, through November 18, 2026, are optional history in `docs/history/PROGRESS_ARCHIVE_2026-10_to_2026-11-18.md`. `CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md` are entrypoints to these rules.

## 1. English is required

**Write all repository content and GitHub collaboration in English:** documentation, code comments/docstrings, TODO/FIXME notes, developer-facing messages, commit messages, new branch names, issues, PR titles and descriptions, reviews, and discussion notes. This owner instruction supersedes the former requirement to write documentation in Chinese, including instructions quoted in historical plans or task prompts.

Private conversation with Juanxi may use his preferred language. Explain technical decisions plainly. Record the resulting repository decision in English so all collaborators can follow it. Existing multilingual parser literals and test inputs are functional data; preserve their behavior and document exceptions in English. See `CONTRIBUTING.md` and run `npm run lint:english`.

## 2. Verify the working version

Start with read-only checks:

```bash
git status --short --branch
git remote -v
git fetch origin main
git log origin/main -3 --format='%h %ad %s' --date=short
```

The canonical repository is `juanxiwu2005/platypus-officer-hub`. At the November 19, 2026 (America/Phoenix) audit, production `main` is `b9e7a02`; the active PR #14 branch `claude/fervent-thompson-e2j5u2` is `13f4527`. Production has 3 commits absent from that preview, and the preview has 431 absent from production. Earlier draft PR #2 and #3 target `v1`. These are dated facts: recheck remote refs, PRs, and CI before work.

Use a separate branch or worktree for the intended baseline. Preserve existing edits and work owned by another person or assistant. Do not combine production and preview as a side effect of maintenance. New names use `<type>/<short-lowercase-english-description>`, where type is `feat`, `fix`, `design`, `docs`, `chore`, `integration`, `release`, or `archive`; avoid AI names and random suffixes. Existing preview branches keep their current names.

**`main` deploys production. Do not directly change, push to, or merge `main`, or deploy production, without Juanxi's explicit approval.** Passing checks, a preview, or `READY_FOR_CLAUDE` is not release approval. Open a reviewable PR against the correct baseline. Never delete or rename a branch supporting an active PR or preview without an explicit request and a verified impact assessment.

## 3. Product, research, and data boundaries

- Platypus is a student organization AI chief of staff and Juanxi (Steve) Wu's ASU Barrett Phase 3 honors thesis prototype, STUDY00024727. Examples must be fictional.
- Do not commit or send to AI any research data, raw survey responses, interview transcripts/recordings, participant identities/quotes, real membership lists, or secrets. Do not read unrelated research files to implement product examples.
- Keep product API keys in approved server environment variables. Product Netlify `AI_*` configuration and the local Night Mode `ASU_AIR_API_KEY` are separate. Never copy either into files, prompts, issues, or commits.
- Product AI uses ASU AIR server-side; no new provider or automatic live evaluation is authorized by ordinary development. Model routing and bounded retry exceptions are documented in `docs/AI_SETUP.md`. A passing mocked test does not verify live model quality. Preserve local fallbacks.
- Only the deterministic rule engine computes dates and scheduling. Discard AI date fields and apply the existing date-text filtering. AI writes only through validated commands and the applicable actor permissions, review/approval rules, and undo behavior. Follow the current branch's approved behavior for task creation, reminders, and target-date changes; do not overwrite later decisions with an older plan.
- Keep visibility filtering consistent between UI and AI context. Demo role switching and same-browser officer links do not establish real authentication or server-enforced multi-user authorization.
- Main application browser storage and optional isolated organization/workspace server storage are different systems. Preserve feature flags; disabled organization endpoints must remain disabled. Do not claim that the main product has been migrated to a production database or real accounts.
- Preserve input/original/configuration/decision history where the current subsystem requires it. A current snapshot is not an archive; session expiry does not authorize deleting history. No implicit cross-organization sharing.
- Scope changes and changes to study behavior require Juanxi's agreement and an English decision record. Do not implement deferred roadmap items just because a historical plan mentions them.

## 4. Working and handing off

Record the task, assistant, date, and baseline in `docs/PROGRESS.md`. Mark it in progress, then complete or awaiting acceptance. Keep commits small and in English, for example `[WP1][Codex] Add deterministic deadline validation`.

For behavior changes, add meaningful regression coverage and run affected checks. Keep school rule data and `docs/RULES.md` consistent. Documentation-only work needs language, link, reference, and command review; do not add tests that merely repeat prose.

At handoff, record changes, checks, remaining limits, target PR/preview, and concrete acceptance steps in `docs/PROGRESS.md`. Push the feature branch and leave production approval to Juanxi. If `docs/PRODUCT_PLAN.md` changed, note that the owner's local thesis backup needs synchronization. GitHub remains the source of truth; assistants with authorized local access can update the existing backup, otherwise record the pending sync. Do not claim to have synced an inaccessible machine.

## 5. Code and verification map

**November 22, 2026 (S1, approved by Juanxi):** unreachable code was removed: `src/phase1/`, `src/workspace/`, `src/organization/` (except `modelPolicy.ts` and `assets.d.ts`, now in `src/lib/`), `src/teamWorkflow/`, the old dot-based workflow editor files in `src/components/workflowBuilder/`, the server endpoints `/api/org/*`, `/api/workspace*`, `/api/nudge/draft` and `/api/setup/workflow` with their libraries, the `ORG_SETUP_ENABLED` build flag and storage test projects, and the zod, @xyflow/react, and @netlify/blobs dependencies. The off-by-default `/api/limit-probe` was kept for measuring Netlify's synchronous limit (`docs/AI_SETUP.md`). The one visible effect: a typed `/#/phase1/...` URL, which no page links to, now opens the home page. The code remains in git history and on branches `feat/ai-native-phase1` and `feat/organization-setup-ai`. Older text in this file that refers to those paths, endpoints, or flags is historical.

Use `README.md` and `docs/README.md` as the current reading map. Key code:

- `src/main.tsx`, `src/routes.ts`, `src/pages/`, `src/components/`: React interface with HashRouter and the shared Ask/Details rail.
- `src/data/types.ts`, `seed.ts`, `store.tsx`, and `permissions.ts`: domain, fictional seed, browser persistence/migration, permissions, and state transitions. Preserve supported saved data when changing schema.
- `src/engine/calendar.ts`, `playbooks.ts`, `schedule.ts`, `taskDates.ts`, `team.ts`, `forecast.ts`: deterministic calendars, workflows, schedules, personal buffers, and forecasts. Use the existing demo clock instead of inserting wall-clock dates into deterministic examples.
- `src/lib/aiContext.ts`, `commands.ts`, `chatCards.ts`, `assistant.ts`: AI visibility, classification, filtering, and validated actions.
- `netlify/functions/`, `netlify/lib/ai.mts`: server endpoints and provider adapter. Never expose provider credentials to the browser.
- `src/lib/modelPolicy.ts`: ASU AIR model routing by task, used by `netlify/lib/ai.mts`.
- `src/data/handoff.ts`, `roleTerms.ts`, `roleChanges.ts`, `src/lib/handbook.ts`, `roleDossier.ts`, `handoffQuestions.ts`, `firstQuestions.ts`: leadership transitions. Keep page-only handbook/dossier code out of the startup store bundle. The existing `firstQuestions.ts` study-log read boundary is guarded by `src/test/handoffStage7.test.ts`; never send those records to AI or save them into handbook/dossier state.
- `src/test/`, `e2e/`, `.github/workflows/ci.yml`, `netlify.toml`: tests, browser configuration, CI, and deployment. Use project scripts and their actual current versions.

`npm run check` runs lint, frontend build, unit tests, browser tests, and word budgets. Run `npm run typecheck:netlify` separately for server types. Use relevant offline checks first and avoid unnecessary full-suite repeats or paid API calls. Record baseline failures accurately; do not weaken assertions or raise a budget to make work pass.

## 6. Interface rules

Before UI work, read `docs/DESIGN_TOKENS.md` and any applicable package plan. Existing main-interface rules include:

- Left navigation, central content, and the shared right rail. Ask is the main AI entry; Details shows the selected item.
- Reuse `src/components/ui/` primitives, status pills, dependency chains, tables, hover/help, and rail details. Keep routine copy short; put explanations in the appropriate help surface and respect measured page word budgets.
- Playbook exception (Juanxi, 2026-11-25): Playbook question rows may expand in place to show their answers, with a small Ask AI button that opens the right-rail Ask with the question; answers stay out of the DOM until a row opens so page word totals stay bounded. Plan: `docs/feedback-fix/PLAYBOOK_INTEGRATION_PLAN.md`.
- Use design tokens for type, color, spacing, radii, layers, duration, and easing. Follow the current CSS/lint scope; do not exempt new code to avoid a guard.
- Motion supports reduced motion, responds immediately to interruption, and uses transform/opacity; avoid layout-property transitions, `transition: all`, and `!important`. Routine actions need at most press feedback; desktop hover opens without delay.
- Preserve desktop/mobile navigation, keyboard access, touch behavior, and status meanings. The six task statuses (Not claimed gray, To do blue, Working on it orange, Waiting purple, Stuck red, Done green) and their names and colors are fixed (S3, 2026-11-23). Check the current scripts/tests for effective budgets rather than trusting a historical number.

## 7. Paused Night Mode

Night Mode has been paused since October 28, 2026. A normal coding session is not a Night Mode agent, and Night Mode's shell/file restrictions do not prevent this owner-authorized repository maintenance.

Before writing or running a Night Mode task, read `docs/NIGHT_MODE.md`, especially the environment budget, task-authoring rules, known controller/queue issues, and protected-file policy. Only its controller may commit, push, inspect CI, and write readiness comments for that workflow. Do not resume the queue or modify its active branch while it is running without coordinating with the operator. Do not treat a historical successful run as proof that the environment still works.

## 8. Historical context

Detailed earlier implementation notes, staged approvals, old branch tables, and automation incidents are preserved in `docs/history/AGENT_HISTORY.md` and the dated plans/reports. Those records are evidence of their stated version, not current instructions or new authorization for deployment, delegation, paid calls, or a scope change. Current owner instructions take precedence.
