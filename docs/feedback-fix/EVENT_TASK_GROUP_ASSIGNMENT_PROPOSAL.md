# Assign event owners by workflow task group: proposal for discussion

2026-11-17 (America/Phoenix). Status: **proposal, not implemented**. Actual code this round only unifies the two setup entry points; this proposal is not added to onboarding.

## 1. What the user needs to do

Recommend Juanxi's new direction: **group workflow tasks first, then select one actual owner per group when creating each event. Tasks in the group inherit that person.**

Example: after entering Welcome Mixer's date, headcount, and circumstances, the president sees:

| Task group for this event | Person responsible this time | Tasks visible on expansion |
| --- | --- | --- |
| Event coordination | Jordan | Venue requests, schedule confirmation, on-site coordination, etc. |
| Finance | Maya | Budget, funding applications, purchasing, etc. |
| Promotion | Sam | Promotional materials, publishing, registration promotion, etc. |

These group names are examples. Other organizations may use Production, Research, or Volunteer coordination; Secretary or Marketing is not required in every organization.

The primary interface shows only **group name, applicable task count, and person selector**. Expand task lists on demand; presidents no longer need to first read a responsibility description or skills library. Before creation, they can confirm at a glance who handles each group for this event.

Organization setup still uses Start: name, constitution upload, role/member confirmation. Constitution AI role/responsibility extraction remains. It helps establish the organization's structure; **it does not choose event executors for the president**.

## 2. Recommendations and alternatives for three questions

### Where work groups come from

- **Recommended: follow the workflow.** Manually organize the standard workflow into a few task groups; organizations can rename/add groups and move tasks. Future one-sentence workflow AI can suggest grouping for user confirmation.
- Faster but limited: display current `fn` categories as groups. Suitable for validating the idea, but nine fixed functions still constrain different organizations and are unsuitable as the long-term architecture.
- More flexible but more work: group from scratch for each event. Repetitive for presidents; not recommended by default.

Groups describe how work is divided; roles describe organizational positions; members are actual people. Keep these separate; one role or person can handle several groups.

### How tasks link to groups

- **Recommended: each workflow-template task has exactly one primary execution group.** The template configures defaults, normally avoiding per-task assignment during event creation. This prevents duplicate ownership; record collaborators separately, without copying tasks.
- Alternative: multiple execution groups per task. This invites everyone assuming someone else will do it, so still requires one primary owner; exclude from the prototype for now.
- Alternative: groups only as filter tags, retaining per-task person selection. Simple, but does not reduce event assignment work.

Full coverage means **all tasks in that workflow**, not every possible responsibility. Flag ungrouped tasks explicitly in the editor; generic administrative work can get a separate workflow later. Standalone tasks still select people directly.

### If two people share a group, who does the work?

- **Recommended prototype: the president explicitly selects one person for this event.** Both finance people appear; choose Maya this time and someone else next time. One person may own multiple groups. The system does not choose by name, array order, or AI score.
- Possible next step: a group lead reassigns individual group tasks. Clearly show tasks not yet delegated and add the necessary lead permissions.
- Future option: rotation or workload-based suggestions. Requires explicit rules, explainable workload measurement, and manual override; current cross-device data also cannot reliably establish everyone's actual workload.

Allow explicit **Leave unassigned**, showing “X tasks remain unassigned” before creation and retaining them in the unassigned list. Do not silently give them to the president or duplicate a task for two people. Member matching no longer relies on prechecked qualifications/responsibility tags; candidates must still be current, assignable members of this organization.

## 3. Current code and required changes

Checked against this branch's actual call chain:

| Location | Current behavior | Required adjustment |
| --- | --- | --- |
| `StepTemplate` in `src/data/types.ts` | `fn`, optional `ownerRoleId`, `phase`, no task group | Add independent `assignmentGroupId`; workflow stores group definitions |
| `roleFor` in `src/engine/playbooks.ts` | +100 for role-function match, +20 for title/duty keywords; ties use role array order; then fallback functions, possibly first role | New events use explicit per-event group-owner mapping, without guessing through this algorithm; retain old-event reads |
| `buildEventNodes` in same file | Find `ownerRoleId`, else `roleFor(fn)`, then current role's `holderId` | Explicit group → selected member for this event → `node.ownerId`; null if unselected; preserve rule dates/dependencies |
| `PlanForm` in `src/components/rail/AskPanel.tsx` | Date, headcount, circumstances checklist; no grouped person selection | After circumstances are set, show actually applicable groups and person selectors |
| `src/components/rail/ChangeCard.tsx`, `src/data/changeReview.ts` | `HumanInputs` has dates/buffer only; `newObjects` creates event/tasks | Add human-confirmed group assignments; revalidate members/groups when applying |
| `completeSetup` in `src/data/settings.ts`, first-event preview | Calls `buildEventNodes` itself | If grouping reaches first event, reuse the same component/service to avoid divergent setup chains again |
| Missing-task repair in `src/data/store.tsx`, task additions in `src/lib/flowEdit.ts`, etc. | Other task-generation paths; repairs may call old generator | Use event's saved group assignments; do not reassign existing tasks or silently use old guessing for new tasks |
| `src/engine/eventBudget.ts` | Synchronizes finance-task completion from budget-item status | Preserve budget approval/completion rules; group ownership grants no financial approval rights |

**Do not use `phase` as the team.** Existing phases include plan, prepare, marketing, money, run, close. Event coordination spans preparation, on-site work, and wrap-up; stages and execution teams differ. `fn` still serves legacy logic/permission associations and cannot simply become an arbitrary group name.

Existing ranking does not balance load or automatically choose the next same-function person if the top role is vacant. It cannot provide free presidential selection for each event.

This idea can simplify the product, but needs data/task-generation changes; adding dropdowns alone is insufficient.

## 4. Minimal data design

Use independent fields rather than reusing withdrawn `matching`, retained as opaque data.

```ts
// Workflow: relationships between groups and tasks. Group IDs are scoped to this workflow.
AssignmentGroup = { id: string; name: string }
Workflow = { id: string; version: number; groups: AssignmentGroup[]; steps: StepTemplate[] }
StepTemplate.assignmentGroupId?: string

// Event: workflow version, group-name/task-group snapshots, and actual people selected this time.
Event.assignmentPlan = {
  workflowId: string;
  workflowVersion: number;
  groups: AssignmentGroup[];
  taskGroups: Record<stepKey, groupId>;
  owners: Record<groupId, memberId | null>;
}

// Task: ownerId remains authoritative at runtime; group/source support explicit later reassignment.
Node.assignmentGroupId?: string
Node.assignmentSource?: "event-group" | "manual"
```

Illustrative design; finalize field names before implementation. `owners` does not replace `ownerId`: the event records group allocation at creation, while the task records its current actual owner. Do not maintain competing ownership authorities long-term.

Recommended precedence: **manual reassignment of existing task > event group allocation > explicitly unassigned**. Preserve old event owners without `assignmentPlan`; once group mode is enabled for new events, never fall back to `roleFor`. Later task repairs must know which mode the event uses.

New workflow-editor mode replaces default Done by role selection with task groups; retain `ownerRoleId` for compatibility, without showing competing rules on one task. Manually added ad hoc tasks may select people directly and record manual assignment; only later template-derived tasks inherit from the event's group snapshot.

Later template renames/new groups/task moves affect future events only. Existing events have snapshots and do not silently change. First version excludes “changing group owner reassigns all old tasks”; use existing per-task reassignment.

## 5. Technical and product boundaries

1. **Still a single-browser prototype.** It can validate planning/assignment experience, not prove that 20 distinct accounts can claim across devices, server authorization works, or background email exists. Real team operation needs a future server source of truth.
2. Grouping answers **who executes**. Approvers, helpers, and informed people remain separate; do not send one execution reminder to all Finance members. The primary reminder recipient still derives from actual `ownerId`; RACI/recipient rules proceed separately.
3. Selection into Finance grants neither Treasurer budget approval nor payment rights. Continue existing permission checks and explicitly indicate approval dependencies when needed.
4. Event generation currently treats a selected incumbent as accepted; standalone assignments to others have a separate claim flow. Preserve status rules in this prototype; unifying claiming requires separate scope, not a hidden change here.
5. Applicable tasks come from existing `stepsFor` condition filtering. Recompute groups/counts after headcount, food, funding, etc. change; do not require selection for inapplicable groups, and reconfirm newly appearing groups.
6. UI selections are human input limited to current valid organization members. Revalidate at save against departures, workflow changes, empty groups, duplicate/unknown group IDs. AI-generated `ownerId` never bypasses human confirmation.
7. Implementation needs compatible fields/version migration; preserve originals/backups, archive 23, and history. This proposal **does not upgrade the archive version**.

## 6. Two prototype stages, then expansion

**Stage 1: rules and data foundation.** Manually assign every standard-workflow task one primary group, ensuring full nonduplicated coverage; establish event-specific snapshots and one generator. Preserve old events, vacant members, standalone tasks, budget permissions, and date engine. Verify multi-person groups depend only on human selection, not role order.

**Stage 2: shortest usable interaction.** Add a few group-selection rows to event-creation review; share the component between Start's first event and in-app creation; created tasks show actual owners. Settings editor supports group renaming/task moves so standard roles do not lock the framework. Cover creation, circumstances changes, unassigned groups, departures, save failure, later task repair, manual reassignment, desktop/mobile. No formal team-management module yet.

**Stage 3 (decide from feedback): multiple workflows and teamwork.** Multiple versioned workflows per organization; AI suggests tasks/groups; optional default/previous-owner preselection, group-lead delegation, collaboration, rotation suggestions. Still confirm actual owners for this event. Server collaboration, RACI reminders, and background email advance separately.

Core acceptance in one sentence: **the president can create the same event twice with different Finance owners; ownership is accurate, later-added tasks follow that event's selection, and old events/manual reassignments are fully preserved.**
