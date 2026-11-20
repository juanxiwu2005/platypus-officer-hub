# One/two-day milestone workflow implementation compact

2026-11-18（America/Phoenix），Codex。Users have approved interactive program access to the original preview 14, only 1-day / 2- day, not 3-day; All visible node can click on Details to modify it on the right.

## Results approved by user

- The main line maintains Start/ Done, shares live tasks and date milestones; Branches can be separated and merged on the main line. Event can work as a team before and after the day, or in two days.
- Each Event day independently stabilizes ID, name, relative Day1 date and description; The fixed date will not be postponed owing to the non-completion of previous tasks. The actual date is calculated by rule engine using the activity date and offset.
- Each branch reference organization already has teamId, drawn from the frame; The name of a team does not exist in the canvassing organization, no new Team N is automatically created. The same team can repeat responsibility for several branchs between different sectors.
- Start/Done is a fixed border and not a result task; You can also edit names and descriptions by clicking on Details. Live tasks can be edited by name, team/ rule, description, duration, target relative to a single Event day. Share inspection tasks with one another.
- Addbranch selects the responsible team, where to start and where to meet; Team boundaries and old operating conditions are independent of Branch. Adds/inserts/crossbranch drag/Undo/ save drafts and versions, refreshs them to be maintained.

## Data compatibility

WorklowTemplateContent.milestoneGraph is an optional version1 metadata, including start/done descriptions, up to two eventsDays, spine references, teambranches and taskAnchors. Live task is still in step, not copying task. Each step in the graph must appear at the spot or a teambranch, and all team/connection references are verified.

taskAnchors saves eventDayId, offsetDays and optional calendar/business units; School official rules continue to be calculated relative to Day1 and may not be relaxed by choosing Day2. (b) The new version of graph implements the controlled independent date path; Old no graph and sequential activities retain old algorithms. The snapshot, copying and exemplifying retention of the map relationship is available without rewriting activities/outputs or replacing schema23. Milestones do not generate operational tasks and no reminders; Risk only is reported before completion.

## Documents Officer

- Master Agent: Builder/Library and rightDetails, documents, integration and final delivery.
- Model: Share typers, workflyTemplates, New engine/worklowMilestones, necessary Schedule and targeting tests.
- Canvas: New Milestone WorklowCanvas, Milestone Layout and independent CSS/test without change to Builder/Library.
- Comands: Independent worktree to achieve new/move/date switch pure commands; Browser: Projection of Plan's actual mission with milestone e2e, affected return; Independent Review ultimately reads only reviews.

Normal dates, directors and teams are still preserved through existing validated operations; Can't put pixels on date. Keep the same reminder fix ef0d0d0 and do not modify alarm/mail/handoff realized. Following the original PR14/ Function Branch, 0 Live Product AI/External Mail, no more mege main.
