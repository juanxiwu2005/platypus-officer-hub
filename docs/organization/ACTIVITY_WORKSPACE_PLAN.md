# Activity Platform Execution Plan (Approved for Implementation)

2026-10-26 (America/Phoenix). This round: read-only verification/plan review, no product changes or live AI calls.

## 1. Agreed direction and scope

User selected A1 daily-management home + B1 member-activity list + C2 timeline-centered activity details. Personal tasks center on Board; activity lists use short workflow chains; Funding becomes an activity branch. Include prior explicit requests: global right-side AI, stable IDs/name synchronization, free navigation across five chapters, click-delete workflow edges, remove Connections/per-node Mark reviewed, clarify file entry/deduplicate navigation.

Begin worktree implementation only after approval; deliver development preview for acceptance, without main merge/production release. English UI, Chinese docs [historical documentation rule; superseded by current English policy]. No raw research interviews read/committed or extra paid model comparisons.

## 2. Current code facts

- Both GitHub development branches verified at 1815be02d83bc67ed35eb6970d14f0ed6a3023c6; main 4dc55ba. Refetch before implementation to confirm latest shared baseline.
- src/pages/Tasks.tsx/src/data/board.ts already support dragging/order/personal filters/keyboard status menus. Default remains Table; six columns include Not claimed/Waiting/Done; standalone tasks possible.
- Old Tasks/Events share DemoState.nodes; board edits affect event nodes, persisted in browser localStorage.
- src/phase1/ApprovedWorkspace.tsx consumes server-approved organization templates, without actual activity instances/personal-task write path. Mounting old board in new page is not integration.
- New templates support dependencyMode=all/any; old taskWorkflow.ts/schedule.ts mainly all, requiring explicit adaptation.
- `src/pages/Funding.tsx`/`src/data/store.tsx` six funding stages independent of task nodes; next is not real approval.
- playbooks.ts includes ASU rules/club practices/budget-quotes, but lacks complete 8/7/6-week anchors. Add these user-specified organization defaults, never label school rules.
- Existing calendar covers explicitly listed semesters only; timeline must check coverage, never treat unknown semesters as holidays or invent schedules.

## 3. Pages and layout

### 3.1 Unified navigation and A1 home

Fixed left Home, My tasks, Activities, Organization setup; Recent activities contains at most five recent member activities plus View all. Executive Board work has its own list/details from home, excluded from Recent; Board workflow no longer setup entry.

Center current page; persistent Ask Platypus right. Desktop resizable/collapsible rail; chart pans/zooms in remaining space without flattening nodes. Narrow screens use always-available chat drawer, preserving conversation/unsent input.

Home order:
1. At most three items actually requiring current user's action: important blocks/approvals/deadline risks.
2. Compact My next actions entry, not duplicate full board.
3. Member Programs board: future count, next three dates/status/short chains.
4. Executive Board board: active management work/owner/next action/blocks. Retain both boards; honest empty states/create entries.

Structure/duties only in organization settings; remove Edit organization from activity pages. Shared label keys; Activity Workflow is template name within setup, Activities opens actual instances.

### 3.2 B1 Activities and short chains

One searchable member-activity list, upcoming-date ascending by default, switch to recently modified; semester/owner/status filters; completed collapsed. Undated separate, never fake dates.

Desktop starting proportions: identity about 25%, four-position chain 50%, date/key risk/entry 25%; accept at actual width, wrap to two lines rather than shrink text. Phone row 1 name/date, row 2 current stage/next actions, expandable full short chain.

Show last completed/current/next two stages. Actual names plus Completed/Now/Next, no T−1/T/T+1 confused with event anchor T. Explicit pre-start/all-complete/fewer-than-four boundaries.

For parallel work, never pick one line as sole current step. Expandable stage groups, e.g. Prepare event with actual 2/4 complete, 2 branches active, Finance blocked. Fixed leafTaskIds per group; complete only when all required branches/approvals satisfy. Execute event label cannot hide critical blocks.

AI proposes concise stage names/groups only during workflow creation/adjustment; validate references/cycles/order, approve, cache by version. Program computes live status/count/current stage; list opening/task dragging never reinvokes AI. Template stages/deterministic grouping work offline.

### 3.3 C2 activity details

Top name/date/overall owner/status, then risks/pending approvals. Main dated timeline: actual date axis/today line, collapsible stage groups, department/person filters, current/blocked expanded by default, others summarized.

Show intervals/milestones/owners/dependencies; Funding parallel with marketing/venue. Edit tasks centrally or in overlay, never displace right AI. Budget/materials/history on demand; compact dependency view secondary, timeline default, no 15 activity tabs.

## 4. Unified data and personal Board

### 4.1 Contract

Organization template → activity/management-work instance → executable tasks. Template/instance separately versioned; instance snapshots creation version, preserving customization/history from later template updates.

All objects immutable IDs; names fields, never keys. Precisely identify organizations/roles/departments/members/work items/stages/tasks/applications/actions. Shared current names/department colors; historical snapshots retain old names.

Every Task has one parentWorkItemId/executable node; Board/timeline/short chain share it, not three states. Ordinary executable node = one Task; summary stage is projection. Approval nodes advance by approvals, not freely dragged Done.

Preserve all template roleIds, never collapse shared responsibility into one role. Shared task remains one record with primary owner/collaborating roles-members, visible on their boards. Only designated owner/authorized manager confirms whole completion; collaborators submit own progress. Independent deliverables become explicit required subtasks retaining source-node link; stage completes after all required deliverables. Ambiguous owner remains unassigned, never randomly discard other roles.

Every Task belongs to member activity or Executive Board work, implementing no unowned Task while allowing funding/recruitment parent projects without disguising them as public events.

### 4.2 Board rules

Default My tasks, current member's assignments only; To Do/Working on it/Stuck. Done button moves into expandable Completed history, undoable. Done persists but is not a permanent fourth column. Preserve drag/same-column order/mobile/keyboard. Card: task/parent/deadline/short blocker.

Remove Not claimed and unowned Add task. Creation proposes ownerRoleId from approved duties and assigneeId from bound incumbents, confirmed within creation approval. Never infer permissions from titles or assign randomly. Vacant/unclear roles prompt management assignment, retaining drafts/questions rather than dropping tasks.

Your team provides compact fictional members/role bindings: member IDs separate, multiple roles per person, multiple people per role require explicit primary or divided work. Runtime bindings do not alter constitution duties; unbound roles vacant. Identity switch marked Demo; same role name never grants leadership.

Personal view binds explicit member ID. Only private test sessions, no formal organization accounts/multi-user authentication; use labeled test members, never call View as login. Cookie grants private workspace access, not real identity. Server session resolves demo actor and validates demo rules; request-body memberId is not authorization. Real accounts/invitations/cross-device permissions require separate approval; do not claim real individual approvals.

### 4.3 Stuck and dependencies

UI combines Waiting/Stuck; backend structured waiting_approval/waiting_dependency/external_response/needs_help plus target/time/resolution/prior state. Select nearby on Stuck; inferred approval reasons prefilled for confirmation, no external auto-messages.

- Unready future tasks stay To Do with prerequisite/not-startable note; distant work collapsible, never turn all downstream red Stuck.
- Started/currently actionable blocked work becomes Stuck, never complete; only actual dependents affected, independent branches continue.
- all requires every prerequisite; any/conditional follow approved structure. No jargon dropdown in UI; server retains semantics/validation.
- Completion denominator explicit active/required set; all applicable required tasks complete. any only satisfies a gate with one prerequisite, never cancels others. Exclusive/nonapplicable branches need separate decision records before exclusion. Optional work visible but nonblocking; AI summaries never skip tasks.
- Upstream completion only unlocks eligibility, never auto-starts/completes downstream.
- Resolved conditions clear only their own blocks; preserve manual help/multiple unresolved reasons.
- Done updates node/stage/list chain/home/timeline together; new windows read same revision; names/owners update shared views.
- Reopening completed work requires authorization/downstream checks/history preservation. Executed purchases not automatically undone; affected downstream marked for review, unstarted dependencies regated.
- Rule engine computes deadlines. Stuck does not imply extension; recompute risk only, never silently move event/official dates.

## 5. Funding within activity workflow

Preserve budget/audit, remove new standalone Funding navigation. Default branch: confirm items → quotes → submit budget request → wait/record approval → submit purchase request → wait/record approval → order/reimburse → attendance/receipts/close-out. Choose applicable steps by source; unfunded activities get no full chain.

Submission-task Done means submitted only; separate budget Gate unlocks funding-dependent purchases. Authorized members approve internally; authorized people record external/school results/evidence, never fabricate receipts. Approval/rejection recorded; rejection leads revision/resubmission, not graph cycles.

Funding display projects same Tasks/Gates; amounts/sources/quotes/materials linked, no bypassing Next buttons. Cannot exceed approved amount; revisions may need reapproval. Independent marketing/venue collection remains parallel. Separate IDs per funding source; one approval cannot cover all purchases.

Approval binds application ID/version/source/purpose/currency, default USD, no silent conversion. Limits include cumulative spent/committed amounts; same-WorkItem CAS validates/reserves together, preventing aggregate overspend across individually small requests. Material amount/source/purpose changes create new application versions; old approvals remain history, not approval for new scope. Executed spending preserved; commitment release/adjustment traceable/idempotent. Workflow limits only, no real payments/general ledger.

Do not confuse budget (draft initial budget) with submit_budget_request. Separate items/quotes/submit_budget_request milestones, define initial-plan approval versus external request. Convert old draft→budget→approve→quote by real stage; blindly attaching 8/7/6 weeks would invert time/create cycles.

Old Funding page/data remain separate legacy reference, never auto-import into new organization or mix with fictional seeds. Import requires explicit preview/conversion.

## 6. Timing in Setup

Keep five chapters; compact Timing within Activity Workflow, linked directly to relative node labels, no new chapter/second rules system.

| Default milestone | Relative to event start | Source |
| --- | --- | --- |
| Confirm items | 8 weeks before (56 calendar days) | User-specified organization practice |
| Confirm quotes | 7 weeks before (49 calendar days) | User-specified organization practice |
| Submit budget request | 6 weeks before (42 calendar days) | User-specified organization practice |

Adjust weeks/days per row, default/restorable. Generate only applicable procurement/funding tasks; small non-purchase events avoid full chain. Stable milestoneKey/node IDs, never AI title matching. 8/7/6 are completion targets, not starts; subtract duration/buffer for starts.

Save anchor/offset quantity/unit/default-or-override/source/version. Week=7 calendar days; non-working-day internal targets shift to previous workable day with explanation. Official constraints coexist and cannot be postponed by later internal targets.

Separate relativeTarget/applicableOfficialRules; old single-choice Anchor must not overwrite official limits. School rules use school working days, officer duration personal working days. Estimated approval time is not a school promise to approve by submission deadline. Preserve materials/fee checks; fix missing old R01 registration applicability for off-campus events using school funds.

After human event date, compute using duration/dependencies/club buffer/known calendar; show estimated start/internal target/official deadline. Unsupported calendar explicitly unschedulable pending data, never precise-looking unknown dates. Three-week lead time shows insufficient preparation, never silently compresses eight-week work into future.

Rescheduling previews unfinished impacts, preserves completed history/manual fixed dates/conflict notices; absolute funding-use deadlines do not shift automatically. Template timing changes apply to future instances by default; existing events opt in with per-item preview, preserving manual adjustments.

## 7. Global AI, persistence, migration

Requests include organization/page/selection/version; cross-page questions retrieve relevant shared workspace data/history as needed, not whole database every time. Allowlisted proposals for queries/explanations/rename/owners/nodes/dependencies/new activity-or-Board drafts/relative timing. Model never writes DB/effective dates directly. Server validates/commits after approval; UI locates/syncs. Ask ambiguity, never guess from names.

Persist new runtime to private server workspace, never copy to old localStorage. Versioned whole-work-item commit or equivalent commit marker prevents partial task/approval/budget success. Command-ID dedup/revision conflicts/actor/source/server time/traceable events. Preserve unsent local input on failure, explicit 409 handling, recoverable audit/snapshot consistency beyond Saved copy.

Atomic boundary is Task/Gate/Funding within one WorkItem via CAS/commit pointer; recoverable outbox prevents committed state with permanently missing archives. Blobs lacks arbitrary cross-object transactions. AI proposals spanning templates/multiple work items are segmented, separately confirmed/results recorded, with applied/unapplied/recovery entries; no platform-wide atomicity claim.

No silent migration of browser demos. Version compatibility/default Timing for approved configuration without rerunning AI/clearing manual data. Verify names/states/all-any/history individually; display-map old Waiting/Stuck while preserving blockers.

Rename Files to Organization documents within Constitution; pasted text source explicit. Free chapter navigation/autosave, zero AI without edits. Remove Connections/all-any selector/per-node Mark reviewed, preserving server semantics/central impact review. Selected edge delete/undo with mobile/keyboard alternatives.

## 8. Worktree/agent assignments after approval

Create feat/activity-workspace-v1 from verified latest development commit; integrate in dependency waves. Main agent freezes shared contracts, one owner per file; others request changes by message, never overwrite across worktrees. Separate installs/ports; tested small commits cherry-picked into integration.

| Agent | Worktree / branch | Exclusive scope | Delivery |
| --- | --- | --- | --- |
| Main/integration | activity-integration / feat/activity-workspace-v1 | Shared schema/routes/old-new boundary/migration/docs/integration | ID/state/approval/timing/AI contracts, staged acceptance |
| Data | activity-data / feat/activity-data | Runtime storage/API/command validation/Task-Gate-Funding | Shared state/CAS/idempotency/permission API/archives |
| Schedule | activity-schedule / feat/activity-schedule | Relative scheduling adapter/calendar coverage/rule tests | 8/7/6 defaults/dependencies/reschedule-override protection |
| Workspace UI | activity-ui / feat/activity-ui | Home/Activities/details-timeline/personal Board | A1/B1/C2/short chain/three columns/completion history |
| AI | activity-assistant / feat/activity-assistant | Context/tools/proposals/stage cache/rail | Cross-page targeting/approved changes, remove duplicate page chat |
| Setup UI | activity-setup / feat/activity-setup | OnlineSetup/SetupCharts/styles | Free navigation/Timing/edge deletion/central review/file copy |
| Independent Review | activity-review / review/activity-workspace | No feature development; review integration/diffs/evidence | Staged review/blockers/final signoff |

Maximum seven including main; Review alternates by stage. New engine/UI directories preserve explicit legacy reference; extract drag/rule pure logic as useful, never directly reuse old store/fixed eight-role mapping.

Freeze P0 ownership: main src/workspace/contracts/, PhaseOne.tsx route wiring/migration versions; Data netlify/lib/workspace/ and runtime APIs; Schedule adapter/pure tests; UI src/workspace/pages/components; AI src/workspace/assistant/server tools; Setup existing OnlineSetup.tsx/SetupCharts.tsx/styles. Notify owners before cross-directory behavior changes. Main manages shared fixtures/API samples. Module-local unit tests, separate browser files/ports, unified run after integration.

## 9. Sequence and gates

1. P0 contracts/baseline: SHA/ownership/stable IDs/Task state/Gates/anchors/version-migration/auth boundaries; independent Review first.
2. P1 foundation: storage/API and schedule parallel; create work item→role assignment→Task update→shared activity projection→save/reload first.
3. P2 pages/Setup: UI/Setup/AI parallel on frozen contract; A1/B1/C2/Board/embedded Funding/global chat/Timing.
4. P3 end-to-end: offline mocked eight-week preparation through approval/execution/close-out; parallelism/rejection/reschedule/multiple views/recovery; fix all blockers.
5. P4 independent Review/development preview: reviewer checks data/flow/code/evidence; after pass push feature branch/preview acceptance; verify remote CI/deployment commit or explicitly mark unverified. Main unchanged.

## 10. Acceptance

- Fifteen member activities searchable in one list, no 15 permanent tabs; Board excluded from Recent.
- Both home boards, at most three priorities, clear personal entry.
- Short chain last/current/next two, visible parallel/blocked work, no invented AI counts.
- Board/timeline/home/chain/reload agree on drag/Done/Undo; partial completion never completes whole stage.
- Preserve Stuck reasons/all-any; clearing one never clears other blocks; upstream never performs downstream.
- Submitted budget keeps procurement locked until approval; rejection/resubmit/overspend/multiple sources cannot bypass.
- 8/7/6 overrides/workdays/finals/unknown calendar/short lead time explicit; internal changes preserve official rules.
- Reschedule/templates preserve completed/manual data; reopening never erases actual procurement.
- Same names never cross-edit; rename updates current references/history; cross-page AI needs approval/permissions.
- 409/offline/duplicates/refresh/chapter jumps/mobile Back preserve input and prevent duplicate generation/paid calls.
- Build/related unit-integration/desktop-mobile/keyboard checks, final necessary full regression. User later verifies real AI quality/performance; mocks do not substitute.

## 11. Approval scope

Approval authorizes this complete flow with independent worktrees/Review and development preview, excluding production/main, real organization accounts, external procurement/payments/email automation, general ledger, research migration. Future formal multi-user login should be a separate identity/invitation/organization-permissions package on stable IDs/commands.

Independent plan review completed: four initial rule issues and two commitment boundaries clarified, zero open plan blockers; [independent review](REVIEW_ACTIVITY_WORKSPACE.md). This means the plan is reviewable for approval, not implementation authorization or completed/tested code.

## 12. Implementation authorization and final annotations

2026-10-26: user explicitly authorized code changes after final annotations. Home priorities must derive/sort from current member's existing tasks, top three by default, expandable all important tasks; no separate AI summary/task list. All business changes exposed to AI through the same validated commands, supporting organization setup/members-roles/member activities/Executive Board creation forms/workflows, never arbitrary database writes.
