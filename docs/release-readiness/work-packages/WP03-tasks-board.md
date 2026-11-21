> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# WP03 — Tasks, Board, task details

## Agent prompt

Fix Tasks/Board/task details/related E2E. Read `AGENTS.md`, README, manifest, fetch/confirm latest stage baseline SHA. No `main` or other packages' tests.

### Scope

- `e2e/tasks.spec.ts`
- Task scenarios in `e2e/rehearsal.spec.ts`
- Tasks/Board/details/extension components
- Necessary feature-scoped styles

### Required verification

- Claim unassigned tasks; Waiting/Need help/Done updates.
- Extension draft/submission/president approval.
- Table/Board/Timeline share task data.
- Board dragging/keyboard alternatives.
- Custom status names; no new task created completed.
- Ordinary members cannot move others' tasks.
- State survives refresh, mobile operable.

### Requirements

- Replace obsolete `my-tasks`/old `move-menu` DOM assumptions with current stable semantics.
- Where Activity workspace replaces old features, verify equivalent outcomes without restoring duplicate UI.
- Never weaken permission/persistence/status-transition assertions.
- No skip/force click/assertion deletion/timeout-only increases.

### Acceptance

1. All desktop/mobile `tasks.spec.ts` pass.
2. `rehearsal.spec.ts` claiming/status/completion pass.
3. At least one mouse/keyboard/mobile status-change path each.
4. Reload persistence, retained/passing negative permission tests.
5. `npm run lint`, `npm test`, `npm run build`, `git diff --check` pass.
6. One `[RR-WP03][Codex]` commit distinguishes product fixes/test migration.
