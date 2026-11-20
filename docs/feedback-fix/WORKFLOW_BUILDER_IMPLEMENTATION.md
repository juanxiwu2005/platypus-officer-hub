# Manual workflow editor implementation programme

> **2026-11-18 User latest selection:** Settings is now replaced by a chain of sequences with 132 x 52 fixed cards for each team, short title + T label only; Drag rehearsing, Details change dates and remove parallel entrances from the same queue. New template version displaying sequences, old version/active retention; See [ for details on the current delivery log ](WORKFLOW_STABILITY_HANDOFF.md). The old time scale below is dragged and the parallel description retained as history.

2026-11-18（America/Phoenix）。User confirms 2 main interfaces +1 quick entry at Settings → Workflow; Plan uses a point orbital map. This round explicitly authorizes worktree more Agent to complete continuous preparation and code changes, not involving main mege.

## Team default correction (2026-11-18)

The user noted that the editor had not previously prepared the default team together, resulting in the need for the original template to be regrouped and a clear request to restore the division of labour. Currently, four categories of required teams are provided directly by default: Club lightship (Full Check, Task 1), Operations (Activities, Speaker/Partner, Special Matters and Archives, Task 25), Marking (Includes Post-Activation Publicity, Task 8), Finance (Inclusive Settlement, Task 12). These figures describe only the original 46 presets, with user-defined tasks/obvious reassignments maintaining their settings.

`src/data/workflowTeamDefaults.ts` save default tables for production and initialization of application; `Org.workflowPresetTeamIds` links semantic slots to stable teamID, the name of which is an editable label. (b) Priority is given to maintaining the active role/team ID and manual step mapping; The old four-team labels can follow the original ID at a time when there is no association, and change to any name after establishing the connection does not rematched. Unknown task does not belong by name, unallocated role remains vacant and does not create a person.

New browsers, old v23 loadings, Reset/new workspaces can be used directly; Initialization only adds to the organization ' s sidecar and does not recreate any task, historical version or activity snapshot. Teams must invoke protection and be free to change names/teams; Standard template editing and the exemplifying of new activities share the same missing map completion, which has been rewritten off site in a published version. Removes the one-on-one initialization entrance, usually without having to order an Apply Roll Teams. Acceptance DirectSettings — Workflow, Teams only for renaming or adding.

219 units/components, 26 sole two-end browsers passed (including default, arbitrary renaming and refreshing/Plan application, old school protection/Undo/type succession); Sixteen units/components and four double-ends were completed after the mail plan was achieved. Production of construction, type, lint, 9 pages and diff through; See [ for details: JSON ](workflow-preset-teams-verification.json) of this round. Do not change the rule date/Task Details/weblink, do not change Schema23, do not synchronize local backup.

## Phases and documentation responsibilities

1. **Data and Identity Contract**: DataAgent maintains typepes, workflowTemplates pure functions and playbooks visible custom creation. Template ID, variable version, stabilization stepskey, execution run, stand-alone task ID; Old v23 inert compatible and not fully reset.
2. **Parallel realization**: Editor Agent is responsible for the creation of a new controlled WorldBuilder (time axis/team lane/live line reliance, list approvals, detailed fields, pre- and parallel additions, Undo); Execulation Agent is responsible for real New Event form selection and atomic exaggeration of template versions with approval; Lans Agent uses the final independent teamWorkflow snapshot to access N-T and Plan Dot General DAG; Main Agent is responsible for Settings catalogue/draft/save/ copy/default templates, clear team configuration and store sustainability.
3. **Integration and independent review of**: Review Agent first examines loading/budget/Undo risks and then runs to the end scene. Main Agent resolves cross-border problems in order of reliance, running the necessary units, types, lint, build and desktop/cell function acceptance, keeping other dialogue updates and pushing the same PR14 preview.

(a) Agent independent worktree and document ownership, without changing documents; Do not automatically publish main, do not call AI or send mail. Other preset templates (Volunteer, Partnership, Field Trip, etc.) are produced separately after this editor's acceptance.

## Data constraints

- Org adds the option to worklowTemplates/defaultWorkFlowTemplateId/workflowTeams/workflowRoleTeams and does not erase old Role/Person/function/historical or organizational settings.
- Template save name, steps, branches, team mapping; The draft allows incomplete but must be retained, and the publication requires a non-empty task, an effective role/team, duration/relative date, reliance on non-suspension and circulation. The standard school process uses the original policy protection and does not impose 31 standards by definition.
- Stepkey is identity stabilization and the new step is UUID, changed name/position/team/principal responsibility does not change ID; The old criterion Key retains policy semantics. Distinguishing between template Id+key and template to keep step identities across templates.
- Version is inflexible. Creates a fixed version of the activity, records workflowrun and task map snapshots, generates taskID for applicable step batches and converts dependsOn; Creates the same time to try again without adding duplicate tasks or overlaying progress.
- Plan dot binding actual taskId; Templates and examples of activities are separated and materials/status is not shared between events; Subsequent template changes do not change existing activities.
- Organizational team open creation/confirmation; The role team is an independent map, not based on the name of the role. Team N included an empty team, and no grouping was a matter to be addressed rather than an additional swimming lane. Teams, roll masters, branches of business, dependencies are independent dimensions.
- T ±  is relative to the calendar day and the length of the working day, calculated by the existing rule engine. Double-clicking on the line is not operational and yellow hoover continues to close; Type of succession and retention of future activities checklist connects TODO.

## Acceptance

- The blank template creates 5-8 tasks with a cache, and the cut-off axis remains the same data; Change name/Details/ rule / duration /T++/Preparation/type, with clear additions before and after/in parallel; Reliance on connection readable, denial of loops and Undo recovery.
- A clear team followed by an N swimway with an empty team; (b) The non-dismantling of the group before and after its activities; Inter-team reassignments retain dependency/ rule/condition.
- Saves post-distribution refreshing still; Creates an optional template and solids the release freeze book, generates actual task dots and clicks into existing task details.
- Create two activities with the template, separating taskId, cut-off date, materials and progress; (b) Non-repetition; Template v2 will not rewrite activity v1; The old activity is linked to the old task.
- Desktop/mobile phone, keyboard, light-deep colour and severe/critical accessibility; The goal of two to three minutes is not written as it has been measured.

## Delivery records

This round of realization and independent review has been completed; Original branch/PR14 to user acceptance, not merge main. The data, editor, execution, swimming lanes, independent review and old test migration consisted of six Agent independent worktrees with the lead Agent maintaining Settings/Store/contracts and final integration.

### Actual documentation and behaviour

- `src/data/workflowTemplates.ts`/`types.ts`: 100 template ceilings; Stabilize ID/invariable versions/drafts, remap copy and internal references, permissions and release verifications, current role parsing, group/run/source snapshots and alternative generation. `playbooks.ts` Visible distinctionstandard/custom; The old standard school policy is retained, and custom does not replace 31 core.
- `src/components/workflowLibrary/` + `Settings.tsx`: New space, name, copy, default template, auto draft/save version and clear team configuration; When the first entry is made, the generic Ask will be closed to preserve editing space and the task will be opened for shared Details. The team is Org sidecar, the original Rale/Person records are not covered.
- `src/components/workflowBuilder/`: Two data viewes; The length of the working day and the T ±  field, using a rule engine preview, connection/resistance, back-to-back/parallel, branch of business conditions/AND and confluence point selection, Undo. Horizontally drag only live calendar target/ calibration window, without changing working hours/ reliance/ roll/team/condition; The school or business-unit target intercepted the statement. The empty swimming lanes can touch the screen rolling.
- `AskPanel.tsx` / `ChangeCard.tsx` / `changeReview.ts`+store: real New Event with a clear version of the option to approve reservations, failed to write Approved; Remaps the selected index on filter operations, and retry without repeating; New/rescheduled custom is not automatically fee-checked.
- `src/teamWorkflow/` / `TeamMetroChart` / `teamMetro`: Introduction of an independently validated final base snapshot; A team with a clear mandate to execute an empty swimway, live taskID dots/dependency; The old criteria were not used in groups. Non-clustering temporary tasks can still be opened in problem areas and no additional swimming lanes could be created empty. The new dot chart does not show invalid Edit follow.
- `store.tsx` / `settings.ts` / `schedule.ts`:v23 old load and task link retention, new execution not backfill core; New workspace cleans up the previous workspace templatesidecar. Custom made it clear that T0/T+ targets were allowed on/after the day, and that standard school deadlines were maintained. Rail refreshs the form without reopening the hidden sidebar.

### Fixing the problems found in the authentication

The draft Undo used temporary insertion as a permanent school requirement and now uses the published version to protect the benchmark; (b) Branch ID to b-UUID meets the letter start/length requirements; Reopen the mobile phone bar after re-newing the autosave trigger details; Removes an invalid edit entry for Plan ' s new point. Four workflow e2e have been moved to the new version control, retaining school policy/branch scope/worktime/inheritance/Undo/updated and old Live Plan gestures overlayed.

### Certification and evidence

Submit `ab3fa29` (including `2ad6a42` drag) on final run, independent review snapshot `081483e`. 27 Document 368 associated units/components were passed, and one old whole checklist slow list was not running. 16 new double-end and 41 old workflow browsers passed, 1 cellular mouse limit skip passed in 57 cases; The affected function is limited to repeat after final minor repairs and the number of duplicates is not counted. The budget for the production Today entrance has been approved in two separate sections. Serious/key axe 0, pageerror 0, live CDP touch screen and mouse are measured.

Full lint, back-end type, production of build, 4 characteristics CSS with 9 pages of word pass; Settings 147/150, entry 492833/55000 bytes local, unchanged. Subcontract sharing pure rules maintain four initial JS requests, and the total initial experiment JS is increased by 391 bytes (0.053 per cent), improving the cache boundary and the size of the entrance, without claiming to reduce overall downloads or parsing. [ JSON records ](workflow-builder-verification.json); The actual [ editor screenshots ](../prototypes/workflow-builder-implemented/settings-editor-desktop.png) and [ Plan dot screenshot ](../prototypes/workflow-builder-implemented/plan-dots-desktop.png) have been viewed.

The entrance to acceptance is the original preview14: `/#/settings`  →  Workflow (default four teams and standard task reintegration are ready, and Teams can change their name), New Workflow  →  Quick entry  →  Timeline check/details/preparation  →  SaveVersion; `/#/events` New event selects a template to open the task dot after confirmation. Old criteria that are not grouped may continue to be created according to the original path; Only saved versions can be used by new activities.

### Current Border

The same browser remains locally sustainable and there is no cross-equipment account/server template database; Each activity UI currently selects a template, and multiple templates merge single activities need to be designed separately. Keep the existing Speaker preset and do not automatically produce Volunteer/Partnership/Field trip etc. AI is a follow-up extension only, the current round of 0 live AI/external mail. 2– 3-minute time-bound target for real people; Complex co-lines may cross and live dependencies can be viewed through the selection and forward list, followed by improved routes. The P1 personnel card base code has been introduced with the module and has not been reprogrammed as a complete package.

This environment requests 403 HTTPs for a preview of GitHub API and Netlify, which cannot be verified as having been completed on-line with CI or deployment; The functional branch of Git is still available normally, following PR14. Could not close temporary folder: %s
