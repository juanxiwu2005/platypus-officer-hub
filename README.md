# Platypus Officer Hub

Platypus is a team AI chief of staff for student organizations and the Phase 3 prototype for Juanxi (Steve) Wu's ASU Barrett honors thesis (STUDY00024727). It helps officers plan events, follow dependencies, update tasks, and retain knowledge during leadership transitions.

> **English is the repository's working language.** Write documentation, code comments, commit messages, issues, pull requests, reviews, and GitHub discussion notes in English. See [Contributing](CONTRIBUTING.md). A private conversation with Juanxi may follow his preferred language; the resulting repository record must be in English.

## Start here

1. [Documentation index](docs/README.md): find the current guidance and historical evidence.
2. [Technical co-founder onboarding](docs/TECHNICAL_COFOUNDER_ONBOARDING.md): architecture, limitations, responsibilities, and a proposed first month.
3. [Contributor guide](CONTRIBUTING.md): local development, English policy, and review requirements.
4. [Agent instructions](AGENTS.md): shared rules for every coding assistant.
5. [Progress and decisions](docs/PROGRESS.md) and [approved product plan](docs/PRODUCT_PLAN.md): implementation history and scope.

## Production and active development

Verified on November 19, 2026 (America/Phoenix). Recheck GitHub before starting work.

| Version | Baseline | Purpose |
| --- | --- | --- |
| Production | `main` at `b9e7a02` | [Live prototype](https://platypus-officer-hub.netlify.app), including the November 15 server output-budget fix |
| Active preview | [PR #14](https://github.com/juanxiwu2005/platypus-officer-hub/pull/14), `claude/fervent-thompson-e2j5u2` at `13f4527` | [Preview 14](https://deploy-preview-14--platypus-officer-hub.netlify.app); workflow milestones, task details, reminders, and onboarding changes awaiting acceptance |
| Earlier prototypes | Draft [PR #2](https://github.com/juanxiwu2005/platypus-officer-hub/pull/2) and [PR #3](https://github.com/juanxiwu2005/platypus-officer-hub/pull/3), targeting `v1` | Earlier Phase 1 and Organization Setup previews; these are not the production baseline |

At this snapshot, `main` has 3 commits absent from PR #14, and PR #14 has 431 commits absent from `main`. Compare patches before integration, including the server output-budget fix; commit counts alone do not establish missing behavior because changes can exist under different commits. Do not describe preview functionality as released. Historical test counts apply only to their recorded revision.

`main` is the production branch. Work on a descriptive feature branch and open a pull request. **Merging or deploying requires Juanxi's explicit approval.** Preserve existing preview branches and PR numbers.

## Run locally

Use Node.js 22.13+ within Node 22, or Node 24+. CI and Netlify use Node 22. A normal Vite session uses local fallback behavior for server APIs; live Netlify Functions and real AI need separately configured server infrastructure.

```bash
npm ci
npm run dev
```

```bash
npm run lint
npm run build
npm run typecheck:netlify
npm test
npm run e2e
npm run words
npm run check
```

For the first browser-test run, install Chromium with `npx playwright install chromium`, or set `PW_CHROMIUM` to an installed compatible Chromium binary. `npm run check` runs lint, build, unit tests, browser tests, and word budgets. Server type checking is a separate command. See [AI setup](docs/AI_SETUP.md) for configuration names; never commit credentials. Offline checks do not establish live model quality.

## Code map

| Location | Responsibility |
| --- | --- |
| `src/pages/`, `src/components/` | Main React interface and shared right-side Ask/Details rail |
| `src/data/` | Domain types, demo state, permissions, migrations, and state transitions |
| `src/engine/` | Deterministic scheduling, school calendars, dependencies, and forecasts |
| `src/lib/` | Browser helpers, AI context filtering, commands, and handoff logic |
| `netlify/functions/`, `netlify/lib/` | Server APIs, AI adapters, and optional isolated workspace storage |
| `src/organization/`, `src/workspace/`, `src/phase1/` | Separate organization/workspace experiments; check their feature flags and documentation |
| `src/test/`, `e2e/` | Unit/component tests and desktop/mobile browser tests |
| `docs/` | Plans, operating guidance, acceptance evidence, and historical records |
| `.github/` | CI, contribution templates, and Copilot entrypoint |

The main prototype stores its organization state in browser storage. Optional server workspace storage is a separate feature, disabled by default; it does not establish production accounts or shared multi-user persistence. Demo officer links are not cross-device authentication.

## Product boundaries

- Use fictional demonstration data. Keep research records, participant information, real membership lists, and secrets out of the repository and AI prompts.
- Dates and scheduling come from the deterministic rule engine; AI proposals pass through validated commands and the applicable approval gates.
- Product AI uses server-side ASU AIR configuration. Do not add a new provider or spend live AI quota for routine verification.
- Changes during Phase 3 must preserve the study's documented behavior and record any approved differences.
- Night Mode has been paused since October 28. Its controller and [runbook](docs/NIGHT_MODE.md) remain historical operating material; review the known issues before any restart.
