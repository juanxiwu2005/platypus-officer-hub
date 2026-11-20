# Job Matching Phase 3 Contract

2026-11-16（America/Phoenix）。Phase 3 approved by the user; Baseline `dbfc47d`. Separately compatible readrollback base `e370361`: able to read 23 and keep an unknown matching field without the function fallback being deleted. Main Agent is responsible for 22:23 migrations and product connections, with two developers using the same contract.

## Only original

`DemoState.matching` is Matching State; `org.matchingWorkspaceId` is the same as its organization Id; `org.settings.matchingMode` does not set or legacy to use the old process, responsibilies enable a new matching. `matchingContext` stores metadata for setting up interfaces (source/reads/decisions/audit, without repeating maching or complete raster), membership eligibility/availability and a one-time manual exception. The actual name, the status of service and the name of the role are still provided by the Operations People/Roles, and manual qualifications do not allow outgoing/to be performed.

`Node.matching` Identification of work flow/steps/functions and causes. The liability matching has been confirmed in Matching.assessments; An explicit one-time manual addition to a person without duties or qualifications showing gaps and not falsifying responsibilities or global eligibility. (a) Historical references may be retained; The actual new assignment must point to the current member. Sets the preview import to be clearly confirmed, checks the current scope/ member/ rule, and then changes to a business original without long-term double-write preview keys. The 12-person example cannot be imported into another team.

## Workflow Adapter Agent only range

`src/matching/adapters/` All new files and exclusive tests; Allows `src/engine/playbooks.ts` to add `ownerMode?: "legacy" | "unassigned"` parameters only for assignment, and unasssigned cannot call the old owner RoleId/ rollFor to select an executor (the previous rule is still available in the RACI field). Do not change dates, conditions, anchors, dependency and budget control. Data/store/types/sheets/ rootmatching compacts are not modified. Export concentrated `src/matching/adapters/index.ts`.

Public methods (specific parameters are strictly achieved as follows):

```ts
matchingModeEnabled(s: DemoState): boolean // (b) Only visible models; You can't fallback even if the configuration is damaged. legacy
validOrganizationMatching(s: DemoState): MatchingState | null
organizationMatchingReferences(s: DemoState): MatchingReferences
eventMatchingWorkflowId(s: DemoState): string // org.eventWorkflowExistence As club-eventOtherwise... seo-event
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

PrepareMatchingNodes only handles incoming new nodes and the old mode returns directly to the original node. Queued old pre-positioner, status=unclaimed/accipatedOn=null when no confirmed option becomes available; It is not automatically recognized as owner because of prism/sole. Confirms the choices' positioning using a template stepKey or an independent node.id, which must be verified by reference to Conformation.revision=current matking.revision, otherwise the whole group is rejected (MatchingError contact). Effective choice only responds to the default/backup/sole/manual for eligible available candidate records; Backup has to be visible. One-time manual Override records only for current members. Independent mandates with no assigned responsibilities also retain clear gaps; There are no explicit exceptions to allow AI ' s own field to bypass the match.

WorklowId=standalone, stepId=node.id; Create the single step when there is a visible resonsibility Ids or school.responsibilityId (confirmed after recognition of duties); No other tasks or templates are modified. (b) Once the task owner has been set up, he may be given access to him or her and give another person an unclaimed waiting to be recognized; Assigning a confirmation of return is not the same as a recognition by member.

RecordChanged MatchingOwners simply changed the living owner's basis for an existing node in the same workspace and did not falsify past records for an old task; The normal eligible candidate adds matching back and the rest of the explicit manual work adds manual overrides (including cancellations) without rewriting history. Callers are responsible for the original missions; Budget and roles permissions remain unchanged. CanClaimMatchingTask: The owner has been designated by him; A matching task without an owner only allows the function to be eligible for a candidate and cannot bypass the gap if there is no configuration; The old mandates follow the old logic.

Step 46: Creation of an item-by-line directory (key/title/Recommended boundaries/complexity/source), not assigned to nine categories of functions, and no fixed creation of student responsibilities. Export `STANDARD_MATCHING_STEPS` (each stepId, title, description, status: "draft"  | needs_split"), and `standardRequirementCommands(state, workflowId?, steps?)`: Generate missing steps to responsibilityId:null draw/nes_split requirement that does not cover an existing artificial connection. Provides a `WorkflowResponsibilityMap` component (the same directory, programs {state: DemoState; onCommand: (command: MatchingCommand)=>void}), allowing the user to select custom duties, confirm or mark them as composites, item by item. Standard and custom templates are marked with a stable workflow+step; component in English and token styles to repeat the existing class. Documents can add 46 `docs/feedback-fix/MATCHING_STEP_COVERAGE.md` records without claiming to have covered all external policies.

## Integration Test Agent only

New `src/matching/stage3*.test.ts(x)`, `src/matching/stage3Fixtures.ts`, `e2e/matching-stage3.spec.ts`. Do not edit other production documents or old tests; If the old assertion is to be updated, then it will be necessary to update the previous report. Completes a pure module/integrator and then verifies the browser on the main line. Live AI is prohibited.

Root API will be implemented by master Agent to achieve `src/matching/organizationMatching.ts`:

```ts
initializeOrganizationMatching(s: DemoState): DemoState
importOrganizationMatching(s: DemoState, preview: MatchingSetupDocument): DemoState
organizationSetupDocument(s: DemoState): MatchingSetupDocument | null
saveOrganizationSetup(s: DemoState, doc: MatchingSetupDocument, expectedRevision: number): DemoState
```

Add action: `matchingInitialize`, `matchingImport` {preview}, `matchingMode` {enabled:boolean}, `matchingSave` {documentation, expedition}, `matchingCommand` {command}, `matchingLinkTask` {nodeId, responsibleId:string | null}. All configured by president/VP; Separately assigns the original entry documents. HumanInputs add matching? NewTask, responciabilityId?:string | ull/manualOverride?: boolean; What are you doing here? The list of Tasks/Ask forms, which has been activated in the new model, selects only one actual person and multiple candidates do not generate duplicate tasks; Legacy still retains a copy of the original act.

Can not get folder: %s: %s 22  → 23 back up without reconstructing the map; The damage/future massing configuration retains the original value, suspends matching without reset organization; Export retention matching and return, replace restoration of tissues and structures. The first organizational set-up must obtain a new matchmakingWorkspaceId and cannot follow the old configuration or return to it; The new mode option is set by the main Agent access. All creation paths call the same aadapter, without changing dates.

## Lord Agent

Data types,seed/store/settings/changeReview and UI portals (MatchingPage, using MatchingSetup, Tasks, Askpanel/ChengeCard, task details, first setup) are owned by Agent. The new archive migration, storage error protection, synchronization, import previews, controlled eligibility settings and assignment editors are all integrated by the main Agent. After the completion of the development package, the final independent review. Eventually run the Lint/Build/backend type, modules, associated browsers and a complete `npm run check`, distinguishing existing failures from this addition and not running live models.
