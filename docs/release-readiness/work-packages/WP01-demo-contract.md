# WP01 — Demo Dates, Seeds and Routes

## Agent prompt

You are responsible for repairing outdated test contracts caused by Demo dates, seed events and Funding route changes.

Read `AGENTS.md`, this directory README and manifest before starting. Execute `git fetch origin`, confirm that worktree is created by the latest `origin/integration/v1.0` SHA designated by the master of the phase. No worktree of `main` or other agent.

### Scope of responsibility

- `e2e/smoke.spec.ts`
- `e2e/recovery.spec.ts`
- `e2e/safety.spec.ts`
- `e2e/m2b.spec.ts`
- `e2e/bts.spec.ts`
- `e2e/today.spec.ts`
- Necessary tests

### Request

- The seed must not be returned to 2026-10-22.
- The test should be derived from the current feed, page status or shared fixture date, avoiding a hard encoding of Demo date again.
- `/funding` has been redirected to `/events`; Verifys a new contract and cannot restore an independent Funding page.
- Fixes the number of events, default cut-off dates, export status, simulation clocks and Reset demo expectations.
- Keeps a true business assertion: clock push/replace, pre- and post export status, default job cut-off date, AI-off fallback, no running error on the page.
- If a live product defect is detected, it can be repaired but must be added to the regression test and distinguished between “test drift” and “product defect” in the delivery report.
- Ban skip, delete assertions, add blind timeout or relax to meaningless locator.

### Acceptance Standard

1. The six specs above have all been adopted in the desktop and mobile projects.
2. The old `2026-10-22`, `2026-10-23`, `2026-10-27`, `2026-10-29` are no longer hard-coded for any reason.
3. `/funding` Redirectional acts have clear assertions.
4. `npm run lint`, `npm test`, `git diff --check` were adopted.
5. There is no reduction in the number of tests or operational behaviour covered.
6. Creates a `[RR-WP01][Codex]` submission, returns the committee SHA, changes files, test commands and results.
