# Workstream template phased restoration programme

2026-11-17（America/Phoenix）。Base `b18ee3c`, ready to submit `e87b19c`. Users have made a clear choice: both the number of working days and the Scheduling date are checked, and all phases are implemented continuously after the programme is completed. (b) No repetition of requests for confirmation at the stage covered; No merge main, no new PR.

## Objective and scope

Repair of node movements without updating, addition of the original branch to a new branch, workload data anomalies, Full Check deletions leading to process loss, release of additional tasks from the conditional branch and provision of a clear parallel branch before/after operating with the new branch. Corresponding to audit of WF-04/05/06/08/09/10, workload processing with value input and start alarm; WF-09 deals only with uniform mandatory rules and avoids tension between the editor and the generator.

The WF-01/02/03/11/12/13 is delayed for links and details easy to use. Existing panels only have access to the required value check, remove protection and add operations. Parallel changes to the actual mandate Details/Edit must be retained. Dates are calculated only by rule engine and do not call live AI or live mail.

## Operating rules

| User Actions | Rehabilitated behaviour |
| --- | --- |
| Move the same branch node | At the same time, local orders and associated reliance are changed and updated immediately; Save, refresh, new activity with consistent results |
| Add before or after a node | (b) To explicitly use the branch to which the node has been clicked and by default to succeed to the applicable conditions of that node; The end of the branch applies as well. |
| Add an online paragraph | (a) The branch using the segment; If two-end conditions are inconsistent, the range is clear and no left node condition is stolen |
| Add before Full Check and other shared convergence points | (c) Explicitly opting to enter its branch, or using the link of that branch; Can not use first line as default |
| Move across branches | (a) Retention of the head and workload; Displays a change in scope of application that cannot be changed. Drag the cross-section between activity and end of session to reject and explain |
| Add branch | A stand-alone Addbranch, choosing name, pre/post activity, scope of application, default rule and first task; Create a full branch at once |
| Modify working days | The legal integer is saved and the empty value does not become zero; Clear input 0 is still valid; Manually modified to start reminders based on workload |
| Delete Full Check | All entrances were consistently rejected and explained structural requirements; Show all remaining tasks when old data are missing |

The key to the prefix is a clear command for `branchId` and `referenceId`. Even if the left is Start or the right is Full Check, the clicked branch nodes are used; Branches, role, stages, reliance are expressed separately.

Add a new branch to support the security structure in line with the existing map: pre-activities start — new branch — Full Check; After the event Head Count — New Branch — Done. Do not do any nesting branch or edit any convergence point. Start/Done is a virtual site, not dependent on forged tasks; Live Full Check is dependent on the last step of the new branch before the event, and the final step depends on the first step is live Head Count, with Done deriving from actual completion status.

## Data-sharing and implementation rules

1. **Saves branches and locations.**New Templates and Tasks Optional `placement: { branchId, order }`； Templates store branch definitions, new activities keep their own branch snapshots and subsequent template changes do not change existing activities.
2. The **position does not amount to dependence.** Grouped by Branch, relying on top-tops to determine the order of order to be preserved as parallel nodes; It does not impose a chain of all adjacent steps, nor does it depend on the date to determine the location of the map. Moves only to reconnect the relevant branch order, retaining manual cross-branch dependency and refusing all times when a ring occurs.
3. **condition stratification.** Practical application = branch condition AND node condition. Re-use of existing white list conditions; Speaker, catering, RSVP, security, etc. Federation/Marking/Special Internal Mixing Conditions that do not blindly give the entire branch conditions to duplicate neighbours.
4. **Uniform protection rules.** ASU requirements, existing CORE pools, structural anchors and actual activity completed unified nodes verification; Organizational standards do not pretend to be school rules. No nodes can be kept hidden by the branch of conditionality.
5. **operates one time to save.** branch definitions, steps, reliance, location and conditions are verified together, sustained and withdrawn. The failure of invalid references, trans-activity IDs, unknown branches, loops and saves does not leave half the result, nor does it show success.
6. **Old data maintained.** Schema 23 does not reset. Standard key compatibility map for missing fields only; The old self-defined nodes did not depend on neighbours guessing the scope of application, and the observable compatible branches were retained in ambiguity. Read not to regenerate historical tasks, keeping responsible persons, status, content, attachments and reminder history. The old Full Check/ Head Count does not automatically create a history task by using a graphical backup anchor when missing.

## Workload and Scheduling Rules

Section 6 of the existing `CALIBRATION_REPORT.md` lists “modification of workload without changing date of calibration” as known differences to be confirmed; This is not a fault that has been resolved, nor is it a condition of ratification that must be followed. This round selects compatible default tables, while allowing future well-defined human workload editing to produce an interpretable scheduling effect.

- Numerical boxes keep draft local strings; Only the legal integer 0-30 returns and the empty, negative, decimal or excess limit is changed to another number.
- Add an optional `startPolicy: window | effort`. Existing compatible behaviours should be followed when there are no fields; Set-up when clearly changing workloads; Undo/Recovery standard is accompanied by a recovery strategy.
- Effort uses final cut-off days, working days and complete personal buffers to push the start day, taking into account weekends, holidays and busy weeks. Retains the deadline and semantic content of Timing, which cannot be simply deleted.
- The standard steps and historical activities were not edited using the original time window; There is no natural day-to-day backloading and no automatic modification of the difficulty, contribution formula or predictive model.
- (c) Official hard-cut deadlines are not subject to drag or ease of work; The end cannot be pushed back to the event, reporting live conflicts when there is a shortage of time.
- Manually confirmed workloads are accompanied by a clear strategy to avoid using the old Pre_FB6 values guessing it back to its old default.

## Phase with Worktree

Phase 0 has completed an independent analysis of three Agents; The following is done on a dependency basis and the same phase does not alter each other ' s documents. Each phase freezes the interface and begins to rely on its packages.

| Phase | Work package and sole file responsibility | Delivery and thresholds |
| --- | --- | --- |
| 1 Bottom Contract Compatibility | Main Agent maintains type/store/settings/read and write contracts; DataAgent maintains branch definitions, applicable conditions, generation, protection and old data compatibility. Graph Agent at this stage first achieves a pure recombinable map operation without an incomplete UI | (b) The branches, conditions, location and cancellation contracts that may be preserved; Harmonizing Full Check/CORE protection; The old archive went backwards and the task was not recreated |
| 2 Graphics Operation and Workload | Graph Agent maintains metro, MetroChart,lowEdit,stepOrder; UI Agent maintains WorldPanel, Settings, new branch small windows and draft values; Timing Agent maintains the schedule and stand-alone workload support functions. Playbooks are written by DataAgent only and Timing requires generation changes to be integrated by Data | Move, before/after, add new links, add additional branches, separate conditions, time editor/date all connected; Modules and components cross-examining |
| 3 Integration and independent review | Main Agent integration; Independent Review Agent recommences nonvariable, compatible and unauthorised ranges; Browser double-end validation and check build, type, lint and associated returns | Relevant examples are adopted; The source check confirms that the links and the Decails layout have not been changed; Retain existing PR14 and functional branches, check remote new submission and forward |

Implementing worktree naming: `workflow-integration`, `workflow-data`, `workflow-graph`, `workflow-timing`, `workflow-ui`, `workflow-review`. The `workflow-graph-plan`, `workflow-timing-plan` and `workflow-scope-plan` have been used for planning analysis, and the three catalogues have not changed products. Agent only submits his own package, does not send the shared preview branch separately and is integrated by master Agent in sequence.

The only writeer who shares the files is particularly important: `types.ts/store.tsx/settings.ts` Main Agent; `playbooks.ts/workflow.ts` Data；`stepOrder.ts/flowEdit.ts` Graph；`WorkflowPanel.tsx/Settings.tsx` UI。Cross-package requirements are delivered to the person in charge by freezing interfaces or patches and do not cover each other. The actual mission Details/Edit has additional work in progress, which was previously reviewed and maintained at an incremental rate.

## Rebuttals and Users Required

| Category | Counterfeit |
| --- | --- |
| Move | Mouse and keyboard movePromotion Items; It is asserted that live displays order, dependence, preservation, refreshing. Do not lose upstream/downstream across branches; Undependable adjoining tasks are not colluded |
| Add Original Branch | First node before, middle node before/affer, last node aafter, line inserted; The same role was still in charge of both branches. Share Full Check doesn't guess the line |
| Condition | Speaker/partner switches, catering switches, RSVP switches, security conditions respectively; Add correct task after closing sskip and rely on noghost ID |
| New Branch | Previous/post-branch, constant/conditional scope, continuous additions, generation of new activities, updating, Undo and cancellation; There's no overlap in the new branch of the cell phone. |
| Delete | Fuld Check refused at the entrance; (b) The saveable template is consistent with the necessary reserve pool of the generator; Old Full Check or Head Count displays all original tasks |
| Workload | Empty, 0, 10, negative, decimal, excess, toggle nodes, undo, refresh; 2 ~10 The day of the start of the correct impact on manual strategy; The official date remains unchanged. |
| Calendar | Weekends, holidays, busy weeks, buffer 0/ 1/3; (b) The lack of end-of-life time for conflict; No standard date sample edited without drifting |
| Save Restore | Unknown ID, expired gap, looped, written to failed atom rejection; Template snapshots and activity snapshots are completely withdrawn; Historical content/state/head/alert not recreated |
| Exclusion | Handle links, Details layouts, actual task submission/Edit, difficulty/ contribution and live delivery not to be redecorated |

Eventually edits a speaker process from Settings: Move  →  Insert  →  New Conditional Branch  →  Change of Working Day  →  Update New Speaker Activity  →  Check date and reminder facts against normal activity. Each conclusion needs to correspond to the branch's actual code and test and cannot be replaced by `all old tests passed'.

## Rollback and Risk

Each package is submitted independently, consolidating the reserved boundary. Packages involving new metadata cannot remove only UI and discard existing fields; Rollback first closes the new operation, saves to parsing and exporting. At any stage, it is not clear that the empty browser is archived, does not modify main or call fee AI.

The main risks were that the old self-defined range of steps could not be reversed, cross-branch reliance was wrongly deleted by mobile operations, default dates were recalculated in one size and one size, Undo only restored nodes but missed branches, common changes to shared documents and existing visual convergences did not amount to actual waiting. The programme is handled through explicit attribution, stratification conditions, partial reliance on operations, compatible strategies, complete snapshots and sole document owner; Not all existing visual convergences will be quietly replaced by new mandatory dependence during this round.

Phases 1, 2, 3 have been completed and the running-time code 18d7316; Results, compatible boundaries and acceptance see [ restoration delivery ](WORKFLOW_STABILITY_HANDOFF.md). Could not close temporary folder: %s
