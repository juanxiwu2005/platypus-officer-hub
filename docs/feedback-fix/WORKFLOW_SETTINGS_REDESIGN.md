# Settings → Workflow editor redesign

2026-11-19 (America/Phoenix), Claude (main chat + three worktree agents: A canvas, B page shell/right panel, C browser tests). Retain PR #14 / preview14; no `main` merge, schema 23 unchanged, 0 real AI calls, 0 emails.

## User decisions

1. Change only Settings → Workflow first; port layout to Plan after Juanxi accepts.
2. Light mode only this round; dark uses tokens but is not accepted/tested.
3. Include bulk assignment now (Select steps → Assign N steps).

## Previous problems

- Every 4 team steps wrapped in a snake pattern, squeezing the 46-step standard template into a tall left column, leaving right blank; mainline/Start outside initial viewport.
- Team names were dropdowns, three Operations indistinguishable, no step counts, backgrounds too faint.
- 13 same-size buttons in two rows mixed template/canvas actions.
- Template picker did not distinguish Platypus preset, club-owned, default.
- Midword title breaks (Accessibili ty, Attendanc e).
- No Plan / Prepare / Event day / Close temporal orientation.
- Content capped at 1180px.

## Delivery

**Template layer (page header)**
- `Saved workflow` groups `Platypus preset` / `Your organization`, with Preset / Default / Draft / Version N badges.
- `New workflow ▾`: Blank workflow / Copy of preset.
- Large name input + autosave status; `Save draft`, sole primary `Save version`, `More ▾` (Duplicate workflow / Use by default / Apply role teams / Teams).
- Workflow content width expanded to 1600px.

**Canvas toolbar**
- Left: `Undo` | `Flow | Quick entry` | `1-day | 2-day`.
- Right: `Select steps`, primary `+ Task`, `Add ▾` (Team branch / Full check / Event day), zoom `− 85% + Fit`.
- `Connect` moved into task Details as `Connect on canvas`.

**Canvas (new `laneLayout.ts`, `lane-editor.css`, `wfx-` classes)**
- One row per team; wrap only above 10 steps. Standard template longest row is 8, no wrapping.
- Place each row on the side with least total-height growth, reusing empty rows, mainline centered.
- Fixed top temporal headings: Plan → Prepare → Event day → Close.
- Team-card top-left label button "Operations · 7 steps", `+` at right; 6 fixed team colors.
- Two-line truncated step titles, no midword breaks; full names in tooltips/accessible names.
- Legend: Core step / Conditional step / Team area / Event day.
- Default 85% (horizontal canvas scroll if needed); `Fit` shows all.

**Right Team assignment panel (team-label click)**
- "Finance path" + step count; Team dropdown; Team roster (current officers in roles mapped to this team, display only); Starts at / Joins at.
- `+ Select steps` → choose canvas steps → `Assign N steps`; one Undo reverses entire batch; Escape exits.
- Description (new optional `details`, maximum 400 characters); `Delete team branch` disabled while it contains steps.

**Data**
- Optional team-branch `details`; old data without it reads/writes normally.
- New `moveMilestoneTasks` bulk command preserves real task IDs, conditions, roles, durations.

## Plan unchanged

`src/components/flow/`, `milestoneLayout.ts`, `milestoneLayout.test.ts`, `milestone-editor.css` are identical to `4d6290e`; Plan retains old layout.

## Validation

- Related unit/component: 15 files, 139 passed; full 2051: 2049 passed, `calibration.test.ts` timeout and `uiLog.test.tsx` also fail on `4d6290e`.
- Lint/style guards, frontend/backend types, production build passed; entry unchanged 498,36x / 550,000 bytes (Workflow lazy-loaded).
- Playwright desktop/mobile: 11 Settings workflow files; desktop 52 passed, mobile 51 passed + 1 existing desktop-only skip. New `e2e/workflow-settings-layout.spec.ts`: 5 cases covering one row/team, temporal order, no midword breaks, bulk assignment/single Undo, menus/focus, mobile no horizontal overflow, 0 serious/critical axe violations.
- Plan-side 10 browser files: 169 passed, 15 skipped, 18 failed; same files on `4d6290e`: same 17 failures. Additional mobile `a11y.spec.ts:286` passes only 1 of 3 runs on both (old flaky test). No Plan regression from this change; existing failures need separate work.
- Screenshots: `docs/prototypes/workflow-settings-redesign/` (`before-desktop.png`; after: `desktop-default.png`, `desktop-fit.png`, `desktop-team-assignment.png`, `mobile-default.png`).

**Test updates (Agent C):** button locators follow new UI; no behavior checks removed/skipped. Some assertions targeted UI already absent before this change: Task name first in Details; no dependency arrows on Settings canvas; Remove prerequisite now rejected by ASU rules rather than disabled; conditional-branch dialog only in Plan Edit flow. Updated to actual behavior; three conditional-branch tests moved to Plan `e-speaker`.

## Second-round corrections (2026-11-19, Juanxi feedback; worktree Agent D)

1. **Restore diamond drop hints:** during drag, diamonds between steps, at team-row ends, between adjacent mainline nodes; nearest enlarged. Move only on a diamond; elsewhere unchanged with "Drop a step on a diamond." (`laneDropSlots`, `.wfx-slot`).
2. **Editable mainline:** tasks (Full check, Check-in Forms, Headcount) move to team rows/other mainline positions; team tasks move to mainline. Branches starting/joining at moved/deleted mainline tasks reconnect to adjacent nodes.
   - In presets, only ASU-required steps and prerequisites awaited by school-rule steps (e.g. Venue, Budget, Budget Approval) remain undeletable. Other core steps, including Check-in Forms, may be deleted; Details: "Restore Platypus preset brings it back." This relaxes the old no-preset-core-deletion rule (`checkWorkflow` option `requireCoreSteps` off only for template edit/save; unchanged elsewhere).
   - Events created from such versions do not silently restore deleted steps (`restoreMissingCore` off only in `instantiateWorkflowTemplate`).
3. **Restore actions (More, confirmation required):** "Restore Platypus preset" (presets only; replace draft with original preset/name Speaker series; Save version required for a new version), "Discard draft" (last saved version). Saved versions/existing events unchanged.

Validation: lint/build passed; 2088 units, 2086 passed (same 2 old failures); new `e2e/workflow-main-line.spec.ts` desktop/mobile 8/8; combined `workflow-main-line`, `workflow-settings-layout`, `workflow-stability` 32/32. All Workflow browser tests in clean run: desktop 56/56, mobile 55/55 (+1 existing skip). 1 case each in `workflow-milestones`/`workflow-builder` intermittently fails full parallel runs and passes alone, also intermittent before changes. Screenshots: `drag-diamonds.png`, `restore-preset-dialog.png`.

Acceptance: drag a team step to a mainline diamond; move Check-in Forms to a team or Delete task in Details; More → Restore Platypus preset; More → Discard draft returns to last saved version.

## Acceptance

1. preview14 → Settings → Workflow (Speaker series template).
2. One row per team, centered mainline, Plan / Prepare / Event day / Close headings; Fit for whole graph.
3. Click Finance label → Finance path/member names on right.
4. `+ Select steps`, select 3 other-team steps → `Assign 3 steps`, all 3 move to Finance.
5. Undo restores all 3 positions.
6. Check discoverability in More/Add menus.

## Not done / known limitations

- Plan retains old layout until Juanxi accepts the port.
- Dark mode not accepted/tested.
- Bulk assignment violating school rules (e.g. R06 Food Exception Permit waits for Budget) is rejected; error above canvas, but right-panel "N steps selected" gives no reason.
- Preset opening autosaves a Draft after about 0.5 seconds (existing behavior).
- At 1440px, standard template at 85% needs horizontal scroll; Fit shows all with smaller text.
- Two units (`calibration.test.ts` timeout, `uiLog.test.tsx`) already fail at `4d6290e`, unrelated.
- No connection to Juanxi's computer; **local backup needs synchronization**.
