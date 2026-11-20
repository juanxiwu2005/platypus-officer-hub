# Job Matching Phase 1 Delivery

2026-11-16(America/Phoenix) `claude/fervent-thompson-e2j5u2`

## What did you build this time?

It is possible to maintain a record of its duties, each stating “what it does, what it delivers, what it doesn't include, and what it comes from”. role is saved separately from duties; A role can take on multiple duties, and the same functions can be assigned to more than one role or member. Mission steps relate to duties and the parser identifies the right person. The new module does not require a roll to be called Secretary, Marketing or other predefined names.

The duties can be created, modified, confirmed, merged and archived manually. Edited and reconfirmed; Merge retains the location of the old ID, steps back to confirmation and history assigns record retention. The integrity of the overlapping and coverage of duties still requires follow-up AI inspections and manual review; At this stage, no claim has been made to automatically guarantee that all responsibilities are mutually exclusive and cover all policies.

When more than one person has the same responsibility, the rule order is: to retain valid confirmed assignments  →  to check with default recipients to make backup recommendations and await confirmation  →  to preselect if there is no default and there is only one qualified available person § The remaining cases indicate the reasons and are pending. When the same person enters from a role and directly related two paths, it only appears once.

**“Pre-selection” has not yet become a mandate holder; "Acknowledging" is not the same as being recognized.** After the principal has lapsed or his/her duties have changed, he/she is recorded and asked for review without automatic change. The current official mission entrance still uses the original logic, and physical access is stage 3.

## Readable exercise input

All data on the fielding of robots, 12 members, 7 duties, two streams (regular meetings, competitions). The example is gradually developed by the official data operation and includes 45 revisions; An additional 46 revision snapshot is used to verify that the changer will not reassign an existing task. The [ input code ](../../src/matching/examples.ts). [ exercise asserts ](../../src/matching/examples.test.ts).

| I'm sorry. | Associated duties | Current situation |
| --- | --- | --- |
| Morgan | Example operator only, not associated with performance of duties | I don't think that being Team Captain is gonna be the head of this operation. |
| Riley | Site coordination, directly linked by roll inheritance and manual | (b) Eligibility recognition, available; The default recipient of the site |
| Casey | Site coordination | (b) Eligibility recognition, available; Backup site |
| Jordan | Site coordination | Unqualified school system |
| Taylor / Skyler | Solid Test | Both available; No default initial |
| Quinn / Drew | Visual production | Quinn is the default but not available; Drew is a backup. |
| Sam | Robot demonstration | Only qualified available |
| Alex | Flight demonstration | External authorization unknown |
| Robin | Site coordination, equipment transportation | Site accreditation, but availability is unknown |
| Jamie | Site coordination | Not anymore. |

## Actual operational results

The following table is derived from the call for the same `resolveMatchingAssignment` offline operation; Not a forecast prepared by AI.

| Workstream and Tasks | This results | Reason |
| --- | --- | --- |
| Regular meetings: reservation of conference rooms | Preselection Riley | (a) The default person is qualified and available; Three other associated members with unknown qualifications, unknown availability or departure. |
| Competition: booking of venue | Preselection Riley | Reuse the same site duty for both processes without creating the same name |
| Competition: production of posters | Recommendation Drew, awaiting confirmation | Default Quinn is not available. Drew is backup. |
| Competition: Test Solids, New Task | To be selected Taylor or Skyler | Both are available without defaults; The table doesn't change the result. |
| Competition: Preparing Robot Demonstrations | Preselection Sam | Only qualified available |
| Regular sessions: renewal of registration | To be staffed | Have duties but are not connected; No, fallback to present. |
| Competition: Flight demonstration | Pending verification of eligibility | Alex's flight authorization has not yet been confirmed. |
| Regular meetings: transport of equipment | Availability to be verified | The availability of Robin is unknown |
| Competition: both writing and designing | To be split or explicitly integrated | Steps are marked as complex tasks and cannot be assigned solely on the basis of visual production duties |
| Regular sessions: new jobs that do not relate to duties | To be associated duties | Workstream steps not configured |
| Competition: Manual confirmation of a solid task to Skyler | Keep Skyler in charge. | Retention of confirmed result |
| Same task, then set the default to Taylor | Still Skyler in charge. | Default rules affect only new recommendations and do not cover confirmed results |

The candidate explanation for the site assignment will list Riley, Casey, Jordan, Robin and Jamie, with an indication of acceptance. Riley calculates only once, although there are two associated paths. Eligibility and availability are confirmed by input data; The platform does not automatically access the school website to verify accounts.

## Data and Extension Borders

- The public interface is concentrated in [ src/matching/index. ts ](../../src/matching/index.ts) and shared by [ MATCHING_CONTRANT. md ](MATCHING_CONTRACT.md). Responsibilities, workflows, steps, members use stable IDs.
- (a) The ID, operator, time, command and amendment number for each actual change of the record; Retrying the same operation will not be repeated. The incident did not contain the complete list of external members at that time, and could not be claimed to have allowed all external situations to be rebuilt by the event alone.
- The records are assigned only with amendments to the duties, steps and default rules on which the record is maintained. The parser returns the recommendations and reasons, with the future operations portal responsible for authorizing, confirming and actually writing to the task.
- Independent configuration key is `platypus.matching.v1:<OrganizationsIDEncoding>`; Archived tape version. Damage, other organization or non-support of version data retention source text does not overwrite as illustrative data. The ID of the different organization is not a login or permissions system.
- The save will check the changes that have been read and can reject common expired overlays; The browser read/check/write is not an atomic lock across labels or devices and cannot be called multi-person co-service.
- The existing `DemoState`, the old archive keys and the outer layer schema version have not been modified. The only original, import, version upgrade and rollback design for stage 3 can be found in [ MATCHING_COMPATIBILTY. md ](MATCHING_COMPATIBILITY.md).

## Development and validation of records

Baseline `22cb3cc`; Shared compact `886ccf7`. Two developments Agent created a separate worktree from the same contract, the main Agent reserve package submission:

| Bag. | Branch and Submission | Scope of documentation |
| --- | --- | --- |
| Data Agent | `feat/matching-library` · `307b5d0` | Library, valuation, repository and 29 tests |
| Resolver Agent | `feat/matching-resolver` · `c5bb56c` | Resolve and 45 tests |
| Lord Agent | Integrated Branch | Contract, public exports, 12 exercises, old data isolation tests and files |

Integration exercises and isolation tests were also conducted on 17, totalling 91. Final inspection:

| Inspection | Results |
| --- | --- |
| New module 91 + former relevant links 114 | 10 files, 205 all adopted |
| `npm run lint` | Adopted, with CSS, ESLint and Project Guardrails |
| `npm run build` | By, containing the front end TypeScript and production construction |
| `npm run typecheck:netlify` | Passed |
| Actional Exercise Actual Call | The above-mentioned 12 scenes match expectations |
| Read-only Independent Review | Can not open message `3ad168d` (a) The review was adopted without the need for restoration; Also authenticate editing, reconfirming, merge and save restored historical protection |

Test command: `npm test -- src/test/m4.test.ts src/test/orgWorkflow.test.ts src/test/workflowV2.test.ts src/test/m2b.test.ts src/test/onboardingTeam.test.ts src/test/fb-05-create.test.ts src/matching`.

The first integrator type check revealed joint typologies of the subjects eligible for the exercise, which have been supplemented with a clear list of members and categories of qualification objects and are again constructed; Data compacts were not liberalized. The build output is based on notes and large cunk hints, and no construction error. No page changes at this time, no Playwright or complete `npm run check`; These inspections were not recorded as having been adopted.

## Subsequent phase

Phase 2 is still to be approved: matching the results of the existing Constitution AI with draft duties, checking references source text, adding job bubbles, membership connections, defaults and backup interfaces. Phase 3 is still to be approved: access to actual task creation, processing of 46 standard step maps on a case-by-case basis, migrating the archive and being a browser acceptance.

There is no new page or clickable demonstration this time; Use the bottom rule for the distribution table above. No live model called, no mail sent, no merge main. Could not close temporary folder: %s
