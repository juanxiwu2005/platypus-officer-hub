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
