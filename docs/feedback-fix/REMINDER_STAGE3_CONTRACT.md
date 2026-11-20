# Reminder stage 3: Details, reminder center, unified demo-send contract

2026-11-16 (America/Phoenix). Juanxi explicitly requested "continue stage 3". Baseline `feat/reminder-plan-v2@17b3e3c`, including matching source `5e301d9`; reuse PR #15, no main merge/release/real AI/external email.

## Exclusive file ownership

- Lead: shared types/store, runtime/engine/adapter, taskAccess/message, `delivery.ts`, automatic preparation hook, Settings, compatibility entries, integration/e2e/docs.
- Details Agent: `src/components/TaskDetail.tsx`, `TaskActions.tsx`, separate `src/reminders/task-detail.css`, targeted Details/Actions tests. No shared store/original global CSS.
- Centre Agent: `src/pages/Today.tsx`, `src/reminders/centre.ts` (shared presentation results/tests), separate `centre.css`, targeted Today tests. No old lib/reminderQueue, store, Settings, service.
- Independent Review: final read-only review, counterexamples returned to owners. At most two concurrent developer agents, each independent worktree from frozen commit.

## Version and enabling

New runtime version 2 requires complete validated rule-based email and a single task entry for new sends. Reads v1 history; v1/no-runtime saves require explicit upgrade/enable; unknown/corrupt values retained unchanged and disabled. New organizations enable v2 by default; reload neither resets nor fabricates history. Upgrade preserves mode/maxNudges/old silence settings; UI explains new member reminders at start/due/3 days overdue, six emails per seven days; old member 3/5-day parameters remain without duplicate execution; leadership escalation retains original configuration.

Nodes with unprovable historical recipients remain pending review; explicit owner confirmation permits future reminders without rewriting history/guessing old recipients. Confirmation requires a save receipt. Neither v1 nor v2 business reducers directly create bodyless automatic sends; v2 async preparation signs entry/builds email, then same reducer revalidates and persists. Unsaved is not sent. Background scheduling/cross-device remain item six.

## Centre Agent shared presentation

`src/reminders/centre.ts` exports `reminderCentre(state)`, `taskReminderSummary(state,nodeId)`.

`reminderCentre`: `runtimeState: 'active'|'legacy'|'invalid'` (active only v2), `mode`, `needsOk`, `thisWeek`, `sent`, `replies`, `noReply`, `blocked`, `approvableCandidateIds`.

Shared rows contain at least `id,nodeId,eventName,taskTitle,recipientId,recipientName,ownerId,ownerVersion,due,reason,explanation,risk,taskAvailable`, optionally `candidateId,scheduledOn,blockedReason,deliveryId,sentOn,via,outcome,message,reply,days`. History uses saved recipient/task/event/date snapshots, never current-owner replacements; deleted-task history remains. Old nudge/protocol without proven recipient explicitly shows Earlier reminder/recipient not recorded, excluded from no-reply and never fabricated as new delivery.

`taskReminderSummary`: `runtimeState`, `recipientId/recipientName`, `explanation`, `blockedReason:string|null`, `canPrepare:boolean`, `candidateId?:string`, `history` (same history rows). Details uses directly for preparation/status, no mixed nudgeBlocked. Disabled/old runtime prompts enabling, never claims active; Working retains due check, Waiting explains assistance target/reply, Stuck pauses, Done ends.

Retain five sections `rq-needs-ok/rq-this-week/rq-sent/rq-replies/rq-no-reply`. Replies accept only actual ownerReply in same term or actual response to same waitingRequest; sequence orders same-day events. No reply starts from actual saved delivery; reassigned/completed/responded cases stop chasing old target. This week contains only nearest candidate in next 7 days; primary date Task due.

## Lead unified preparation/recording

`src/reminders/delivery.ts` exports:

```
sendReminderBatch(
  store: {getState:()=>DemoState;tryDispatch:(a:Action)=>boolean},
  candidateIds:string[], origin:string, via:'platypus'|'automatic',
  isCurrent?:()=>boolean
): Promise<{recordedIds:string[];failedIds:string[];error:string|null}>
```

Centre batch only review_then_auto with lead, via=platypus; automatic authorized by organization settings, may follow ordinary member actions, never borrows viewer identity. Service reads rule facts/prepares via same mail/taskAccess; recording reducer rechecks current organization/date/mode/candidate/recipient/owner version/limits/snapshot/authorization. Changed state/preparation failure records only still-valid entries; success determined from newly added delivery IDs, never old records. Automatic component loads asynchronously on demand; save failures stop with explicit retry, no write loop.

New actions: `upgradeReminderPlan` (lead, v1→v2/none→v2), `reviewLegacyReminder {nodeId}` (lead, confirms future target, no history change), `recordReminderBatch {via,entries}` (lead defines shared types). Single composer reuses same mail/authorization/snapshot validation; v2 rejects bodyless old confirmation path.

Provider exposes `automaticReminders:{busy:boolean;error:string|null;retry:()=>void}` for center's preparation/failure retry. Enabling/history confirmation use tryDispatch+getState to verify results. Invalid runtime has no overwrite-enable button.

## Details and status

Three sections: event/task/owner status and one Task due; requirements/completion criteria/importance, one applicable external destination, status actions; reminder recipient/reason/review or automatic demo plus collapsed history. Official/dependency severe risks visible; private start parameters retain permissions. Preserve People/date derivation/Sources/Edit/responsibility matching and unassigned-task assignment UI.

TaskActions supports Done, Working on it, Stuck, Waiting on; retain extension request as secondary flow, old token compatibility. Status remains owner/president only; VP gains no reporting-on-behalf permission; claiming/finance constraints unchanged. Waiting requires current member + specific explanation, saves verbatim without request recreation, guesses no external email. tryDispatch/getState determines success; failure preserves input.

## Acceptance

Explicit v1/old-save upgrade, settings/history retained, corrupt-data protection, new org default v2; all three modes' single/batch/automatic complete emails persisted; daily/person/task limits, failures/cross-tab conflicts, reassignment/rescheduling/recipient changes, waiting-target permissions/deduplication; actual same-day replies, no wrong sends from old history; readable desktop/mobile Details, keyboard/a11y/overflow; entry ≤550,000 bytes and existing word budgets. Historical FB waves/handoff behavior unchanged.
