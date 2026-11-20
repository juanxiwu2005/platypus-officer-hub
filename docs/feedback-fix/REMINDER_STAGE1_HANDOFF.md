# Reminds plan preparation and phase I delivery

2026-11-16（America/Phoenix）。Branch `feat/reminder-plan-v2`, starting with the `dbfc47d` delivered in function matching phase II, which combines the v23 compatible reading point of the source branch `e370361`; This task does not update the functional matching branch.

## What's done?

The preparatory phase identified the [ full implementation programme ](REMINDER_IMPLEMENTATION_PLAN.md) and the [ freeze contract ](REMINDER_STAGE1_CONTRACT.md). Two development packages were completed at the independent worktree, with Main Agent accessing live review, independent review. Phases II and III remain to be approved.

| Scope | Phase I actual delivery |
| --- | --- |
| Rules and AI | New bottom facts, dates, addressees, trigger statements are rules, 0 live AI calls; Send greetings/Thanks for the type-out on stage two. |
| Date | Highlighting a data cut-off date for a task; Late start only for triggers; The number of days overdue is determined by the date available, and model dates are not allowed |
| Specific requirements | (b) Read actual activities/numbers/steps/manual why and dependencies, generating clear requirements; Do not add unknown numbers to 40 |
| Processing entrances | Up to one known applicable entry point for each; The information and route pages clearly state that they do not pretend to be the final application form |
| Waiting on | Automatically create an independent follow-up candidate for the current member; Automated mail mode long-range record-recording simulator, audit process is pending |
| Identity and duties | (b) The original mandate-holder remains unchanged, pending the completion of the original mandate; Do not pretend to deliver a former, self-directed, undefined object or without a valid mailbox |
| History | (a) Sustained retention of the recipient, original owner and distribution version, planned date, actual recording date, task and activity snapshot; Finish or Cut Mode Do Not Delete History |
| Compatibility | Optional version of rantime visible enabler; Old v22 not automatically rewrite; Old send without guessing the addressee; Damage to record retention but not performed |

## Actual exercises that can be verified

[ offline exercises output ](REMINDER_STAGE1_SCENARIOS.json) using live `reducer` and rule engine, fielder Night (40 people), containing live calculations, not handwritten results sheets.

| Scene | Actual results |
| --- | --- |
| First reminder on start date | Rule returns start candidate and a sentence explaining that the audit was not recorded |
| Waiting on Sam | Sam became the recipient of independent follow-up, and Jordan remained the mandate holder. |
| Automatically submit the same waiting | Only one waiting request and a corresponding simulator are kept |
| Change to wait for Maya | The original Sam requested that it be closed, and the candidate was to be Maya. |
| Just waiting for text, not a clear object. | `unresolved_waiting`, do not guess the mail box or the records sent |
| Mission accomplished. | Candidacy cleared. Sending history reservation. |

An additional live return overlay: same day World updating, retitled, rescheduled closing of old hours, changed and returned to the original header, old send is not miscalculated, token actual operator, restarted task, new student event non-replacement alarm, unknown/damaged rantime deactivates.

## Independent review of identified and amended boundaries

1. The introduction of the new scheme will follow the old open voiceCase and may generate an old upgrade before the start date. Now closes the old case on display, saves history and creates a follow-up time at the current date.
2. Automatic mail may miss the mailbox when choosing whatsApp for a person. Autu_email now requires a valid mailbox, regardless of the preferred channel.
3. A broken array of elements in v1 rantime may cause a reading crash. The log-by-record verification is now performed, the original value is retained and disabled, and there is no need to reset the error.

(b) The independent follow-up of the subject is calculated separately on the basis of the actual recipient, without depleting the normal trigger level for the former head; The seven-day six and the same day were carried out in a unified manner.

## Authentication and acceptance boundary

Final relevant checks: `npm test -- src/reminders src/test/workflow.test.ts src/test/nudges.test.ts src/test/reminderQueue.test.ts src/test/store.test.tsx src/test/officerLinks.test.ts src/test/handoffReview.test.ts src/test/fb-04-taskDue.test.ts src/matching/compatibilityReader.test.ts --maxWorkers=2`, 13 documents, 202 adopted; Include new module 102, original link 99, source branch v23 compatible reading 1. Lint, back-end type inspections and production construction are carried out.

A 5 second predictive test of the old `reminderQueue` was timed out when the construction was running at the same time as many worker tests; The final limit test workeder was passed after 2 and did not modify the original assertion or timeout. The new invitation code for the " new student organization " test did not correspond to the original check, was changed to legal UUID and the original check was retained.

No page changes have been made at this stage and no full station has run Playwright, live Air, external mail delivery or real machine testing. The entrance was exceeded by 493 bytes, and the template and streamlined instructions were repeated in metge without easing the threshold. Eventually constructed with 40 characters `COMMIT_REF=bbce88b039e208bccac36aef52036ae01ebd676f`, `BRANCH=feat/reminder-plan-v2`, `CONTEXT=deploy-preview`, entry `/assets/index-Db_Ate9l.js` for **549,819/ 550,000 bytes**; Follow-up UI phase still needs to be kept in view of the balance of entrances, with priority being given to loading as required.

Independent Review Final Review Code `bbce88b`, no open blockage; The original three counterclaims are returned green. Independently complete new module inspection is 102 product tests plus 3 ad hoc counterclaims (105); Only files are streamlined and compatible read-up rechecked and run 58 items, all of which have been adopted. Temporary testing and reliance links have been cleared. Only document changes will be delivered thereafter, without changing the running-time code.

Synchronising folder failed: %s: %s Old NudgeComposer may still call the old AI; The whole product can't be claimed to have stopped AI. The new mail layout, repeatable task links, four status buttons and Details in the follow-up phase; Live back-office and cross-equipment access falls into the sixth category. At this stage, only the current person is supported by a clear Personson, and the external approver/CRM object has not been entered by an explicit recipient.

Phase II also requires the recording of final rendering mail text, actual target addresses/channels and mission access portals; The candidate for this stage is not a full email that can live.

No merge main, no official publication. Synchronizes the local backup (this only updates repository documents).
