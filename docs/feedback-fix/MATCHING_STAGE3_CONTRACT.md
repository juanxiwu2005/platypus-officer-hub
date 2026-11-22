# Responsibility matching Stage 3 contract

2026-11-16 (America/Phoenix). Stage 3 approved by the user; baseline `dbfc47d`. Independent compatible-read rollback base `e370361` reads 23 and preserves unknown matching fields across feature rollback. Lead agent owns 22→23 migration/product integration; both development agents use this contract.

## Single source of truth

`DemoState.matching` is MatchingState; `org.matchingWorkspaceId` equals its organizationId; absent/legacy `org.settings.matchingMode` uses old flow, responsibilities enables new matching. `matchingContext` stores setup metadata (source/reads/decisions/audit, without duplicating matching/full roster), member qualifications/availability, and one-time human exceptions. Actual names, incumbency, and role titles still come from business people/roles; manual qualifications cannot turn former/future holders into current incumbents.

`Node.matching` identifies workflow/step/responsibility/reason. Confirmed matching receipts live in matching.assignments; explicit one-time human assignment without responsibility/eligibility appends separately to matchingContext.overrides, showing gaps without fabricating responsibilities/global qualifications. Historical people references may remain; new assignments must target current members. Setup-preview import requires explicit confirmation and current scope/member/role validation; afterward use business authority, without long-term dual writes to preview keys. Never silently import the 12-person sample into another team.

## Workflow Adapter Agent exclusive scope

All new files/tests in `src/matching/adapters/`; may add assignment-only `ownerMode?: "legacy" | "unassigned"` to `src/engine/playbooks.ts`. In unassigned mode, never use legacy ownerRoleId/roleFor to choose executors (existing RACI fields may retain old rules). No date/condition/anchor/dependency/budget-control changes. Do not edit data/store/types/forms/root matching contract. Central exports: `src/matching/adapters/index.ts`.

Public methods (implement the exact parameters below):

```ts
matchingModeEnabled(s: DemoState): boolean // Explicit mode only; even damaged config must not fall back to legacy
validOrganizationMatching(s: DemoState): MatchingState | null
organizationMatchingReferences(s: DemoState): MatchingReferences
eventMatchingWorkflowId(s: DemoState): string // club-event if org.eventWorkflow exists, otherwise seo-event
prepareMatchingNodes(s: DemoState, nodes: Node[], options?: {
  workflowId?: string
  confirmation?: MatchingConfirmation
  responsibilityIds?: Record<string, string | null>
  actorId?: string
  at?: string
}): { nodes: Node[]; matching?: MatchingState; matchingContext?: OrganizationMatchingContext }
recordChangedMatchingOwners(before: DemoState, after: DemoState, actorId: string, at: string): DemoState
canClaimMatchingTask(s: DemoState, node: Node, actorId: string): boolean
```

prepareMatchingNodes handles only supplied new nodes; legacy returns originals. When enabled without confirmed choices, clear old preassigned owner, set status=unclaimed/acceptedOn=null, and return candidate reasons; primary/sole never automatically confirms ownership. Confirmation choices identify template stepKey or standalone node.id. If choices are supplied, require confirmation.revision=current matching.revision; otherwise reject the entire batch (MatchingError conflict). Valid choices record default/backup/sole/manual receipts only for eligible, available candidates; backup requires an explicit choice. One-time manualOverride targets only current members and is recorded separately. Standalone tasks with no responsibility retain an explicit gap; AI owner fields cannot bypass matching without explicit exceptions.

Standalone workflowId=standalone, stepId=node.id; explicit responsibilityIds or choice.responsibilityId creates that one-off step requirement (confirmed only after responsibility confirmation), without changing other tasks/templates. After owner assignment, self can be accepted; others are unclaimed pending claiming. Assignment receipt confirmation is not member acceptance.

recordChangedMatchingOwners appends evidence only for actual owner changes of existing nodes in the same workspace, without fabricating historical receipts. Eligible people append matching receipts; other explicit human actions append manual overrides (including clearing owner), never rewriting history. Caller enforces original permissions; budget/role permissions unchanged. canClaimMatchingTask: designated owner claims their task; ownerless matching tasks allow only eligible, available candidates for that responsibility, with missing config unable to bypass gaps through claiming; purely legacy tasks retain old logic.

46 steps: establish an explicit item-by-item catalog (key/title/proposed responsibility boundary/composite flag/source), without nine-function assignment or fixed organization-responsibility creation. Export `STANDARD_MATCHING_STEPS` (stepId, title, description, status: "draft"|"needs_split" per item) and `standardRequirementCommands(state, workflowId?, steps?)`: generate missing-step draft/needs_split requirements with responsibilityId: null, preserving existing human links. Provide `WorkflowResponsibilityMap` in the same directory, props {state: DemoState; onCommand:(command: MatchingCommand)=>void}, for per-step custom responsibility selection, confirmation, or composite marking. Standard/custom templates use stable workflow+step identity; English UI reuses token-based existing classes. May add `docs/feedback-fix/MATCHING_STEP_COVERAGE.md` for 46 items, without claiming full external-policy coverage.

## Integration Test Agent exclusive scope

New `src/matching/stage3*.test.ts(x)`, `src/matching/stage3Fixtures.ts`, `e2e/matching-stage3.spec.ts`. Do not edit other production files/old tests; report needed assertion updates to lead first. Finish pure unit/integration fixtures before browser checks against main integration; no live AI.

Lead implements root business API `src/matching/organizationMatching.ts`:

```ts
initializeOrganizationMatching(s: DemoState): DemoState
importOrganizationMatching(s: DemoState, preview: MatchingSetupDocument): DemoState
organizationSetupDocument(s: DemoState): MatchingSetupDocument | null
saveOrganizationSetup(s: DemoState, doc: MatchingSetupDocument, expectedRevision: number): DemoState
```

New reducer actions: `matchingInitialize`, `matchingImport` {preview}, `matchingMode` {enabled: boolean}, `matchingSave` {document, expectedRevision}, `matchingCommand` {command}, `matchingLinkTask` {nodeId, responsibilityId: string|null}. Configuration is president/VP only; individual assignment keeps original entry permissions. HumanInputs adds matching?: MatchingConfirmation; NewTask adds responsibilityId?: string|null/manualOverride?:boolean; createTasks adds matchingRevision?: number. New-mode Tasks/Ask forms select one actual person per task, never duplicating tasks for multiple candidates; legacy retains explicit one-copy-per-person behavior.

Enable/import/migrate must not change existing task owners/statuses. Back up before 22→23; do not rebuild the graph. Preserve damaged/future matching config verbatim, pausing matching without resetting the organization; exports retain matching/receipts, replace restoration validates organization/structure. First organization setup must receive a new matchingWorkspaceId, without reusing config/receipts; lead integrates new-mode options into setup completion. All creation paths share the adapter; date calculation unchanged.

## Lead Agent

Lead owns data types, seed/store/settings/changeReview and UI entries (MatchingPage, useMatchingSetup, Tasks, AskPanel/ChangeCard, task details, first setup). Lead integrates archive migration, storage-error protection, synchronized save adapters, preview import, controlled qualifications, and real-task assignment editing. Independent final Review follows package completion. Run lint/build/backend types, units, relevant browser tests, and one full `npm run check`; distinguish existing/new failures and never call live models.
