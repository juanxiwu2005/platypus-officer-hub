# Phase I functional matching development compacts

2026-11-16 (America/Phoenix) A2/B2/C2 Phase 1 approved by Juanxi.

The only original of the shared type is `src/matching/contracts.ts`, the wrong type in `errors.ts`, and public exports are maintained by master Agent at `index.ts`. Develop Agent does not modify the three files, existing product data or UI. Gaps were identified to be fed back to the main Agent and continued with the same revision.

## Data Agent Delivery

Document ownership: `src/matching/library.ts`, `repository.ts`, necessary private authentication modules and corresponding `.test.ts` files.

The public function must be:

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

`createEmptyMatchingState` and `applyMatchingCommand` are exported from library, the rest from repository. Error uniform to `MatchingError`, `loadMatchingState` returns the result of saving source text; No other browser keys can be read, hidden writing back or access to `window` when the module is imported.

Rules:

- Status and command are validated when running, with reference to the current organization; Strictly protects ID, reference, state and non-written fields. The function is updated and turned and the duties are added; Updates that repeat confirmations or do not have actual content changes remain unchanged.
- For each actual change state review plus one, add an event containing the full command and use the incoming actor and audit time without calculating the date of the task.
- Replay the same network of operations Id with exactly the same command; Conflicting with ID orders. The new operation must meet the expected review.
- The references to responsibility, role, member, requirements and strategy cannot be organized in a coherent manner. (a) Each `(workflowId, stepId)` uniquely, keys cannot be collated by easily collapsing strings; The only thing that determines the role of a single, same member is the default and back-up. Back-up requires a primary recipient.
- Archiving retention duties, references and history, whereby the parser ceases its new assignment. Merge archive source, set mergedIntoId, re-reference the configuration and convert the target duties and affected requirements to be confirmed; There's an assignment recips not to rewrite. A conflicting candidate strategy or an include/exclude decision to reject the entire merge is not optional.
- (c) The assignment of a record as an additional reply, checking the organization, reference to mission steps/functions and current revisions; The re-qualification of candidatures is the responsibility of the resolver/future business interface, and Library itself does not grant missions or write actual tasks.
- Storage key to fix the tissue ID after `platypus.matching.v1:` plus encodeuricompont. If not available, load returns empty and new empty state; Damaged, unsupported version, organizational mismatch, stored abnormally reserved raw or corresponding error, not Reset demo.
- Only keys that do not exist are used to verify existing storage prior to saving. Damaged or new versions of data cannot be covered; The same content can be saved by the application, and older snapshots are not allowed to cover newer snapshots. The browser read/check/write is not a cross-labeled atom CAS, and this limit must be specified in the delivery.

## Resolver Agent Delivery

File ownership: `src/matching/resolve.ts`, corresponding to `.test.ts`. Private field data can be used in the test file, and no changes to others ' modules can be made.

The public function must be:

```ts
getMatchingCandidates(state: MatchingState, references: MatchingReferences, responsibilityId: string): MatchingCandidate[]
resolveMatchingAssignment(state: MatchingState, references: MatchingReferences, request: MatchingRequest): MatchingResolution
```

This is a pure function module that does not read and write storage, does not call AI, does not calculate date, does not quote old `RoleFunction`.

Rules:

- Only confirmed roleBinding + membership or confirmed direct path. Contributed exit covers all inheritance paths; Press member ID to weigh and stabilize the sorting. The missing member quote does not become a qualified candidate; Expiration of the role cannot create eligibility for succession.
- Active=false, qualified missing; Availability=unavailable separate columns; (a) Lack of the necessary qualifications to unknown; It is not automatically pre-selected. Unknown is not considered positive information.
- There are no valid requirements, drag/needs_split, missing duties/braft/archived, inconsistent or inconsistent duplicate IDs that explicitly return the unresolved result and cannot be randomly selected.
- Confirmed to press statusRevision to find the last contact decision for this task; The task/workflow/step must be matched together to prevent cross-process collusive steps. Remains eligible, available and the requirements/function revisions remain unchanged and are not reassigned as a result of default strategy changes; Upon expiry, the owner Id=null, existing OwnerId reserves, status needs_review, does not automatically recommend a replacement to cover the decision.
- Unidentified proposed return is not considered to have taken over. (b) No confirdback: valid prism preselection only; returns backup_requires_conference; Pre-selection if there is no default and only one eligible candidate; Multiple candidates to be elected. The strategy itself shows problems when the reference fails and does not choose another person at will.
- Soggested OwnerId is separated from ownedId, and only confirmed and valid returns can obtain owned Id. Backup advice status=neds_review; Primari and sole_candidate status=sumgested.
- Returns the candidate, using ID and revision, the input order changes cannot change the selection. The negative reasons for the candidacy are clearly retained with a shared list.

## Main Agent Delivery

Maintenance of contracts and public exports, preparation of 10–20 projectal members, readable exercises and tests for two different workflows, 3 access/old archive compatible design. Phase I does not modify existing `DemoState`, SchemaVersion, business portals, AI interfaces, date engines or web pages.

Phases 2, 3 not ratified. (b) Two developers, Agent, each to submit and not send integrated branches; Main Agent is integrated into the package and arranges for an independent read-only review.
