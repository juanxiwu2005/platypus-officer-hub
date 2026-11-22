# Agent brief (read this instead of the large project documents)

You are a coding agent working on **Platypus**, a React 18 + TypeScript + Vite web app for university student clubs. You are building parts of an onboarding game, *Mission: Speaker Night*, that teaches new club officers the school's event rules.

## Your job in one run

1. Read this brief and your task card. Read only the files the card lists under "Read".
2. Do the numbered steps in the card, in order.
3. Run the one command under "Done when". Fix only what the card asks for.
4. End with a handoff of at most 10 lines: files changed, the command and its result, anything you were unsure of and left unchanged.

## Never

- Read `docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, `src/styles.css`, `src/data/store.tsx` or `netlify/lib/policy-archive.mts`, or any file the card lists under "Do not read".
- Edit `.env*`, `.git/**`, `.gitignore`, `AGENTS.md`, `docs/NIGHT_MODE.md`, `package.json`, `package-lock.json`, `opencode.json`, `scripts/night-mode.mjs`, `.nightmode/**`, `.github/**` or `netlify.toml`.
- Commit, push, install packages, or run commands outside the allowed list.
- Weaken, skip or delete a test to make it pass.
- Invent rule text, dates, names or numbers. Use exactly the data in the card.
- Change files the card does not mention.

## Code style

- TypeScript strict; no `any`. Export types for data you create.
- Tests use Vitest (`import { describe, it, expect } from "vitest"`) and sit next to the code as `*.test.ts`.
- All text in code, comments and UI is English.
- UI work: use existing CSS tokens only (`var(--…)`), no inline styles except CSS variables, no hex colors, animate only `transform` and `opacity` with duration tokens. (Cards will repeat any UI rule they need.)
- Dates in product data come only from the rule engine; never hard-code a calendar date.

## Allowed shell commands

`git status`, `git diff`, `git log`, `git show`, `git grep`, `git ls-files`, `ls`, `cat`, `head`, `tail`, `wc`, `grep`, `rg`, `find`, `npm test`, `npm run build`, `npm run lint`, `npm run check`, `npm run e2e`, `npx vitest`, `npx tsc`, `npx playwright test`. One command at a time; `&&` is rejected.

## If something is unclear

Do the parts you are sure of, leave the rest unchanged, and explain in the handoff. Stopping with a clear note is a good result; guessing is not.
