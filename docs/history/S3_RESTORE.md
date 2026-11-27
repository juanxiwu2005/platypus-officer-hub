# S3 restore guide (November 23, 2026)

Juanxi approved removing parts of the Plan page in S3 on the condition that they can be restored from earlier versions. Nothing below was archived as dead files in the tree: git keeps every version, and each S3 work package came in through its own merge commit on `claude/fervent-thompson-e2j5u2`.

- **Last commit before S3 code changes:** `5a3b13c` (S0–S2 plus docs). Production `main` at `db1a0be` (Preview 14) also still has all of it.
- **Restore a whole package:** `git revert -m 1 <merge commit>` (listed per package below), then fix any conflicts with later work and run the checks.
- **Restore single files:** `git checkout 5a3b13c -- <path>` (for files that were deleted, also re-add their imports, e.g. CSS in `src/styles/index.css`).
- **Saved data:** no package changed `SCHEMA_VERSION` or removed stored fields, so restored code reads existing saves. Status names/colors customized before S3 are still stored under `org.board` and reappear if the editor is restored.

## S3-W2 — Tasks keeps only the Table (merge `d7b32ad`, commits `ea8a0e6`, `947ce24`)

| Removed | Where it lived |
| --- | --- |
| Board view: status columns, drag (useDragSort), Alt+arrow moves, folding empty columns, per-column "+ Add task" quick add and its notice | `src/pages/Tasks.tsx` (`Board` component) |
| Timeline view (task Gantt bars) and the view switch | `src/pages/Tasks.tsx` (`TaskTimeline`) |
| Inline owner select and due date input in the Table (now read-only; edit in Task Details → Edit) | `src/pages/Tasks.tsx` |
| Board/timeline styles | `src/styles/dx-16-board-layout.css`, `dx-21-board-headers.css`, `dx-24-board-drag.css`; board and `.task-gantt*` rules in `src/styles.css`; board references in `dx-03`, `dx-04`, `dx-08` CSS |
| Specs | `e2e/dx-16-board.spec.ts`, `e2e/dx-21-headers.spec.ts`, `e2e/dx-24-drag.spec.ts`; the quick-add test in `e2e/tasks.spec.ts` |

Kept: `src/lib/dragSort.ts` (used by the archived Partners page), `.board-add*`, `.tag-*` styles.

## S3-W3 — the six statuses are fixed (merge `53f9e0f`, commit `f48b95d`)

| Removed | Where it lived |
| --- | --- |
| Board editor: rename statuses, pick status colors, add/remove tags, card-field toggles, restore defaults | `src/components/BoardSettings.tsx` |
| Settings → Tasks section (`TaskSettings`, `"tasks"` in `SettingsTab`/`SETTINGS_TABS`); `?tab=tasks` now opens Club | `src/pages/Settings.tsx` |
| `saveBoard` action (Action type, reducer case, audit-log case) and `saveBoard()` | `src/data/store.tsx`, `src/data/board.ts` |
| Rail `{ kind: "board" }` panel | `src/components/rail/Rail.tsx` |
| `PALETTE` | `src/data/statusDefaults.ts` |
| Swatch and status-edit styles | `src/styles.css`, `src/styles/dx-04-touch-targets.css` |
| Tests | saveBoard test in `src/test/v11.test.ts`, the a11y board-customization test, "board customization renames a status everywhere" in `e2e/tasks.spec.ts` |

Behavior change to undo together with the editor: every place that showed a renamed status (StatusPill, `statusStyles`/`useStatusStyles`, board notices, the Task Details status menu, reminder-centre replies, Ask previews) now uses `STATUS_DEFAULTS`.

## S3-W1 — Events shows one Flow with a Next up strip (merge `4b30b70`, commits `b3ffb27`, `63c9b9e`)

| Removed | Where it lived |
| --- | --- |
| Events List view (table of Step, Owner, Status, Due with per-step Due and reminder notes) and its saved choice `platypus.v1.eventsView` in browser storage | `src/pages/Events.tsx`; `asuSentence` / `reminderSentence` in `src/lib/taskDue.ts` stay (unit-tested, no UI caller) |
| Workflow version tag "name · vN" in the event head | `src/pages/Events.tsx` |
| Event Details rail opening by itself on every event change (now a "Details" button) | `src/pages/Events.tsx` |
| Flow help sentences ("Follow the dots…", "Select a task to work on it…", "This station is not a task…") and `.team-metro-help` CSS | `src/components/flow/TeamMetroChart.tsx`, `MilestoneExecutionChart.tsx` |
| The "← event" link inside the Plan task panel (one back link remains) | `src/components/TaskDetail.tsx` (`eventLink` prop), `src/taskDetails/PlanTaskPanel.tsx` |
| Owner name under every flow dot (now on a lane's first dot and where the owner changes; hovers and screen-reader labels still name every owner) | `src/components/flow/` |

Added: `src/lib/nextUp.ts` (ranking) and `src/components/NextUp.tsx` (the strip); one permission message helper `eventBlocked` in `src/data/changeReview.ts`. Kept unchanged by owner decision: Budget view, Funding rail, "$ requested", per-event Edit flow.

## S3 follow-ups (merges `2238178` Done group, `fe844db` review fixes)

| Change | Where |
| --- | --- |
| Added a collapsed "Done (N)" group at the bottom of the Tasks table; "Undo mark done" now stays available until a reload even after Task Details closes | `src/pages/Tasks.tsx`, `src/taskDetails/TaskSubmission.tsx` |
| Removed `addTaskNotice` (export), the `addTask` action, `addBoardTask` and `startStatus`; `byRank` is no longer exported; `src/test/taskCreate.test.ts` deleted (its reopen-rule check moved to `src/test/v11.test.ts`) | `src/data/board.ts`, `src/data/store.tsx` |
| One at-risk rule `isAtRisk` (schedule error, red forecast, Stuck, or past club deadline) for the Events head count, Next up and the three flow charts | `src/lib/nextUp.ts` and callers |
| Flow legend reads "Done · Started or due · Not started · At risk" | `src/components/flow/MetroChart.tsx`, `TeamMetroChart.tsx` |
| Removed `.board-add` styles (kept `.board-add-btn`, which the archived Partners page uses) | `src/styles.css` |
