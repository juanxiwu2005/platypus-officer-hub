> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# WP01 — Demo Date, Seed, and Route Contracts

## Agent prompt

Repair stale test contracts caused by Demo dates, seed events, Funding route changes.

Read AGENTS.md, directory README, manifest first. git fetch origin; verify worktree starts at stage main agent's designated latest origin/integration/v1.0 SHA and report short SHA. Never use main or another agent's worktree.

### Scope

- e2e/smoke.spec.ts
- e2e/recovery.spec.ts
- e2e/safety.spec.ts
- e2e/m2b.spec.ts
- e2e/bts.spec.ts
- e2e/today.spec.ts
- Necessary test helpers/fixtures

### Requirements

- Never revert production seed to 2026-10-22.
- Derive dates from current seed/page/shared fixtures; avoid hardcoding Demo dates again.
- /funding redirects to /events; assert this contract, never restore separate Funding page.
- Correct event counts/default deadlines/export state/demo clock/Reset expectations.
- Preserve real business assertions: clock advance/reset, export-state preservation, default task deadlines, AI-off fallback, no runtime errors.
- Real product defects may be fixed with regressions; distinguish test drift from product defects in handoff.
- No skip/assertion deletion/blind timeout increases/meaningless locators.

### Acceptance

1. All six specs pass desktop/mobile.
2. No unjustified old dates 2026-10-22, 2026-10-23, 2026-10-27, 2026-10-29 hardcoded in owned tests.
3. Explicit /funding redirect assertion.
4. npm run lint, npm test, git diff --check pass.
5. No reduction in test count/business coverage.
6. Create [RR-WP01][Codex] commit; return SHA/files/commands/results.
