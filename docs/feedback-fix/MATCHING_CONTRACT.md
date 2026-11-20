# Stage 1 responsibility-matching development contract

2026-11-16 (America/Phoenix) · Juanxi approved A2/B2/C2 stage 1.

The sole source of truth for shared types is `src/matching/contracts.ts`; error types are in `errors.ts`; the lead Agent maintains public exports in `index.ts`. Development Agents must not edit those three files, existing product data, or UI. Report gaps to the lead Agent first and continue against the same revision.

## Data Agent deliverables

File ownership: `src/matching/library.ts`, `repository.ts`, necessary private validation modules, and corresponding `.test.ts` files.

Required public functions:

```ts
createEmptyMatchingState(organizationId: string): MatchingState
applyMatchingCommand(state: MatchingState, command: MatchingCommand, context: MatchingMutationContext): MatchingState
parseMatchingState(input: unknown, expectedOrganizationId?: string): MatchingState
encodeMatchingState(state: MatchingState): string
decodeMatchingState(raw: string, expectedOrganizationId?: string): MatchingState
matchingStorageKey(organizationId: string): string
loadMatchingState(storage: MatchingStorage, organizationId: string): MatchingLoadResult
saveMatchingState(storage: MatchingStorage, state: MatchingState, expectedStoredRevision: number | null): void
```

Export `createEmptyMatchingState` and `applyMatchingCommand` from library; the rest from repository. Use `MatchingError` consistently; `loadMatchingState` returns a result preserving raw input. Do not read other browser keys, write back implicitly, or access `window` on module import.

Rules:

- Runtime-validate states/commands and check references within the current organization; strictly protect IDs, revision, status, and nonwritable fields. Updating responsibility content returns it to draft and increments its revision; reconfirming or updating without actual content changes is a no-op.
- Every actual mutation increments state revision by one and appends an event containing the full command, using supplied actor/audit time; do not calculate task dates.
- Network replay of the same operationId with exactly the same command returns original state; same ID with different command conflicts. New operations must satisfy expectedRevision.
- Responsibility, role, member, requirement, and policy references must not cross organizations. Each `(workflowId, stepId)` is unique; do not form collision-prone concatenated-string keys. One policy per responsibility, one member-responsibility decision per pair; primary and backup must differ; a backup requires a primary.
- Archive retains responsibilities, references, history; resolver stops new assignments accordingly. Merge archives source, sets mergedIntoId, reconnects configuration references, and returns target responsibility/affected requirements to awaiting confirmation; existing assignment receipts unchanged. Conflicting candidate policies or include/exclude decisions reject the entire merge; never arbitrarily choose one.
- Assignment records are append-only receipts; validate organization, task-step/responsibility references, and current revisions when recording. Resolver/future business integration reevaluates eligibility; library itself grants no permissions and writes no actual tasks.
- Storage key is fixed `platypus.matching.v1:` plus encodeURIComponent organization ID. Missing key loads empty with a fresh empty state; corrupt, unsupported-version, wrong-organization, or storage-error cases retain raw or corresponding error; never Reset demo.
- Before saving, check stored revision; expectedStoredRevision=null only for absent key. Never overwrite corrupt/future-version data; identical content may save idempotently; older snapshots cannot overwrite newer. Browser read/check/write is not atomic cross-tab CAS; explicitly document that limit in handoff.

## Resolver Agent deliverables

File ownership: `src/matching/resolve.ts`, corresponding `.test.ts`. Private fictional test data allowed; do not edit others' modules.

Required public functions:

```ts
getMatchingCandidates(state: MatchingState, references: MatchingReferences, responsibilityId: string): MatchingCandidate[]
resolveMatchingAssignment(state: MatchingState, references: MatchingReferences, request: MatchingRequest): MatchingResolution
```

Pure functions: no storage access, AI, date calculation, or old `RoleFunction` references.

Rules:

- Only confirmed roleBinding + membership or confirmed direct include provides an eligibility path. Confirmed exclude overrides every inherited path; deduplicate by member ID, sort stably. Missing member references never become eligible candidates; invalid roles cannot confer inherited eligibility.
- active=false or qualification missing means ineligible; availability=unavailable is separate; missing required qualification means unknown; availability=unknown is not automatically preselected. Unknown is never affirmative evidence.
- No valid requirement, draft/needs_split requirement, missing/draft/archived responsibility, organization mismatch, or inconsistent duplicate IDs explicitly returns unresolved; never arbitrarily choose a member.
- For confirmed receipts, find this task's latest confirmed decision by stateRevision; task/workflow/step must all match to prevent same-named steps crossing workflows. Retain if still eligible, available, and requirement/responsibility revisions unchanged; default-policy changes do not reassign. If invalid, ownerId=null, retain existingOwnerId, status needs_review; do not automatically suggest a replacement over the decision.
- Unconfirmed proposed receipts do not mean takeover. With no confirmed receipt: valid primary is only preselected; if primary unusable and backup eligible/available, return backup_requires_confirmation; with no default and exactly one eligible available candidate, preselect; multiple candidates await selection. Invalid policy references show a problem rather than arbitrarily choosing someone else.
- Keep suggestedOwnerId separate from ownerId; only a valid confirmed receipt produces ownerId. Backup suggestions have status=needs_review; primary and sole_candidate have status=suggested.
- Return candidates, evidence IDs, and revisions; input order must not affect selection. reason uses shared enum; retain explicit negative candidate reasons.

## Lead Agent deliverables

Maintain contracts/public exports; prepare readable exercises/tests using 10–20 fictional members and two distinct workflows; write stage 3 integration/old-save compatibility design. Stage 1 does not modify existing `DemoState`, schemaVersion, business entry points, AI endpoints, date engine, or pages.

Stages 2/3 are not approved. Both development Agents commit independently without pushing the integration branch; lead Agent integrates packages and arranges independent read-only Review.
