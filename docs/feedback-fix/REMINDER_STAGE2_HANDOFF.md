# Reminder phase two: rule mail and stand-alone task page delivery

2026-11-16（America/Phoenix）。Juanxi expressly requested “Continuing Phase 2”. (a) Branch `feat/reminder-plan-v2`, which follows [ PPR #15 ](https://github.com/juanxiwu2005/platypus-officer-hub/pull/15), base is `claude/fervent-thompson-e2j5u2`; Combine with its `26af354`, synchronize to `5e301d9`, and retain the actual task matching, recognition rules and file protection of v23. Only resolves file conflicts with PROGRESS and keeps records of the delivery of two jobs.

## Results at this stage

| User Requirements | Actual delivery |
| --- | --- |
| Rule first, avoid waiting for AI | Single reminder editor completes the clean rules, does not request AI and does not wait even for full-stop AI switches to be opened; Queries, date explanations, requests, importance, collaboration and gratitude are made up of rules and preserved facts |
| Activity ahead, project behind | Subject fixed as `event · specific task` , stand-alone task with Club work |
| A priority cut-off date. | The text highlights Task due; Start date is used only for natural reasons such as “Today to the start of the plan” triggers, which are expressed in the current records as due and overdue, avoiding a claim that the reality is incomplete |
| Specific requirements and implications | Task instructions / Complement crimeia / Why it matters, second live activity number, steps and dependence; The absence of 40; These fields can be maintained in Edit of Details |
| Email Simple | Within the text, approximately 100 words in English: greetings, mandate requirements, importance, collaboration and thanks; Verify body only one Open tab link and no longer list four status links or original material sites |
| Just look at the current task when you do. | New entrance `/#/officer?access=…`, showing separately the corresponding activity/task, a cut-off date, specific requirements, completion standards, materiality, an applicable live processing portal and status operation |
| You can keep it up to date. | Working on it  →  Done, which can be viewed after completion; I've got it, cannot bypass the duty matching requirements; Working does not pretend to be an extension request |
| Waiting on | Select the current member and fill in the required assistance; Generates independent follow-up on the object when it is running. The only entrance to the other party was Acknowledge/Update requested, and the original mandate holder and status did not change as a result of response; Other external reliance can save instructions without guessing mailboxes |
| Prevent mishandling or false success | Redistribution, change in the attribution version, departure, expiry and alteration of entry points; Financial control nodes cannot be directly Done; Save failed to save input and prompt retry, displaying this saved instead of old records |
| Retroactivity | (a) Record a rule mail snapshot that has been re-checked by the current recipient, mode, request and authorization; The old history does not replace the text or the addressee; Action summary does not copy token, sign or complete mail |

New mail and task pages are loaded as required, with the old `?token=` one-time entry reserved for compatibility. The new access authorization is only a local demonstration of the current browser and not a server login or cross-equipment capability.

## What do you mean, "accidentance"?

After the preview is released, open an uncompleted task from Tasks on Details Point Remind. Check the theme 's activity/task order, Task due, specific requirements and thanks, and only Open task links; Select Working on it, after refreshing. Preview status correction (2026-11-16, America/Phoenix): The previously presumed PR #15 address actually shows Sit not found and there are no valid online preview links; For the latest delivery portal and deployment barriers, see [ Phase III for ](REMINDER_STAGE3_HANDOFF.md#hows-that).

If you want to compare a specific request, modify Task in Edit of the original task Details/Completion Crimeia/ Why it changes alarms after saving, and the body and task page should read the latest facts. The processing button may be an application entrance to the school; Only the entry page is known to have a clear scope of application and not to pretend to be a specific application form after it has been entered.

The full new scheme candidate and stand-alone mail on the list is required to be clearly enabled for a new run; Normal old archives are still compatible. At this stage the browser acceptance uses the Live Runtime folder for independent follow-up, confirming that the recipient is a pending object and that its page does not modify the original task status. Final uniform access, single/batch/auto-show links and Details reorder to phase III.

## Independent review and revision

Mail and Page develop their worktrees, master Agent owns the sharing type, authorization, store, message snapshots, route bridges, job description editing and integration checks; Independent Review checks the integrated candidate and gives it to the original person responsible for repair.

1. If the damage to rantime is missing waitingRequests, the normal owner ' s state of preservation will be misreported. The pre-read validation structure is now read, ordinary task updates are not dependent on damaged waiting records and the original field remains intact.
2. The same day old messages with the same content may be mistaken for this saving success. Keep confirmations must check this action and add a record, not just the same text.
3. Reopening of existing Waiting on/retain possible overlays to assist, resulting in closure/reconstruction requests. (b) A description that is now pre-filled; Without changing the content, there will be no new follow-up.

In addition, protections for damage archive values of null / 0 / false / empty string were completed: could not overwrite enabler or revert old sender paths; The general officer can still update the task and not clear the original bad fields. The focus test should be changed to wait for the actual useEffect post-focus check to retain the same assertion and original timeout.

## Inspection results

Final run-time code candidate `e91346484c785f5667a59cb79effae37db3d70a9`, independent review passed; . Only the delivery documents are updated thereafter.

- Relevant modules/components 20 documents, 330 adopted. Command: `npm test -- src/reminders src/matching/stage3Creation.test.ts src/matching/stage3Persistence.test.ts src/matching/stage3RecoveryUI.test.tsx src/test/workflow.test.ts src/test/nudges.test.ts src/test/reminderQueue.test.ts src/test/store.test.tsx src/test/officerLinks.test.ts src/test/handoffReview.test.ts src/test/fb-04-taskDue.test.ts src/test/fb-04-taskDetail.test.tsx --maxWorkers=1`.
- Compatible browser 6 specs with a total of 67 passes on desktop/cell, 1 cell phone is limited to desktop kskip: tisks, day, fb-01-ai-wait, fb-08- reminder-centre, research-log, reminder-stage2. The latest Merge candidate ran for 8 new mail/task pages and 2 first page sizes, with a total of 10 approved.
- New browser link overlay: mail link/no AI request; Working, refreshing, Done, completing read-only; Waiting and stuck sustainability; (b) Deversion and reassignment; The actual recipients waiting for the mail respond only to the range of assistance. Includes two-end WCAG checks and horizontal overflows, and desktop/mobile phone screenshots have been viewed.
- Lint, back-end type, production build, full-stop text budget and target stellint for the new CSS were adopted. Constructed with 40 characters `COMMIT_REF=e91346484c785f5667a59cb79effae37db3d70a9`, `BRANCH=feat/reminder-plan-v2`, `CONTEXT=deploy-preview`, the main entry `/assets/index-DV95VBqu.js` is **545,608/ 550,000 byte**; The threshold has not been raised.
- All three of the reverse cases examined independently have been turned green; Twenty-six final pages plus three independent counterclaims were approved in 29 cases, and provisional testing and reliance links were cleared.

(b) A former reminder Queue test triggers the original five-second timeout when running a parallel browser build/text check; The other 329 were adopted. When the browser is completed, all 330 items are returned to full operation by single Walker without adjustment of time-consuming or relaxed assertions. (b) The former browser Waiting Selector has been searched by the combobox role, retaining the same operational and state claims; The final focus awaits the use of Effect for example and does not delete the focus check.

Not running full station Playwright, live Air, external mail delivery, Safari/iOS real machine check. Online preview access was denied by the current environmental agent 403; Local production constructs and screenshots have been verified for deployment on the same line. The destination sent manually is selected by the user in an external draft, and maintaining a snapshot does not represent verification of an external address or delivery.

## Follow-up scope

Phase III is still to be approved: Details reordering three paragraphs, alarm centre single bar/batch/auto-show unified connection, default on new operation and setting up the migration demonstration. The automated/batch path of the current general old archive is not therefore upgraded to full rule mail snapshot; Phase II single-mail delivery cannot be described as a complete set of backstage connections.

Live time distribution, server sharing of data, cross-equipment identification and delivery failure are still the sixth in six jobs. There is no live AI call, no external mail delivery, no merge main or official release and no change in handoff behaviour. Could not close temporary folder: %s
