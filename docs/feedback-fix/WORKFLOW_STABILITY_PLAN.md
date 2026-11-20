# Staged workflow-template repair plan

2026-11-17 (America/Phoenix). Base `b18ee3c`, preparation `e87b19c`. User explicitly selected checking both work durations/scheduled dates and continuous implementation of all stages after planning. Do not request repeated confirmation within scope; no main merge/new PR.

## Goals and scope

Fix moves not updating, additions to existing branches creating new ones, incorrect effort data, Full Check deletion hiding workflows, conditional-task leakage; provide explicit same-branch before/after and Add branch. Covers WF-04/05/06/08/09/10; effort covers numeric input/start reminders; WF-09 only unifies mandatory-preservation rules against editor/generator disagreement.

Defer processing links/Details usability; do not additionally implement WF-01/02/03/11/12/13. Existing panels receive only needed numeric validation, deletion protection, new operations. Preserve parallel actual-task Details/Edit changes. Dates from deterministic engine only; no live AI/email services.

## Operation rules

| User action | Fixed behavior |
| --- | --- |
| Move within branch | Update local order/related dependencies immediately; save/refresh/new-event results agree |
| Add before/after node | Explicitly use clicked node's branch, inherit applicability by default, including ends |
| Add on edge | Use edge's branch; if endpoint conditions differ, explicitly select scope, never steal left-node condition |
| Add before shared join such as Full Check | Explicit incoming-branch selection or its edge; no default first incoming edge |
| Move across branches | Preserve owner/effort; visibly show applicability changes; reject/explain pre-event↔wrap-up cross-segment dragging this round |
| Add branch | Independent Add branch: name, pre/post-event, scope, default role, first task; create complete branch once |
| Edit business days | Save valid integers only; blank is not 0; explicit 0 valid; manual effort determines start reminders |
| Delete Full Check | All entries reject/explain structural requirement; old missing data still displays every remaining task |

Before-insertion commands require explicit `branchId`,`referenceId`. Even beside Start/Full Check, use clicked branch node; branch, role, phase, dependencies are independent.

Supported safe structure matches existing chart: pre-event Start → new branch → Full Check; post-event Headcount → new branch → Done. No arbitrary nesting/join editing. Start/Done are virtual stations, not fake task dependencies. Pre-event last step joins real Full Check dependencies; wrap-up first step depends on real Headcount; Done derives from actual completion.

## Shared data/execution rules

1. **Persist branch/position.** Optional `placement: { branchId, order }` on templates/tasks; template branch definitions, event-specific snapshots, future template changes do not alter existing events.
2. **Position is not dependency.** Group by branch, use dependency topology for sequence, stored order as stable parallel ordering. Never force adjacent tasks serial or position by dates. Moves reconnect only relevant branch-order edges, preserving cross-branch manual dependencies; reject whole operation on cycles.
3. **Layer conditions.** Applicability=branch condition AND node condition. Existing allowlist; validate Speaker, food, RSVP, security separately. Finance/Marketing/Special contain mixed conditions; never copy a neighbor's condition over the whole branch blindly.
4. **Unified protection.** Validate ASU requirements, existing CORE, structural anchors, completed actual tasks together; organization standards are not school rules. Conditional branches cannot hide mandatory nodes.
5. **One operation, one save.** Validate, persist, undo branch definitions, steps, dependencies, positions, conditions together. Invalid references, cross-event IDs, unknown branches, cycles, save failures leave no partial result/success claim.
6. **Preserve old data.** No Schema 23 reset. Standard keys only provide missing-field compatibility; never guess custom applicability from neighbors, retain visible compatibility branches on ambiguity. Reads do not regenerate historical tasks; preserve owners, status, content, attachments, reminder history. Missing Full Check/Headcount uses graphical fallback anchors, not fabricated historical tasks.

## Effort and scheduling

`CALIBRATION_REPORT.md` Section 6 lists “effort edits do not alter calibrated dates” as an unresolved difference, not a fixed defect or required approved constraint. Preserve default-table compatibility while making future explicit effort edits affect schedules explainably.

- Numeric inputs keep local string drafts; only integers 0–30 write back. Blanks, negative, fractional, over-limit values never silently become another number.
- Optional `startPolicy: window | effort`; absent retains compatibility. Explicit effort edit sets effort; Undo/restore-standard restores policy too.
- effort calculates backward from final deadline, business-day duration, full personal buffer, including weekends, holidays, busy weeks. Preserve timing targets/dependency semantics, not simply delete timing.
- Unedited standard steps/historical events keep windows; never infer effort from calendar span or change difficulty, contribution formula, forecast model automatically.
- Drag/effort never relax official hard deadlines; wrap-up cannot start before event; insufficient windows report real conflicts.
- Explicit policy protects confirmed effort from old PRE_FB6 guessing reverting defaults.

## Stages and worktrees

Stage 0's three independent analyses are complete. Implement by dependency; same-stage agents never edit each other's files. Freeze interfaces before dependent packages.

| Stage | Packages/exclusive ownership | Delivery/gate |
| --- | --- | --- |
|1 Contracts/compatibility | Lead: types/store/settings/read-write contracts; Data: branches, conditions, generation, protection, compatibility; Graph: reusable pure operations first, no incomplete UI | Persistable branch/condition/position/undo contracts; unified Full Check/CORE; old-archive counterexamples, no task regeneration |
|2 Graph/effort | Graph: metro, MetroChart, flowEdit, stepOrder; UI: WorkflowPanel, Settings, Add branch dialog, numeric drafts; Timing: schedule, separate effort helpers. Only Data writes playbooks, integrating Timing generation needs | Moves, before/after, edge addition, branches, condition isolation, effort/dates connected; unit/component counterexamples pass |
|3 Integration/independent review | Lead integrates; Review rechecks invariants, compatibility, scope; desktop/mobile browser/build/types/lint/regressions | Related cases pass; source confirms links/Details unchanged; retain PR 14/branch, check new remote commits before push |

Implementation worktrees:`workflow-integration`,`workflow-data`,`workflow-graph`,`workflow-timing`,`workflow-ui`,`workflow-review`. Planning used `workflow-graph-plan`,`workflow-timing-plan`,`workflow-scope-plan`, without product changes. Agents commit their packages only; lead integrates sequentially, instead of each pushing shared preview.

Single writers are essential:`types.ts/store.tsx/settings.ts` lead;`playbooks.ts/workflow.ts` Data;`stepOrder.ts/flowEdit.ts` Graph;`WorkflowPanel.tsx/Settings.tsx` UI. Cross-package needs go through frozen interfaces/owner patches, not overwrites. Actual-task Details/Edit is concurrently active; review/preserve increments before merging.

## Required counterexamples and user acceptance

| Category | Counterexamples |
| --- | --- |
| Move | Mouse/keyboard Promotion Items; assert real display order, dependencies, save, refresh. Preserve cross-branch upstream/downstream; unrelated neighbors never forced serial |
| Existing-branch additions | Before first, before/after middle, after last, edge insert; correct with same role on two branches; shared Full Check never guesses incoming edge |
| Conditions | Independently toggle speaker/partner, food, RSVP, security; disabled additions skipped correctly, no ghost dependency IDs |
| New branch | Pre/post, always/conditional, repeated addition, new events, refresh, Undo, cancel; no mobile overlap |
| Delete | Full Check rejected everywhere; editor/generator mandatory sets agree; old missing Full Check/Headcount still shows all tasks |
| Effort | Blank, 0,10, negative, fraction, over-limit, switch, undo, refresh; 2→10 changes manual-policy start, official date unchanged |
| Calendar | Weekends, holidays, busy weeks, buffers 0/1/3; insufficient wrap-up conflict; unedited standard dates stable |
| Save/restore | Unknown IDs, stale gaps, cycles, write failures atomically rejected; complete template/event snapshot Undo; no rebuilding historical content/status/owners/reminders |
| Exclusions | No incidental processing-link, Details, actual submission/Edit, difficulty/contribution, real-delivery rewrite |

Final walkthrough from Settings: speaker workflow move → insert before → add conditional branch → edit workdays → refresh → create speaker event → compare ordinary event → verify dates/reminder facts. Tie conclusions to actual branch code/tests; “all old tests pass” cannot replace these counterexamples.

## Rollback and risks

Separate commits retain package boundaries. Metadata packages cannot roll back UI while discarding saved fields; disable new operations first, retain parsing/export. No browser-archive clearing, main edits, paid AI at any stage.

Risks: unrecoverable custom applicability, moves deleting cross-branch dependencies, blanket default-date recomputation, Undo restoring nodes without branches, shared-file collisions, visual joins not equal actual waits. Address through explicit ownership, layered conditions, local dependency edits, compatibility, complete snapshots, single owners; do not silently turn all existing visual joins into mandatory dependencies.

Stages 1/2/3 complete, runtime 18d7316; results, compatibility, acceptance:[repair handoff](WORKFLOW_STABILITY_HANDOFF.md). Local backup synchronization is needed.
