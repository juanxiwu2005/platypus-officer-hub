# Mission Matching Program Comparison and Minimal Prototype Range

2026-11-16 (Americana/Phoenix) . Codex . Based on `claude/fervent-thompson-e2j5u2@c85764e`

This paper compares three options: how to create a pool of responsibilities, how the tasks relate to responsibilities, and how to select an executor when many people qualify. Each option is discussed from the perspective of user experience, research and development work, existing technological constraints, minimal prototypes and subsequent expansion. **Juanxi has selected A2+B2+C2 and requires worktree Agent to be advanced in two to three phases; After approval, the stage is initiated and implemented within clear terms of reference.** Specific three-stage division of labour, compatibility arrangements and acceptance see [ Implementation Plan ](TASK_MATCHING_IMPLEMENTATION_PLAN.md). The current development phases have not yet been initiated. The remaining options are retained for comparison.

## Directions and rules of sharing confirmed

User is clear: keep and enhance the recognition of AI role; AI Artificial matching when identifying incomplete; It is not possible to limit all of the existing functions to pre-set functions such as programs, secretary and marketing; A variety of workflows are supported and a word for the future is generated.

Follow the [ six working order ](TASK_MATCHING_REVIEW.md): only task matching is currently discussed, followed by RACI, reminder plan, mail writing, emailing process and back-office dispatch, then processing incoming officer.

The following rules apply to programmes:

- The role name, the duty name and the workflow name can be custom-defined by the student organization, and the platform example is used to help start.
- AI Retains the source of responsibility drawn from it, and AI identifies new responsibilities based on the process as recommendations; They can be manually modified. AI does not disguise the generic template as a constitution fact when no duties are found.
- One member may take on multiple duties, the same function allows multiple candidates. The duty label itself does not confer on the system permissions, nor does it certify holding an external account.
- One mission identified a key implementer. The multiplicity of candidates, collaboration and each one of them are three different arrangements that do not imply duplication.
- Shows a gap when no matching results are available. Manually confirmed assignments are not covered by the next AI call, page update or recalculation of workload.
- The duties are linked by a stabilizing number, and the name does not disrupt the task or the role relationship.
- (a) The name of the duty may vary, but it may be identified as a boundary by the same actions and deliverables; Broad clusters and breakdowns of responsibilities do not involve overlap matching. The combination of tasks is clearly divided or multiple capabilities are required and cannot be considered capable of performing the entire task as those who meet only one of them.

## How to create a pool of responsibilities

### A1 Manually create custom directories

Read AI extracts or fills itself in by clicking on "Add duties" under each role to enter the job name, or select this current orabubble. The platform provides examples that can be modified. The original AI roll identifies reservations and the job pool is largely created by people.

| Angle | Programme impact |
| --- | --- |
| Actual user experience | The result is manageable, and the words correspond to the student organization habit; The first setup is multiple input, and the user may also create a duplicate function. |
| Product research and development | Low-to-medium: additional duties, reuse options, rale connections, source saving and deactivated tips when quoted; No additional job extraction model task required |
| Current Platform Limits | The current function is short text on the roll and requires an additional independent record of duties; Multiple generic duties cannot be judged by the mere existence of a string. |
| Simplest prototype | Reuse existing roles and members, allowing the addition of duties, selection of existing functions, previewing links; Reminder with the same name. |
| Future Extensions | Customized records and connections can be expanded directly; At a later date, AI may be drafted without re-establishing the directory, but manual naming differences need to be kept up to date |

### A2 AI from drafting manual confirmation

Uploads the constitution before displaying the original rolle and then displays the AI recommended job bubbles under the role. Bubbles can see their definition, delivery source text; President reserves, changes, metges or supplements and is confirmed in bulk. When no constitution or AI fails, direct A1 operations.

| Angle | Programme impact |
| --- | --- |
| Actual user experience | Less initial input and retention of original language; President wants to check whether the constitution is complete and whether AI is overly general |
| Product research and development | : re-read the file and existing AI interface processes to add responsibility structure output, local validation, source text reference check, confirm state and modify protection |
| Current Platform Limits | Duties extracted from existing master applications are one or two sentences per rule and cannot be used directly as a separate repository of duties; The document will be excerpted to identify possible omissions; Scanning PDF for OCRs; AIR call is limited by time and output |
| Simplest prototype | Do role job extraction only, run in batches; AI recommends immediate editing; Source snippets are listed together with manual offsets; Try again only to handle the failed part and do not overwrite confirmed content |
| Future Extensions | Follow-up process documents, roll targets and applicable policy actions, with the same record of responsibility; New version constitution is recommended to be updated with variance, not full library overwrite |

It is recommended that A2,A1 be a manual path always available. The prototype prioritizes the validation of “AI recommendations for fewer entries” and does not seek to allow models to automatically understand all organizational knowledge.

### A3 Progressive establishment of catalogues from actual workflow

Constitution is still used to identify role and existing duties. When the first workflow is created, the system identifies the required duties from the task and gives priority to the identified functions; The missing duties are built up alongside the current mandate. Additional workflows will continue to be added.

| Angle | Programme impact |
| --- | --- |
| Actual user experience | (b) To begin planning actual work without having to complete the catalogue; Job streams are created with job supplement and synonym interruption. |
| Product research and development | Mid-to-high: mission analysis, recommendations for reuse, process weighting and incremental updates are required in addition to the directory |
| Current Platform Limits | The current creation of a major fixed template has yet to connect any new work to a single repository of duties; It's easy to miss organizations like the annual register. |
| Simplest prototype | Manually mark the missing duties in two examples of workflows, allowing for the creation and designation of role in situ; 2nd Process Reuse First Duty |
| Future Extensions | (a) Fits for the generation of workflows in a future sentence; There is still a need for an independent gap check of the constitution and policy, so that “recent tasks” cannot be considered as all organizational duties. |

A3 can be used as a follow-on incremental entrance to A2. The three options here describe the main path for the first creation of a directory, without requiring permanent peer-to-peer rejection.

## B. How mandates relate to responsibilities

### B1 Directly tied per job stream

In the template, president assigns “application space” to the event manager and the debugging programme to the software owner. The roll arrangement for reproducing the template for new activities will be followed by category C options.

| Angle | Programme impact |
| --- | --- |
| Actual user experience | Intuitive, familiar fixed processes only need to be set up once; Similar tasks are maintained separately when they occur in multiple templates |
| Product research and development | Low, closest to current `ownerRoleId` and process editor; Still has to stop from unknown role name silence fallback to preset function |
| Current Platform Limits | Currently, there is a step towards a roll to support manual modifications; The current master application also requires a separate selection layer when there are more than one roller. |
| Simplest prototype | Select role and preview members from two editable templates; Do not automatically semantic matching |
| Future Extensions | More templates can be supported, but modifications are decentralized when organizational changes occur; AI's newly generated workflow also needs to create a ruler relationship for this template |

B1 can verify the assignment interaction, but not separately the functional pool that can be used for re-occupation.

### B2 Template task binding duties, then the job finding a candidate.

The “Application Room” and the “Appropriate Playground” are linked to the “Place Coordination” of this book. As a result of the change to who would take responsibility for site coordination, tasks created in the future could be identified according to new configurations, with existing assignments remaining as assigned and indications of changes that need to be addressed. For the first time, a new task is recommended by AI or selected by someone and will be stored in the template after confirmation.

| Angle | Programme impact |
| --- | --- |
| Actual user experience | For the first time, it checks what duties are required for a task and subsequent duplication of activities can be directly reused; Details can explain duties, candidates and reasons for selection |
| Product research and development | : functional references, role and membership links, templates to examples, identification of sources and reference to affected areas; AI may only participate in initial recommendations |
| Current Platform Limits | Main applications rely on a single task `fn` and `ownerId`，To add reference to duties and candidate search；Old functions are also used on other pages，Can't just delete and assume compatibility |
| Simplest prototype | Only one primary function is associated with each exercise assignment; (a) Tasks requiring multiple professional deliverables are first separated; AI does not participate in the selection of members for each repeat activity |
| Future Extensions | (b) Be suited to multiple workflows for sharing responsibilities; At a later stage, there will be collaborative responsibilities, alternative responsibilities and defaults within processes to maintain the identity of the same duties |

It is recommended that B2 be used to maintain the functional relationship with existing templates and provide a single entry point for new workflows. The first version does not model complex skill weights.

### B3 New job created by AI recommended duties as described

The user inputes a “organisation of a robotic competition”, and AI proposes steps to recommend existing responsibilities for each step based on the current organizational memory. When not found, a proposal for new duties is made and the president concentrates on unclear items. After confirmation, the tasks, duties and candidates are preserved without re-examining at each time.

| Angle | Programme impact |
| --- | --- |
| Actual user experience | (a) Free input and temporary work are easier; Need to look for uncertainties and results may be influenced by mission descriptions and model judgements |
| Product research and development | Mid-to-High: Limiting existing functional numbers, validating model output, processing unmatched and composite tasks, saving results and protecting manual modifications |
| Current Platform Limits | Actual AI delayed and structured results may fail; The current standard activity creates a non-line-by-line application of this mechanism, and arbitrary workflow generation is not the primary application of completed capabilities |
| Simplest prototype | Paste a small number of job descriptions, model one recommended function and freeze the results when identified; A manual chooser to display B2 when the model fails |
| Future Extensions | Fit for temporary assignments and future new workflows, relying on the B2 function data base; Common results should be saved as templates to reduce duplication of waiting |

B3 and B2 can be combined: B3 handles the first time, B2 is responsible for a reliable reuse.

## C. How to select the executors for multiple co-operators

### C1 Select one person by the president when more people match.

Only one member can be preselected; Several candidates are listed in parallel, and the president is identified by lot at the time of creation. The selected interface displays the role of which you belong, the basis of your duties, and recorded non-availability.

| Angle | Programme impact |
| --- | --- |
| Actual user experience | Selection can be explained, and people know the living division of labour; There's still a lot of people to handle when there's more duplication. |
| Product research and development | Low: Candidate search, deweighting, single selection, unresolved list and depositary decision |
| Current Platform Limits | There is currently no pool of candidates for shared responsibilities; There is a need to increase the number of members with responsibility and not consider existing multiple frames as one option. |
| Simplest prototype | (a) Two persons with responsibilities and two candidates for assignment; Generate only one task, select only the main executor. |
| Future Extensions | Exceptions to all automatic strategies may be retained; Can not get folder: %s: %s |

### C2 Default receiver and backup for each function

Sets the duties by selecting the main recipient and backup from a qualified member. Can not delete folder: %s: No such folder A backup is displayed for confirmation when the defaulter is clearly not available; Both individuals are left to be dealt with. There is no default setting of duties to use C1.

| Angle | Programme impact |
| --- | --- |
| Actual user experience | (a) Replication of work after one, which is cost-effective and suitable for space, finance and outreach; It may not be appropriate to give the same person a long time if more people should share their jobs. |
| Product research and development | Low to medium: increase the number of defaults for duties, validity checks and coverage of examples; We don't need to estimate each other's remaining hours. |
| Current Platform Limits | The default candidate must be separated from the `qualified candidate' and the roll holder does not equal all work 's default executor; External systems permissions first edition can only be manually recorded |
| Simplest prototype | (b) Principal recipient, backup and non-functional manual; Transfer to C1 when no settings are available or conflict arises, and save the assignment after confirmation |
| Future Extensions | Follow-up may create a preference for a particular stream of work, or change part of the function to C3; These changes don't require a copy of the exact duties. |

It is recommended that the least available version be C2 and retain C1 to deal with exceptions. The default preselection does not amount to a confirmation of takeover and task recognition is recorded separately from assignment.

### C3 Distribution of eligible candidates according to capacity or rotation rules

Candidates that clearly do not meet the requirements are excluded or are not available, then allocated according to the chosen rule of student organization: e.g. rotation, or priority for those with a higher remaining capacity when input estimates and capacity information are available. Displays reasons for selection and allows manual adjustment.

| Angle | Programme impact |
| --- | --- |
| Actual user experience | (b) Multiple individuals may be assigned to duplicate work; When distributed by volume, maintenance of availability and expected actual inputs is required and data maintenance costs are higher |
| Product research and development | Mid-to-high: pure wheeling is relatively simple; Capacity strategy also requires cross-flow calculations, fixed splitting rules, maintenance of rotation and assignment records, and avoidance of refilling after refreshing |
| Current Platform Limits | The number of outstanding tasks and planned days available are only rough indicators; The main application does not have complete memory capacity data, and there are no live multi-person distribution records. |
| Simplest prototype | (b) To be more equitable, a clear rotation exercise should first be performed; If you perform a capacity exercise, use the manual filling capacity of the field to clearly show the basis for the estimate |
| Future Extensions | (a) Be suitable for a large number of overlapping tasks, and follow-up may choose different strategies according to their responsibilities; When multiple users operate simultaneously, the server is required to process the consistency of assignments |

C3 The term “who has less task” should not automatically be used as “who is available”. Task professional qualifications and operations missions are screening conditions, and the rules of assessment apply only between qualified candidates.

## What can the existing code be reused?

| Existing base | What can be reused | What needs to be added |
| --- | --- | --- |
| Main Application Read with Constitution AI | PDF, docx, text reading; (a) The role and the functions are drawn in batches; Manual field protection already available | Independent record of duties, verifiable sources, re-profiling, confirmation status |
| Main application templates and tasks | Step editing, clear role, mandate holders, current date engine | Sources, candidates and exceptions for functional references, templates and mission examples |
| Main application member and roll | Existing memory input that can be used as an exercise | Add a new part to the function; Full multi-service and multi-person compatriot management needs to be matched separately |
| Hide Organization Setup | Custom role, source text, job arrays, tasks, association and manual field protection | (a) Connecting data bridges to the main application; It can't be assumed that the switch will be turned on to complete the migration. |
| Hide Workspace | Multiple role members, multiple collaborations, server revision and command mode | Multi-candidature practical distribution strategy, live group member access to identity and master applications |

The code is based on: [ `constitution.ts` ](../../src/lib/constitution.ts), [ `useReading.ts` ](../../src/onboarding/founder/constitution/useReading.ts), [ `readDocument.ts` ](../../src/lib/readDocument.ts), [ `types.ts` ](../../src/data/types.ts), [ `organization/schema.ts` ](../../src/organization/schema.ts), [ `workspace/contracts/index.ts` ](../../src/workspace/contracts/index.ts) and [ `runtime.mts` ](../../netlify/lib/workspace/runtime.mts).

(a) The existing main business has a browser site; Another set of server workspaces hides and maintains independence by default. The prototype can be rehearsed in the same browser; Live multi-person editing and cross-equipment assignment of organizations, members, missions and durability that require follow-up access to the server cannot simply add pages.

Constitution currently reads up to 24 caps, up to 6 caps for jobs per batch, up to short text ceilings per ruler; The new record of duties cannot be forced to plug back into these short strings. The rules of the 20 people screen for a small amount of calculation, which is mainly limited to clarity of duties, completeness of information, AI waiting and consistency of data, rather than requiring complex optimization algorithms.

## Two prototype ranges available

### P1

Adopt A1 + B1 + C1. Keeps the existing constitution recognition and selects rehearsals with manual duties and manual role. The least developed is the ability to determine whether users understand and can select, but it does not validate the long-term value of cross-flow responsibilities and automatic selection.

### P2 Minimum available version of the authentication function framework

A2 + B2 + C2 is recommended, and A1 and C1 are treated as failures and exceptions. (b) Re-read existing files to fit with AI and create an independent matching exercise portal that will be isolated from the archive of old presentations; Keeps the relationship structure for future access to live members and servers.

The prototype only needs three consecutive images:

1. My student obligation: uploading or pasting the field coordination, viewing the role, the bubbles and sources of the duties, fixing them manually and confirming them.
2. What is needed for this job: to open a template and select responsibilities for the task; A second stream of different jobs is opened, existing duties are reused and gaps are addressed.
3. To whom: display candidates, default receivers and backups, centralize pending assignments, and check final implementers and reasons after confirmation.

The minimum data requires the expression of duties, role and function relationship, memory functions, principal duties, defaults and actual assignment of tasks. The first version has been reprinted and will be supplemented later by full peer management; Candidates are counted in terms of membership to avoid the repetition of one person in the future. Example templates and functional relationships are stored as editable data and are not placed in a fixed line name judgement.

First authenticated with 10–20 name field members, two distinct workflows and a small number of representative tasks. When the first official template is then accessed, all 46 standard steps are mapped item by item and the applicable generic policy actions are checked. This representative sample does not constitute full proof of policy coverage.

Prototype acceptance includes at least:

- Self-defined professionals rule need not be classified into nine existing categories of functions; AI can continue manually if it fails, there is no consultation or the function is missing.
- (b) The two different workflows revert to the same duty and do not reproduce synonym labels for each process; New responsibilities are also allowed.
- (a) The renaming of the role or the retention of the link; The impact can be seen when the duties quoted are discontinued.
- Two qualified members produce only one principal executor of the mission; Show pending cases when no candidate, no available and no default rule exists.
- Manual reassignments update or regenerate non-coverage decisions; Change template does not change existing mandate holders.
- The function is consistent but necessary for the operation to show reasons when not confirmed, and labels are not treated as evidence that they have been approved.

The prototype does not simultaneously achieve live mail, migration of the entire old business database, full workflow generation, complete skill rating, calendar integration or organization handoff. The follow-up is provided in the six recorded order.

## Interface relationships retained in future extensions

Category A of the job pool, Category B of the task identification and Category C of the selected person may be replaced separately: created responsibilities may continue to be supplemented by AI, newly generated steps may also be manually tied to duties, and the functions of the recipient may later be rotated.

The same relationship is used for specific work: organizational information  →  duties  →  template steps are required  →  qualified members  →  mandate-holders. AI is one of the sources of input and recommendation, with dates that continue to be calculated by existing deterministic engines and task writing that continues to be validated. Responsibilities, skills, external qualifications and system authorizations are recorded separately; The future RACI complements the roles of responsibility in these relationships and does not at present predetermine for users.

## Selected Group and Next

Comparison of the programme with the code base has been completed and users have selected A2 + B2 + C2, retaining manual paths. Using the P2 role framework as a basis for rapid delivery, phase 3's actual business access is set out in [ Implementation Plan ](TASK_MATCHING_IMPLEMENTATION_PLAN.md). Current document updates only, no new model calls or product tests; Pending the commencement of approval at a specified stage, implementation will be carried out within the scope of the mandate. Could not close temporary folder: %s
