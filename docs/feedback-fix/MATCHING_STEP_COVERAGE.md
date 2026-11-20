# Job-related coverage of standard workflows

2026-11-16(America/Phoenix) • Job matching phase 3 · Workflow Adapter Agent

This table checks the current item by item `EVENT_STEPS`It's... 46Standard steps, which include the branches of conditions.  A single event produces only applicable steps, not necessarily 46 tasks. The table contains the **step duty boundary review tips**, not requiring the student organization to create 46 fixed duties, nor does it pre-set a roll like Secretary, Marketing etc. Multiple steps or different streams of work can reclaim the same responsibilities that have been identified by the Organization.

The original program is `src/matching/adapters/steps.ts`. `standardRequirementCommands` Adds unconnected records only to the missing workflow/step combination, and responsibility ID is null; Do not replace an existing manual connection. 37 initial Draw, 9 needs_split, all subject to review. Complex steps should be recognized as needs-allocation only after splitting or clear professional integration. The completion of the entire exercise should not be determined by a professional match.

| Step ID | Existing title | Borders of responsibility to be identified | Initial Status | Existing sources |
| --- | --- | --- | --- | --- |
| `plan` | Event Plan | Own the documented event purpose, scope and operating plan; coordinate specialist inputs without assuming their execution duties. | `draft` | PLAN-01 |
| `backup` | Back-up Plan | Produce the agreed fallback plan for event disruptions; obtaining each replacement service remains a separate execution task. | `draft` | PLAN-01 |
| `venuechoice` | Candidate Venue | Compare suitable venues and record the selected candidate; booking and school registration are separate work. | `draft` | VENUE-01 |
| `registry` | Event Registry (SDC & Special Event) | Prepare and submit the required event registrations and retain confirmation; split submissions if different access or approvers are required. | `needs_split` | R01 |
| `venue` | Book Room & Layout | Submit the venue and layout reservation and retain confirmation; this does not grant access to a school reservation account. | `draft` | VENUE-01 |
| `moderator` | Moderator Lead Staffing | Confirm who owns moderator selection versus staffing recruitment; separate execution if these require different responsibilities. | `needs_split` | Organization standard |
| `materials` | Event Materials PPT Decorations | Separate slide production, signage, decorations and run-of-show materials, or explicitly name one coordinator before assigning. | `needs_split` | Organization standard |
| `checkin` | Check-in Forms Photo Release Liability | Separate check-in preparation, photo-release handling and liability paperwork when different responsibilities or approvals apply. | `needs_split` | Organization standard |
| `headcount` | Headcount | Record the final attendance count from check-in evidence; submitting attendance to a funding system is separate. | `draft` | Organization standard |
| `thankyou` | Thank You Note | Prepare and send the approved thank-you communication; recipient approval and financial closeout remain separate. | `draft` | Organization standard |
| `feedback` | Feedback | Collect feedback and record the reusable retrospective; archive management is a separate responsibility. | `draft` | CLOSE-03 |
| `postmarketing` | Post Marketing | Publish approved post-event communications; selecting and retaining source photographs belongs to photo management. | `draft` | Organization standard |
| `photoBackup` | Photo Backup | Collect and preserve event photographs in the agreed location; consent decisions and promotional publication are separate. | `draft` | Organization standard |
| `invoice` | Invoice | Collect and validate invoices for approved commitments; payment execution and purchase approval remain separate. | `draft` | CLOSE-02 |
| `attendance` | Attendance Submit | Submit documented attendance through the required reporting process; the attendance count itself is a separate input. | `draft` | CLOSE-02 |
| `spending` | Paid Reimbursed | Record approved payments or reimbursements using the applicable financial route; this responsibility does not grant spending authority. | `draft` | CLOSE-02 |
| `financeRecord` | Finance Record | Reconcile and retain the event's financial evidence; initiating purchases and approving reimbursement are separate. | `draft` | CLOSE-02 |
| `documentation` | Documentation | Archive approved event records, final materials and reusable lessons; their production remains with the corresponding responsibilities. | `draft` | CLOSE-03 |
| `partner` | Partner Meeting | Coordinate the partner meeting and record agreed goals, audience and contributions; specialist delivery is assigned separately. | `draft` | SPEND-02 |
| `speakerPacket` | Speaker SAP Headshot | Separate speaker agreement/SAP handling from headshot and publicity asset collection when permissions or execution differ. | `needs_split` | SPECIAL-04 |
| `travel` | Partner Travel Plan | Coordinate confirmed guest travel arrangements and record logistics; split bookings requiring different accounts or approval routes. | `draft` | TRAVEL-01 |
| `partnerReview` | Partner Speaker Review | Obtain and record the partner's approval of their presentation and materials; creating the materials is separate. | `draft` | Organization standard |
| `parking` | Parking Validation | Confirm the appropriate parking or transport arrangements and access instructions; travel purchasing is separate. | `draft` | VENUE-02 |
| `budget` | Budget | Prepare the event budget and funding-source proposal; budget approval and actual purchases remain distinct controlled work. | `draft` | FUND-02 |
| `foodCompliance` | Food Exception Permit | Obtain the applicable food exception evidence or permit; sourcing quotes and approving spending remain separate. | `draft` | R06 |
| `quotes` | Quote Gather | Collect the quote evidence required for the selected purchasing route; do not treat this as purchasing approval. | `draft` | FUND-04 |
| `budgetRequest` | Budget Request | Submit the documented budget request and supporting evidence; approving the request is a separate controlled action. | `draft` | FUND-02 · FUND-04 |
| `budgetApproval` | Budget Approval | Obtain and record the funding decision; a responsibility tag cannot grant the authority to approve a budget. | `draft` | FUND-02 |
| `purchaseRequest` | Purchase Request | Prepare and submit the approved purchase request using the applicable institutional process; approval and ordering are separate. | `draft` | R09 |
| `purchaseApproval` | Purchase Approval | Obtain and record purchase authorization from the proper authority; this step does not place an order. | `draft` | R09 |
| `advisor` | Advisor Involved | Coordinate the advisor participation or signature required by this event; it does not transfer the advisor's authority. | `draft` | PLAN-03 |
| `access` | Accessibility Check | Coordinate and verify the required accessibility arrangements with the appropriate specialists; split their implementation where needed. | `draft` | VENUE-03 |
| `security` | Security | Identify security requirements and obtain the appropriate security arrangements; medical planning and permits remain separate. | `draft` | RISK-01 |
| `eams` | EAMS Plan | Prepare and route the required event and medical safety plan; approved specialist actions require their own execution responsibility. | `draft` | RISK-01 |
| `permit` | Permit Insurance | Separate permit applications from insurance or certificate acquisition when they use different authorities or providers. | `needs_split` | RISK-01 |
| `alcohol` | Alcohol Permit | Clarify the alcohol permit, venue and insurance responsibilities before assigning this combined approval route. | `needs_split` | SPECIAL-03 |
| `drone` | Drone Approval | Obtain the applicable drone or aviation approval; actual operation requires separately confirmed pilot qualifications. | `draft` | SPECIAL-06 |
| `schoolApproval` | School Admin Approval | Obtain and retain the school's administrative approval; the tag does not confer approval authority. | `draft` | PLAN-03 |
| `marketingNeeds` | Marketing Needs | Specify the communications deliverables, channels and associated costs; content production and distribution are separate. | `draft` | Organization standard |
| `contentCreation` | Content Creation | Separate copywriting, graphic design and other production specialties, or explicitly confirm one coordination responsibility. | `needs_split` | Organization standard |
| `promotionItems` | Promotion Items | Prepare the agreed promotional items or print materials; design approval and purchase authorization remain separate. | `draft` | Organization standard |
| `rsvp` | Open RSVPs | Configure and open the approved registration form or system; promotion and attendance reporting are separate. | `draft` | Organization standard |
| `content` | Content Distribution | Distribute approved campaign assets through the chosen channels; authoring and approving assets are separate. | `draft` | Organization standard |
| `reminder` | Event Reminder | Prepare and send the attendee-facing event reminder; this does not configure the platform's task reminder service. | `draft` | Organization standard |
| `orderPlaced` | Order Placed | Place an already authorized order and record confirmation; budget and purchase authorization remain separate controls. | `draft` | R09 |
| `finalcheck` | Full Check Alert Changes | Review all active routes, coordinate readiness and notify changes; clarify the coordinator and split specialist corrective work. | `needs_split` | CLOSE-01 |

## Custom workflow and scope

`WorkflowResponsibilityMap` can edit standard flow `seo-event` and the existing custom process `club-event`, using workflow ID+ step ID positioning. Self-defined steps are transferred to the same initializer through actual `StepTemplate`, with no second set of rules based on a rolle guess; It has not reviewed the initial function. The full free workflow generator is not at this stage.

This table only proves that the current 46 standard definitions contain a review log entry item by item and do not represent all ASU policies that have been extracted or are fully supported by semantic and complete coverage. External system accounts, professional qualifications and approval authority must be verified manually. RACI maintains the existing rules with respect to budgetary control; The responsibility bubble is not granted for budgetary, procurement or school approvals.

`buildEventNodes` creates no executors only when adding ownerMode=unassigned; The anchors, conditions, dependence, expected time, calibration and old RACI metadata remain unchanged. The actual candidate and confirmed assignment are handled by a single function parser and fit layer, not revert old functions or list first person.
