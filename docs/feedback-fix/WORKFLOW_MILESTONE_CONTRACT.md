# One-day/two-day milestone workflow implementation contract

2026-11-18 (America/Phoenix), Codex. User approved integrating the interaction into original preview 14, 1-day/2-day only, no 3-day; every visible node clickable/editable in right-side Details.

## Approved outcome

- Main spine retains Start/Done, shared actual tasks/date milestones; branches split/rejoin spine. Team work can occur before/after each Event day and between days.
- Each Event day has independent stable ID/name/date relative to Day1/description; fixed date never delayed by unfinished predecessors. Rule engine computes actual date from event date/offset.
- Each branch references existing organizational teamId selected by dropdown; no team renaming on canvas, no automatic Team N creation. Same team may own multiple branches in different intervals.
- Start/Done fixed boundaries, not deliverable tasks, but names/descriptions editable in Details. Actual/shared-check tasks equally editable: name, responsible team/role, description, duration, target relative to Event day, prerequisites.
- Add branch chooses team/start/join point; team boundaries separate from old business-condition branches. Preserve add/insert/cross-branch drag/Undo/draft/version saves/refresh recovery.

## Data/compatibility

Optional version 1 `WorkflowTemplateContent.milestoneGraph` metadata includes start/done descriptions, up to two eventDays, spine references, teamBranches/taskAnchors. Real tasks remain in steps, without duplication. Each step appears exactly once in spine or one branch; all team/connection references validated.

taskAnchors stores eventDayId/offsetDays/optional calendar/business units; school rules remain relative to Day 1, never relaxed by Day 2 selection. New graph execution has controlled separate date path; legacy graphless/sequential events keep old algorithm. Version snapshots/copies/instantiation preserve relations; no rewriting existing events/deliverables, no schema 23 reset. Milestones create no business tasks/reminders; unfinished prerequisites only flag risk.

## Ownership

- Lead: Builder/Library/right-side Details, docs/integration/final push.
- Model: shared types/workflowTemplates/new engine/workflowMilestones, necessary schedule/tests.
- Canvas: new MilestoneWorkflowCanvas/milestoneLayout/dedicated CSS/tests; no Builder/Library edits.
- Commands: independent-worktree pure add/move/date-switch commands; Browser: actual Plan task projection/milestone e2e/affected regressions; independent Review final read-only check.

Ordinary dates/owners/teams still saved through validated existing operations; pixels never dates. Preserve concurrent reminder fix ef0d0d0, no reminder/email/handoff implementation changes. Existing PR14/feature branch, 0 real product AI/external email, no main merge.
