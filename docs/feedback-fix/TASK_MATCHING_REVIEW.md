# Automatic reminder task matching review and follow-up arrangements

2026-11-16(America/Phoenix) `claude/fervent-thompson-e2j5u2@bea7771`

Automatic reminders advance in six order. This round completes the review of existing task matching codes, records job labels and multiple candidate design requirements; The label catalogue and allocation rules are still to be determined item by item. Only the document will be modified for this round, and task matching, reminder, mail and handoff product behaviour will remain the same.

> **Follow-up Direction (2026-11-16):** Juanxi requires the retention and enhancement of functional AI rule and function recognition, which is manually supplemented and matched; Not limit all student functions to the existing nine types of function, but create scalable relationships for different workflows and future AI stream generation. The former “assessment does not require AI” to be retained as originally envisaged and cannot be read as removing existing constitution AI. Juanxi has selected A2 + B2 + C2 from the [ comparison ](TASK_MATCHING_OPTIONS.md), requiring worktree Argentina to be implemented in phases before approval begins; [ Three Phase Implementation Plan ](TASK_MATCHING_IMPLEMENTATION_PLAN.md) Currently pending approval and product behaviour has not been adjusted.

## Six jobs and current scope

| Order | Work | Current status |
| --- | --- | --- |
| 1 | Task Match | Status review completed; Discussion of role labels, coverage and multiple candidate rules |
| 2 | RACI | Recorded; Then identify the responsible actors and the recipients of all kinds of messages. |
| 3 | Synchronising folder | Recorded; Determine trigger conditions, state changes and Details display |
| 4 | Mail Writer | Recorded; After that, a short description of the facts and a link to the process will be determined |
| 5 | Click to open the mail process | Recorded; (c) Process the buttons as directly as possible to the specific page of the actual external platform, and multiple entrances will be required to explain the applicable scene; Status feedback is designed separately. |
| 6 | A stand-alone backstage sender service | Recorded; Then connect to server data, timed, sent records and failed processing |

Incoming office is the second core objective of independent work and organization, which follows the automatic reminders mentioned above. The FB wave, three-day handoff arrangement in the old document does not constitute a concurrent implementation scope for this round; Only the current sequence of pushes is adjusted here, and historical records are not rewritten retroactively.

## Task matching requirements by user

1. The assessment does not depend on AI handling options matching onboarding and roll: collating existing workflows, role functions and applicable policy work into tickable blisters of duties.
2. (b) The two bubbles cannot be defined in terms of functions that cannot be duplicated or made impossible to distinguish; At the same time, any known omissions are checked.
3. Covers the current complete workflow and also examines common organizational responsibilities outside activity planning.
4. When two persons assume the same role, there is a need for clarity on how to select the implementer of a mandate.
5. (a) Explain the existing mechanisms before refining the programme; This round does not directly implement labels, assigned algorithms or the last five functions.

The " Not dependent on AI " job tag scheme is the direction that users propose and are assessing and does not represent an approved final label list, automatic assignment or data migration. The workload, time available and other factors that have been raised in previous conversations cannot be considered to be the capacity already realized by existing systems.

## How tasks are assigned to existing main processes

The basic path used by the main application is: role name — a broad function  →  job flow step designation or functional matching  →  role holder  →  mandate-holder.

### role assigned to one function

[ `RoleFunction` ](../../src/data/types.ts) is fixed in nine categories: president, vice_president, finance, projects, marketing, outreach, secretary, membership, avisor. One `Role` has only one `fn` and one `holderId`; The current model does not have a tickable job directory, multiple job labels or a roller candidate pool.

[ `fnForRole` ](../../src/data/structure.ts) uses English keywords in the name of role. For example, Finance, Treasurer, Budget to finance; Marking, Designing, Media to Markating; Event, Logistics, Organisations to Programs. Unrecognisable normal role by default to process. Cross-functional names are assigned to one category by match in the code and do not receive multiple categories.

The current Team page allows changes to the rolle name, holder, reporting relationship and duty text. The name change usually results in the reprofiling of its functions; The functional text is kept as a free text and will not be compiled into a fine-scale job label.

### Each step carries the responsible function or specific role

[ `EVENT_STEPS` ](../../src/engine/playbooks.ts) Current definition of 46 steps, of which 31 are the core steps that have always been retained, and 15 whether or not they appear according to the circumstances of the activity. Not every activity produces all the 46 tasks.

There is one `fn` for each step and a clear `ownerRoleId` can also be saved. Many different professional steps, such as content production and publicity, are currently under way in the form of marketing; The site, guests, transportation, security, etc. are all part of the program.

The order of priority for [ `withOwners` ](../../src/engine/workflow.ts) is: the step of open-rolling role selection  →  the result of which matches have been saved and still exist  →  `roleFor`. The manual selection takes effect and the file written by an automatic historical match is retained, and the system does not distinguish between sources.

### Select by fraction when no specific role

[ `roleFor` ](../../src/engine/playbooks.ts) calculates for each role:

- Role `fn` is consistent with step `fn`, plus 100 points.
- The key word for the function is matched in the file name and function text, plus 20 points.
- Select the highest gross score; Select the roller that will be placed in front of the list at the same time.

The use of a fixed reserve chain when no positive candidate is available: finance, positioning to presidient; Programs can be found at vice_president, and then at president; The remaining functions also have their own back-up chains. Returns the first line of the roll list directly when it is not found.

There is no comparison of specific skills, necessary accounts, whether there are holders, personal busy weeks, live available capacity or assigned tasks. `orderRoles` Sorts the path in partial setting by reporting hierarchy, so that the same time-frame list does not actually fit best. The saved `ownerRoleId` step will prioritize the old line, and not every construction activity will be rematched to the current list.

### Write role holder as specific executor

[ `buildEventNodes` ](../../src/engine/playbooks.ts) uses the active roll of steps first and calls `roleFor` when missing; Write the selected `holderId` to task `ownerId`. If no one is in charge of the job, no one will be responsible for it. It will not continue to look for the next candidate because of the role vacancy.

`buildEventNodes` receives only activity, roll and template options and does not receive complete memory skills or workload data. (a) This path of the current creation activity, with a holder setting the task directly as associated; This is different from the rule of waiting for a claim after the creation of an independent mission.

## The practical effects of AI and other created portals

| Imports | Current actual acts |
| --- | --- |
| New activities | Creates an activity to generate tasks from templates and engines, following a step line or the above-mentioned matching rules; Not an AI-by-article call |
| Cannot initialise Evolution's mail component. | AI can extract a roll name and duties; After accepting the recommendation, this information is involved in local role configurations and cannot be equated with fine particle size skill matching |
| Workstream AI job separation interface | `netlify/functions/workflow.mts` , which allows the model to select an existing ruler for a step; The static search did not detect the branch's non-test front end calling the interface, and cannot describe the existence of the service end code as the current onboarding has taken the process |
| Ask New Independent Task | Prompt requires a user-only name or roll to leave space when it is uncertain; Form for revision, then go. `createTasks` |
| Head of manual change | Direct use of the selected person; Existing portals mainly authenticate identity, IDs and modifications permissions. There is no common functional qualification layer |
| After the silence, take over the proposal. | `suggestedOwner` (a) The number of tasks not completed is ranked first by functional proximity; It's just a suggestion for a specific follow-up scenario, and it doesn't become an integrated distribution mechanism for normally created tasks. |

Relevant codes: [ `structure.ts` ](../../src/data/structure.ts), [ `workflow.mts` ](../../netlify/functions/workflow.mts), [ `chatCards.ts` ](../../src/lib/chatCards.ts), [ `changeReview.ts` ](../../src/data/changeReview.ts), [ `followup.ts` ](../../src/engine/followup.ts).

When two individuals are selected on an independent task sheet, two similar tasks, one each, are currently created; It did not choose one person from two members of the same duty to take up the same job. _Other Organiser A separate mission for others is waiting to be claimed by each other.

Repository also has a default hidden server. Its `resolveOwners` is selected on the basis of membership `roleIds`: only one candidate automatically has a lead implementer, several candidates are empty and the rest are listed as collaborative candidates. The mechanism and the current browser main application are separated and cannot be confused with unified access.

## A border proposal for a small bubble.

Small bubbles are appropriate to indicate “what kind of work is in charge”, such as booking of premises, registration of school events, preparation of promotional papers, promotion of visual production and publicity. The role name continues to be defined by the student organisation, and a role can tick multiple duties.

The need to distinguish duties, skills and operations It is the responsibility to promote visual production; Applications that can be submitted to a specific system are missions. A cross-checking of duties does not automatically justify the need for missions and interests cannot automatically be considered professional qualifications.

Refusal checks should be carried out to the actions, objects and deliverables of each assigned function. For example:

| Candidature duties | Main delivery | Clear exclusion |
| --- | --- | --- |
| Registering school activities | Activity log and confirmation number | Organization of annual registration, room reservations |
| Place reservations | Site, capacity, configuration requirements and booking confirmation | Registering school activities |
| Promotional writing | Verifiable promotional text | Visually produced, released |
| Promotion of visual production | Verifiable posters or images | Writing, publishing. |
| Dissemination | What has been published through the designated channel | Production of documents and visual products |

These five are just examples of boundaries and are not labels that have been finalized or covered for all jobs. Upper grouping can be used to search for small bubbles and should not become a double-countable task at the same time as sub-items.

(b) The definition of duties between different bubbles should be clear; Different role or member ticks the same little bubble that allows it to exist. The two address “how jobs are classified” and “who are the candidates”.

Currently, `contentCreation` contains both literature and visual material, while `materials`, `checkin` and `speakerPacket` have multiple deliveries. A professional breakdown requires the dismantling of tasks or the identification of multiple essential functions and coordination responsibilities of the principal implementers. The direct labelling of complex tasks does not guarantee that any person matching one of them will be able to perform the entire task independently.

## How to check the full coverage

The overlay check requires two separate forms:

1. Which is the main responsibility for each current standard step, organizational self-defined step and temporary task; Whether composite steps need to be split; No work visible was mapped to be retained for classification.
2. For each applicable organizational policy exercise, what triggers the conditions, practical actions and primary responsibilities. Rules are binding, restraining matters or work to be performed and should be judged separately and not automatically turn every source of policy into a task.

Current scope of verification: 46 standard steps, 9 broad functions, 16 simplified rules and catalogue records of 64 policy sources. The following is a full list of 46 current steps; 64 catalogue records have not been extracted and checked by article for all duties, so there is no claim that the label system covers all ASU policies.

The scope to be checked outside the event includes: organizational registration and annual re-registration; maintenance of role and organizational information; necessary training and account access maintenance; liaison between consultants and school partners; organization of archives; use of brands and trademarks; and verification of applicable music copyright. Recruits, regular meeting records, etc. are also found in the existing rolle job template. The scope of work to be verified is set out here, and specific obligations and performances must be linked to applicable provisions and organizational configurations and cannot be determined by reference to the source title alone.

[ `R16` ](../../src/data/rules.ts) has taken on a number of common organizational matters; [ `POLICY_CATALOG` ](../../src/data/policyCatalog.ts) has other sources of governance, brand name, accessibility, colleges, etc. Historical information and specific college requirements cannot automatically be considered as current requirements for all organizations.

Coverage should be based on a defined list. Future new workflow steps or policy actions must be re-examined; Keeps the gap when it cannot be matched, and hides the gap no longer by " first roll " .

## When two people have the same duties,

The current master application selects the first line of the roll list in the same fraction and the same rule has only one holder; There is no strategy for allocating the same duties as members of the pool.

It was recommended that the labels should form a pool of candidates before a clear allocation of responsibilities. There are at least two different scenarios:

- Function that requires continuous external communication or a fixed system of missions: setting up the primary recipient and backup.
- Independent work to be shared among eligible members: distribution among candidates meeting the conditions of time; Clear rules for follow-up can be used with capacity, work and rotation sequences already in place.

In any way, the principal implementer of a mandate is retained. Collaboration members should not automatically receive a duplicate task. Manual designations have been made that cannot be secretly reassigned due to daily recalculation of loads; Candidates are not available or when the distribution strategy is uncertain, a clear indication of their allocation and an explanation of why.

Rotation, volume calculation, symmetry rules, default receivers and coverage adjustments have not yet been finalized. The number of tasks available and the number of days planned are not sufficient to accurately represent the actual input of each individual and cannot be referred to directly as live workloads.

## Current complete list of standard steps

Below is a review of static definitions in the baseline. The core column indicates whether it is in `CORE_EVENT_STEP_KEYS`; The scenario describes the conditions for creating additional steps. The skills or duties labels have not yet entered these data.

| Step ID | Current Name | Current function | Core | Situation |
| --- | --- | --- | --- | --- |
| plan | Event Plan | programs | Yes | — |
| backup | Back-up Plan | programs | Yes | — |
| venuechoice | Candidate Venue | programs | Yes | — |
| registry | Event Registry (SDC & Special Event) | programs | Yes | — |
| venue | Book Room & Layout | programs | Yes | — |
| moderator | Moderator Lead Staffing | programs | Yes | — |
| materials | Event Materials PPT Decorations | programs | Yes | — |
| checkin | Check-in Forms Photo Release Liability | programs | Yes | — |
| headcount | Headcount | programs | Yes | — |
| thankyou | Thank You Note | secretary | Yes | — |
| feedback | Feedback | vice_president | Yes | — |
| postmarketing | Post Marketing | marketing | Yes | — |
| photoBackup | Photo Backup | marketing | Yes | — |
| invoice | Invoice | finance | Yes | — |
| attendance | Attendance Submit | finance | Yes | — |
| spending | Paid Reimbursed | finance | Yes | — |
| financeRecord | Finance Record | finance | Yes | — |
| documentation | Documentation | secretary | Yes | — |
| partner | Partner Meeting | programs | No | externalGuest |
| speakerPacket | Speaker SAP Headshot | programs | No | externalGuest |
| travel | Partner Travel Plan | programs | No | externalGuest |
| partnerReview | Partner Speaker Review | programs | No | externalGuest |
| parking | Parking Validation | programs | No | externalGuest |
| budget | Budget | finance | Yes | — |
| foodCompliance | Food Exception Permit | finance | No | externalFood |
| quotes | Quote Gather | finance | Yes | — |
| budgetRequest | Budget Request | finance | Yes | — |
| budgetApproval | Budget Approval | finance | Yes | — |
| purchaseRequest | Purchase Request | finance | Yes | — |
| purchaseApproval | Purchase Approval | finance | Yes | — |
| advisor | Advisor Involved | programs | No | advisor |
| access | Accessibility Check | programs | No | access |
| security | Security | programs | No | safety |
| eams | EAMS Plan | programs | No | safety |
| permit | Permit Insurance | programs | No | safety |
| alcohol | Alcohol Permit | programs | No | alcohol |
| drone | Drone Approval | programs | No | drone |
| schoolApproval | School Admin Approval | programs | No | schoolApproval |
| marketingNeeds | Marketing Needs | marketing | Yes | — |
| contentCreation | Content Creation | marketing | Yes | — |
| promotionItems | Promotion Items | marketing | Yes | — |
| rsvp | Open RSVPs | marketing | No | rsvp |
| content | Content Distribution | marketing | Yes | — |
| reminder | Event Reminder | marketing | Yes | — |
| orderPlaced | Order Placed | finance | Yes | — |
| finalcheck | Full Check Alert Changes | president | Yes | — |

## Validate and Handoff

The status quo conclusion is verified by the live function 's offline assertion: the same score is selected in the list order, reverses the list to change an unbound step candidate, the opening of a slot can also be ranked first, unknown roll name defaults, missing matches to list 1, saved steps are retained, and the opening of a slot creates unaccountable tasks.

Relevant test 6 files, 114 adopted: `npm test -- src/test/m4.test.ts src/test/orgWorkflow.test.ts src/test/workflowV2.test.ts src/test/m2b.test.ts src/test/onboardingTeam.test.ts src/test/fb-05-create.test.ts`. The workflow interface test uses the simulation AI, and no live model is called in this round. The list of steps is generated directly from the current `EVENT_STEPS` and `CORE_EVENT_STEP_KEYS`, and a total of 46 lines and 31 core steps are checked.

Only the current status, user requirements and options to be refined are recorded during this round. The next step would be to review the catalogue of duties and the coverage map on a case-by-case basis, and to clarify the rules for multiple candidates; Do not execute RACI, Mail, Scheduling, Backstage Send or Division Handoff in advance. Could not close temporary folder: %s
