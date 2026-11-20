# Mail into activity Plan and start task on right

> **Follow-up Status:** Juanxi has been approved to be implemented as live workflow, see [ Delivery Record ](REMINDER_PLAN_ENTRY_HANDOFF.md). The original scope of discussion of the two static maps is retained below, and the picture is not the final flow chart layout.

2026-11-18 (America/Phoenix) Codex . Two static reference maps to be implemented by Juanxi after approval

## Requirements and scope of the current round

Juanxi likes the last round of reminders, but points out that separate task pages do not allow access to information submitted by other members at different nodes. New direction: Mail enters the activity Plan, Details on the right automatically starts the target task, and members can view the information directly by clicking on other nodes.

This round will read only the existing realizations and produce two static images; No product code, mail URL, authorization, storage, alarm rules or Settings templates were modified and no follow-up was initiated. Continues the original branch/PR #14, does not create PR, does not merge main. Maintains the boundary between the Settings Editor and Plan point execution interface, as recorded in another dialogue.

## Two maps are two states of the same path.

1. **Mail  →  Plan's reservation task.** Left Plan Navigator Selection; The middle is a point flow chart for Speaker Night, which automatically locates and highlights the Reserve a room; Right Details open simultaneously. (a) To maintain a Due, principal, status, specific requirements, multiple relevant external entry points, unified Details large text boxes, attachments and automatic drafts; There is no need to look for activities and tasks.
2. **Click on another node to view the membership submission.** The above point of the same chart Event references to the number, time frame, accessibility and equipment requirements submitted by Maya on the right. Jordan can read the results shared by these teams; Your own booking node is still visible, with a light port to the right.

These are consecutive status and are not mutually exclusive interface options. The figures, activities, dates, workflows and submissions in the figure are all full-fledged notes and are not research participants ' information or rule calculations. Keep an actionable flow chart on the desktop alongside Details; No other nodes were covered with a window.

## What can the existing code be reused for?

- `src/routes.ts`: Plan corresponds to `/events`, with available navigation for Events/Tasks.
- `src/pages/Events.tsx`: The activity has been selected using the `event` parameter; `MetroChart.onSelect` to `rail.show({kind:"node",id})`; `selectedId` is used for the current node in the chart. The current logic does not yet read the job selection parameters required for mail.
- `src/components/rail/RailContext.tsx`: `show()` can directly open the right column and select Details; The primary memory is currently selected, and targets will need to be processed for restoration after the refresh/ fallback.
- `src/components/rail/Rail.tsx` and `src/components/TaskDetail.tsx`: shared task details can be used; Do not add another set of forms.
- `src/taskDetails/TaskSubmission.tsx`: Read-only displays of content and attachments submitted by others, with their own body/document using existing automatic drafts; Private non-submission of drafts should not be seen by others as a result of switching nodes.

The code check baseline is `bebe999` when running, synchronizing to file submission `8cc68be` before the start of this round; These two do not indicate that the follow-up route functionality has been achieved.

## Act after approval.

- The mail entrance carries the activity and stabilization task ID, forcing the proper Plan view to be displayed after entering, opening the right column and positioning the node; Could not close temporary folder: %s
- Toggles the selection status of nodes, refreshes, browsers forward and backslide; When node lapses/reassignments give a description that can be restored and does not wrongly open the first task for other activities.
- The original mail task can be returned lightly; Only one Details panel is displayed at the same time.
- (c) To maintain the independence of their own drafts from published results and to continue auto-saving across nodes; Look for other members who have submitted information that will not be able to modify their tasks.
- The current email token only authorizes specific tasks and **cannot use it as a full root login identity for**. The team information for other nodes needs to be viewed with an existing session, login and retain the original target if necessary. Specific access needs to be confirmed during the implementation phase, and there is no commitment in the figure that existing cross-equipment links have been completed.
- Two parallel columns of the desktop; The mobile phone continues to fit into the full screen of the existing Details and will be required to provide a back-plan/node switch entrance; No cellular phone was designed separately for this round.
- This round does not change multiple entrances in the previous e-mail round; If the Plan a start/ Ask for help is eventually adopted, they should also enter the same target context of the Plan 's task, which is confirmed separately by the specific subview.

## Pictures and acceptance

- [Figure 1: Mail entering Plan and booking tasks](../prototypes/reminder-plan-entry/01-email-opens-plan.png)
- [Figure 2: Switch to other minutes of submitted nodes. ](../prototypes/reminder-plan-entry/02-view-teammate-submission.png)
- [Photo Listing](../prototypes/reminder-plan-entry/manifest.json)

Only static pictures, document links and variance ranges are verified; No product behavior changes, no product testing and no live mail. The mail portal and related Plan interactions will be implemented after user chart approval.
