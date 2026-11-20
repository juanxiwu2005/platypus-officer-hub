# Three-phase implementation plan for functional matching

> **Current state has changed:** Juanxi requires, after a trial, the restoration of main duties prior to re-engineering, withdrawal of current job matching experiences and reading programmes before redesigning them by reference or handwriting. The three phases have been implemented in the current round of fallback and history has become `5e301d9` archive; The original plan and the record are kept below. For an update see ['s existing strategies, ](MATCHING_STRATEGY_FOR_REVIEW.md) and [ fallback handoff ](MATCHING_ROLLBACK_HANDOFF.md). The original interface programme will not continue without new interactive confirmation.

2026-11-16(America/Phoenix) . Codex . Plan baseline `claude/fervent-thompson-e2j5u2@3a9fa94`

Juanxi has selected and confirmed A2, B2, C2:AI from drafting; (a) Mission-related responsibilities; Multiple persons with responsibilities are based on default receivers and backups. The plan divides this combination into three separate stages of acceptance, with the objective of quickly creating reusable matches and accessing existing task creation processes.

**Implementation threshold from Juanxi's request: “I approve before the stage begins”. 2026-11-16 Juanxi has been approved in three phases, the latest being Continuation 3. The** phases are developed, integrated and reviewed independently of the Worldtree; The stage approval is dealt with separately from the merge `main`, which is officially published. The actual results of phase 3 and the restrictions on access can be found in stage [ 3 for delivery to ](MATCHING_STAGE3_HANDOFF.md).

## Selection of scope and deliverables

| Options | Achieving the Goals for the current round |
| --- | --- |
| A2 | Keeps the existing view upload and AI rule read; (b) Upgrading responsibilities to independent records with sources, redactable and identifiable; It can always be supplemented by labour. |
| B2 | The template steps relate to the duties of the organization and then identify candidates according to their responsibilities; Reuse the same function to support different workflows |
| C2 | (a) The default recipient and backup for each function; Centralize when candidates are not qualified, available or unclear. No first person on the list |

The first of the six automatic reminders is completed. New RACI rules, alarm plans, mail, mail jumps, backstage dispatches or organization handoff are not built at the same time in this round. Existing fixed date engines, rules for production identity and existing official websites maintain their respective borders.

Target operation after phase 3: Uploading field coordination  →  review file with function  →  binding member and setting defaults and backups  →  connecting workflow steps to duties  →  processing to be assigned  →  creating actual tasks and saving the assigned source. Repeating the confirmed template does not require a call from AI to select member.

## Phased arrangements and approval status

| Phase | Focus | Delivery | Activate Status |
| --- | --- | --- | --- |
| 1 | Data contracts and certainty matching rules | Job model, relationships, candidate selection, interpretation and offline exercise results | Technical inspection and independent review completed, delivery |
| 2 | Constitution AI and Job Settings | Operational Job Repository, Source Review, Member Association, Default and Backup Interface | Development, desktop/cell check and independent review completed for delivery |
| 3 | Access to Actual Tasks and Integration | Harmonization of matching, old data compatibility, browser and independent review of activities and stand-alone missions | Access and review completed, delivering access; Baseline time-out phase for full door closures 3Delivery  |

Stages 1, 2 allow for the first exercise of a new module through an independent entrance and phase 3 must be created back to the actual task. The results of only stand-alone exercises cannot be described as complete in all three phases.

## Common agreement on data and rules

### Independently preserved relationships

Phase 1 determines the shared compact of `src/matching/`, followed by Agent developed under the same contract. The following are the concepts that must be expressed: the TypeScript field and the operational signature are submitted and frozen by the main Agent of stage 1.

| Data | Minimum Contents | Purpose |
| --- | --- | --- |
| Duties | Stable ID, name, definition, deliverer, exclusion, source, confirmation status, revision | Do not rely on roll guesses; Change Retention Link |
| role and responsibility | Existing role ID, duties ID, confirmation and source | A role can have multiple duties, multiple functions. |
| I'm sorry, remember. | Existing membership ID, function or roll relationship, manual exception, required qualification, availability | Qualified candidates for re-entry, responsibility not automatically delegated to management |
| Template Step Requirements | Workstream ID, step ID, main duties, composite task pending mark | Two streams of work can be reused, and the same name moves are not linked. |
| Default selection rule | Responsibilities ID, principal recipient ID, backup ID | Default arrangements are checked separately from candidatures |
| Results of this assignment | Task ID, executor, matching basis, rule revision, manual coverage and confirmation | It can be explained that the confirmed result is not covered by recosting. |

Roles, members and task identities refer to existing stable IDs and do not copy the entire list of members in multiple locations. The new relationship supports one person with multiple responsibilities and multiple persons with the same responsibilities, as well as managing space for the full follow-up of one person with multiple co-workers.

The first version repeats the existing membership input, giving priority to the independent relationship between members and duties. The current `Role.holderId` and `Person.roleId` are still being used by old logics such as missions, handoff, etc., not to pretend that the candidate for duty is a roll administration permissions or to rewrite all members at the same time in this round.

### C2 Selection Rule for certainty

1. Keeping valid and confirmed manual assignments; Can not delete folder: %s: No such folder
2. Finds the current available member from the recognized functional relationship, press Member ID to weigh; A person who expressly fails to meet the requisite qualifications, who has left office or is not available shall not be a regular candidate.
3. The default recipient is qualified and available to pre-select that person, with an indication of the basis.
4. When the defaulter is not available and back-up is available, make a backup recommendation and await this confirmation; Don't whisper back-up as it has been taken over.
5. (a) Pre-selection if the default is not configured but only one qualified candidate is available; The choice is reserved for more than one person.
6. Returns a clear pending status and cause, not revert `roles[0]` or default president, when there are no duties, no recognized functions, no qualified candidates, unclear qualifications or no available owner.

The first version of the external operational qualification is manually confirmed and the state is capable of distinguishing between known satisfaction, known non-fulfilment and unknown; Do not pretend that the platform has authenticated school system accounts. Assigning, preselection and membership recognition are different states.

### Duties and working-flow boundaries

- Each ordinary enforcement step first relates to a primary responsibility; The composite step retains the status of “need to be split or clearly integrated”, and cannot match only one of the professions to assert that the whole job can be accomplished.
- Existing 46 standard steps must have an item-by-item map or a clear unresolved mark; Unresolved items cannot be automatically assigned from the background of old functions. The remaining policy responsibilities are not declared to be fully covered without article-by-article checks.
- Extensions could be validated using a second different editable example process; The round does not build complete free workflow generators or redraw flow canvass.
- The confirmed template association is used for future tasks; Changes in templates and defaults do not automatically reassign existing tasks.

## 1 Establishing Data Contract and Matching Rules

### Changes

1. The main Agent first establishes a single shared contract, input validation and module export with clear responsibilities, candidates, defaulters, backups, unresolved status and assignment sources.
2. Create job creation, manual editing, merge, deactivated and quoted pure data operations; The synonym metge is a matter for decision and has been retained or expressly reconnected by the stable ID.
3. Achieves a unified candidate parser with a C2 selection that does not rely on nine types of `RoleFunction` to match new links.
4. Designing a version of the matching configuration for reading, writing and importing validation; The rehearsal data is isolated from the old business archive and does not rewrite the old file in advance.
5. Preparation of readable exercises with 10–20 name field members, two different streams; You can test the rules without asking to wait for AI.
6. Clear stage 3 access compatible designs for existing archives: field location, reading default values, source, snapshots and necessary outer-storey versions are migrated, written with stage 1 delivery, depending on when accessing.

### Worktree Agent

| Work package | Scope of responsibility | Example of document title | Dependence |
| --- | --- | --- | --- |
| Main Agent Contract | Share types, public exports, uniform clips and documents | Planned Add `src/matching/contracts.ts`、`index.ts`；Share files only main Agent changes | Finish and check the compilation first. |
| S1 Data Agent | Job operation, source and confirmation protection, configuration of reading and writing and version validation | Planned Add `src/matching/library.ts`、`repository.ts`The corresponding test. | Worktree from the freeze |
| S1 Resolver Agent | Qualified candidates, defaulters and backups, unresolved reasons, retention of manual selection | Planned Add `src/matching/resolve.ts`The corresponding test. | Same frozen contract submission |

The two developments will be completed by the main Agent, which will then arrange for independent read-only reviews; Problems were repaired by the former head or master of Agent, who prevented reviewers from changing public documents at the same time.

### Acceptance

- Job and role can be named arbitrarily; Two different jobs revert to the same duty ID.
- Two members are not affected by the order of groups when the results match; One person through more than one role meets only once.
- The main candidate is valid, backed up with recommendations, is not available, has no qualifications and lacks responsibility gives a separate determination.
- (a) Protection by manual decision; Archiving duties and deactivated members alert that they cannot continue to be used quietly.
- (a) Conservation and recovery results are maintained; The old archive did not contain new configurations without empty tasks or personnel.
- Compatibility of the input to the distribution table, test results and stage 3 for delivery of field scenes is checked by users who do not read code.

Reporting of results after phase 1; Phase 2 awaits approval before being authorized and does not carry out an AI or a Bread advance.

## Phase 2 Connect Constitution AI with Job Settings

### User-operated processes

Continues to use the existing constitution upload and roll extraction. Show job bubbles below role; Opens bubbles to see definitions, deliverables and source segments. Users can create new, edit, copy and confirm functions, then tick the recipient from the existing members, and set the default receiver and backup. AI can continue manually if it fails, does not reflect or only recognizes parts of the content.

### Changes

1. Reuse PDF, docx and text readings, and ASU AIR matching; Adds a structured function extraction that does not treat the current short `duties` string as a full directory.
2. Reuse compatible extensions or internal service branches of the existing constitution interface to keep old structure/duties available; The public request and result contract is managed by the main Agent.
3. (a) A source text matching check for reference to constitution: the reference not found cannot be marked as a proven source; Manual supplements and AI supplementary recommendations are recorded separately.
4. Retain existing manual field protection, add partial retesting, retain confirmed content, cancel expired requests and do not modify non-repetition requests.
5. Adds the responsibility, membership association, default, backup and assignment preview interface for the same solver for 1 at the consumption stage.
6. Priority is given to the access interface through an independent matching portal; The current portal for Team/Settings is handled centrally by the main Agent.

### Worktree Agent

| Work package | Scope of responsibility | Example of document title |
| --- | --- | --- |
| S2 Constitution AI Agent | Extract service, client-end fit, source verification and simulation interface testing | Planned Add `netlify/lib/matching/` extract module, `src/matching/constitutionClient.ts`；Existing `netlify/functions/constitution.mts` Compatible Extensions |
| S2 UI Agent | Job library, source review, membership association, default and backup components | Planned Add `src/matching/ui/` Tests with exclusive styles, components; Do not modify other Agent AI or public contracts |
| Lord Agent | Request contracts, old page portals, shared style import and configuration | `src/App.tsx`、`src/onboarding/`, shared connections such as Settings; Read the design first token |

Each development Agent submits to create worktree from the same stage of 1 integration. UI uses a simulation of frozen contracts to be developed and the service and interface are independently completed before being jointly validated.

### Acceptance

- The rale and duties of the professional staff organization can be accurately presented and do not require classification to fixed functions such as programs/marketing.
- AI product has a verifiable source or clear recommendation mark; Changes, merges, confirmations and refresher saves are available.
- AI Timeout, format failure, partial failure and stop waiting for manual content not to be lost; No AI can complete the settings.
- Unlawful or repeated defaulters, non-candidature backups, unclear qualifications and non-availability can be detected.
- Computers and mobile phones can complete their functional settings, and keyboards and basic accessibility checks are passed.
- Simulation interface validation is reported separately from live model results; Default not to run a large number of live AI assessments automatically.

User acceptance using the function branch preview; If the first draft PR needs to be previewed, this action is included in the approved scope of stage 2 and executed by the main Agent. It is created and attached to this chat and remains unmerge. Reporting of results after phase 2; Phase 3 awaiting approval pending authorization.

## Phase 3 Access to Actual Job Creation and Integration

### Changes

1. The functions of 1 for the new activity, the first setup and the joint use of the separate task portal are sorted and assigned with links to `newObjects`, `completeSetup`, template saves and corresponding task forms.
2. Save matching configurations and actual task assignment sources in organizational data, with reference to existing role, member and task ID; Independent exercise data are imported only after explicit confirmation and not as a second long-term business original.
3. Implementation phase 1 Established archiving compatibility programme. Specific changes involving `DemoState`, schema logic, export or recovery logic must be specified in the delivery prior to this stage; Under stage 3 approval. Saves first to restore snapshots and does not replace user data.
4. Clear access to the new matching mode: maintain compatibility when old organizations are not configured; Once enabled, the new link returns to process when it lacks responsibility or a candidate and does not sneak back into old `roleFor`.
5. Keeps the existing `fn` for old pages, dates and other compatible logical uses and new matches no longer limit duties or candidatures with it. The date is still calculated by rule engine.
6. In the new matching mode, assigns separate records to the memory confirmation. It does not rewrite the status of existing tasks as a whole; The recognition requirements for new tasks are consistent with the selection process and the validation of controlled steps such as budgets does not circumvent established rules.
7. (b) The primary responsibility mapping, composite delivery and unresolved items for processing the 46 standard steps on a case-by-case basis; Specific reasons why records cannot be allocated automatically. Independent missions allow explicit manual designation as a one-time decision, and gaps in responsibility remain visible and are not concealed through reassignment.
8. (a) Verifying the same duty library and a parser with a second different workflow; Do not add a second set of role distributors by name.

### Worktree Agent

| Work package | Scope of responsibility | Example of document title |
| --- | --- | --- |
| S3 Workflow Adapter Agent | Template steps, job mapping, matching for existing configurations | Planned Add `src/matching/adapters/`；`src/engine/playbooks.ts`、`workflow.ts` Changes expressly limited to assignments, no change in date rule |
| S3 Integration Test Agent | Multiple processes, multiple candidates, old archives, recognition and browser returns | New Match Test, FieldCluster, `e2e/` (a) Exclusive examples; Up-to-date behaviour description of the relevant old test |
| Lord Agent | Status of operations, archived versions, creation of portals and UI connections | `src/data/types.ts`、`store.tsx`、`settings.ts`、`changeReview.ts`、`seed.ts`；Public documents do not cross-modify |

After master Agent completes the integration, independent Review Agent submits a read-only worktree review from the final candidate. The review object must be an integrated result, not just a single Agent branch. The review questionnaire includes repair and re-examination.

### Acceptance

- Create actual tasks from existing user portals, where the main implementer of a task is in line with previews and functional bases, and where multiple candidates do not generate duplicate assignments.
- Creation, reopening, refreshing and export restoration, confirmed assignment and function association maintained; Old saved data do not lose tasks, people or history.
- The defaulter is disabled, back-up is available, full staff is not available, there are no duties and manual reassignments are routinely used by browsers.
- Two different streams of work could share responsibilities; Change template does not automatically change historical tasks.
- The new matching model does not lead back to a fixed function for lack of candidates; Unfinished configuration with clear pending status.
- Existing dates, missions, recognitions, budgets and handoff-related returns have been passed, distinguishing them from this new issue and giving evidence.
- Final delivery preview of web sites, simple operating steps, change lists, test results, remaining gaps and rollback portals. Local exercises are not referred to as multiple official services without live cross-equipment organizations.

Phase 3 does not automatically enter the second RACI for six jobs by simply indicating that this function is completed in the branch and then awaiting user acceptance and subsequent release arrangements.

## Worktree Collaboration and Integration Rules

- The remote branch, workspace and upper stage results are checked after each receipt phase has been approved before the development of worktree, distribution code for that phase is established; The unapproved phase does not commence earlier.
- Following `claude/fervent-thompson-e2j5u2` as an integral branch of the objective, the current name and existing preview identity will be retained without change or deletion.
- At the same time, a maximum of two developers, Agent, using separate worktrees, branches and unique file ranges; The shared contract was first submitted by the main Agent, which prohibits both sides from inventing different data shapes.
- Sub-branch uses descriptive names such as `feat/matching-library`, `feat/matching-resolver`, `feat/matching-constitution`, `feat/matching-ui`; Checks whether to rename or be used by another session before actually creating it. Do not borrow existing setup worktree.
- Sub-Agent submits in his own branch, not to the target branch. (a) Main Agent, read on a case-by-case basis and integrated in the form of reserved submissions, responsible for documents, conflicts, shared documents and final delivery; Don't push, no merge main.
- Review Agent running after development agent delivery, maintaining and distributing budgets; Read final submission and verification of cross-package interfaces, data protection and no matching results.
- Using different ports when there is a browser service to test and build non-shared generated directories; Reuse only within the current version, with specific reasons and scope indicated when it was found that additional reliance or configuration adjustments were required.
- Each stage of the record begins submission, package submission, document changes, test orders, results and limits. Submission and delivery does not per se represent preview deployment or live AI verified.

## Check with rollback

Phase 1 Recompatible design review for behavioral unit tests, type check and old archive; Phase 2 Increased simulation services, components and desktop/cell operation inspections; Phase 3 Integrated check-ups, related returns and a full release ban. The use of existing `npm run lint`, `npm run build`, `npm run typecheck:netlify`, `npm test` and Playwright, complete `npm run check` remains after the final integration and is not allowed to repeat every Agent.

Live model is not called for batch regression. The necessary small amount of fielding data drainage is recorded separately from the manual online acceptance, and the simulation results are not referred to as live supplier performance. The first inspection found that the same baseline evidence was retained at the time of the original failure, and did not rely on the deletion of assertions, the replacement of data or a relaxation of the quality threshold.

Submit it by package and stage for fallback. Stage 3 save compatible snapshots before access; Disable new matching entrances or modes as a priority, then fallback corresponding codes, retain job profiles and existing tasks, not by reset demo as rollback. The specific version of the recovery path is what phase 1 must deliver and stage 3 must test.

## Current status and next steps

All three phases have been implemented as approved. Phase 3 Connects the duty library to the business and actual tasks, and implements 22 →  23 migration, 46 step-by-step catalogue and cross-label page cover protection. [ stage 1 rehearsal ](MATCHING_STAGE1_HANDOFF.md). [ phase 2 operation and delivery ](MATCHING_STAGE2_HANDOFF.md) [ phase 3 operation, inspection results and restriction of the archive that ](MATCHING_STAGE3_HANDOFF.md) [ has implemented compatible with rollback ](MATCHING_COMPATIBILITY.md). Waiting for Juanxi access; Do not automatically start RACI, alarm plan, mail or incoming office. Could not close temporary folder: %s
