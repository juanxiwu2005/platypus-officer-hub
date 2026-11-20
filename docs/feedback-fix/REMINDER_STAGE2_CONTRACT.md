# Reminder Phase II: Mail and stand-alone job pages freeze compacts

2026-11-16（America/Phoenix）。Juanxi has made a clear request to “continuing stage 2”; Phase three Details/ Reminder Centre rehearsing, default enabler policy and live backstage send are not within this range. Continuation of `feat/reminder-plan-v2` and PR#15; Keep the functional matching branch physically connected to `26af354` at the time of freezing, synchronizing its `5e301d9` with no fallback task recognition and v23 archiving; Reminder interface remains unchanged.

## Division of labour

- Main Agent: Share type/store/taskWorkflow, `taskAccess.ts`, message log fit, old `NudgeComposer` Lazy Bridge, `Officer.tsx` Route Bridge, manual mission description field, e2e/ acceptance and delivery.
- Mail Agent：`src/reminders/mail.ts`、`mail.test.ts`、`ReminderComposer.tsx`、`ReminderComposer.test.tsx`、`reminder-composer.css`。Do not change old composer, global styles, store or contract.
- Page Agent：`src/reminders/SingleTaskPage.tsx`、`SingleTaskPage.test.tsx`、`single-task.css`。Do not change Officer, TaskActions/TaskDetail, store or sharing type.
- Independent Review: Final Candidates Read-only Review found that the problem was left to the original person in charge for repair.

## Share original with main Agent API

`accessContracts.ts` is the original of new mail and repeatable access authorization; `contracts.ts` Reservation phase a fact/candidature. Add optional Node.instructions/Node.completionCriteria, events. priority manual inductions, events.complificationCritria; Importance continues to come from what or live dependencies that already exist. The main Agent provides the editorial entrance and does not allow models to fill in facts.

`src/reminders/taskAccess.ts` Export:

- `makeTaskAccessGrant(state, nodeId, waitingRequestId?): Promise<TaskAccessGrant>`: No request is the original person in charge, and the designated request only gives it a clear waiter. Use local signatures; Not login or cross-equipment services.
- `taskAccessToken(grant): string`, `taskAccessUrl(origin, grant): string`, new address `/#/officer?access=...`, no Done/Working query parameters.
- `usableTaskAccessGrant(state, token): TaskAccessGrant | undefined`, `verifyTaskAccessGrant(state, token): Promise<boolean>`: Repeated visits/updates without consumption links; Checks the actual storage authorization, signature, belonging version, current membership and maturity. Once completed, the same access point is still accessible and old rights cannot be used after redistribution/belonging has changed.
- `taskAccessIssueValid(state, grant): boolean`: Check for store action.
- Add Action `{type:'issueTaskAccessGrant', grant}`, `{type:'taskAccessAction', token, update:TaskAccessUpdate}`.
- Four-button map for owner shop; No lead for claim. Working is a clear new response and does not require an extension as an impostor.
- Only the request is recorded by reference On / responseBy / request; Do not change the original task owner or status, do not assign source tasks to missions. Requests for cancellations/changes are not renewable; Original task completed read-only.

## Mail Agent API & Component

`buildReminderMail(input: ReminderMailInput): ReminderMail`、`checkReminderMail(mail: ReminderMail): boolean`。Defaults all the rules, cannot import/calll AI or network. Theme “Activities — Tasks” (a stand-alone task for Club work), with one message focusing on Task Due; The eventDate is only background in specific requirements, not single Start by, and does not print latest start periods. The trigger causes are distinguished by live today and already startOn/due/candidate (future/date of commencement/due/actually overdue).

Natural greetings, specific requests, importance, collaboration and gratitude are maintained within the text in approximately 100 English language versions, with the most important executable information and complete material on the mission page. Do not return to five mechanical labels, step 1 opens the platform/step 2 for tasks; The mail body has only one core tabskUrl and removes other sites from the source text. The number comes from facts and cannot be supplemented by 40. Continue with the prohibition of catalytic/stigmatization language. waiting e-mails indicating “who is waiting for your mission” and not giving responsibility for the execution of the original task to the addressee; Waiting On cannot be regarded as a specific action requirement if it is just a name.

`ReminderComposer` Default Export, props `{nodeId:string;onClose:()=>void}`, using existing use Street. Normal owner uses current facts; `planReminders(buildReminderInput(...))` is used to select the node 's current ready (including waiting) when enabling the new runtime, which must be explained and sent without forgery. The old uninactivated path still uses NudgeBlocked and does not change the existing schedule; Normal mail is in a new format, and waiting object delivery is only enabled in the new Runtime.

When you get a grant, you'll have to pick it up. Could not close temporary folder: %s Mail = Build Red ReaderMail, window.location.origin generates the only link. There is no AI waiting/Skip AI button. Keep close/ Escape/ Focus, channel preferences, no live delivery instructions. Platform distribution mode by email; The draft Email/WhatsApp/SMS can be accessed manually and recorded after clear confirmation.

Save snapshot `{...mail,channel,preparedOn:state.today,accessId:grant.id}`; Old action `confirmNudgeSent` plus `message`; The new version action `confirmPlannedReminder` adds an optional `message`. If there is a rantime, you must use the current CandidateId to confirm it; Use old action when there is no runtime. Main Agent rechecks current facts/authorizations/recipients with mode and saves snapshots. `ReminderDelivery.message?` and `Nudge.message?` are for historical use and old records are not filled out. Successful information after submission should appear on the basis of actual storage records and not only locally setConfirmed (true).

## SingleTaskPage

Default export, props `{token:string}`. Read permissions from userable/verefy API, not from URL homeId extrapolates permissions. (a) homeer view: activity/task, highlighting deadlines, specific requirements and completion criteria, materiality, one live processing entrance (with applicable instructions), four states; The period of latest start does not take over the head. There is no need for complete navigation, other tasks or Ask. The risk of school cut-off date must remain; Financial control nodes cannot be bypassed from Event Budget directly Done.

(a) waiting view: the context of the task for which the original leader requested help, a statement to be specified, showing only Acknowledge / Update requested; Not the original four-state mission. Displays the current status after a successful update; Refresh/open again to continue; After completion, you can see it. Unknown/neutralized/reassignment/departure token has a clear hint that it cannot be misled into an update.

(b) To maintain compatible access to the old `?token=` one-time link and old state query parameters; New `?access=` uses this page. New pages and new composer are loaded as required to comply with established import volume thresholds. Do not add live identity, actual mail service or presumably external mailboxes.
