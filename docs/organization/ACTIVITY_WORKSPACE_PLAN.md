# Activity Platform Implementation Programme (approved for implementation)

Date: 2026-10-26 (America/Phoenix). This round of read-only checks and programme reviews; No product changes implemented, no live AI called.

## 1. Directions and scope defined

Users select A1 (the day-to-day management front page) + B1 (member active list) +C2 (the activity details are time-axis). (a) Individual assignments are based on Board; The active list uses short flow chains; Funding becomes a branch of the active workflow. Include explicit requirements for the previous round: global right AI, stable ID and synchronisation of name, free five-chapter jumping, process line click removal, removal of Connections and node by node Mark reviewed, file entry description and navigation weighting.

Start worktree implementation only after this plan is approved. Deliver a development preview for acceptance; do not merge `main` or release production. Write UI text, documentation, comments, commits, and GitHub notes in English. Do not read raw research interviews, commit their contents, or run additional paid model comparisons.

## 2. Current code facts

- The GitHub development branches are `1815be02d83bc67ed35eb6970d14f0ed6a3023c6` and main is `4dc55ba`. Re-establish the fetch prior to implementation, confirming an updated common baseline.
- `src/pages/Tasks.tsx`, `src/data/board.ts`: Drag, sort, personal filter, keyboard status menu already exists. The default remains Table, with six columns including Not cleared/Waiting/Done, to create a new inactive task.
- Old Tasks and Events use the same `DemoState.nodes`. Old board changes reflect old active nodes but are stored in the browser localStorage.
- The `src/phase1/ApprovedWorkspace.tsx` read server has been approved for organizational configuration and is currently consumed by templates; There are no live examples of activities and individual tasks included in the links. The old board cannot be hung on a new page as if it had been connected.
- The new template supports `dependencyMode=all/any`; The old `taskWorkflow.ts` and `schedule.ts` are mainly treated as all and must be clearly adapted.
- Funding for `src/pages/Funding.tsx` and `src/data/store.tsx` six stages independent of task nodes; The current next operation cannot be a live approval.
- The old `playbooks.ts` has ASU rules, standard application and budget/price steps, but there is no complete 8/7/6 anchor. The default value is added to the organization ' s preference for the information that this user has clearly given and cannot be marked as a school rule.
- (a) The calendar covers only the term of a specified intake; Adds a time frame to check the coverage and cannot use an unknown term as a holiday or fielding.

## 3. Page and layout

### 3.1 Unified Navigation and Homepage A1

Home, My tasks, Activities, Organization setup; Recent activities only keep up to five recent events and view all. Executive Board services enter a stand-alone list/detail from the front page, without mixing with Recentactivities, and no longer using Board workflow as a set-up portal.

medium is the current page and right is resident in Ask Platypus. Desktop right bar is wide and can be closed; The chart uses the remaining space to flatten/scaling and does not crush nodes. The narrow screen uses a dialogue drawer that can be opened at any time to maintain the same dialogue and do not send input.

Home order:
1. A maximum of three items do require current users to deal with, including significant blockages, pending approval and time-frame risks.
2. My next actions streamlines the personal task portal without copying the full board on the front page.
3. Members Programme board: Total number of future activities, date/state/short flow chain for the last three.
4. Executive Board board: Management services, managers, next action, blockage in progress. Keeps both. Shows the live empty state and creates an entrance when no data are available.

Organisation arcitecture and responsibilities only place organizational settings. Removes the active page Edit event. Fixed page labels are defined by a uniform label key; Activity Workflow is the template name in the setup and ACTies are the physical activity portals.

### 3.2Activities B1 and Short Flow Chain

All members activities in the same searchable list, defaulting to the date of future activity ascending and switching to the most recent changes; Support for term, director, campaign status screening and closure of completed activities. Undated activities are listed separately and no false dates are available.

Each row of the desktop is divided into approximately 25 per cent for active identification areas, about 50 per cent for short-flow chains at four locations, and about 25 per cent for date/critical risks/entry points. This is the starting point of the layout, actually according to available width; When space is insufficient, replace it with two rows without narrowing the text. The first line of mobile phones has an active name/date and the current phase and follow-up actions in the second line can be extended to complete short chains.

Short chains show the most recent completed phase, the current one and two subsequent phases. The interface sets the actual phase name and Completed/ Now/ Next, does not directly display T-1/ T/ T+ 1 and avoids confusion with active date anchor point T. There is a clear state of borders in four phases, before starting/completely ending/under.

When parallel work exists, a line cannot be chosen to pretend that there is only one current step for the entire activity. Use e.g. Prepare event, with live tips for 2/4 complete, 2 branches active, Finance blocked, etc. Phase groups include fixed leafTaskIds; Only at this stage will all the necessary branches and approval requirements be met. The key blockage cannot be concealed by the "Execute event" label.

AI only presents a simple phase name and group when creating or adjusting the workflow, verifies references, no rings and sequences for approval, and caches as a workflow version. Status/completion/current phase is calculated by process in real time; Opens the list or drag tasks without re-calling AI. If not available to AI, the template phase or deterministic grouping is normally displayed.

### 3.3 Activity Details C2

(b) Only the name of the event, date, head of office, overall status at the top; Immediate to current risks and pending approval. (a) The main area is the date axis: the actual dates of the cross-axis and today ' s line, organized vertically under a foldable phase to support sectoral/individual screening; By default, the current phase and the blocking phase are rolled out, while the other phases are summarized.

Time frames, milestones, responsible persons and reliance; Funding is one of the branches, parallel to advocacy/site preparation. Click to edit the task in a central detail area or layer, and AI on the right is not squeezed by details. Budget amounts, materials and history are opened as required. Provides compact workflow view aided view dependency, which by default remains the timeline and does not add 15 active tabs.

## 4. Harmonizing data with individuals

### 4.1 Data Contract

Organizational template Examples of activities/management services Templates and examples are available separately. Save the template version used for creating each instance; User custom changes and history are not covered by subsequent template updates.

All objects have immutable IDs; Displays a name that is a field, not the main key. Organisations, role, departments, members, tasks, stages, missions, applications, operations can be accurately located. Sector colour, current name read from common source; Historic snapshots retain the name of the time.

Each Task has a single parentWorkItemID with its enforceable node; This Task is read by the individual Board, the event axis, and the short chain instead of maintaining three states. A generic executable node corresponds to a Task; The aggregation phase is just more than one projection of Task. The approval node is driven by the approval action and is not a normal card that can be dragged randomly to Done.

Keep all `roleIds` templates and do not co-manage multiples to force a roll. Sharing tasks remain a record, keeping the principal and collaborating role / member, with the same task appearing at the relevant part of the meeting board, which can only be confirmed by the designated head or the manager who has the mandate; The collaborators may submit their own progress. If it is true that there are multiple independent deliveries, the apparent breakdown into several essential sub-tasks and the retention of source nodes, all necessary deliveries will be met before the stage is completed. When the header is not clear, include to be assigned and do not randomly discard the remaining role.

All Task must be part of the activity or Executive Board. This is implemented “without activity and without belonging to Task”, while allowing Board to apply for funding, recruit new preparation, etc. with their own parent projects and not to pretend to be an activity directed towards members.

### 4.2 Board Rules

My tasks, show only the current part assigned; Three active columns: To Do, Working on it, Stuck. Finish buttons to move the task tag to expand Completed history to support undrawn; Done is permanent, but not permanently in column 4. Keeps drag, line sorting and mobile phone/keyboard operations. The cards show the tasks, activities/services to which they belong, date of closure and short reasons for blocking.

Not removed column and Board do not belong to Add task. The creation of the task is based on the approved role function, and the assignment is determined in the bound member; The allocation is clearly established and approved by creation. It does not depend on post-text guesses, nor is it possible to assign a person at any time for the purpose of saturation. Rolle vacancies or unclear responsibilities are to be assigned to management alerts, drafts/specific questions retained and tasks not quietly disappeared.

Provides a compact test on your team: members ID are independent of the rule ID, members may also serve as multiple rollers, and when more than one person is in office, it is necessary to identify the principal or a breakdown of the division of labour. Remember to bind and save as working area running data, without tampering with the function constitution; The unposted role clearly indicates the vacancy. Tests member only using field information and clearly labels it as Demo at the identity switch; Do not automatically grant leadership permissions with the same character name.

This round of personal views is clearly tied to member ID. The existing system has only private testing sessions and does not have a formal organizing account/multiple authentication; This workspace can be tested with a clearly marked test. View as live login is not allowed. Cookie merely attests to the visit to this private test workspace and does not prove live memory status; A demonstration of the actingor parsing and verifying presentation rules from a server session does not use the member Id request as a basis for authorization. Official accounts, invitations and cross-equipment meetings are another range that requires separate approvals and does not promote live personal clearance authorizations for the current round.

### 4.3 Stuck and Dependence Rules

UI megewaiting/Stuck, reasons for the backend to be structurally maintained: waiting_approval, waiting_dependency, external_response, needs_help, as well as blocking objects, time of occurrence, resolution conditions and pre-entry status. Select the cause when moving to Stuck; There is an inference that the reasons for approval are automatically brought out and not sent to external sources.

- Stay in To Do when ordinary future tasks are not pre-satisfactory and show wait/not startable; Foldable to work further away, not to drag the whole downstream into red Stuck.
- Tasks already under way or currently to be dealt with are blocked into Stuck. Obstruction is not considered to be complete; Only it live depends on downstream affected and independent branches continue.
- All dependence needs to be fully met; The branches of any conditions follow the approved structure. UI does not expose terminology to frame, but retains synonyms and verifications at the service end.
- The stage completes the denominator using a clear pool of active/required tasks, all of which are necessary and applicable to the completion of the task. (a) any of the prohibitions may only be satisfied by either front and no other branch is automatically cancelled; The selection and exclusion of branches must be recorded by an independent decision in order to exclude them from completing the denominator. The optional task does not prevent completion, but it is still visible; The AI summary cannot be skip task by itself.
- Upstream completion changes only whether downstream can start and does not automatically convert downstream to Working on it or Done.
- When the condition is lifted, only the blockage caused by that condition shall be cleared and returned to its proper state; Manual recourse/multiple unresolved reasons cannot be mistaken.
- Task Done  →  Completion of Active Nodes and Stages, List Short Chains, First Page, Time Axes are updated simultaneously. New window to read the same revision; The same source view is updated by changing the name of the activity/regulator.
- Reopening completed tasks requires authorization and re-checking downstream to preserve established completion and clearance history; The implemented procurement will not be automatically cancelled due to reopening, the downstream affected items are clearly pending review and no reliance has been placed on the restoration of closures.
- The term is still calculated by the scheduling engine; Drag to Stuck does not automatically extend. Recalculating impacts and risks only, without quietly moving activity days or official deadlines.

## 5. Funding

Keep budget information and audit capability and remove the new independent Funding main navigation. Default branch: Identification of procurement items — Determination of quotations — Submission of budget requests  →  Waiting/recording of budget approval  →  Submission of procurement requests  →  Waiting/recording of procurement approvals Billing or reimbursement of travel/instruments/conclusions. (a) Selection of applicable steps by source of funding; Unfunded activities do not generate a complete funding chain.

Task, who submitted the budget request, was completed and represented only submitted; Budget approvals are independent, Gate, and will be met before funding-dependent procurement can be unlocked. Internal approval is done by the corresponding missions member; Out-of-school/school authorities authorize the recording of results and bases by authorized personnel, without falsifying external systems. Both approvals and refusals are recorded; Refusal to form a modified/re-routed path without circular reliance.

The Funding phase is shown from the same set of tasks and Gate projection; Amounts/sources/prices/materials remain linked data, and there is no other “Next” button to bypass the process. Procurement could not exceed the amount approved, and changes in that amount might require re-approval. Preparations for advocacy, collection of site information, etc. that do not depend on funding approvals are maintained in parallel. When multiple sources exist, each application has an independent ID and does not allow an approved fund to pretend to cover all procurements.

Approve the binding of applications ID, application version, source, use range and currency. This round defaults on USD and does not translate silence into other currencies. The verification level is taken into account in the cumulative amounts incurred and committed, while the same work line is checked and reserved with CAS to prevent a number of accumulated overexpenditures below total. Substantive amendments, such as amounts/sources/uses, must result in a new version of the application and old approvals to retain history but cannot automatically approve the new scope; Executed expenditures are not eliminated, release/adjustment of pending commitments should be retroactive and applicable. This is work flow line management, which does not carry out live payments or build up the financial master record.

Existing `budget` (preliminary budget preparation) cannot be considered `submit_budget_request` (application submission). (a) The establishment of a stand-alone milestones item/quates/submit_budget_request and the clarification of the relationship between initial programme approval and external budget requests; The old draft → budget → approvequate chain is converted to live phase and cannot be used only for 8 7/ 6 weeks, which leads to a reversal of time or circulation.

Old example Funding page and data reserve independent legacy reference and do not automatically import a new organization. If you want to import, do a different preview and conversion. You cannot mix the field feed.

## 6. Setup in Setup

Five chapters remain. Provides a compact Timing area with a tight link to the node time label, without adding a chapter or second set of time rules.

| Default milestones | Relative to the start of activity | Source |
| --- | --- | --- |
| Confirm items | 8 weeks before (56 natural days) | This user-assigned organizational practice |
| Confirm quotes | 7 weeks before 49 days ago | This user-assigned organizational practice |
| Submit budget request | 6 weeks before (42 natural days) | This user-assigned organizational practice |

Each row adjusts the number of weeks/days in advance, and the default is restored without adjusting the default. These tasks are generated only in the applicable procurement/funding branch, which does not allow small non-procurement activities to undertake the full budget process. Link stabilizes the millestonekey and node ID, instead of matching an AI-generated title. 8/7/ 6 is the target, not the start of the mission; The start time would also need to be reduced by the expected duration and buffer.

Time configuration saves at least the relative anchor, number of deviations, units, organizational default/manual overlays, source and version. Week = 7 natural days; The internal target in case of a non-working day is moved by default to the previous working day, where the interface shows the reasons for the actual adjustment. AAU official rules coexist with internal objectives and access to arrangements that meet official restrictions and dependencies; The user cannot modify the internal target by making it late.

The new Scheduling contract saves `relativeTarget` and `applicableOfficialRules`, respectively, without reusing the old single option `Anchor` to directly overwrite official restrictions. School rules are calculated on the basis of school working days and office hours on the basis of an individual working day; Approvals are expected to take place only on an estimated basis and official submission is not considered as a commitment date for the school. (c) Maintenance of the applicable material/costs rule checks; Amend the applicable conditions for registration nodes when old R01 out-of-school activities are spent on school funds.

Once a specific activity date has been filled out, the process combines time use, reliance, organizational buffers and known school calendar generation plans to demonstrate expected start, internal targets and applicable official deadlines. Clear unreliability when the calendar does not cover Scheduling and requests additional supporting data; Do not output an unknown date that appears to be accurate. With only three weeks left, the campaign showed that there was a shortage of preparatory windows and that eight weeks of work would not be snuck into the future.

Rescheduled activities: a preview of the outstanding tasks affected; Retention of completed history, clear manual fixed dates and warning of conflict, with the absolute duration of the provision not automatically reversed. Template time change: the default affects only subsequent examples, and existing activities are selected and previewed item by item; The manual adjustment cannot be fully covered.

## 7. Global AI, Save and Migration

Global AI request contains the current organization/page/target selected/version; Cross-page questions read relevant data and history of the same workspace on demand, avoiding sending a full library at each time. Support inquiries, explanations, renamings, adjustment of head/node/reliance, creation activities or draft Board services, and proposal for a white list to adjust relative time. The model does not directly write the database and does not directly generate the effective date. Post-approved service end validation and submission, interface targeting and synchronisation; Dictionary, not by name.

(a) All new operating data are permanently transferred to the service end private workspace; Do not copy old localStorage. A modified task/approval/budget update is not half-successful, using an equivalent mechanism for the presentation of the entire version item or with a submission mark. The ID is ordered to weigh, revise the conflict number check, operator/source/server time and retrospective event record. Failed to reserve local input submission, 409 overt conflict resolution. The consistency between the audit and the snapshot requires a recovery path, which cannot be limited to “maintained” cases.

(a) The atomic boundary is limited to Task/Gate/Funding within the same WorkItem polymer, with a single CAS or equivalent submission of guidance guarantees; The event archive was used to restore the unbox, preventing the status of the file from being submitted but permanently missing. Blobs does not provide arbitrary cross-client matters; The AI proposal, which also amends the organizational template and multiple tasks, identifies/records results by object, displays applications and unapplications and restores entry points, without claiming that any change across the platform can be submitted at once.

Old browser example data does not migrate. An additional version of the existing approved organizational configuration is compatible with default Timing; The relocation shall not be allowed to rerun AI or empty manual configurations. Authentication of name, state, all/any, historical configurations item by item; The old Waiting and Stuck can map but retain the original blocking information.

(b) The Files entrance should be changed to Organization documents, which will be placed in Constitution; Paste text indicates the source separately. Five chapters can be clicked to jump, toggle automatic saving, and zero AI calls unmodified. Remove Connections, all/any selection boxes and node by node Mark reviewed to keep the service end dependent on semantic and centralized impact reviews. line selection displays deletion/cancellation, to complement the cell phone and keyboard mode.

## 8. Worktree division of labour with Agent (established after approval)

Submitting the latest developments to establish an integrated branch, `feat/activity-workspace-v1`, based on dependent batches. Major Agent first freezes the share contract; The only person responsible for each document is the other Agent, who proposes changes via message and does not cover documents of others across the workspace. Worktrees rely independently on the installation/port, and small submissions are tested for cherry-nick to integrated branches.

| Agent | Worktree/ Branch Ideas | Single area of responsibility | Main delivery |
| --- | --- | --- | --- |
| Main Agent/Integrator | activity-integration / feat/activity-workspace-v1 | Share schema, page route, old and new boundary, migration version, document and integration | ID/status/approval/time/AI compact, stage integration with acceptance |
| Data Agent | activity-data / feat/activity-data | New running data storage/API, command validation, task/Gate/Funding connection | Congener Status, CAS/ idempulation, permissions interface, archive |
| Schedule Agent | activity-schedule / feat/activity-schedule | New relative time Scheduling fit, calendar overlay, rule test | 8/7/6 Default, relying on scheduling, rescheduling/cover protection |
| Workspace UI Agent | activity-ui / feat/activity-ui | Home, Activities, Activity Details/axis, Personal Board Component | A1/B1/C2, short chain, three rows board and completion history |
| AI Agent | activity-assistant / feat/activity-assistant | Global context/tools/proposals, phase summary cache, right column component | Positioning and approving changes across objects, moving out of the page and repeating conversations |
| Setup UI Agent | activity-setup / feat/activity-setup | Online Setup/SetupCharts and their Styles | Free Jumps, Timing Settings, Connection Deleting, Central Review, Documents |
| Independent Review Agent | activity-review / review/activity-workspace | Non-participation in functional development; Evaluation of integrated submissions, discrepancies and test evidence | Batch review, block lists, final signature and receipt |

A maximum of seven (including master Agent); The Review and other Agent operate in alternating phases. The new task running engine and the new UI to keep the old implementation as a clear reference, to the extent possible; The simple logic of the drag/rule can be extracted without directly reverting to the old store and fixed eight roll maps.

The proposed code boundary is frozen at P0: the main Agent takes exclusive possession of `src/workspace/contracts/`, `PhaseOne.tsx` route connections and migration versions; Data monopolizes `netlify/lib/workspace/` and runs API; Schedule takes exclusive possession of the new scheduling adapter and associated pure function tests; Worldspace UI exclusive of `src/workspace/pages/` and components; AI owns `src/workspace/assistant/` and the corresponding service end tool; Setup owns the existing `OnlineSetup.tsx`/ `SetupCharts.tsx` with styles. The person responsible is notified of changes in cross-catalog behaviour; The shared fixture/API sample is managed centrally by the main Agent. Unit tests with its own module, the browser tests sub-files and sub-ports and integrates them into a unified operation.

## 9. Order of implementation and delivery threshold

1. P0 Compacts and baselines: confirmation of development of SHA, document ownership, fixed ID, Task state/Gate, time anchor, version/relocation and authorized boundary. Independent Review first.
2. P1 Bottom closed: parallel durability/API and time engines; Start by creating the task item and update the homogeneity project to save/heavy  → Task.
3. P2 Pages are parallel to Setup:UI/Setup/AI on freezing contracts; A1/B1/C2, Personal Board, Funding embedded, global dialogue and Timing.
4. P3 End-to-end: The process of offline modelling of the same activity from preparation to approval/execution/conclusion eight weeks ago is completed; Covering parallels, denials, reschedulings, multi-person perspectives and malfunction recovery to repair all obstructions.
5. P4 Independent Review and Development Preview: Reviewer Review of Data/Process/Codes and Evidence; After it is sent to the development branch and previewed. Reconciling remote CI and deployment submissions, which cannot be verified and are clearly marked; Main remains unchanged.

## 10. List

- 15 sessions are searchable in a list, without 15 permanent tabs; Exact Board does not enter Recent activities.
- The home page has two categories of board, with a maximum of three priorities; The personal mission entrance is clear.
- Short chains include completed/current/follow-up phases; The parallels are visible, and the completion of figures is not fabricated by AI.
- (b) Task drags/finishes/records after Board, event axis, headline, short chain and reload; A portion of Task was completed without an error in completing the entire phase.
- Stuck's reasons are retained, all/any is correct and one block is removed from the other; Upstream completion is not automatically followed up.
- Procurement remains locked after budget submissions and unlocked after approval; Refusal/restatement, excess, multiple funding sources do not bypass approval.
- The 8/7/6 default and coverage is valid, with clear results from the working day/end week/calendar unknown/short lead window; Old official rules are not covered by internal adjustments.
- Reschedule and update templates to maintain completed/manual data; Reopening the task does not remove procurement records that have already occurred in live.
- The same name is not changed; (a) A change of name to update the current reference and preserve history; Changes across the page AI still need to be approved and not ultra vires.
- 409, offline, repeated requests, refreshing, internal jumps, return of cell phones for non-alcoholic input or duplicate generation/repayment model calls.
- Build, associated modules/integrations, desktop/cell browsers and keyboard checks; The last necessary full return. Live AI quality and performance is followed up by user acceptance, not replaced by simulation tests.

## 11. Scope of approval

The approval will be implemented as described above in closed loops, with an independent Worktree collaboration and a separate Review to complete the development preview. Does not include official issuance, main mege, live organizational account system, external procurement/payment/mail automatic execution, financial master record or study migration. If an official multiple login is required in the future, the identity/invite/organizations will be placed on the same stable ID and command interface as a clear work package.

The independent programme Review has been completed: the first four rules and two commitment boundaries have been cleared, while the updated version of the open programme is blocked at zero. For more details, see [ Independent Programme Review ](REVIEW_ACTIVITY_WORKSPACE.md). This is the conclusion that the programme can be submitted for approval and that formal implementation still requires user approval, which cannot be equated with code completion or test adoption.


## 12. Enforcement authorization and final comment

2026-10-26, the code can be modified when the user makes clear its final comment. The focus on the front page must be extracted and sorted from the current part of the task, displaying the first three by default, performing all important tasks and prohibiting AI from generating another summary/task list. All business data support the creation of forms/ creating workflows for organizational settings, members / rule, meeting activities and Exact Board through the same validated command for AI to propose adjustments, without writing permissions to any model database.
