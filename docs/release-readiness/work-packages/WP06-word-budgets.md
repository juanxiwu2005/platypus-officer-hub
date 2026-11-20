> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# WP06 — Page word-count/information-density gates

## Agent prompt

Restore word gates while preserving discoverability. Stage 2, latest `origin/integration/v1.0` with WP02. Read `AGENTS.md`, README, manifest; fetch/report baseline SHA, no `main`.

### Known audit-baseline failures

- `/events`: total 614/420
- `/rules`: visible 324/170, total 1671/560
- `/team`: visible 138/130
- `/funding`: redirects Events, still measured against old Funding total 160

### Requirements

- Remove independent `/funding` gate or explicitly alias `/events`; do not restore duplicate page.
- Events initially renders current needs only; secondary details on expansion/selection, without removing budgets/sources/key dates.
- Rules categories/search/tabs render selected content only, keeping all policy sources discoverable; no cheating with CSS-hidden large DOM text.
- Team removes repetition, retains clear roles/responsibilities.
- No simple LIMITS increases without explicit approval; scripts must count ordinary users' visible content.

### Acceptance

1. `npm run words` passes; report before/after per page.
2. Funding no longer double-counted as nonexistent page.
3. Sources/event budgets/responsibilities keyboard/screen-reader accessible.
4. Relevant Rules/Events/smoke Playwright passed.
5. `npm run lint`, `npm test`, `npm run build`, `git diff --check` pass.
6. One `[RR-WP06][Codex]` commit.
