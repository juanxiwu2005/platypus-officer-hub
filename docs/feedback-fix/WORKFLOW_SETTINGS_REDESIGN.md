# Settings  → Workflow Editor Re-engineering

2026-11-19 (America/Phoenix), Claude (Message + three worktree Argentina: A canvas, B page frame and right panel, Cbrowsertes). Following PR #14/ preview 14, no more merge `main`, Schema 23, live AI 0 times, 0 mails.

## User Decision

1. Settings  →  Workflow; When Juanxi is satisfied, the new layout will be transferred to Plan 's activity chart.
2. This round is only light; Dark only token, no access.
3. This round is a batch allocation (Select steps * Assign N steps).

## It's a problem before we change.

- Each team folds every step of 4 and returns with snakes; The standard 46 step template is squeezed into a high pillar on the left, empty to the right, main line and start running out of screen.
- The team name is the frame below the form, and the three Organisations do not see a difference, there are no steps, the bottom color is too light.
- Two lines of 13 buttons of the same size, the template action is mixed with the canvas action.
- Template Selector does not see which is the Platypus preset, which is the standard or which is default.
- Step names are separated from the middle of words (Accessibili ty, Attendanc e).
- No time position for Plan / Prepare / Event day / Close.
- Content area is limited to 1180 px.

## Delivery

**Template Layer (page header)**
- `Saved workflow` is divided into two groups, `Platypus preset` and `Your organization`, with Preset/Default/ Draft/ Version N tags.
- `New workflow ▾`：Blank workflow / Copy of preset。
- Large name input box + auto-save state; `Save draft`, the only main buttons are `Save version`, `More ▾` (Duplicate workflow / Use by default / Apply roll towers / Teams).
- Workflow, this page content area is relaxed to 1600 px.

**canvas toolbar**
- Left: `Undo`  ｜  `Flow | Quick entry`  ｜  `1-day | 2-day`.
- Right: `Select steps`, `+ Task` (primary button), `Add ▾` (Teambranch/ Full check/ Event day), scaling `− 85% + Fit`.
- `Connect` moved to the task Details called `Connect on canvas`.

**canvas (new files `laneLayout.ts`, `lane-editor.css`, class `wfx-`)**
- One line per team; More than 10 steps to fold. The standard template has a maximum of one line 8, which is open.
- Each line is placed on the “minimum increase in total height” side and can be reused with empty lines, while the main line remains in the middle.
- Top fixed time period title: Plan Prepare  →  Event day  →  Close.
- The top left corner of the team card is the tab button "Operations 7 steps", a `+` to the right; 6 sets of fixed team colours.
- (b) Step two lines are cut and no more breaks from the middle of a word; The full name is in the tip and read screen names.
- Legend: Core Step / Conditional Step / Team area / Event day.
- The default 85 % when it is opened (not wide enough to roll around the painting); `Fit` Look at the full picture.

**Right Team Assignment Panel (point team tab open)**
- Title "Finance path" + number of steps; Team drops; Team raster (the name of the current officer that maps the group's role, only on the page); Starts at / Joins at。
- `+ Select steps`  →  Selecting steps on canvas  →  `Assign N steps`, once Undo withdraws the whole batch; Escape exits.
- Description (new optional field `details`, maximum 400); `Delete team branch` (which cannot be deleted in a systematic manner).

**Data**
- There are more optional fields for team branches `details`; The old data do not have this field to read and write properly.
- New `moveMilestoneTasks`: Bulk moves, live task IDs, conditions, role, durations are constant.

## Plan hasn't changed.

No changes to `src/components/flow/`, `milestoneLayout.ts`, `milestoneLayout.test.ts`, `milestone-editor.css` and `4d6290e`; Plan continues with the old layout.

## Authentication

- Modules/components: Relevant 15 files 139 complete; Full 2051in item 2049Yeah, it's a failure. `calibration.test.ts`(overtime) and `uiLog.test.tsx`Yes. `4d6290e`The same failure.
- Lint (including style guards), back-end type, production build through; Entry 498, 36x/ 550,000 bytes, unchanged (Workflow is lazy).
- browser tests (Playwright, Desktop + Cell): Settings workflow-related 11 files, desktop 52 more, mobile 51 more + 1 original desktop skip; It adds `e2e/workflow-settings-layout.spec.ts` 5 (one line per team, chronological sequence, step terminologies, batch distribution + one Undo recovery, menu and focus, no horizontal spillover of mobile phones, axe severe/ critical 0).
- On Plan's side, 10 browser sets: 169 over, 15 skip, 18 failed; Run the same file on `4d6290e`, same 17 failed; The extra `a11y.spec.ts:286` (cell phone) was only 1 out of 3 on both sides. So this time it didn't make Plan bad, but these old failures need to be dealt with later.
- Screenshot: `docs/prototypes/workflow-settings-redesign/` (formerly `before-desktop.png`); `desktop-default.png`, `desktop-fit.png`, `desktop-team-assignment.png`, `mobile-default.png`).

**Test Reformation Note (Agent C):** has changed the way you look for buttons to a new interface, without deleting or skip any behavior check. There are several other test checks that were not available before this time (Details first is Task name); Settings canvas is no longer dependent on arrows; Remove prerequisite is no longer disabled, but was later rejected by the ASU rule; The conditions branch dialogue box is only in the Edit follow of Plan, and these tests are changed to check current live behaviour; Three condition branch tests moved to the `e-speaker` activity in Plan.

## Second revision (2026-11-19, Juanxi feedback); worktree Agent D）

1. (a) **diamond placement tips plus: When** drags, it is shown between steps of each team line, at the end of the row and between adjacent nodes of the main axis; The nearest zoom in. Only if it is in a diamond form, it will be left unaltered and "Drop a step on a profile." (`laneDropSlots`, `.wfx-slot`).
2. **The main axis can be adjusted:**(a) Tasks on the main axis (Full check, Chuck-in Forms, Head Count) may be dragged to a team line or other location of the main axis;  Teamline tasks can also drag on the main axis. The branch that starts/convergence from the main axis task that is moved or deleted automatically receives the next node.
   - Only steps required by the ASU school rules and those required to wait for them (e.g. Venue, Budget, Budget Approval) in the pre-set template can not be deleted; Other core steps (including Check-in Forms) can be deleted, Details prompting “Restore Platypus preset brings it back.”. This relaxes the former rule that "preset core steps cannot be deleted" (`checkWorkflow` New Option `requireCoreSteps`, closed only when templates are edited and templates are saved, without change elsewhere).
   - When using this version of construction activity, the deleted step will not be quietly refilled (`restoreMissingCore` only turns off `instantiateWorkflowTemplate`).
3. **Restoration Button (More menu, confirmation):** "Restore Platypus preset" (only for presets); Switching the draft back to original presets and renaming it to Speaker services, the main point Save version became a new version) and “Discard draft” (back to the most recently saved version). Both saved versions and existing activities remain unchanged.

Validation: Lint, build through; 2086 past in unit sets 2088 (old 2 failed as above); New `e2e/workflow-main-line.spec.ts` desktop + mobile phone 8/8; `workflow-main-line`, `workflow-settings-layout` and `workflow-stability` merge have returned to 32/32. Worldbrowser sets of all desktop 56/56 and cellular 55/55 (+ 1 originalskip) in clean running; `workflow-milestones` and `workflow-builder` each have 1 items that occasionally fail in full parallel, run alone and pass on the same code before change. Screenshot: `drag-diamonds.png`, `restore-preset-dialog.png`.

(b) Acceptance: a step to drag a team, see a diamond and put it on the diamond shape of the main axis; Drag the Check-in Forms into a team line, or in Delete task; More  →  Restore Platypus preset; More  →  Discard draft returns the last saved version.

## What? Acceptance?

1. Open preview14 — Settings — Workflow.
2. Look at the whole: a line for each team, with the main line in the middle and Plan / Prepare / Event day / Close; Point `Fit`. Look at the full picture.
3. The label of the point Finance * appears on the right side of its name.
4. Points `+ Select steps`, at the top of the chart 3Individual team steps `Assign 3 steps`Here. 3Move a step to the Finance line.
5. Point `Undo`  →  3 steps back to their original position.
6. Open the `More` and `Add` menus to see if the buttons can be found.

## Not done / Known limit

- Plan's activity map is still an old layout. Wait for Juanxi to confirm the transplant.
- Dark without access.
- A batch allocation that violates school rules (e.g. R06:Food Exchange Permit to wait for Budget) will be rejected, and the error appears on top of the canvas, but there is no indication as to why the “N steps secured” in the right panel.
- Opens a preset template for about 0.5 seconds and automatically saves a copy of Draft (old behavior).
- On a 1440 wide screen, standard templates are scrolled around or around 85 per cent; The full picture can be seen at `Fit`, but the word is smaller.
- Two unit tess (`calibration.test.ts` overtime, `uiLog.test.tsx`) failed on `4d6290e` before the change.
- Not connected to Juanxi's computer this time, **needs to sync with local back-up**.
