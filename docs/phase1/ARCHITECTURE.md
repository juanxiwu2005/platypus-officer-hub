# Platypus AI-native Phase 1: Bottom Design

2026-10-25 Codex Juanxi has confirmed the production of prototypes; Formal access awaits.

## This Border

It's a paper, Phase. 3Prototype One Product Reconstructing, Phase of this paper 1This is the development phase.

This delivers `/#/phase1` with three clickable images and two type of process preview. `src/phase1/model.ts` is an independent front-end demonstration model, **is not a formal data model that has access to old applications**. Do not add live APIs, accounts, databases, remove old pages and change main. All information messageal; No research data were read or submitted.

The order of complete realization and testing of models, APIs, migrations, etc. in the original reminder and " image finishes and stops " , is based on Design-First Checkpoint: description of the target model first, validation of the interaction with a local presentation logic first, image acceptance before official storage/API migration with old data. The demonstration validation report should not be used to produce acceptance.

## Six-tier target structure.

| Layer | Responsibility | Status at this stage |
|---|---|---|
| Data Governance & Safety | Organisational segregation, accounts, minimization, sources, auditing, retention and private data boundaries | Design; Local storage policy demonstration |
| AI Core | AIR, router, organizational search, tool call, ChangeSet, missions, audit, uncertainty | Design; No new vendor calls |
| Organization Intelligence | Standard processes, ASU rules, Constitution, custom role, capability mapping, process variations | Frontend Presentation |
| Activity-centered model | (a) The sole operational base of the job; Tasks, funds, materials, approvals, evidence, decisions and handoff summaries | TwoFictional Preview |
| Activity kinds | member_activity / executive_obligation | Shared workspace with different process lengths |
| Single AI Entry | Target input, one question at a time, recommendation review, implementation tracking | The home page shares the same composer with the workspace; Each image shows only one. |

## Target data model (design specifications before formal access)

All organizational business records must carry `organizationId` or be capable of validating the organization without prejudice to the necessary parent. The account access is judged by the organization ' s membership relationship and cannot be trusted with the request for self-filling. Information versions must be consistent with those at the time of review, and outdated recommendations need to be re-examined.

| Object | Fields and Constraints |
|---|---|
| Capability | id、canonicalName、description、status(active/deprecated)、mergedIntoId、aliases（Press organizationId）；Steady number does not change by name；Addable、Merge、Change name and disable，Disable non-delete history references |
| Role | id、organizationId、title、holderAccountIds、status；Freedom of job name，RoleFunction Just... legacy adapter Exists |
| RoleCapabilityAssignment | id、organizationId、roleId、capabilityId、responsibility(owner/approver/support/informed)、scope、source(manual/constitution/ai_suggestion)、confirmedByUser、confirmedBy、confirmedAt、evidenceSourceId、confidence、notes；Detailed role duties are not equal to account management |
| OrganizationContext | organizationId、profile、mission、customRoles、confirmedRoleCapabilityMap、standardProcessPreferences、workflowVariations、constitutionSourceIds、approvedMemoryIds、contextVersion、lastReviewedAt、reviewedBy、status(draft/confirmed/superseded) |
| KnowledgeSource | id、organizationId、type、fileName、text、accessScope、createdAt、retentionPolicy、checksum、status；Private sources are not automatically made public to organizations |
| ConstitutionSuggestion | id, eventId, sourceId, sourceChecksum, raleId/title, capabilityId, reponsibility, scope, event (source text and start/end), contact, review Status, reviewer, reviewedAt, editedfields; AI output does not contain writeable final dates |
| Activity | id、organizationId、kind(member_activity/executive_obligation)、origin(user_request/recurring/school_notice/ai_suggestion)、title、goal、context、contextVersion、status、tasks、fundingNeeds、materials、approvals、evidence、contacts、decisions、handoffSummary |
| Task | id、organizationId、activityId（You have to fill it out, Father. Activity Must exist and belong to the same organization.）、title、requiredCapability、scope、ownerRoleId、ownerAccountId、approverRoleId、supportRoleIds、informedRoleIds、status、risk、dependencies、scheduleAnchor、computedSchedule；Scheduled fields are written by the rule engine only |
| FundingNeed | id、activityId、source、estimatedAmount、currency、approvalRequirement、applicationStatus、evidenceIds；Record only in Activity, no bank calls, no balance/general/cross-account tracking |
| ApprovedOrganizationMemory | id、organizationId、kind、text/structuredValue、sourceIds、activityId、decisionId、confirmedBy、confirmedAt、contextVersion、accessScope；You can't access the handoff without confirmation or failure of source |
| ConversationLog | id、organizationId、accountId、accessScope、createdAt、expiresAt、messages、retentionPolicy；Separated from Source/Memory; Do not add a permanent dialogue saving at this stage |
| AuditEntry | id、organizationId、actorAccountId、action、recordId、beforeVersion、afterVersion、sourceId、changeSetId、timestamp；Log does not copy sensitive source text |

The tasks in ACT are relationships: officially storeable sub-watches and ID references to avoid saving an independently modified task separately on ACT and Tasksheet.

### Who's in charge of external communication?

Capable `relationships` has a default value of `all` using structured scope: `campus` and `companies`.

- Organization A: Marking is the owner of two categories.
- Organization B: Outreach is capus owner, External Relations owner.
- Each active range must be capable of deciphering the only main owner; Multiple owners, no owners, conflicts of origin all create a problem, not revert first rule.
- Approver, support, informed records separately. The head of operations does not automatically get back-office administration because of his or her name; Live missions are generated from account authorization.
- Changes in the division of labour need to be confirmed; The prototype retains an approved context snapshot, the editor's draft will not cover it.

### Changes in Constitution status

Uploading/ pasting the field source parsing the candidate * field check and source text location * Accept/Edit/Reject  →  Final summary.

Accept accepts only the candidate and does not directly turn the whole extraction into a fact. The source text reference must accurately correspond to the character range of the same source; It is not a factual correctness to express only the certainty of drawing judgement. (b) Manual identification of results as a priority; Users can explicitly change to recommendation. The old recommendation and the source-based review lapsed as a result of the change in content.

The current prototype uses **Local Conservative Matcher** to demonstrate only supported textual clauses; The semantic understanding of arbitrary Constitution is not supported. UI Displays Local demo interpretation. Supports .txt/.md/ paste, does not claim to support PDF, Word or OCR. Contacts with secret key shape fields are rejected; This is just a demonstration filter and cannot be used to prove that all live sensitive data are recognized.

## Onboarding

- Five steps: Basics — Constitution — Roles — Responsibilies — Review.
- Only one basic path must be filled in with an open text: a tissue name (show prefill). Mission/target has been recommended and modified in Advanced; New roles and other options are optional.
- The default question is only organizational type and process preferences; Conflict shows one at a time, and only when candidates have been accepted. (a) No more than six questions on the necessary path to non-conflict information; Complex Live Constitution should not be allowed to close the conflict for patches.
- Options are A/B/C, Big Click Area, Not Sure, Add another option; Set up for Skip.
- Save steps and drafts and the current equipment can be restored; Saves a clear hint of failure.
- Five minutes with at least 80% click completion is the test target. No first user time results, no claims to have met standards or reduced cognitive burden.
- Seven high-level competency groups are shown to be in the division of labour process; Read more on approver/support/informed in Advanced.

## Category Preview

Member: extraction of standard steps from existing `buildEventNodes()`, as recommended by capability map; Only the old fn is used as a template to migrate metadata. The default fallback name, rule allocation does not use `roleFor()`. The current example is Finder Operationss, which are not complete natural languages.

Exact: short chain of notification: verification requirements  →  confirmation of two representatives  →  briefing issued  →  recording of evidence. The preview shows a four-step template; Automatic generation that has not yet achieved the goal of openness.

All dates call unmodified `computeSchedule()`. The date anchor for an active activity is from the field of actional examples; The fixed requirements for the officer service are from the field notification/manual anchoring point. AI suggests that the object be discarded by allowlist dates and unknown fields. Timemarks such as CreatedAt are metadata recording, not task scheduling.

Review / Reject / Approve and status changes in the workspace only operate front-end previews with a clear hint on the page; Do not write to the old Store, do not treat it as a full implementation of the official ChangeSet backend.

## Repository with reserved boundary

`PreviewRepository` Read drafts, saves, approves snapshots and clears first with a localStorage demonstration. Key grouping separates the demo account, draft and approved. The retention period is... **Since last time saved 7Jesus.**, delete when reading an expired record.  There is no new persistent chat log.

This is the strategy test for field data; The browser View as, MayManage and localStorage are not production authentication or security isolation. Live online requires service-end authentication, organization of members missions, object-to-person access control, encryption and deletion policy, AIR data processing written confirmation, and IRB allowed range. These external access is not implemented at this stage.

Future `/api/org/extract-constitution`, `suggest-capabilities`, `preview-workflow`: Authentication organisations permissions  →  Minimization/ Filter  →  Read source version  →  Output schema verification  →  Return to processations+evidence+uncertative, without writing operational status. ChangeSet review/apply completed; Apply check the latest missions and contactVersion.

## Old Code Processing

| Processing | Contents |
|---|---|
| Reservations | React18/TS/Vite；All available tests; School Calendar, Schedule, Forecast, Job Recognition/State Logic |
| Reuse with Modified | Playbooks (for fn assignment read capability/scope); aiContext (reconfirmed by permissions); ChangeSet/Review/Undo (add tissue and version verification); Accessible UI controls |
| Redesign | Setup And job editor；AI Entry and new navigation；nullable eventId Task Creation；RoleFunction Operational constraints；Formal repository And migration |
| Keep Legacy | Today/Events/Tasks/Funding/Handoff/Team/Rules/Settings/Partners；Keeps old route and old data keys as they are. New shells only Home, Organization setup and Recent Activity |
| Not yet. | Full plans, live login, production database, official Handoff, new dialogue storage, old page delete, main merge |

Old limitations such as repository "three columns + AI fixed right bar + primarily dependent on Hover" do not apply to this new route; This is the direction Juanxi clearly confirmed this time. New route is isolated from the old frame to avoid changing already acceptance page.

## Migration strategy (design and pure preview inspection); No live migration performed)

1. Read only the old version of the original package, calculate the checksum, and make a back-up snapshot with schemaVersion. It can't be recovered directly by structural upgrading.
2. Old Event keeps the original ID or records steady map, and turns the memory_activity; The associated task belt needs to be active Id, retaining source, state, date anchor and dependency.
3. The independent task of determining attribution is placed in the corresponding exact_obligation; The same date cannot be the reason. The original retention package could not be identified for target/attribution, Legacy+neds_review, not discarded.
4. Old fn produces only unconfirmed capacity advice; Do not extrapolate Live Account Manager missions. Funding sub-records; Old Handoff reserved source, unconfirmed text cannot enter Approved Memory.
5. Use a steady migration ID and the migration version to create objects without repeating them; Cross-activities rely on individual reviews. (b) Atoms to switch new storage fingers after the map is confirmed; Failure restores the old snapshot.
6. Read and write the old package after the image. This `inspectMigration()` only validates classification, original record retention and pending marking.

## Visual reference

Only three main references specified by the user are used:

- Apple HIG: Tier, White, Standard Controls, Keyboard and Touchability: https://developer.apple.com/design/human-interface-guidelines/
- Monday: Task status, header, risk and scanable work view: https://monday.com/new-product
- Option Projects: Both tasks, materials, decisions and multiple views in ACTity: https://www.notion.com/product/projects

Do not copy brands or icons. icon is a simple SVG in this item. Text at least 14 px; The supporting labels may be smaller; (a) Interactive target of at least 44 px; No key Hover-only operation. The mobile phone is replaced by a top-down streamlined navigation, and the composer does not cover content in the document stream.
