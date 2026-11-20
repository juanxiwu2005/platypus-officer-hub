# Platypus AI-native Phase 1: foundational design

2026-10-25 · Codex · Juanxi approved the prototype; formal integration waits for visual acceptance.

## Scope

This is a product redesign of the thesis's Phase 3 prototype; Phase 1 here means this development stage.

Deliver three clickable screens and two workflow previews at `/#/phase1`. `src/phase1/model.ts` is an independent frontend demo model, **not the formal model already integrated into the old app**. No real APIs, accounts, databases, old-page deletion, main changes. All materials fictional; no research data read/committed.

Where the original prompt orders “complete implementation/tests of model, API, migration” versus “stop when screens are done, ”the Design-First Checkpoint governs: explain target model, validate interactions with local demo logic, then implement formal storage/APIs/migration after visual acceptance. Demo verification is not production acceptance.

## Six-layer target structure

| Layer | Responsibility | Stage status |
|---|---|---|
| Data Governance & Safety | Organization isolation, account permissions, minimization, provenance, audit, retention, private-data boundaries | Design; local retention-policy demo |
| AI Core | AIR, routing, organization retrieval, tools, ChangeSet, permissions, review, uncertainty | Design; no new provider calls |
| Organization Intelligence | Standard workflows, ASU rules, Constitution, custom roles, capability mapping, workflow differences | Frontend demo |
| Activity-centered model | Sole business root for work; contains tasks, funding, materials, approvals, evidence, decisions, handoff summary | Two fictional previews |
| Activity kinds | member_activity / executive_obligation | Shared workspace, different flow lengths |
| Single AI Entry | Goal input, one question at a time, suggestion review, execution tracking | Same composer type on homepage/workspace, only one visible per screen |

## Target data model (design specification before formal integration)

Every organization business record must carry `organizationId` or unambiguously validate it through a required parent. Access derives from authenticated account membership, not self-declared request organizationId. Source and review versions must match; stale suggestions need rereview.

| Object | Fields/constraints |
|---|---|
| Capability | id, canonicalName, description, status(active/deprecated), mergedIntoId, aliases scoped by organizationId; stable IDs survive rename; add/merge/rename/deactivate, without deleting historical references |
| Role | id, organizationId, title, holderAccountIds, status; free titles, RoleFunction only in legacy adapter |
| RoleCapabilityAssignment | id, organizationId, roleId, capabilityId, responsibility(owner/approver/support/informed), scope, source(manual/constitution/ai_suggestion), confirmedByUser, confirmedBy, confirmedAt, evidenceSourceId, confidence, notes; detailed duties do not grant account administration |
| OrganizationContext | organizationId, profile, mission, customRoles, confirmedRoleCapabilityMap, standardProcessPreferences, workflowVariations, constitutionSourceIds, approvedMemoryIds, contextVersion, lastReviewedAt, reviewedBy, status(draft/confirmed/superseded) |
| KnowledgeSource | id, organizationId, type, fileName, text, accessScope, createdAt, retentionPolicy, checksum, status; private sources do not become organization-public automatically |
| ConstitutionSuggestion | id, organizationId, sourceId, sourceChecksum, roleId/title, capabilityId, responsibility, scope, evidence (verbatim text/start/end), confidence, reviewStatus, reviewer, reviewedAt, editedFields; no writable final AI dates |
| Activity | id, organizationId, kind(member_activity/executive_obligation), origin(user_request/recurring/school_notice/ai_suggestion), title, goal, context, contextVersion, status, tasks, fundingNeeds, materials, approvals, evidence, contacts, decisions, handoffSummary |
| Task | id, organizationId, activityId (required, parent Activity must exist in same organization), title, requiredCapability, scope, ownerRoleId, ownerAccountId, approverRoleId, supportRoleIds, informedRoleIds, status, risk, dependencies, scheduleAnchor, computedSchedule; scheduling fields written only by rule engine |
| FundingNeed | id, activityId, source, estimatedAmount, currency, approvalRequirement, applicationStatus, evidenceIds; Activity-contained only, no bank, balance/general-ledger/cross-account tracking |
| ApprovedOrganizationMemory | id, organizationId, kind, text/structuredValue, sourceIds, activityId, decisionId, confirmedBy, confirmedAt, contextVersion, accessScope; unconfirmed/invalid-source memories excluded from handoff |
| ConversationLog | id, organizationId, accountId, accessScope, createdAt, expiresAt, messages, retentionPolicy; separate from Source/Memory; no new long-term chat retention this stage |
| AuditEntry | id, organizationId, actorAccountId, action, recordId, beforeVersion, afterVersion, sourceId, changeSetId, timestamp; logs do not duplicate sensitive source text |

Activity's tasks, etc. express ownership; formal storage may use child tables/ID references, avoiding independently mutable duplicate tasks in Activity and task tables.

### Who handles external relationships

`relationships` capability uses structured scope:`campus`,`companies`, optionally default `all`.

- Organization A: Marketing owns both scopes.
- Organization B: Outreach owns campus, External Relations owns companies.
- Each valid scope resolves exactly one primary owner; multiple owners, no owner, source conflicts produce a question, never fallback to first role.
- Store approver, support, informed separately. President title does not automatically grant backend administration; real rights come from account authorization.
- Responsibility changes require confirmation; prototype retains approved context snapshots, not overwritten by draft edits.

### Constitution state transitions

Upload/paste fictional source → parse candidates → field validation/source location → Accept/Edit/Reject → resolve each conflict → final summary → Confirm organization.

Accept accepts a candidate only, not the whole extraction as fact. Quotes must match exact character ranges in the same source; confidence measures extraction judgment, not factual accuracy. Human confirmations take precedence; users may explicitly switch to constitution suggestions. Changed source invalidates old suggestions/reviews derived from it.

Current prototype uses a **conservative local matcher** for supported fictional clause patterns, not arbitrary Constitution semantics. UI says Local demo extraction. Supports .txt/.md/paste, not claimed PDF, Word, OCR. Contact/key-shaped fields are rejected; demo filtering does not prove exhaustive sensitive-data detection.

## Onboarding interaction

- Five steps: Basics → Constitution → Roles → Responsibilities → Review.
- Basic path has one required open-text field: organization name, prefilled in demo. Suggested mission/goals editable under Advanced; new roles/other options optional.
- Default questions only organization type/workflow preference; one conflict at a time, only among accepted candidates. Necessary conflict-free path≤six questions; never silently drop complex real-constitution conflicts to meet a count.
- A/B/C options, large targets, Not sure, Add another option; setup may Skip.
- Save steps/drafts for current-device restoration; clearly report failure.
- Five minutes/≥80% click completion are test targets. No first-use timings, no claim achieved/reduced cognitive load.
- Seven high-level capability groups in assignment; detailed approver/support/informed under Advanced.

## Two Activity previews

Member: extract standard steps from existing `buildEventNodes()`, suggest owners from capability map; old fn is migration metadata only. Never use `roleFor()` defaults for people/roles. Example Founder Connections, not a complete natural-language planner.

Executive: fictional-notice short chain: check requirements → confirm two representatives → issue briefing → record evidence. Four-step template preview, no open-goal automatic generation.

All dates use unchanged `computeSchedule()`. Member anchors come from fictional events; executive fixed requirements from fictional notice/manual anchors. AI suggestion allowlist discards dates/unknown fields. createdAt and similar timestamps are record metadata, not scheduling.

Workspace Review / Reject / Approve/status changes affect frontend preview only, explicitly labeled; no writes to old Store, no claim of complete formal ChangeSet backend.

## Repository and retention boundaries

`PreviewRepository` uses localStorage adapter to demonstrate draft reads, saves, approved snapshots, clearing. Keys separate organizations/demo accounts, draft/approved. Retention **7 days since last save**; expired records deleted on read. No persistent chat log added.

Fictional-data policy exercise only; browser View as, mayManage, localStorage are not production authentication/security isolation. Real deployment needs server auth, membership permissions, per-object access, encryption/deletion policies, written AIR-processing confirmation, IRB-permitted scope. No such integrations this stage.

Future `/api/org/extract-constitution`,`suggest-capabilities`,`preview-workflow`: authentication → organization permission → minimization/filtering → read source version → validate output schema → return suggestions+evidence+uncertainty, without business-state writes. Separate ChangeSet review/apply modifies state; apply rechecks current rights/contextVersion.

## Existing code treatment

| Treatment | Content |
|---|---|
| Keep | React 18/TS/Vite; all tests; academic calendar, schedule, forecast, claim/status logic |
| Adapt/reuse | playbooks (fn assignment→capability/scope); aiContext (permission-filtered confirmed context); ChangeSet/Review/Undo (organization/version validation); accessible UI controls |
| Redesign | Setup/role editing; AI entry/navigation; nullable eventId task creation; RoleFunction restrictions; formal repository/migration |
| Retain legacy | Today/Events/Tasks/Funding/Handoff/Team/Rules/Settings/Partners; old routes/data keys unchanged. New shell only Home, Organization setup, recent Activity |
| Defer | Full planners, real login, production DB, formal Handoff, new chat storage, old-page deletion, main merge |

Old “three columns + fixed AI rail + mainly Hover” constraints do not apply to these new routes; Juanxi explicitly confirmed this direction. Isolate new routes from old chrome, preserving accepted pages.

## Migration strategy (design/pure-preview checks; no real migration)

1. Read original legacy package only, checksum, recoverable schemaVersion snapshot. Never reset to seed merely for schema upgrade.
2. Preserve Event IDs or stable mapping, convert to member_activity; linked tasks require activityId, preserving provenance, status, anchors, dependencies.
3. Place attributable standalone tasks in corresponding executive_obligation; shared dates alone never justify merging. Unclear goals/ownership retain original package as legacy+needs_review, not discarded.
4. Old fn yields unconfirmed capability suggestions only, no inferred real admin rights. Funding becomes Activity children; old Handoff retains sources, unconfirmed text cannot enter Approved Memory.
5. Stable migration IDs/version prevent duplicate objects on rerun; review cross-activity dependencies separately. Atomically switch storage pointer only after mapping confirmation; restore old snapshot on failure.
6. Formal adapter/actual legacy read-write after visual acceptance. `inspectMigration()` only verifies classification, original retention, pending-review marks.

## Visual references

Use only the user's three primary references:

- Apple HIG: hierarchy, whitespace, standard controls, keyboard/touch accessibility:https://developer.apple.com/design/human-interface-guidelines/
- monday: task status, owners, risk, scannable work views:https://monday.com/new-product
- Notion Projects: tasks, materials, decisions, multiple views within Activity:https://www.notion.com/product/projects

No copied branding/icons; simple project SVGs. Body≥14px, auxiliary labels may be smaller, targets about≥44px, no essential Hover-only actions. Mobile uses simplified top navigation; composer in document flow, not covering content.
