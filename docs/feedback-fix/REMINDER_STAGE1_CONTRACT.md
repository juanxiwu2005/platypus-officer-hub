# Reminder phase one freezes the contract.

Type original `src/reminders/contracts.ts`. The main Agent modification type has to synchronize the two developers; Data/Riles do not modify this document or old business documents.

## Data Export (facts.ts/actionLinks.ts)

- `buildReminderFacts(state: DemoState, nodeId: string): ReminderTaskFacts | null`；Only live activities/tasks/rule facts are taken. Missing activities are null and stand-alone tasks remain available. Specific requirements can be inserted with a known stepKey template live headcount/date; It gives priority to artificially dependent or live, with no consequences. Do not write three parallel dates.
- `reminderPeople(state: DemoState): ReminderPerson[]`；The current judgement reverts to officers/isOfficer, and the predecessor/designate cannot be an automatic waiter.
- `buildReminderInput(state: DemoState, runtime: ReminderRuntime): ReminderInput`；Just make it right, don't adjust the engine.
- `taskActionLink(node: Node): TaskActionLink | null`；Reuse already known entry points, with priority given to explaining the applicable scene; Unknown unfabricated. This link is used on a stand-alone task page, without adding a second link to the mail.
- `planKey` = JSON.stringify([node.id, node.ownerId, node.ownerVersion ?? 0, node.clubDeadline, node.latestStart])。Do not edit titles/labels as a new plan.

## Rules Export (engine.ts)

- `createReminderRuntime(today: string): ReminderRuntime`。
- `transitionReminderRuntime(input: ReminderTransition): ReminderRuntime`；To compare facts, add an update of the live order of operations; Explicit updated NodeIds is only imported by the main Agent on film/reply/board. The order of the same day is used as a sequience, without lastUpdate extrapolating who responded. (b) Waiting for the same object/same content to submit a second request; Undefined target can be specified Id: null and marked blacked. Completed/changed/cancelled/replaced old requests.
- `planReminders(input: ReminderInput): ReminderPlan`；Only compares rule engine with a date that is already available and overdue on the third day for addDays (due, 3); returns ready/upcoming/blocked. Only the actual ownerReply and status effects begin to alarm that title changes do not count. The waiting person must be an active and non-former person in the People; Missing doesn't guess. Do not permanently reject candidates for the temporary weekly limit; Only one copy of the same day should not be repeated.
- `confirmReminderDelivery(input: ReminderInput, candidateId: string, via: ReminderDelivery['via']): ReminderRuntime`；Recheck the current ready level and add a non-changeable snapshot; Could not close temporary folder: %s Via automatic is only available autu_email; Two reviews are reviewed by a reducer with permissions. Supports recording by sending. Allows the automatic processing of maximum amounts to be recalculated on arrival in the same batch.
- `runAutomaticReminders(input: ReminderInput): ReminderRuntime`；Only auto_email, recheck and add to the presentation history on a candidate-by-candidate basis and repeat calls without repetition. Other means only generate candidatures.

The amount is broken down according to nodeId + ownerId/ownerVersion + request Id, pending independent follow-up of the subject without depleting the three reminders from the original head; The rolling limit of seven days remains at the actual recipient. Auto_email is a common reminder that whatever the individual ' s preferred channel is, it requires a clear and valid mailbox; Do not consider preference for whatsApp as automatically mailed.

The above function cannot call an AI, network, storage or wall clock. Unknown old records do not refill recipientId, and the plan is not extrapolated as a fact that has occurred. Old nodge or old simulator with no term/ recipient snapshot encountered when enabled. Main Agent puts nodeId into optional `legacyUnresolvedNodeIds`; Engine returns `legacy_history` and does not send it back clandestinely, return to incoming officer or replace the limit. Phase III provides a clear treatment entrance. The historical update or new field compatibility is the responsibility of the main Agent.

The new header/ new ownerVersion, after the display has been enabled, represents a new term that can be identified and removes node 's legacy tag; Old send is not filled back, not returned to incoming officer. Reschedule, change the title, re-establish the status or suspend the designation of those responsible.

## Main Agent Fitness and Authorization

Adds optional `DemoState.reminderRuntime` and visible action. Creates a pending request from the current facts at the time of enablement and does not create an old send; Call translation, autu mode after each relevant reducer action. Offier token update actor with grant.ownId; Can not put the current page on viewer when really answering person. Waiting for object mail is an independent request and does not issue the original task owner operations.

The new version of the demonstration clock will have to run day by day (skip old member reminder) and suspend waiting/blocked; Date changes close old case(s) and implement new automatic candidates; Old unenable data to keep track. Separate task pages, repeatable links and new mail layout phase 2 access only.
