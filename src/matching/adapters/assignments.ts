import type { DemoState, Node } from "../../data/types"
import { isOfficer } from "../../data/permissions"
import type { MatchingAssignmentMethod, MatchingCommand, MatchingReferences, MatchingResolution, MatchingState } from "../contracts"
import type { MatchingConfirmation, MatchingNodeLink, MatchingTaskChoice, OrganizationMatchingContext } from "../businessContracts"
import { MatchingError } from "../errors"
import { applyMatchingCommand } from "../library"
import { getMatchingCandidates, resolveMatchingAssignment } from "../resolve"
import { eventMatchingWorkflowId, matchingModeEnabled, organizationMatchingReferences, validOrganizationMatching } from "./organization"

const uuid = () => crypto.randomUUID()
const identifier = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 200 && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value)
const memberIsCurrent = (state: DemoState, memberId: string) => state.people.some(person => person.id === memberId && isOfficer(person))
const own = (value: object, key: string) => Object.hasOwn(value, key)

interface Options {
  workflowId?: string
  confirmation?: MatchingConfirmation
  responsibilityIds?: Record<string, string | null>
  actorId?: string
  at?: string
}

function apply(matching: MatchingState, command: MatchingCommand, references: MatchingReferences, actorId: string, at: string) {
  return applyMatchingCommand(matching, command, { operationId: uuid(), actorId, at, expectedRevision: matching.revision, references })
}

function touch(context: OrganizationMatchingContext, actorId: string, at: string, taskIds: string[]): OrganizationMatchingContext {
  if (context.setup.audit.length >= 5000) throw new MatchingError("invalid_input", "This prototype's setup history is full. Export it before continuing.")
  const revision = context.setup.revision + 1
  return { ...context, setup: { ...context.setup, revision, updatedAt: at, audit: [...context.setup.audit, { revision, actorId, at, kind: "commands", detail: { action: "task_assignment", taskIds } }] } }
}

function checkConfirmation(confirmation: MatchingConfirmation | undefined, matching: MatchingState | null, nodes: Node[]) {
  if (!confirmation) return
  if (!matching || !Number.isSafeInteger(confirmation.revision) || confirmation.revision !== matching.revision) throw new MatchingError("conflict", "The responsibility setup changed. Review the assignment choices again.")
  if (!confirmation.choices || typeof confirmation.choices !== "object" || Array.isArray(confirmation.choices)) throw new MatchingError("invalid_input", "Choose task assignments explicitly.")
  const keys = new Set(nodes.flatMap(node => [node.id, ...(node.stepKey ? [node.stepKey] : []), ...(node.matching?.stepId ? [node.matching.stepId] : [])]))
  for (const [key, choice] of Object.entries(confirmation.choices)) {
    if (!keys.has(key) || !choice || typeof choice !== "object" || Array.isArray(choice)
      || Object.keys(choice).some(field => !["memberId", "responsibilityId", "manualOverride"].includes(field))
      || (choice.memberId !== null && !identifier(choice.memberId))
      || (choice.manualOverride !== undefined && typeof choice.manualOverride !== "boolean")
      || (choice.responsibilityId !== undefined && choice.responsibilityId !== null && !identifier(choice.responsibilityId))) throw new MatchingError("invalid_input", "An assignment choice does not match this task group.")
  }
}

function linked(node: Node, workflowId: string): MatchingNodeLink {
  if (node.matching) {
    if (!identifier(node.matching.workflowId) || !identifier(node.matching.stepId) || node.matching.responsibilityId !== null && !identifier(node.matching.responsibilityId)) throw new MatchingError("invalid_input", "This task's responsibility link needs recovery before assigning it.")
    return { ...node.matching, workflowId: node.eventId ? node.matching.workflowId : "standalone" }
  }
  return { workflowId: node.eventId ? workflowId : "standalone", stepId: node.stepKey ?? node.id, responsibilityId: null, reason: "requirement_missing" }
}

/** Old work has no responsibility basis to infer. Preserve known event provenance without borrowing today's template. */
function unlinkedHistoricalTask(before: DemoState, after: DemoState, node: Node): MatchingNodeLink {
  if (!node.eventId) return { workflowId: "standalone", stepId: node.id, responsibilityId: null, reason: "manual_override" }
  const event = before.events.find(row => row.id === node.eventId) ?? after.events.find(row => row.id === node.eventId)
  return identifier(event?.playbookId)
    ? { workflowId: event.playbookId, stepId: node.stepKey ?? node.id, responsibilityId: null, reason: "manual_override" }
    : { workflowId: `task:${node.id}`, stepId: "work", responsibilityId: null, reason: "manual_override" }
}

function qualified(matching: MatchingState, references: MatchingReferences, link: MatchingNodeLink, memberId: string): boolean {
  const requirement = matching.requirements.find(row => row.workflowId === link.workflowId && row.stepId === link.stepId)
  if (!requirement || requirement.status !== "confirmed" || requirement.responsibilityId !== link.responsibilityId || !link.responsibilityId) return false
  return getMatchingCandidates(matching, references, link.responsibilityId).some(candidate => candidate.memberId === memberId && candidate.eligibility === "eligible")
}

function receipt(matching: MatchingState, references: MatchingReferences, node: Node, link: MatchingNodeLink, memberId: string, method: MatchingAssignmentMethod, actorId: string, at: string): MatchingState {
  const requirement = matching.requirements.find(row => row.workflowId === link.workflowId && row.stepId === link.stepId)!
  const duty = matching.responsibilities.find(row => row.id === link.responsibilityId)!
  return apply(matching, { type: "assignment.record", value: {
    id: uuid(), taskId: node.id, workflowId: link.workflowId, stepId: link.stepId, responsibilityId: duty.id, memberId, method, status: "confirmed",
    requirementRevision: requirement.revision, responsibilityRevision: duty.revision, policyRevision: matching.policies.find(row => row.responsibilityId === duty.id)?.revision ?? null,
  } }, references, actorId, at)
}

function chosenMethod(result: MatchingResolution, choice: MatchingTaskChoice): MatchingAssignmentMethod {
  if (result.suggestedOwnerId !== choice.memberId) return "manual"
  return result.reason === "primary_candidate" ? "default" : result.reason === "backup_requires_confirmation" ? "backup" : result.reason === "sole_candidate" ? "sole_candidate" : "manual"
}

/** All choices are checked against one input revision, then committed as one immutable result. */
export function prepareMatchingNodes(state: DemoState, nodes: Node[], options: Options = {}): { nodes: Node[]; matching?: MatchingState; matchingContext?: OrganizationMatchingContext } {
  if (!matchingModeEnabled(state)) return { nodes }
  if (new Set(nodes.map(node => node.id)).size !== nodes.length) throw new MatchingError("duplicate", "A task can only occur once in this creation group.")
  const original = validOrganizationMatching(state)
  checkConfirmation(options.confirmation, original, nodes)
  const workflowId = options.workflowId ?? eventMatchingWorkflowId(state)
  const actorId = options.actorId ?? state.viewerId, at = options.at ?? new Date().toISOString()
  if (!identifier(workflowId)) throw new MatchingError("invalid_input", "Choose a stable workflow identity.")
  if (!original || !state.matchingContext) return { nodes: nodes.map(node => ({ ...node, ownerId: null, status: "unclaimed", acceptedOn: null, matching: { ...linked(node, workflowId), reason: "invalid_reference" } })) }
  const references = organizationMatchingReferences(state)
  let matching = original, context = state.matchingContext
  const created = nodes.map(node => {
    let link = linked(node, workflowId)
    const choiceKey = options.confirmation && [node.id, node.stepKey, node.matching?.stepId].find(key => key && own(options.confirmation!.choices, key))
    const choice = choiceKey ? options.confirmation!.choices[choiceKey] : undefined
    const hasResponsibility = choice && own(choice, "responsibilityId") || options.responsibilityIds && own(options.responsibilityIds, node.id)
    const responsibilityId = choice && own(choice, "responsibilityId") ? choice.responsibilityId : options.responsibilityIds?.[node.id]
    // Per-task linkage never overwrites a shared template requirement.
    if (hasResponsibility && (node.stepKey === null || !node.eventId || link.workflowId.startsWith("task:"))) {
      if (responsibilityId !== null && !identifier(responsibilityId)) throw new MatchingError("invalid_input", "Choose an existing responsibility or leave the task unlinked.")
      const existing = matching.requirements.find(row => row.workflowId === link.workflowId && row.stepId === link.stepId)
      const duty = matching.responsibilities.find(row => row.id === responsibilityId)
      if (responsibilityId && !duty) throw new MatchingError("not_found", "This responsibility no longer exists.")
      matching = apply(matching, { type: "requirement.upsert", value: { id: existing?.id ?? uuid(), workflowId: link.workflowId, stepId: link.stepId, title: node.title,
        responsibilityId: responsibilityId ?? null, status: duty?.status === "confirmed" ? "confirmed" : "draft", origin: "manual" } }, references, actorId, at)
    }
    const result = resolveMatchingAssignment(matching, references, { taskId: node.id, workflowId: link.workflowId, stepId: link.stepId })
    link = { ...link, responsibilityId: result.responsibilityId, reason: result.reason }
    let ownerId: string | null = null
    if (choice?.memberId) {
      if (!memberIsCurrent(state, choice.memberId)) throw new MatchingError("not_found", "Choose a current organization member for this task.")
      if (choice.manualOverride) {
        context = { ...context, overrides: [...context.overrides, { id: uuid(), taskId: node.id, memberId: choice.memberId, responsibilityId: link.responsibilityId, actorId, at, reason: "explicit_manual_assignment" }] }
        link = { ...link, reason: "manual_override" }
      } else {
        if (!qualified(matching, references, link, choice.memberId)) throw new MatchingError("invalid_input", "This person is not a qualified, available candidate. Review the responsibility or choose an explicit one-task manual exception.")
        const method = chosenMethod(result, choice)
        matching = receipt(matching, references, node, link, choice.memberId, method, actorId, at)
        link = { ...link, reason: method === "manual" ? "manual_assignment_preserved" : "assignment_preserved" }
      }
      ownerId = choice.memberId
    }
    return { ...node, ownerId, status: ownerId === actorId ? "accepted" as const : "unclaimed" as const, acceptedOn: ownerId === actorId ? state.today : null, matching: link }
  })
  const changed = matching !== original || context !== state.matchingContext
  return { nodes: created, ...(changed ? { matching, matchingContext: touch(context, actorId, at, nodes.map(node => node.id)) } : {}) }
}

/** Called after the existing permission-checked action. Preserve actual task state and append its new ownership basis. */
export function recordChangedMatchingOwners(before: DemoState, after: DemoState, actorId: string, at: string): DemoState {
  const original = validOrganizationMatching(after)
  if (!original || !after.matchingContext || before.org.matchingWorkspaceId !== after.org.matchingWorkspaceId) return after
  const old = new Map(before.nodes.map(node => [node.id, node]))
  const oldReceipts = new Set(Array.isArray(before.matching?.assignments) ? before.matching.assignments.map(row => row.id) : [])
  const oldOverrides = new Set(Array.isArray(before.matchingContext?.overrides) ? before.matchingContext.overrides.map(row => row.id) : [])
  let matching = original, context = after.matchingContext
  const changedIds: string[] = []
  const references = organizationMatchingReferences(after)
  const nodes = after.nodes.map(node => {
    const previous = old.get(node.id)
    if (!previous || previous.ownerId === node.ownerId || (!node.matching && !previous.matching && !matchingModeEnabled(after))) return node
    if (node.ownerId && !memberIsCurrent(after, node.ownerId)) throw new MatchingError("not_found", "Choose a current organization member for this task.")
    let link = node.matching || previous.matching
      ? linked(node.matching ? node : { ...node, matching: previous.matching }, eventMatchingWorkflowId(after))
      : unlinkedHistoricalTask(before, after, node)
    const recorded = matching.assignments.some(row => !oldReceipts.has(row.id) && row.status === "confirmed" && row.taskId === node.id && row.memberId === node.ownerId && row.workflowId === link.workflowId && row.stepId === link.stepId && row.responsibilityId === link.responsibilityId)
      || context.overrides.some(row => !oldOverrides.has(row.id) && row.taskId === node.id && row.memberId === node.ownerId && row.responsibilityId === link.responsibilityId)
    if (recorded) return node
    changedIds.push(node.id)
    if (node.ownerId && memberIsCurrent(after, node.ownerId) && qualified(matching, references, link, node.ownerId)) {
      matching = receipt(matching, references, node, link, node.ownerId, "manual", actorId, at)
      link = { ...link, reason: "manual_assignment_preserved" }
    } else {
      context = { ...context, overrides: [...context.overrides, { id: uuid(), taskId: node.id, memberId: node.ownerId, responsibilityId: link.responsibilityId, actorId, at, reason: "explicit_manual_assignment" }] }
      link = { ...link, reason: "manual_override" }
    }
    return { ...node, matching: link }
  })
  return changedIds.length ? { ...after, nodes, matching, matchingContext: touch(context, actorId, at, changedIds) } : after
}

export function canClaimMatchingTask(state: DemoState, node: Node, actorId: string): boolean {
  if (!node.matching) return true
  if (!memberIsCurrent(state, actorId) || (node.ownerId !== null && node.ownerId !== actorId)) return false
  const matching = validOrganizationMatching(state)
  if (!matching) return false
  if (node.ownerId === actorId && node.matching.reason === "manual_override") {
    const overrides = state.matchingContext?.overrides
    if (!Array.isArray(overrides)) return false
    const override = overrides.filter(row => row && row.taskId === node.id).at(-1)
    return override?.memberId === actorId
  }
  const references = organizationMatchingReferences(state)
  if (node.ownerId === actorId) return resolveMatchingAssignment(matching, references, { taskId: node.id, workflowId: node.matching.workflowId, stepId: node.matching.stepId }).ownerId === actorId
  return qualified(matching, references, node.matching, actorId)
}
