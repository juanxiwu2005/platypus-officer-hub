# Manual workflow editor implementation plan

> **Latest user choice, 2026-11-18:** Settings now uses one sequential chain per team and fixed 132×52 cards, short title + T badge only; drag reorder, dates edited in Details, no same-team parallel entry. New template versions explicitly enable sequential scheduling; old versions/existing events retained. See [current handoff](WORKFLOW_STABILITY_HANDOFF.md). Old proportional-time dragging/parallel descriptions below remain as history.

2026-11-18 (America/Phoenix). User confirmed ② main interface + ① quick entry both in Settings → Workflow; Plan uses dot tracks. Explicit authorization for multiple worktree Agents to complete writing/code continuously; no main merge.

## Team-default correction (2026-11-18)

User noted default teams were missing, forcing regrouping of the original template, and explicitly requested original workflow responsibilities restored. Four required team categories now provided: Club leadership (Full Check, 1 task), Operations (events, Speaker/Partner, special matters, archive, 25 tasks), Marketing (including post-event publicity, 8 tasks), Finance (including settlement, 12 tasks). Counts describe original 46-task preset only; custom tasks/explicit reassignment retain settings.

`src/data/workflowTeamDefaults.ts` holds production defaults/idempotent initialization; `Org.workflowPresetTeamIds` links semantic slots to stable teamId, names remain editable labels. Preserve explicit role/team IDs and manual mappings first; old canonical four-team labels may reuse original IDs once if no association exists; after association, arbitrary renaming never rematches. Unknown tasks are not assigned by name; unassigned roles remain vacant, no invented people.

Fresh browser, old v23 load, Reset/new workspace all use preset directly; initialization adds only organization sidecar, never rebuilds tasks, historical versions, event snapshots. Required team references protected; renaming/addition free; standard-template editing and new-event instantiation share missing-mapping completion, published versions never rewritten in place. Removed “one role one team” initialization; Apply role teams usually unnecessary. Accept directly in Settings → Workflow; Teams for renaming/addition only.

219 unit/component tests, 26 unique desktop/mobile browser checks passed (default ready, four teams arbitrarily renamed/refreshed/applied in Plan, old school protection/Undo/type inheritance); after merge with concurrent email Plan, another16 unit/component and 4 desktop/mobile checks passed. Production build, types, lint, 9-page words, diff passed; [round JSON](workflow-preset-teams-verification.json). Rules/dates/Task Details/site links/schema 23 unchanged, no main merge; local backup needs synchronization.

## Stages and file ownership

1. **Data/identity contract:** Data Agent owns types, workflowTemplates pure functions, explicit custom generation in playbooks. Template IDs, immutable versions, stable step keys, execution runs, independent task IDs; lazy old-v23 compatibility, no full reset.
2. **Parallel implementation:** Editor Agent: new controlled WorkflowBuilder (timeline/team lanes/real dependency lines, bulk list, detail fields, before/after/parallel additions, Undo); Execution Agent: actual New Event/approval template-version selection, atomic instantiation; Lanes Agent: final independent teamWorkflow snapshot for N teams/N lanes and Plan dot DAG; lead Agent: Settings library/drafts/save/copy/defaults, explicit team config, store persistence.
3. **Integration/independent review:** Review Agent first checks loading/budget/Undo risks, then end-to-end scenarios. Lead cherry-picks by dependencies, resolves boundaries, runs necessary unit/types/lint/build/desktop-mobile acceptance, retains other conversations' changes, pushes same PR 14 preview.

Independent worktrees/file ownership; no cross-editing shared files, no automatic main deployment, AI calls, emails. Other presets (Volunteer, Partnership, Field trip, etc.) after editor acceptance.

## Data constraints

- Optional Org workflowTemplates/defaultWorkflowTemplateId/workflowTeams/workflowRoleTeams; never erase old Role/Person/responsibilities/history/settings.
- Templates save name, steps, branches, team mappings; incomplete drafts allowed and retained; publish requires nonempty tasks, valid roles/teams, durations/relative dates, no dangling/cyclic dependencies. Standard school flow retains policy protection; custom never forcibly receives31 standard core steps.
- Stable step keys, new UUIDs; rename/position/team/responsible-role changes never replace ID; old standard keys retain policy meaning. Across templates use templateId＋key; across same-template versions retain step identity.
- Immutable versions. Event creation pins selected version, records workflowRun/task-graph snapshot, bulk-generates taskIds for applicable steps and translates dependsOn; creation retries idempotent, no duplicate tasks/progress overwrite.
- Plan dots bind real taskId; templates/instances separate, materials/status isolated between events; later template edits leave existing events unchanged.
- Organization teams explicitly created/confirmed; role→team separate mapping, no role-name guesses. N teams/N lanes includes empty teams; ungrouped is an issue, not extra lane. Teams, responsible roles, business branches, dependencies independent.
- T± means relative calendar days; duration business days; existing rule engine computes actual dates. Double-clicking dependencies does nothing, yellow hover remains off; inherit types and retain TODO for future event-checklist integration.

## Acceptance scenarios

- Quick-entry 5–8 tasks in blank template, switch timeline with same data; edit name/Details/role/duration/T±/prerequisites/type, explicit before/after/parallel additions; readable lines, cycle rejection, Undo.
- Exactly N lanes after explicit teams, including empty; no splitting same team before/after event; cross-team reassignment retains dependencies/roles/conditions.
- Published save survives refresh; new events select template/pinned version, create actual task dots opening existing details.
- Two events from same template isolate taskIds, deadlines, materials, progress; no duplicates on retry; v2 does not rewrite v1 events; old events/links remain.
- Desktop/mobile, keyboard, light/dark, serious/critical accessibility; 2–3-minute goal not reported as measured achievement.

## Delivery record

Implementation/independent review complete; original feature branch/PR 14 awaiting user acceptance, no main merge. Six Agents in independent worktrees: data, editor, execution, lanes, independent Review, old-test migration; lead maintained Settings/store/contracts/final integration.

### Actual files and behavior

- `src/data/workflowTemplates.ts` / `types.ts`:100-template limit; stable IDs/immutable versions/drafts, copy/internal-reference remapping, permissions/publish validation, current-role resolution, team/run/source snapshots, idempotent generation. `playbooks.ts` explicitly standard/custom; standard school policies retained, custom gets no 31core.
- `src/components/workflowLibrary/`＋`Settings.tsx`: blank creation, naming, copy, default template, autodrafts/save version, explicit teams; first entry collapses universal Ask for editor space, task selection opens shared Details. Teams Org sidecar, Role/Person never overwritten.
- `src/components/workflowBuilder/`: two views, same data; business-day durations/T±, rule-engine preview, connections/cycle prevention, before/after/parallel, business condition branches/AND/branch selection at joins, Undo. Horizontal drag shifts actual calendar target/calibration window only, not effort/dependencies/role/team/conditions; school/business-unit targets blocked with explanation. Empty lanes touch-scrollable.
- `AskPanel.tsx` / `ChangeCard.tsx` / `changeReview.ts`＋store: actual New Event/approval retains explicit selected version; fresh validation failure never writes Approved; filtering operations remaps selected index, retries do not duplicate; custom creation/date changes do not automatically trigger paid checks.
- `src/teamWorkflow/` / `TeamMetroChart` / `teamMetro`: final independently verified foundation snapshot; explicit-team runs use one lane/team including empty, real taskId dots/dependencies; ungrouped old standard uses original diagram. Ungrouped temporary tasks remain openable in issues, no invented lane. New dots omit invalid Edit flow.
- `store.tsx` / `settings.ts` / `schedule.ts`: old v23 loading/task links retained, no core backfill in new runs; new workspace clears previous template sidecar. Custom explicit T0/T+ allows same-day/later targets, standard school-deadline checks retained. Rail form refresh does not reopen hidden rail.

### Issues found and fixed

Draft Undo had treated temporary insertion as permanent school requirement; protection now based on published version; branch IDs now b-UUID for letter-start/length constraints; fixed autosave Details refresh reopening mobile rail; removed invalid Plan-dot edit entry. Four existing workflow e2e files migrated to new controls, retaining school policy/branch scope/effort/inheritance/Undo/refresh/old actual Plan gesture coverage.

### Verification/evidence

Final runtime `ab3fa29` (including drag `2ad6a42`), independent Review acceptance snapshot `081483e`.368 related unit/component tests across 27 files passed; one old slow full-checklist enumeration not run.16 new desktop/mobile and 41 existing workflow browser cases passed, one mobile mouse-specific skip, 57 unique passes; affected features selectively rechecked after final fixes, not recounted. Two desktop/mobile production Today entry-budget checks also passed. Zero serious/critical axe, pageerrors; actual CDP touch and mouse tested.

Full lint, frontend/backend types, production build, 4 feature CSS files, 9-page words passed; Settings 147/150, local entry 492833/550000 bytes, threshold unchanged. Shared pure-rule splitting keeps4 initial JS requests; experimental total initial JS +391 bytes (0.053%), improved cache boundaries/entry size, no claim of reduced total download/parsing. [JSON](workflow-builder-verification.json); actual [editor](../prototypes/workflow-builder-implemented/settings-editor-desktop.png) and [Plan dots](../prototypes/workflow-builder-implemented/plan-dots-desktop.png) screenshots inspected.

Acceptance: existing preview 14 `/#/settings` → Workflow (four default teams/standard mappings ready; Teams optional rename), New workflow → Quick entry bulk input → Timeline/details/prerequisites → Save version; `/#/events` → New event, select template, confirm, open dots. Ungrouped old standard still creates via original path; only saved versions usable for new events.

### Current boundaries

Same-browser persistence, no cross-device accounts/server template database; UI selects one template/event, multiple-template combination needs design. Existing Speaker preset retained, no automatic Volunteer/Partnership/Field trip creation. AI future only, 0 real AI/external emails.2–3-minute setup awaits human timing; complex same-team lines may cross, selection/prerequisite list show true dependencies, routing improvable. P1 people-card foundation imported with module, not mounted as full onboarding redesign.

Environment HTTP requests to GitHub API/Netlify preview return403; online CI/deployment cannot be verified; feature-branch Git pushes still work, continuing PR 14. Local backup needs synchronization.
