# WP03—Tasks, Board and Task Details

## Agent prompt

You're in charge of repairs to Tasks, Board, details of the mission and related E2E. Read `AGENTS.md`, README, manifest, fetch before starting and confirm the updated baseline SHA. `main` should not be used or the test files owned by other work package should not be modified.

### Scope of responsibility

- `e2e/tasks.spec.ts`
- `e2e/rehearsal.spec.ts` task operating scene
- Tasks, Board, mission details, extension request-related components
- Necessary Feed-Scoped Styles

### Must authenticate

- (c) To receive undistributed assignments; Waiting, Need help, Done status update.
- Draft extension, submission and president approval.
- Table, Board and Timeline use the same task data.
- Board drag and keyboard replacement.
- Custom status names; New tasks cannot be created directly for completion.
- Ordinary members cannot move without their own task.
- Maintain status after refreshing; The phone is operational.

### Request

- Removes the dependency on `my-tasks`, old `move-menu` and other DOM contracts that no longer exist, using the current stable semantics.
- If the old feature has been replaced by the Activity Workspace, verify the equivalent business result and do not revert to duplicate UI.
- It must not weaken the claims of missions, durability or state conversion.
- Bans kip, force click, deletes assertions or increases only timeout.

### Acceptance Standard

1. `tasks.spec.ts` on desktop/ mobile all through.
2. The `rehearsal.spec.ts` task receipt, state update and completion path is passed.
3. Mouse, keyboard and moving end have at least one state change path.
4. The status is maintained after reload, and the negative tests are kept and passed.
5. `npm run lint`, `npm test`, `npm run build` and `git diff --check` were adopted.
6. Create a `[RR-WP03][Codex]` submission to distinguish product restoration from test migration.
