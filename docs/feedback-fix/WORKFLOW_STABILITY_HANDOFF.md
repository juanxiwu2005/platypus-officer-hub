# Workflow-template fix handoff

## Implemented direction: sequential same-team small cards (2026-11-18, America/Phoenix)

This supersedes the static study's "awaiting selection/not implemented" below. User explicitly chose B1 direct connectors/fixed small cards, adding no same-team parallelism and short titles + T-minus only. Implemented in original Settings entry; retain four default teams with stable renameable IDs, without rewriting 46 original task names, Details, links, estimates, conditions, or school rules.

- Fixed 96px row per team, 132×52 cards, 156px slots; cards show only first two words of full title plus engine T label, with full names/properties in Details. Horizontal axis is task order, not proportional time; team headers fixed, mobile scrolls horizontally inside graph.
- `workflowSequence.ts` initially references existing engine dates, then projects team sequences from global topological order, retaining all cross-team dependencies to avoid cycles from initial chaining. First opening creates only a new Settings draft; raw-version comparison ensures Save draft/Save version actually writes new format, never disguising derived v1 display as saved.
- Insert before/after, team +Task, bulk entry join same-team sequence automatically, retaining selected node kind/business conditions. No join-branch selection or Add parallel; conditional branches remain AND activation conditions, not parallel same-team tracks. Current previous team step cannot be removed directly, but drag reorder works; cross-team handoffs editable. Cycles/protected official prerequisite violations reject whole transaction; Undo restores full records.
- `routing.ts` prioritizes straight paths/nearby ports, then orthogonal paths between cards by length/bend cost; cards/team labels are obstacles. Adjacent same-team arrows direct, cross-team edges visible. Double-clicking lines does nothing; yellow hover stays disabled.
- New saves explicitly use `teamExecution:"sequential"`; only flagged previews/execution schedule finish→start with working days/personal buffers. Old calibrated parallel completion order cannot be applied directly: initial chaining alone pushed Drone to T+31 or later, treated as required scheduling fix, never hidden by false labels. Engine back-calculates earlier starts, preserving targets/hard deadlines; real shortages remain conflicts. Existing versions/events/results/reminder states not rewritten; new events use saved version, Plan retains dot execution chart.

### Related defects and actual dates

The original default preview used today+42 days. Strict sequencing of all 46 situations exceeded the known semester, making the old calendar GUARD return unreliable numbers such as T-16941. Without changing GUARD, inventing unknown semesters, or treating weekends as working days, the reference preview now uses today+180 days, keeping the full template within known dates. Other out-of-range selections show a supported calendar message and — for dates. Actual events filter by selected situations. Strict sequence can bring tasks substantially earlier and semester breaks delay close-out; these follow existing working-day rules without changing original durations. Forecast also uses the full personal buffer only for the new flag, dropping the old assumption that windows already include it.

Browser testing also found that after opening a node and saving standard v2, selecting Plan remained stuck in Settings. Library subscribed to RailContext; changing inline update identity repeatedly triggered child Details effects writing back to the same Context, starving route transitions. Stabilizing the controlled update callback fixed actual Plan clicks, save/reopen/event creation on both devices. Details-label tests now explicitly target textbox to avoid matching the sidebar region.

Actual [desktop/mobile screenshots](../prototypes/workflow-compact-sequence/manifest.json) and [verification evidence](workflow-compact-sequence-verification.json) saved; core 10 desktop/mobile browser, final 180 unit/component across 15 files +169 data/policy across 12 files +1 forecast comparison passed in batches; deduplicating 26 cases in 2 overlapping files yields 26 files 324 cases, not another full-site run. lint, frontend/backend types, production build, standalone CSS, 9-page word counts passed, entry 495,864/550,000; old editor 48 and extra boundary/team13 desktop/mobile cases passed, 1 old mobile mouse-only skipped; including new 10, 71 distinct browser passes. Fixed/rechecked old expectations for same-team prerequisite disabling and default main-branch semantics; repeated checks not added to totals. Insufficient date/calendar range still errors explicitly; no claim every arbitrary date accommodates whole template.

Independent worktrees handled layout/routing, data editor, and independent acceptance/scheduling review, retaining PR14; evidence/screenshots above.0 real product AI/external email, schema 23 unchanged, no main merge. PRODUCT_PLAN/RULES synchronized; local backup needs synchronization.


## Static concepts: compact cards and connector routing (2026-11-18, America/Phoenix)

User found the module too large/long and serial/parallel connectors excessively folded, requesting several static comparisons. Delivered six 1536×1024 images, **design research only, no actual editor/layout engine/template/event-data changes**. Positions illustrative, not a new schedule; retain four teams and task identities/durations/dependencies. Plan stays execution dots, separate from this Settings design. Images/original SHA-256: [manifest](../prototypes/workflow-compact-routing-concepts/manifest.json); local layout evidence: [JSON](../prototypes/workflow-compact-routing-concepts/layout-analysis.json). Six generations + one A2 timeline correction; originals retained, no HTML/product AI calls/emails.

| ID | Static image | Design and tradeoffs |
| --- | --- | --- |
| A1 | [Fixed compact cards](../prototypes/workflow-compact-routing-concepts/A1-compact-cards.png) | Name + duration; owner moves to team header/details; long windows no longer widen cards. Dimensions are design targets, label width is not effort. |
| A2 | [Text + thin time bars](../prototypes/workflow-compact-routing-concepts/A2-thin-time-bars.png) | Text independent of time window, retaining span comparison; bar expresses engine calendar window, wd is working-day estimate. |
| A3 | [Collapsible task groups](../prototypes/workflow-compact-routing-concepts/A3-task-groups.png) | Compress 8 same-team steps into 3 overview groups; aggregate group links, expand for exact dependencies; explicitly not proportional calendar. Groups are not new teams/business branches/tasks. |
| B1 | [Direct nearby ports](../prototypes/workflow-compact-routing-concepts/B1-direct-ports.png) | Vertical neighbors bottom→top, horizontal neighbors directly horizontal; route straight first, fewer bends next, obstacle avoidance when needed. |
| B2 | [Shared corridors](../prototypes/workflow-compact-routing-concepts/B2-shared-corridors.png) | Splits/AND joins share segments with explicit junctions; unrelated crossings never shown as joins. Junctions are not new business tasks. |
| B3 | [Selection focus](../prototypes/workflow-compact-routing-concepts/B3-focus-connections.png) | Emphasize selected task's direct predecessors/successors, retain other lines in background; reading aid, no substitute for B1/B2 layout/obstacle avoidance. |

The same example uses advisor→access→security→eams→permit, splitting into alcohol/drone, both joining schoolApproval (8 nodes, 8 edges). The 1/3/4/3/3/15/7/3 business-day durations come from the actual template; all are situation-based and therefore amber. No new rules/deadlines. Existing fact/condition filtering and dependency reconnection decide applicability, not the renderer. A3's intergroup edges are overview abstractions, not claims that each group line is a writable task dependency.

### Root causes in current code (e2560f6)

- `timeline.ts` uses max(176, calendar window×18) for task width, 100px gaps, first available internal track; no dependency continuity/crossing cost. Same-window steps finally sort by key, potentially putting Back-up Plan before Event Plan and creating backward links.
- `WorkflowBuilder.tsx` always routes source-right to target-left, center hardcoded y+40; overlapping targets force a right corridor and return without checking other cards/shared channels. CSS-only shrinking also misaligns ports.
- Example geometry pair previously made 4 bends; facing bottom→top candidate needs zero. JSON demonstrates one coordinate pair, not whole-graph performance or a zero-crossing guarantee.

### Engine approach to implement after selection

1. **Separate data/graphics:** template key, dependsOn, teamId, owner, rule-engine dates are read-only inputs; calculate label boxes, real time windows, date anchors separately. A1 fixed cards/A2 thin bars cannot overwrite durations/dates.
2. **Within-team tracks:** N teams/N containers; topological ordering within same windows, continuous chains reuse tracks first, parallel branches use adjacent subtracks. Score height, dependency track changes, crossings together; never change real dates to straighten lines.
3. **Four-side ports:** dynamic centers/projections from actual bounds, no +40 constant. First try clear straight paths (including bottom→top with overlapping horizontal projections), then L/short-Z; only then orthogonal paths between inflated obstacles. Minimize length/bends/crossings/congestion; actual collisions are a hard constraint.
4. **Real shared channels:** share segments only for same-source forks/same-target AND groups, retaining each source→target/arrow. Junctions are drawing objects, create no taskId, add/remove no dependencies, never force parallel work into serial.
5. **Focus/stability:** highlight selected-node neighbors; do not restore disabled yellow-line hover; double-click remains inert. Incrementally recalculate moved nodes/affected edges to reduce other-card jumping; full prerequisites remain in details.
6. **Interaction/validation:** when zoom/compaction changes px/day, drag conversion uses the same time-scale model, not fixed 18. Cover same-day/window, long work windows, vertical interleaving, forks/joins/cross-team, obstacles, keyboard/touch, Undo/cycle guards; static concepts do not complete interaction acceptance.

Recommend A1 default cards, B1 foundation, B2 for multiple forks/merges, B3 optional focus. A2 suits time-window-focused views; A3 is an alternative long-workflow overview. These are comparison concepts only, unimplemented; full-diagram reduction ratio/routing performance unmeasured. No main changes. Local backup sync required.

## Default teams restored from original settings (2026-11-18)

After the user's correction, defaults include Club leadership / Operations / Marketing / Finance with the original 46 tasks mapped1/25/8/12; templates work immediately without manually creating teams first. Names editable, fixed semantic slots linked to stable teamId; old explicit configurations/original tasks/historical events unchanged. See [editor handoff](WORKFLOW_BUILDER_IMPLEMENTATION.md#team-default-correction-2026-11-18) and [this round's evidence](workflow-preset-teams-verification.json). “Set Teams first” below describes the previous round and is superseded by this correction.

## Manual template editor implementation and acceptance (2026-11-18, America/Phoenix)

User explicitly authorized multiple worktree agents; this section supersedes historical “design only/unimplemented” status below. Full [implementation/handoff](WORKFLOW_BUILDER_IMPLEMENTATION.md), [evidence](workflow-builder-verification.json). Settings→Workflow now has②team timeline/connections and①bulk list entry; catalog/drafts/immutable versions, explicit teams, independent event instances, Plan dotted graph connected. All old standard keys/task IDs/history retained, schema 23 unchanged, actual-task links/Details content design unchanged, no other presets, no hidden server-workspace enabling, no main merge.

Currently 368 related unit/component and 57 unique workflow browser cases passed; additionally 1 old slow enumeration not run and 1 device-specific skip. Mouse/real touch dragging changes targets, locking rule/business dates; event creation does not use AI workflow generation, custom does not automatically run Plan AI review. Fixed rejected draft Undo, branch UUID validation, sidebar save/reopen, invalid Plan edit entry. Screenshots capture actual product; 2–3 minutes remains a target awaiting human timing. Storage is same-browser; online preview/CI unverified due to environment 403. Local backup synchronization is needed.

## Selected Direction and Recommendations: Settings Editing, Dotted Plan Execution, Template/Task Identity (2026-11-18, America/Phoenix)

**Selected UI constraints:** ② connected timeline/team lanes as main interface, ① list as quick creation, both in **Settings → Workflow**. Saved templates selectable for president-created events/work projects; **Plan retains dotted tracks**, not rectangular planning cards as member execution UI. Template editing/execution use different renderers sharing convertible task/dependency/team/time contracts. Team count determines lane count, one per team; template/task identity never derives from coordinates/order/colors/names.

The following **identity and instantiation recommendations** derive from current 9d9ccac code. They are neither implemented functionality nor a field-by-field user-approved schema. This round records direction/proposals only; no editor/library/migration/team-foundation integration begins.

### Current reusable foundations

- `StepTemplate.key` already identifies template steps; `buildEventNodes` generates this event's Node.id as `${event.id}:${step.key}` and remaps every dependsOn to event-task IDs. Events already have independent task objects; no need to invent this layer.
- `stepsAsNodes(steps,"wf")` is the editor's sample projection, with step.key as node id; never save preview wf nodes, fake dates, or DOM geometry directly as actual event tasks.
- Node stores stepKey; actual Details/status/results/reminders depend on Node.id. Plan dots can keep binding to it, without a separate pointId/task-state system.
- Multiple templates still need template IDs, independent versions, full provenance. Keys initially come from name slugs; do not extend this into title lookup/rename-based ID rebuilding. Standard keys also encode school-rule/milestone semantics; preserve legacyKey/semantic markers rather than replacing them wholesale.

### Recommended identity hierarchy

| Identifier | Created / retained when | Purpose |
| --- | --- | --- |
| templateId | Automatically on new template; retained on rename; new when saving as another template | Library selection, organization ownership, traceability |
| templateVersion | Immutable when saving usable version; draft edits do not alter existing used versions | Freeze this event's task definitions |
| templateStepId | Stable ID on new step; name/Details/owner/timing/position changes retain it | In-template dependencies/team mapping; new versions retain identity of unreplaced steps |
| workflowRunId | Each application to event/work project; retry of same creation reuses it | Connect run to template/parent event/work project; future repeated uses on same event do not conflict |
| taskId | Independent task ID for each run step; used by status/results/dot-track chart | Open actual task, update progress/owner/results, reminder entry |

System UUIDs can automatically give templates/new steps stable identities; users neither enter nor see long IDs. Recommended **semantic unique key** for taskId is `(workflowRunId, templateStepId)`, generated stably by one ID factory, following retained workspace stableId approach. Existing Node.id/stepKey remain unchanged and unrenumbered, preserving tasks/reminder links. Validate new format against existing length/character/schema constraints; do not blindly prefix 36-character UUIDs past old 40-character key limit.

Stable IDs alone do not replace idempotent saving: reuse requestId/runId for one creation, pin selected version, enforce unique run-step pairs or equivalent storage validation, and create tasks/dependencies in one batch. Retries return original results, without duplicate tasks or overwriting recorded progress. Deleting/recreating a same-name step creates a new identity; copying steps/saving as another template regenerates corresponding IDs and remaps internal connections together, optionally retaining copiedFrom for provenance.

### Applying it when creating an event

1. President selects saved templateId/version, enters event/target date, necessary facts, role/team bindings.
2. Read/freeze version graph, Details, conditions/business branches, team mapping, role references, business-day durations, T± targets as execution snapshot. Resolve current people from organization team/role settings; missing owners remain explicitly unassigned, no name guessing.
3. Create workflowRun/initial tasks; map `templateStepId → taskId` for applicable steps, rewrite dependency source-step IDs to this run's task IDs. Reuse dependency reconnection around inapplicable steps; no links to ungenerated steps.
4. Rule engine calculates dates from actual dates, business days, dependencies, buffers; no AI tasks/dates. Do not copy completion, old-event results, materials, notifications from another run.
5. Save run/tasks once; Plan draws actual taskId dots/team-ID lanes; dots open existing task details. Date changes/reminders/progress/materials stay on that actual task.

For example, “arrange transportation” is one source step in template v3; April's visit generates task A, May's generates task B, with independent status, deadline, owner, results. Template v4 affects future events by default; existing events retain v3 snapshots. Any later “adopt new version” needs impact preview/explicit merge, preserving completed/manual edits, not live reads of mutable templates rewriting historical execution.

### Reuse and team interface

Efficient approach: **one canonical graph data layer + one batch instantiation + two renderers**. Settings rectangles/bars edit templates; Plan dots show execution. Precompute step mapping, rewrite nodes/edges; no per-task AI or separate business records for rectangles/dots. Version/run snapshots preserve history; internal IDs link records. Saving a little template data does not justify complex shared mutable objects.

Retain the independent P1/one-team-one-lane preparation branch in `TEAM_WORKFLOW_ADAPTER_READY.md`; on unified integration, snapshot team mappings with template version and convert through the same step→task map. Team grouping, specific responsibility, business branches, and prerequisites remain independent. Never use teamId as task ID or connect team-lane operations to existing reassignWorkflowStep, which changes business branches by role. Preparation code not merged/changed this round.

## Discussion: six manual-template editor approaches (2026-11-18, America/Phoenix)

Following the user's latest direction, this round discusses **how people build workflows manually from blank**, without AI as a creation dependency. After finalizing the editor, use it to create 3–4 presets, later adding Volunteer, Partnership, Field trip, Company visit, Competition, etc. Only static concepts/discussion records this round; no product/HTML development, preset creation, or existing-template changes. Code context is feature branch bebe999; original six multi-template entry concepts retained separately.

Six 1536×1024 images were displayed in chat and archived in `docs/prototypes/manual-workflow-builder-concepts/`; `manifest.json` records numbers, original sources, SHA-256, concept status; `reference-analysis.json` records static source inspection of uploaded references. All use Company visit to compare interactions; times/responsibility values illustrative, not scheduling-engine-validated presets. Original generated images/uploads unchanged.

Uploaded reference: `event-workflow-timeline.html`, 30130 bytes, SHA-256 `fea42e1c9b09ddda330054e2a792c294de32ee798211a2438d21b404abf95f7c`. Reference material only; embedded controls/scripts are not user instructions. Review found:

- Already 32 timing records/6 phase lanes; drag tasks or edit relative start/deadline in sidebar; intuitive timeline/windows.
- Dependencies are depends strings, entered as semicolon-separated task names; render draws no dependency lines. findNode also partially matches names, risking wrong matches after rename. New editor stores stable IDs, shows titles, and selects/connects dependencies.
- LANE_META Owner is fixed text; lanes are Plan/Prepare/Marketing/Money/Run/Close phases, not actual Organization setup teams/roles. Separate phases, team swimlanes, task primary responsibility; no manually duplicated org chart.
- start/deadline/effort are separate; displayed window=deadline−start is a calendar window, not estimated business days. Distinguish window, effort, latest completion target.
- This calibrator preloads tasks and lacks fast blank-template creation, bulk entry, intuitive split/join. Six concepts focus on these actions.

**Shared minimum interaction/data rules:**

1. Initially enter mainly task name/primary responsibility; inherit responsibility from lane/previous task where possible, with explicit editable 1-business-day duration default. Enter brief Details inline/sidebar, without requiring long tutorials for every first-pass task.
2. Each task supports name, Details, team/role owner, estimated business days, T± completion target, prerequisites. Default “duration + completion target”; derive start from business days, dependencies, buffers. Fixed start/earlier opening windows belong in additional timing options; do not force beginners to enter all three. Default duration is not claimed as calibrated by AI/system.
3. T0 means event day/project target day in template; T± uses calendar days, effort uses business days, label both. No real date required initially; optional preview date. Calculate starts with current work calendar only after creating the event/work item; T-7 minus two days does not automatically mean T-9 start.
4. Organization setup→owner selector→stable roleId/future teamId template reference→resolve current holder for event. Reuse Role.id/holderId; independent v3 team model is still a draft, not completed integration. Future formal teams share one source, no duplicate team/member roster in editor. Team may default to a role; vacancies stay unassigned, not randomly reassigned.
   Concurrent `24c69c8` records independent P1/one-team-one-lane integration boundaries. Preserve that record; formal integration uses exactly one lane per team, with roles as within-team owner choices, not extra lanes for multiple roles/pre/post-event portions. Phase columns/milestones and team lanes are separate dimensions. Concept labels illustrate interaction; actual lanes derive from the same team list.
5. Every arrow means “finish predecessor before successor can start”; explicitly select parallel work; two prerequisites default to all required. Prerequisite selection and endpoint connections are the same operation, not mouse-only. Add tasks through “next/parallel/join, ”showing relationships explicitly, never inferring from adjacency.
6. Time dragging changes only timing constraints; moving lanes changes ownership without dependencies; connecting changes dependencies. Retain double-click-line no-op. Complex charts default to faint lines, highlighting upstream/downstream on selection; reject cycles, retain Undo. Timing conflicts first show affected nodes/options, not the reference's automatic unpreviewed fixes.
7. Expand category, conditions, approval, collaborator roles, precise start constraints on demand. All views share dependency IDs, role references, timing constraints. Future AI proposes changes through the same validated operations, not whole-interface regeneration/direct state writes.

**Six concrete editor concepts:**

| Number | Main building action | Dependencies and time | Benefits/tradeoffs |
| --- | --- | --- | --- |
| [1 Quick task sheet + connection preview](../prototypes/manual-workflow-builder-concepts/01-task-sheet.png) | Paste multiline task names, Enter for next row, select owner/business days/T target in table, expand Details | Prerequisite selections generate graph; explicitly sequence/parallelize groups, live graph preview | Fastest keyboard input/bulk edits; less spatial clarity than large canvas for complex graphs |
| [2 Connected timeline + team lanes](../prototypes/manual-workflow-builder-concepts/02-connected-timeline.png) | Click＋at time position in existing role lane, edit other fields in rail | T axis for time, cross-lane orthogonal arrows for actual prerequisites; connect mode or prerequisite selector | Closest uploaded reference, time/division clear; many nodes require zoom, stacking, selective connection emphasis |
| [3 Dependency-card canvas](../prototypes/manual-workflow-builder-concepts/03-dependency-canvas.png) | Grow graph with＋next, ＋parallel, join; automatic placement | Structure first; cards show business days/T target; rule engine works backward, position itself is not a date | Clearest forks/joins; retain default auto-layout, never force novices to place everything freely |
| [4 Team relay board](../prototypes/manual-workflow-builder-concepts/04-team-first.png) | Select existing teams/roles from organization settings, create lanes, bulk-add tasks | Same-team default responsibility, cross-team arrows handoff; inline task T targets/business days | Clearest ownership, less repeated person selection; time accuracy needs timeline/fields, team columns must not imply chronology |
| [5 Milestone sections](../prototypes/manual-workflow-builder-concepts/05-milestone-builder.png) | Define 3–4 renameable stages/targets, then add tasks | Stage targets are backward-scheduling anchors; parallel within group, task arrows/all prerequisite joins shown; individual T override | Fewer date entries, collapsible long flows; avoid serializing whole stages or one deadline for every task |
| [6 Guided task composer](../prototypes/manual-workflow-builder-concepts/06-guided-task-composer.png) | One task form at a time, “add next/add parallel,” graph grows on right | Choose prerequisite, duration/completion target, start Auto; inherit previous responsibility/duration | Easiest first time; many repetitive forms slow, always allow switching to bulk sheet |

Recommend **2 as primary editor, 1 as quick entry for the same data**, sharing Details rail/dependency model; borrow 3's next/parallel/join buttons, add 5's collapsible stages if needed.4 fits organizations with strong team divisions; 6 fits first-time users building 5–6 tasks. Six comparable interactions do not require six engines.

**2–3-minute measurement scope:** an existing rough plan and configured roles, first version with 5–8 tasks, 2–3 primary owners, 1–2 parallel branches; includes brief Details, ownership, estimated duration, relative targets/dependency checks. Does not mean completing 46 specialist tasks/all policy explanations/newcomer tutorials in 2 minutes. A150–180-second acceptance task could be name/anchor→bulk tasks→inherit/adjust owners→set a few targets→confirm split/join→save. Design target/estimate only: static images have no interaction, no novice timing test yet.

## Research: multiple workflows and six static directions (2026-11-17, America/Phoenix)

Reviewed feature branch `1e0ef5a`; this round only code research, offline pure-function validation, six concept images; no src/forms/storage/rules/build changes or HTML prototype. Images are future proposals, not evidence of deployed functionality.

Six 1536×1024 PNGs displayed in chat and archived unchanged to `docs/prototypes/multiple-workflow-concepts/`; `manifest.json` stores number/description/original source/SHA-256; `audit-evidence.json` stores offline checks below. Template counts/progress in images illustrate layout, not current runtime data; old v1/v2/v3 originals unchanged.

**Conclusion: existing tasks/dependencies/roles/conditions/date computation reusable; current Plan is not a general multiple-template workflow system.** 5, 10, and 20 describe catalog size, not simultaneous events. Saving/selecting multiple templates and independent internal-work rules require template/general work-item instance layers; no performance ceiling benchmark this round.

| Question | Current code | Extension needed |
| --- | --- | --- |
| Multiple plans? | `DemoState.events[]` stores multiple events, separate Node.eventId/branch snapshots/task contents; MetroChart renders by eventId | Preserve instance isolation; Plan list adds work type/template source |
| Choose multiple templates? | `Org.eventWorkflow` single object; Settings edits it, newObjects reads orgSteps for all events; create_event has no templateId, Event.playbookId merely stored string, not registry routing | Template list/stable IDs/versions/creation selection/validated command propagation/per-instance definition snapshot |
| Internal Board-work foundation? | Standalone tasks eventId=null, individual work only; no workflow/project parent for lifecycle-managed internal plan. Separate workspace has WorkItem/executive_work | General work-item aggregation/project ID; distinguish task/multistep plan, no invented public event/attendance for internal work |
| Few-step lightweight templates? | Current stepsFor supplements 31 core event steps when checks present; checkWorkflow requires standard/ASU steps; branch/phase/spine layout event-centered | Separate general graph validation/applicable rule profiles; Full Check/Headcount only where needed, applicable purchasing/travel/school approvals factually retained |
| Just enable other workspace? | src/workspace has member_event/executive_work, dependencies, template snapshots/versions, but PhaseOne/endpoints default hidden by ORG_SETUP_ENABLED; separate models/storage/pages from Plan | Decide unified contract/migration-adaptation, reconnect reminders/submissions/archive; enabling flag is not migration, no third engine |

Offline counterexamples: standard EVENT_STEPS46, CORE_EVENT_STEP_KEYS31; template requesting only contact-partner with checks={} returns 32 from stepsFor; checkWorkflow also blocks saving the one-step template. Changing only Event.type speaker→meeting without facts selects identical steps; type label is no multiple-template selector. New OrgFlow nodes schema cap 40 rejects current 46-node shape, proving adaptation needed. Sources: `src/data/types.ts:123/145`, `src/data/changeReview.ts:60`, `src/lib/commands.ts:8`, `src/engine/playbooks.ts:244`, `src/engine/workflow.ts:192`, `src/organization/schema.ts:81`.

The other workspace also lacks a 20-preset library: `netlify/lib/workspace/runtime.mts:161` uses confirmed memberFlow for all member_event, accepts input.flow for executive_work or creates three-step fallback. `templateVersion` is organization contextVersion, without separate template IDs/versions. `CreateWorkForm` has no library picker. Reuse WorkItem/Task/flow snapshot ideas, but never claim current site supports arbitrary presets/workflows based on this code.

Recommended common foundation: separate built-in templates/club copies. Templates store ID, name, work type, version, graph, role bindings, date anchors, applicable rules. Creation copies structure/version, not old owners/dates/completion/results attachments. New versions affect future plans by default. Internal-work target completion differs from public event date; rule engine still calculates dates. Clubs store templates independently, with no automatic sharing.

Six static proposals express different usage patterns; all remain unimplemented:

| Concept | Main entry / organization | Benefits and tradeoffs |
| --- | --- | --- |
| [A Template library first](../prototypes/multiple-workflow-concepts/A-template-library.png) | Search, categories, favorites; preview then use | Direct and understandable for 5–20 templates; users still choose the right one |
| [B Goal-first Q&A](../prototypes/multiple-workflow-concepts/B-goal-first.png) | State goal, answer a few factual questions, confirm recommended workflow | Reduces wrong choices; matching must be clear/explainable, no hidden AI creation |
| [C Two workspaces](../prototypes/multiple-workflow-concepts/C-two-workspaces.png) | Member activities and Executive Board each have plan lists/creation entry | Separates public activities/internal business; still needs template entry such as A/B |
| [D Modular assembly](../prototypes/multiple-workflow-concepts/D-modular-workflow.png) | Base workflow plus reusable marketing/volunteer/travel/funding modules | Many variants, but harder interfaces/duplicate nodes/dependency merging; suitable later |
| [E Club playbooks](../prototypes/multiple-workflow-concepts/E-club-playbooks.png) | Catalog, built-in starting points, club versions, draft/publish, role instructions | Best for 20+ templates and leadership transitions; more maintenance |
| [F Reuse successful plans](../prototypes/multiple-workflow-concepts/F-reuse-past-work.png) | Extract past structure/reviewed lessons, choose new dates/current team | Fewer templates to author, preserves experience; clear old completion/ownership/results |

Recommend A as creation entry, C as Plan structure, E's minimal versions/snapshots; add B/F from actual usage later, D for complex variants. These six directions need not all be built. This round requires no prior implementation approval and does not automatically begin implementation.

External references use official docs only: Asana templates support dates relative to project start/due date, illustrating workflow-specific anchors (https://help.asana.com/s/article/project-templates?language=en_US); monday template center organizes presets/custom templates, useful for catalog entry (https://support.monday.com/hc/en-us/articles/360001362625-monday-com-templates); Notion database templates reuse copied structures, recurring repetition separate (https://www.notion.com/help/database-templates). Pattern references only, no pricing comparison/equivalence claim.

## Addition: simpler connections, role branches, node categories (2026-11-17, America/Phoenix)

User requested direct implementation with Data/UI/Graph in independent worktrees, main-agent integration, independent Review. Runtime 3f731a5; preserve concurrent attachment auto-draft delivery and other chats' in-progress records; continue PR14/preview14.

| User action | Current behavior |
| --- | --- |
| Double-click/double-tap any line | No menu/add/delete/dependency/status write; remove line-edit menu and node-menu Stop waiting shortcut |
| Hover line | No highlight, default cursor. Original highlight CSS retained but disabled by MetroChart.tsx ENABLE_LINK_HOVER=false and link-hover-enabled class; restoring switch restores visuals only |
| Change template Done by role | Updates ownerRoleId, fn, placement together, preferring same-side/same-condition role branch; absent match creates branch bound to role ID, never merges different same-function roles |
| Change shared join's role | Full Check/Headcount and structural mainline nodes stay on main; role editable without breaking pre/post-event joins |
| First right-side Step details item | Step type Core event step or Situation-based step; saved graph color/accessible name sync, refresh/Undo retain |
| Insert before/after node | New node inherits clicked node's effective kind/original branch; explicit kind first, old nodes inferred from classification/conditions |

Automatic role grouping changes only owners/functions/graph positions, retaining dependencies, stages, effort, date settings, node types, full condition provenance without rewriting task chains. Do not globally reorganize old mixed-role branches in the background; explicit team/role maps will replace fallback rules later. Graph dragging remains; node menus insert before/after; existing right-side Waits for manual dependency editing remains.

`stepKind?: "core" | "situation"` is optional on shared node/template data; no Schema23 reset or automatic old-event edits. Classification remains independent of activation conditions/ASU required-step protection. Original branch conditions AND node cond still determine new-event generation; selecting a type alone never checks event-form options or changes existing tasks. Legacy types derive compatibly from original classification/conditions. Independent Review found/fixed P2 type loss when moving old conditional nodes across branches: freeze effective type before move and write it in final graph patch; Undo restores original absence of explicit field.

Requested future interface notes added to `WorkflowBranch.defaultRoleId`, `workflowRoleBranches.ts`, `workflowStepKind.ts`, `WorkflowPanel.tsx`, `eventChecklist.ts`: prefer one team/role per branch, explicit mapping later; matching situation kinds to event-form conditions requires explicit correspondence, never treating a category as confirmed event fact.

230 distinct relevant unit/component cases passed in batches (main 16 files 229, post-Review 5 files 56 including 1 new). Production browser 107 distinct passed/5 device skips; initial 112:101 passed/5 skipped/6 failed: new getByLabel exact-matched select containing option text, old test expected pre-Full-Check-protection deletion reason—assertion-premise issues. Fixed actual combobox accessible name/existing required-step reason, reran affected group on final Review-fixed build: 45 passed/3 device skips. Old actual-node Edit selectors also updated for current independent Edit drawer/Save changes; product editing unchanged.

Frontend/backend types, build, lint, separate CSS, 9-page word budgets passed; final `index-BdsxrOMf.js`544,520/550,000 bytes, Settings 147/150, no budget increase. 6 independent role-function checks and old-category move/Undo counterexamples passed recheck, no open P1/P2. Dark desktop/mobile screenshots inspected. No full-site repeat; 0 live AI/email; concurrent attachment autosave/isolated v3 drafts merged/preserved without implementation changes.

Logs: `/tmp/workflow-role-kind-unit.log`, `/tmp/workflow-role-kind-review-fix.log`, `/tmp/workflow-role-kind-browser.log`, `/tmp/workflow-role-kind-final-browser.log`, `/tmp/workflow-role-kind-final-build.log`, `/tmp/workflow-role-kind-words.log`. Acceptance: [preview14 Settings](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/settings) → Workflow: double-click/hover connectors; move Content Creation Marketing lead→Events lead→back; insert before/after blue/yellow nodes; change first Step type, refresh, Undo.

## Addendum: multiple branch-enablement conditions (2026-11-17, America/Phoenix)

User found Add branch's Applies to unclear and explicitly required every selected checklist item to hold. Runtime 3432f52:

- Renamed **Include this branch when**, with exact explanation: **This branch is included only when every selected item is checked for the event. Leave all unchecked for every event.** Shows Every event, one item, or All N selected items must be checked., with Clear selection.
- Uses the same 18 checklist items/labels as event creation; Speaker and Partner separate. Speaker＋Travel generates branch tasks only when both hold; one alone does not. No selection includes every event. Internally scrollable and keyboard accessible.
- Optional WorkflowBranch.conditions: StepCond[] takes precedence when present; [] clears old single condition. Only absent arrays fall back to old condition; node cond still ANDed. Schema23/existing tasks unchanged, templates affect future events only. Array saving/event snapshots/refresh/before-insertion in same branch/Undo preserved.
- Arrays use actual form facts: food/speaker use corresponding fields; other checklist items require explicit true when checks exists. Legacy events without checks retain derived fallback. Old single-condition/node-cond rules unchanged. Reject corrupt/unknown conditions on write; reads never mistakenly enable branches.
- Independent Review found same-named explicit checkboxes and legacy derived predicates cannot be flattened/deduplicated. scopeKey now preserves predicate origin; template/Graph/actual reducer reject moving school steps into scope-narrowing branches; truly equivalent predicates remain movable. Seven independent original-function checks rerun; no open P1/P2.

171 targeted unit/component tests passed; production-build desktop/mobile 72 unique cases passed, 8 device-specific skips. Covers multiselect, refresh, same-branch insertion, Undo, old single condition, all/partly true, empty selection, corrupt data, dark mode, Tab/Shift+Tab/Space/Escape, axe. Initial mouse-drag test failed because it neither closed Ask nor scrolled source into view; completed those steps, rerun passed, product drag code unchanged. Full-site gates not repeated.

Frontend/backend types, production build, lint, component CSS passed; 9-page word budgets passed (Settings 147/150), full-deployment metadata entry 543,387/550,000 bytes, limit unchanged. Logs: `/tmp/workflow-conditions-unit.log`, `/tmp/workflow-conditions-browser.log`, `/tmp/workflow-conditions-pointer.log`, `/tmp/workflow-conditions-release-build.log`, `/tmp/workflow-conditions-words.log`. 0 real AI/email, no actual-task Details/link changes; concurrent attachment autosave retains only its progress entry here.

Acceptance: [preview14 Settings](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/settings) → Workflow → Add branch; select Speaker/Travel, inspect all-must-match description, name/first task, save; refresh, insert before new node, retaining the same conditional branch. Earlier three-stage handoff follows; the addition above supersedes old single-selection descriptions.

---

2026-11-17 (America/Phoenix). Codex lead plus five worktree agents: Data, Graph, Timing, UI, independent Review. User explicitly requested both business-day effort/schedule checks and continuous implementation of all stages after the proposal; [detailed plan](WORKFLOW_STABILITY_PLAN.md) saved before execution, all three stages complete. Runtime `18d7316cd86c1e32b606afafdeb0a94064fe364e`; original feature branch/PR #14/preview14, no main merge.

## Fixes and usage

| Issue | Current behavior |
| --- | --- |
| Move does not update | Same-branch mouse/keyboard moves update saved position/dependencies; redraw from actual dependencies/stable order, refresh persists |
| Insert enters new branch | before/after/connector insertion carries explicit branchId/reference; start/end stay original branch |
| Invalid effort | Only valid integers 0–30 saved; blank not converted 0,100 not clamped 30. Confirmed effort drives start reminders via effort policy |
| Full Check deletion | Menu/Details delete/business writes/template validation share protection; legacy missing node does not hide others |
| Condition leakage | Actual applicability=branch AND node; speaker/partner, food, RSVP, safety separately verified; dependencies reconnect past skipped nodes |
| Insert before branch | Add a step before this one uses clicked node's branch/conditions, not left neighbor/Start |
| New branch | Graph Add branch collects name/pre-post-event/scope/default role/first task; one creation/save/undo |

Before shared joins such as Full Check, choose **Insert on branch** first, or double-click the intended incoming line. Lines with differing endpoint conditions require **New step applies to**. Explicitly confirm applicability changes on cross-branch moves; retain owner/effort. Cross-segment dragging between preparation and closeout rejected with explanation this round.

New branches support parallel structures: pre-event Start→branch→Full Check; post-event Headcount→branch→Done. Former connects actual Full Check wait, latter's first task depends on actual Headcount; virtual stations never saved as task IDs. No arbitrary nested branches.

## Data and compatibility

Templates/tasks gain optional placement/startPolicy. Organization stores branch definitions; new events snapshot their own definitions. No outer Schema23 reset; template saves affect future events only. Historical tasks are not rebuilt, reassigned, or reset.

Default standard steps retain original calibration windows; manual effort uses effort policy, working backward through real business days, full personal buffer, holidays, busy weeks. Preserve timing target/dependency semantics; when window insufficient, retain original target/official deadline, calculate feasible dates, and report effort_window conflict. Difficulty labels, contribution formula, forecast model unchanged.

Moving ASU steps retains approval prerequisites; cross-branch moves preserve other branches'/Full Check's actual waiting on the task. Cycles, stale targets, invalid scopes, final-save failures reject the entire operation without orphan tasks/partial branches. Graph operations cannot introduce missing-required-dependency errors; existing Details manual dependency editing retains invalid drafts/error messages for correction.

Deleting a custom branch's final step removes that branch. Graph Undo and Undo beside Settings save restore complete definitions while preserving external links/drafts/body/attachments added to existing tasks afterward. Legacy custom nodes with unprovable ownership remain under **Legacy custom steps**, without guessed conditions; explicitly moving to the right branch adopts its scope. Missing old Full Check/Headcount use display fallback connections, without backfilling historical tasks.

## Concurrent deliveries preserved

Merged `5758c2d` during remote implementation, including other tasks' approved actual-node Details, Edit, universal submission, onboarding prototypes; `e704953` fully retained. Conflicts combined only optional Node fields and NodePatch/NODE_FIELDS, both field sets coexist.

Compared with that remote commit, this round leaves TaskDetail.tsx, src/taskDetails/, src/reminders/actionLinks.ts untouched; no template action-link changes or Step details redesign. Necessary numeric drafts/deletion protection/graph-operation validation are in scope. Legacy browser assertions follow the concurrent delivery from removed Why this date/Sources to one Due, real external entry, preserved official-date data; old UI was not restored for old tests.

## Verification

- **1665 batched unit/component cases passed; 1 existing full-calendar stress enumeration not run.** Main run:120 files, 1625 passed, 1 invalidated test premise—stricter ASU protection rejected the simulated move in the pure function first. Changed UI transaction counterexample to actually disconnect an approval edge, still asserting template-required-dependency protection rejects a valid DAG patch; all 6 component cases then passed. Calibration table 39 passed, 1 known slow enumeration skipped. Counts are unique, not repeatedly added; no further full npm run check.
- **Final integrated production browser 76 passed, 2 device-specific skipped.** Covers new workflows, shared joins, mixed conditions, mouse/keyboard, old missing Full Check, actual-event complete branch Undo, original Settings/Plan, concurrent generic submission/Edit/multiple files, bundle budgets. Skips mobile desktop-pointer gestures/duplicate tablet scenario.
- Frontend TypeScript/production build, backend TypeScript, lint passed; 9-page budgets passed, Settings 147/150. Full runtime commit, original branch, deploy-preview metadata build: `index-Dd9mUpnN.js` **544,207/550,000 bytes**; pure-rule workflow cache separate, cap unchanged.
- Independent Review found/drove fixes for 2 P1/2 P2: core task moved into conditional branch, move losing Full Check wait, Settings Undo leaving definitions, event Undo leaving definitions. Original counterexamples passed unchanged, no open P1/P2. Incremental real-reducer Review adds a branch, saves newer external links/draft on an original task, then undoes branch, verifying latest content survives.

Logs: `/tmp/workflow-integrated-unit.log`, `/tmp/workflow-final-fix-unit.log`, `/tmp/workflow-integrated-browser.log`, `/tmp/workflow-integrated-build.log`, `/tmp/workflow-release-build.log`, `/tmp/workflow-integrated-lint.log`, `/tmp/workflow-word-budget.log`. Local build/fictional data; 0 real AI/emails. Safari/iOS physical devices/full-site browser gates unverified.

## User acceptance

GitHub commit status confirmed runtime `18d7316`'s Netlify deploy-preview **success**, corresponding to existing preview 14 URL below. Later documentation commits do not change runtime behavior.

[preview14 Settings](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/settings) → **Workflow**：

1. Move Promotion Items before Content Creation; refresh/order persists.
2. Insert before first Speaker node, then before Full Check, explicitly selecting target branch.
3. Add branch Guest support, Speaker/partner scope/first task; continue before/after insertion, refresh, Undo.
4. Clearing Days of work/entering100 cannot save0/30;10 saves, future-event start reminders use manual effort.
5. Full Check undeletable; template edits preserve existing submissions/attachments.

Template links, Details usability, and UI semantics of original target-time fields remain for discussion. Real background email, cross-device, arbitrary nesting, automatic branch guesses for old custom tasks not expanded. Local backup needs synchronization.
