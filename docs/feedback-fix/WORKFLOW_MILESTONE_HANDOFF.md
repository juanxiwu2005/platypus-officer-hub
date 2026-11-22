# One-day/two-day date-mainline workflow handoff

2026-11-18 (America/Phoenix) · Codex / Model / Canvas / Commands / Browser / independent Review.

Runtime `7b3f5fc` confirmed Netlify preview14 success; user approved direct integration of interaction design into existing [preview14](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/settings) → Workflow, one/two days only. Existing branch/PR14 retained, no main merge. Supersedes current design in `WORKFLOW_DOT_EDITOR_HANDOFF`, preserving history.

## Connected operations

- Workflow length only 1-day / 2-day. New template Start—Event day—Done; two days separately named, Day2 offset relative to Day1; preview dates separate from actual event dates.
- Every node clickable: Start/Done edit name/description; Event day edits name/description/relative date; shared Full check/ordinary tasks edit full name, team branch, role, duration, target completion relative to selected day, business conditions, description, prerequisites.
- Add branch chooses existing Team/Starts at/Joins at in right panel. Work before event, between Day1/Day2, after final day; multiple local branches per team. Canvas dropdown changes only this branch's team; org settings manage team catalog, canvas never creates/renames organization teams.
- One-click `+ Task`, each branch also `+`. Empty template creates first branch under existing org team; unassigned old drafts repairable individually; clearing team saves absent map entry, not invalid empty value. Full check adds real shared task; Event day max two, always date stations. Mouse/touch cross-branch dragging retains real IDs, conditions, roles, duration, external prerequisites; changing interval updates selected Event day, original relative offset editable in Details. Undo restores whole transaction.
- Mainline/gray branches laid out by connections; translucent cards cover only branch interval; dense tasks wrap locally. Fit/zoom, internal scroll, full-name accessible labels, Quick entry, draft/version saving, copy/default template retained.

## Dates and snapshots

Optional `WorkflowTemplateContent.milestoneGraph.version:1` stores endpoints, one/two days, mainline, team branches, per-task anchors. Every real step appears exactly once; org teamId agrees with stepTeams; save/publish/run all validate. Derived branch dependencies plus existing prerequisites must remain acyclic. Copying custom templates remaps actual task IDs; run snapshots retain teams/version/date graph independent of later edits.

New graph runs use controlled separate scheduling: rule engine computes fixed Day1/Day2, relative calendar/business targets, owner's workdays, full buffers. Upstream plans later than task start or targets/effort outside branch endpoints explicitly raise risk; never move milestones to hide conflict. Official ASU dates/club buffer stay relative to real Day1, never postponed via Day2. Configuring a graph does not guarantee completion; users must leave reasonable time.

Existing no-graph/sequential versions/events preserve algorithm, actual tasks, results, reminder history, official rules; no schema23 reset. Plan reuses graph-snapshot layout, mapping actual IDs via `workflowSource.templateStepId`; conditionally omitted tasks disappear from projection without losing actual extra tasks. Clicks open original Task Details/permissions. Plan Event day/Start/Done show snapshot source/fixed dates, definitions editable only in template editor; no business tasks, effort, results, reminders generated for stations.

## Review fixes

Independent Review checked cleared/new-team mapping consistency, Apply role teams atomic branch sync, Full check not forcibly joining work later than checkpoint, selection after deleting Day2/Undo. Fixed with regressions. Canvas cannot free-type old team names or create Team N automatically. No reminder/email/handoff changes; 0 real product AI/external email.

## Verification and takeover

Final 23 files/210 related unit/component tests passed: graph completeness/cycles, fixed-day scheduling, official Day1 hard limit, conditions, copy/version isolation, all-node editing, unassigned teams, actual-task projection, initial/selected positioning. Lint, frontend/backend types, production build, standalone CSS, 9-page words passed; Settings 145/150, entry 498,362/550,000 bytes. Unique device browser cases: 46 passed (12 new + 34 original editor); after final color fix, 4 affected Plan/link/theme cases rerun passed, not counted again. Includes actual mouse/touch cross-branch moves, reorder/Undo, all-node Details edit/refresh, publish to actual Plan, exact per-day dates, old events/results/reminder history, 0 serious/critical axe, no horizontal overflow. Initial body-label locator/old steps-dependency assertions corrected to accessible names/graph source of truth and rerun, retaining independent actual-generated-dependency/old-event/original-task assertions. No unrelated full-site rerun, 0 real AI/external email. [Verification](workflow-milestone-verification.json), [46 unique cases](workflow-milestone-browser-cases.json).

[Production-build screenshots](../prototypes/workflow-milestones/manifest.json) visually inspected: standard 46 tasks, one/two-day editor desktop/mobile light/dark, actual Plan. Online deploy verified via Netlify commit status; fresh cloud browser hits preview Netlify edge-access, no bypass. Interaction checks ran locally on identical production build.

Main code: `workflowBuilder/{WorkflowBuilder,MilestoneDetails,MilestoneWorkflowCanvas,milestoneLayout,milestoneCommands}`, `workflowLibrary/WorkflowLibrary`, `engine/workflowMilestones`, `schedule.planMilestoneEvent`, `data/workflowTemplates`, `flow/MilestoneExecutionChart`.

Acceptance: Settings → Workflow → New workflow; switch 2-day, click Start/Done/both Event day/tasks to edit Details; Add branch selects existing Team/endpoints; add/drag/Undo, Save draft/refresh; Save version, create event with it, verify actionable actual tasks/fixed station dates in Plan. Existing events unaffected by template edits.

Still same-browser prototype; no real sending service/server accounts/cross-device sync. PRODUCT_PLAN/RULES/PROGRESS updated; local backup sync required.
