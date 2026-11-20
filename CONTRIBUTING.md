# Contributing to Platypus

## English working language

All repository and GitHub collaboration content must be written in English: documentation, comments and docstrings, TODO/FIXME notes, developer-facing messages, commit messages, branch names, issue and PR titles/descriptions, review comments, and discussions. This rule applies to people and every AI assistant.

Translate the substance of a decision made in another language into English before recording it. Use plain language, state what changed and why, and include relevant verification. Private conversations with Juanxi can follow his preferred language.

Keep non-English text only when the text itself is required functional data, such as a multilingual input fixture or a parser expression. Explain the reason in English. The language check permits only the exact, counted lines recorded in `scripts/english-exceptions.json`; a new exception needs review. Do not translate user input, alter parser behavior, or remove multilingual test coverage to satisfy a documentation rule.

`npm run lint:english` detects Chinese, Japanese, Korean, Cyrillic, Arabic, and Hebrew script text outside those exceptions. It is a script check, not proof of English: reviewers must also check prose written in other Latin-script languages. It scans tracked text files and skips binary files; text inside images and older Git commits is outside this check.

## Before changing files

1. Read `AGENTS.md`, `docs/PROGRESS.md`, and the relevant product plan.
2. Check `git status --short --branch` and the remote. Preserve someone else's edits.
3. Fetch and branch from the intended baseline. Production and PR #14 are different versions; do not merge them as part of unrelated maintenance.
4. Use `<type>/<short-english-description>`, such as `docs/technical-onboarding` or `fix/task-date-validation`. Keep existing preview branches intact.

Do not push directly to `main`. Open a PR against the version you changed. Merge and production deployment require Juanxi's explicit approval; a successful CI run or preview is not that approval.

## Development and checks

Use the Node version documented in the README, then run `npm ci` and `npm run dev`. The Vite server does not run the Netlify Functions backend by itself. Configure a separate local or deployed backend only when the task requires it. Secrets belong in approved environment variables.

Run checks appropriate to the change. For code changes use lint, frontend/server type checking and build, then relevant offline unit/component tests. Run affected browser scenarios for interface changes. The full project gate is `npm run check`; `npm run typecheck:netlify` is separate. Existing GitHub CI remains enabled. Do not repeat expensive suites without a reason or call real AI services for routine checks.

For documentation changes, verify language, local links, technical references, and commands. For a new repository guard, exercise both acceptance and intentional failure cases.

## Pull requests and handoff

Write a short English title and describe the trigger, resulting behavior, checks, and remaining limits. Identify the baseline and target branch. Do not describe mocks as live provider validation or preview work as production behavior.

Use English commit messages, for example `[Docs][Codex] Explain production and preview onboarding` or `[WP1][Codex] Add deterministic deadline validation`.

Update `docs/PROGRESS.md` with the work, verification, known issues, and acceptance steps. If the approved product plan changes, record that the owner's local thesis backup needs synchronization. Preserve prior decisions as dated history.

## Product and data safeguards

Only fictional data belongs in examples and tests. Do not commit `.env` files, credentials, research data, recordings, participant identities, or interview material. Preserve deterministic dates, visibility filtering, archival requirements, and the applicable human approval gates. Follow `docs/DESIGN_TOKENS.md` before changing the main interface. Scope changes require the owner's approval.
