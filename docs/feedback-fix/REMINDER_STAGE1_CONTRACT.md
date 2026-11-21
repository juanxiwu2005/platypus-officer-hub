# Reminder stage 1 frozen contract

Type source of truth: `src/reminders/contracts.ts`. Lead must notify both developers of type changes; Data/Rules must not edit that file or old business files.

## Data exports (facts.ts / actionLinks.ts)

- `buildReminderFacts(state: DemoState, nodeId: string): ReminderTaskFacts | null`: actual event/task/rule facts only. Missing event is null; standalone tasks still supported. Known stepKey templates may insert actual headcount/date into requirements; importance prefers manual why or actual dependencies, inventing no consequences. No three parallel dates.
- `reminderPeople(state: DemoState): ReminderPerson[]`: reuse officers/isOfficer for current status; former/incoming officers cannot be automatic waiting targets.
- `buildReminderInput(state: DemoState, runtime: ReminderRuntime): ReminderInput`: adaptation only, no engine call.
- `taskActionLink(node: Node): TaskActionLink | null`: reuse known existing destinations, preferring one, explain applicability; invent none. Used on standalone task page, not a second email link.
- `planKey` = JSON.stringify([node.id, node.ownerId, node.ownerVersion ?? 0, node.clubDeadline, node.latestStart]). Title/tag edits do not create new plans.

## Rules exports (engine.ts)

- `createReminderRuntime(today: string): ReminderRuntime`.
- `transitionReminderRuntime(input: ReminderTransition): ReminderRuntime`: compare facts, append updates in actual operation order; explicit updatedNodeIds supplied only by lead for claim/reply/board actions. Same-day order uses sequence, not lastUpdate to infer respondents. Repeated waiting submission with identical target/content creates no second request; unclear target may use recipientId:null and blocked. Completion/reassignment/undo/target changes close old requests.
- `planReminders(input: ReminderInput): ReminderPlan`: compare existing rule-engine dates only; overdue day 3 uses addDays(due,3); return ready/upcoming/blocked. Only actual ownerReply/status affect start reminders, not title edits. Waiting target must be active in people and differ from original owner; do not guess missing targets. Temporary weekly limits must not permanently discard candidates; only one email per day, no repeated catch-up of earlier candidates.
- `confirmReminderDelivery(input: ReminderInput, candidateId: string, via: ReminderDelivery['via']): ReminderRuntime`: recheck current ready/limits, append immutable snapshot; invalid returns original runtime. via automatic only for auto_email; both review modes authorized by reducer. Record outcome by delivery method. Automatic batch may recalculate limits after each item.
- `runAutomaticReminders(input: ReminderInput): ReminderRuntime`: auto_email only; recheck each candidate, append demo history, repeated calls do not duplicate. Other modes generate candidates only.

Limits count separately by nodeId + ownerId/ownerVersion + recipientId; separate follow-ups to waiting targets do not consume original owner's three-reminder allowance; rolling seven-day cap still counts actual recipients. auto_email ordinary reminders require an explicit valid email regardless of channel preference; WhatsApp preference is not evidence of delivered automatic email.

No AI, network, storage, or wall-clock calls in these functions. Do not backfill recipientId for unknown old records or treat projections as historical facts. When enabling with old nudges/demo sends lacking term/recipient snapshots, lead puts nodeId in optional `legacyUnresolvedNodeIds`; engine returns `legacy_history`, without silent resends, attribution to successor, or reset limits. Stage 3 provides explicit resolution UI. Lead owns history updates/new-field compatibility.

An explicit new owner/new ownerVersion after enabling establishes a known new term and may clear that node's legacy marker; do not backfill old sends or attribute them to the successor. Rescheduling/title/status changes/temporarily unassigning never clear it.

## Lead adaptation and authorization

Add optional `DemoState.reminderRuntime` and explicit enable action. On enable, create pending waiting requests from current facts, invent no past sends; run transition after related reducer actions, process auto mode for that day. Officer-token actions use grant.ownerId as actor, never current viewer as actual respondent. Waiting-target email is a separate request, granting no original-owner task authority.

Enabled demo clock first runs original leadership flow daily (skip old member reminders, pause waiting/blocked, close old case on date change), then new automatic candidates; disabled old data retains old path. Standalone task page, repeatable links, new email layout connect only in stage 2.
