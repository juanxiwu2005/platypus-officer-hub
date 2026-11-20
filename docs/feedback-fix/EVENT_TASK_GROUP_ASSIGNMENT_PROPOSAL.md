# Task force on task forces: programme for discussion

2026-11-17（America/Phoenix）。Status: **Programme not achieved**。 Only two set-up entrances are harmonized for the actual code in this round; Do not include this programme.

## 1. What exactly does the user need to do?

**first group tasks in the workflow and then select an actual head for each group at the time of creating each activity. The task within the group inherits this person.**

Example: President created Welcome Mixer, after filling in dates, numbers and actuals, sees:

| Task forces for the event | The man in charge. | Visible tasks after expansion |
| --- | --- | --- |
| Event coordination | Jordan | Application site, confirmation schedule, on-site coordination, etc. |
| Finance | Maya | Budget, request for funds, procurement, etc. |
| Promotion | Sam | Publicity material, distribution, registration, promotion, etc. |

These group names are just examples. Others can be called Production, Research, Volunteer Corporation; There is no requirement for each student organization to have a Security or Marketing.

The main interface shows only the **group name, number of tasks applicable and frame selection**. The list of tasks is carried out as required, and presidients are not allowed to read a job description or skills bank. At the outset of the creation, it was confirmed that “this event, who did each of these groups”.

Set student event still follows Start: fill in name, upload constitution, confirm role and member. Ali rule/ function recognition continues to be maintained for constitution. It helps the organization build its own structure, **does not replace president to decide who will execute**.

## 2. Recommendations and other options for the three issues

### Where did the team come from?

- **Recommendation: Follow the work stream.** standard workflows are first manually organized into a small number of task forces; The name may be changed, the group added, and the task moved. When the next sentence generates workflows, AI may suggest grouping and user confirmation.
- Faster but limited: temporarily show the existing `fn` classification directly into groups. Suits for validating ideas, but fixing nine functions will still limit different student application and is not suitable for long-term arcitecture.
- Flexibility but more cost-effective: each activity is grouped from zero. Repeats the effort and is not recommended as default.

The group is "What's the score for this job?" The role is "The position of the target organization," and the member is "the actual person." (c) Separation; A role can take on more than one group, and a person can take on more than one group.

### How does the mission connect to the group?

- **Recommendation: In the workflow template, there is only one main executive group for each task. The** default is configured by templates, and the creation of an activity does not usually require task-by-task settings. This rule addresses double attribution; Those involved in the collaboration will be remembered separately and there will be no duplication of tasks.
- Option: One task with more than one implementation group. It is easy to “think that others can do it”, and the sole principal has to be designated, and the prototype will not be used.
- Optional: Only groups will be used as filter labels and selected on a task-by-mission basis. To be simple, but without reducing the allocation of operations for this activity.

The full range of coverage is **, the entire task of the workflow**, not an attempt to drain all the world's duties. (b) Ungrouped tasks to be clearly hinted in the editor; General administration can be followed by a separate stream of work. The independent mission continues to select individuals directly.

### There are two people in the same group. How do you decide who does it?

- **Suggested prototype: The event was specifically selected by the presidient.** two financiers are on the list; This time Maya, you can choose another one. One person may be responsible for multiple groups. The system does not select individuals by name, order of array or AI score.
- The next possible step is the designation of a team leader, who will be reassigned to individual assignments within the group. It is important to show clearly which tasks have not yet been assigned and to complete the team leader 's missions.
- Post-optional: rotation or recommended allocation based on workload. Clear rules, explanatory workload calibres and manual coverage are still required; The trans-equipment data of the current prototype are also insufficient to reliably judge your live load.

Allows the explicit selection of **Leave unassigned**, but shows "with X tasks not yet assigned" before being created and remains on the list to be allocated. Do not silencing to president or copying a task to two people. Remember that matching no longer relies on pre-tick qualifications or job labels; Candidates must remain valid and available to the Organization.

## 3. How the existing code works and why it needs to be modified

The current branch actually has a call chain:

| Location | Now's behavior. | Adjustments required for the new programme |
| --- | --- | --- |
| `src/data/types.ts` It's... `StepTemplate` | Yes. `fn`Optional `ownerRoleId`、`phase`No Task Force | Add independence `assignmentGroupId`；Workstream Save Group Definition |
| `src/engine/playbooks.ts` It's... `roleFor` | (a) 100 points for the function and 20 minutes for the title/function keyword; (a) The order of the same score in the array; We'll go back to backup functions, and we might end up number one. | The new activity is clearly “head of the group” map, and this algorithm is no longer used to guess people; Old Activity Compatibility Reading |
| Same document `buildEventNodes` | Let's go first. `ownerRoleId`Otherwise... `roleFor(fn)`♪ Take the role now ♪ `holderId` | Clear Group → This selected member → `node.ownerId`；Non-optional null；Date of retention of existing rules/Dependence |
| `src/components/rail/AskPanel.tsx` It's... `PlanForm` | Date, number, status list, not selected by group | When the situation is determined, a selection of groups and numbers that are actually applicable for this time period is listed |
| `src/components/rail/ChangeCard.tsx`、`src/data/changeReview.ts` | Manual input `HumanInputs` Only date/buffer; `newObjects` Construction activities and generation of tasks | Add human-recognized group distribution data; Recheck whether members and groups are legal when actually applied |
| `src/data/settings.ts` It's... `completeSetup`First event preview | Call by yourself. `buildEventNodes` | Then, if the first activity is also connected to a grouping, the same component/service must be reused and two different setup chains avoided. |
| `src/data/store.tsx` The missing task repair, `src/lib/flowEdit.ts` New Tasks, etc. | (b) Access to other generating tasks; It's possible to call the old generator again. | Use the group allocation saved for this activity; Tasks are not reassigned, new tasks cannot be surreptited. |
| `src/engine/eventBudget.ts` | Synchronization of financial assignments according to the status of budgeted projects | Maintenance of rules for budget review and completion, with group heads not granted financial approval |

**can't just take `phase` when the team.** Existing phase includes plan, prepare, marketing, money, run, close. Event coordination works across preparation, on-site and closing; Phases are not the same as implementation teams. `fn` also continues to assume the old logic and permissions connection, which cannot be directly changed to create an arbitrary group name.

The current ranking does not balance the load, nor does it automatically select the next person for the same function because of the first slot. This does not satisfy the experience of “president freely designated officials”.

Thus, the idea does simplify the product, but the logic of data and task generation needs to be adjusted and it is not enough to add a few drops alone.

## 4. Minimal data design

It is proposed to use a stand-alone field instead of `matching`, which has been withdrawn and retained with opaque data.

```ts
// Working troposphere: relationship between groups and tasks. Group  ID Just explain it in the middle of the job.
AssignmentGroup = { id: string; name: string }
Workflow = { id: string; version: number; groups: AssignmentGroup[]; steps: StepTemplate[] }
StepTemplate.assignmentGroupId?: string

// Level of activity: What current, group name and task-back snapshot for this session, actual selection.
Event.assignmentPlan = {
  workflowId: string;
  workflowVersion: number;
  groups: AssignmentGroup[];
  taskGroups: Record<stepKey, groupId>;
  owners: Record<groupId, memberId | null>;
}

// _Other Organiser  ownerId；Additional clustering and distribution sources to support a subsequent definitive reassignment.
Node.assignmentGroupId?: string
Node.assignmentSource?: "event-group" | "manual"
```

The above is an indication of design that the field name can be absorbed before it is realized. `owners` does not replace `ownerId`: The activity record “What is this whole group determined” and the task record “Whom do we actually belong to now?" Two sets of leaders competing for priority are not maintained on a permanent basis.

Priority recommendation: **Manual reassignment of tasks already performed > This activity group allocation > > clear unallocated**. (b) To retain the former person in charge without `assignmentPlan`; When group mode is enabled for new activities, do not fall back to `roleFor`. Any tasks that are subsequently completed must know whether the activity is using a new model.

The new mode for workflow editor replaces the default Done by roll selection with a task force; The old `ownerRoleId` is reserved for compatibility and does not display two distribution rules simultaneously on the same task. Temporary additional manual tasks can be selected directly and recorded as manual assignments; Tasks that were subsequently added to the template will be inherited on a snapshot by the activity group.

The template was subsequently renamed/supplemented/moveable to affect only subsequent activities. Created activities with snapshots that do not change quietly with templates. The first version does not read: “Reorganization heads automatically reassign all old tasks”; Task-by-mission reassignment of existing operations is sufficient.

## 5. Technology and product boundaries

1. **is still the prototype of this browser.** can verify the planning and distribution experience of presidients; It is not yet possible to prove that 20 different account numbers are available for simultaneous tasking, service clearance and live back-office mail. Live team capabilities require follow-up server originals.
2. Grouping is about **who executes**. Approving, assisting and informing is still another matter. Do not send the same executory reminder to Finance as a whole. The subject of the reminder is still decided by live `ownerId`; RACI is moved forward separately from the notification rule.
3. A candidate to the Finance Group does not receive budget clearance or payment for Treasurer. Missions continue to be checked according to the existing rules; Where necessary, clear indications of reliance on approval.
4. The activity generation task now consists of the “selected incumbent”, with separate recognition processes for tasks assigned to others. (a) The prototype should first maintain the current status rule; A different scope, if uniform as a system of recognition, cannot be modified implicitly in this group function.
5. Live The applicable tasks shall be screened under the conditions of the existing `stepsFor`. Recalculation of groups and quantities after changes in numbers, catering, funding, etc.; Non-applicable groups do not force selection, and emerging groups need to be reconfirmed.
6. The UI selection is a manual input that can only be selected from the current active member of the organization. Recheck when saving to prevent the departure of members, changes in workflows, empty groups or duplicate/unknown group IDs during the stay page. Any `ownerId` generated by AI cannot cross manual confirmation.
7. New compatible field and version migration is required at the time of implementation, with original backups, archiving 23 and historical records to be retained; This round document **did not upgrade archive version**.

## 6. It is proposed that the prototype be developed in two phases and that phase III be expanded

**Phase I: Rules and data base. (a)** to organize the main executive group for standard tasks, ensuring coverage and non-duplication; Creates the assigned snapshot and sole generation function saved by activity. Old events, minutes of vacancies, stand-alone missions, budgets meetings, date engines remain the same. The results of the identification of multiple persons in the group were related only to manual selection and not to the sequence of roles.

**Phase II: minimum available interactives.** Add a small group selection line to the review of creation activities; The common component receives start-up activities in Start's first activity and application, which can be created to see the actual person responsible from the task. Settings workflow editor supports reorganisation of name/move task to prevent framework from still being fixed by standard rule. Overwrite creation, modification, non-allocation, departure, saving failure, follow-up tasks, manual reassignment and dual-end use. Instead of a formal team management module.

**Phase III (to be decided by using feedback): Multiple workflows and teamwork.** Multiple versions of the workflow available to organizations; AI Recommended tasks and clusters; The default/last head pre-selection, the lower team leader, multi-person collaboration and rotation advice are available. The interface still requires the identification of the actual persons responsible for the event. Service end coordination, RACI alarm rules and back-office mail are advanced separately.

The core of acceptance has only one sentence: **presidient creates the same activity twice and can select two different people for Finance; Tasks were correctly attributed, follow-up assignments followed the same choice and old activities and manual reassignments were retained entirely.**
