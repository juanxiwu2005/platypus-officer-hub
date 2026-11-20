# Email opens event Plan with task expanded on the right

> **Later status:** Juanxi approved implementation using the actual workflow; see [handoff](REMINDER_PLAN_ENTRY_HANDOFF.md). Original two-static-image discussion scope retained below; images are not final flowchart layout.

2026-11-18 (America/Phoenix) · Codex · Two static references, implementation awaiting Juanxi approval

## Requirements/scope

Juanxi liked the prior reminder email but found standalone task pages inconvenient for viewing others' submissions across nodes. New direction: email opens relevant event Plan, Details automatically expands target task, members click other nodes for materials.

This round only read implementation/generated two static images; no product code, email URLs, authorization, storage, reminder rules, or Settings templates changed, no subsequent implementation started. Existing branch/PR#14, no new PR/main merge. Preserve other chat's boundary between Settings editor and Plan dotted execution view.

## Two states of one path

1. **Email → room task in Plan.** Plan selected left; Speaker Night dotted workflow center automatically locates/highlights Reserve a room; Details open right. Retain one Due, owner/status, requirements, multiple relevant external entries, unified large Details box, attachments/automatic draft; no need to find event/task again.
2. **Click another node → teammate submission.** Event requirements on same graph switches Details to Maya's submitted attendance, times, accessibility/equipment needs, attachments. Jordan can read shared results; own room node remains visible, with lightweight Back to Reserve a room on right.

Sequential usage states, not competing designs. People/events/dates/workflow/submissions fictional, not participant data or rule-calculated results. Desktop graph/Details remain side by side, without modal covering other nodes.

## Reusable code

- `src/routes.ts`: Plan=`/events`, existing Events/Tasks navigation.
- `src/pages/Events.tsx`: selects event via `event`; `MetroChart.onSelect` calls `rail.show({kind:"node",id})`; `selectedId` selects graph node. Does not yet read email task-selection parameter.
- `src/components/rail/RailContext.tsx`: `show()` opens rail/Details directly; selection mainly in memory, future refresh/back target restoration needed.
- `src/components/rail/Rail.tsx`, `src/components/TaskDetail.tsx`: reuse shared Details, no alternate form.
- `src/taskDetails/TaskSubmission.tsx`: existing read-only others' submissions/attachments, existing automatic drafts for own text/files; switching nodes must not expose private unsubmitted drafts.

Code baseline runtime `bebe999`, synchronized to documentation `8cc68be` before this round; images do not mean routing implemented.

## Behavior after approval

- Email carries event/stable task ID, forces appropriate Plan view, rail/node focus; remembered List/Budget must not hide target.
- Node switching/refresh/Back/Forward maintain consistent selection; invalid/reassigned nodes offer recoverable explanations, never wrong event's first task.
- Lightweight return to original email task; one Details panel at a time.
- Own drafts/published results separate, automatic saving across nodes; reading teammate submissions grants no editing permission.
- Existing token authorizes only one task, **not a whole-club login**. Other-node shared materials require existing member session; sign in if necessary preserving target. Identity integration confirmed during implementation; no promise of completed cross-device access in mockups.
- Desktop side-by-side; mobile existing fullscreen Details needs Back to Plan/node switching; no separate mobile design this round.
- Do not change prior email's multiple entries; eventual Plan a start/Ask for help should also enter target context in same Plan, subview to confirm separately.

## Images/acceptance

- [Image 1: email opens Plan/room task](../prototypes/reminder-plan-entry/01-email-opens-plan.png)
- [Image 2: another member's submitted node](../prototypes/reminder-plan-entry/02-view-teammate-submission.png)
- [Manifest](../prototypes/reminder-plan-entry/manifest.json)

Only static images/document links/diff scope checked; no behavior changes, product tests, or real emails. Implement email/Plan interactions after user image approval.
