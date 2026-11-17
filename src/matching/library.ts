import {
  MATCHING_SCHEMA_VERSION, type MatchingCommand, type MatchingMutationContext, type MatchingState,
  type Responsibility, type MemberResponsibility, type RoleResponsibility,
} from "./contracts"
import { MatchingError } from "./errors"
import { canonical, parseMatchingCommand, parseMatchingMutationContext, validateMatchingId, validateMatchingState } from "./validation"

export function createEmptyMatchingState(organizationId: string): MatchingState {
  return {
    schemaVersion: MATCHING_SCHEMA_VERSION, organizationId: validateMatchingId(organizationId), revision: 0, updatedAt: null,
    responsibilities: [], roleResponsibilities: [], memberships: [], memberResponsibilities: [], requirements: [], policies: [], assignments: [], events: [],
  }
}

function upsert<T extends { id: string }>(rows: T[], value: T): T[] {
  const found = rows.find(row => row.id === value.id)
  if (found && canonical(found) === canonical(value)) return rows
  return found ? rows.map(row => row.id === value.id ? value : row) : [...rows, value]
}

function foundResponsibility(state: MatchingState, id: string): Responsibility {
  const row = state.responsibilities.find(value => value.id === id)
  if (!row) throw new MatchingError("not_found", "Choose an existing responsibility.")
  return row
}

function activeResponsibility(state: MatchingState, id: string): Responsibility {
  const row = foundResponsibility(state, id)
  if (row.status === "archived") throw new MatchingError("invalid_input", "Archived responsibilities cannot receive new configuration.")
  return row
}

function roleExists(context: MatchingMutationContext, id: string) {
  if (!context.references.roles.some(row => row.id === id)) throw new MatchingError("not_found", "Choose a current organization role.")
}

function memberExists(context: MatchingMutationContext, id: string) {
  if (!context.references.members.some(row => row.id === id)) throw new MatchingError("not_found", "Choose a current organization member.")
}

function withoutRevision<T extends { revision: number }>(value: T): Omit<T, "revision"> {
  const { revision: _revision, ...rest } = value
  return rest
}

function retainIdentity<T extends { id: string }>(rows: T[], value: T, keys: (keyof T)[]) {
  const previous = rows.find(row => row.id === value.id)
  if (previous && keys.some(key => previous[key] !== value[key])) throw new MatchingError("invalid_input", "An existing record ID cannot be reused for another relationship.")
}

function uniqueValues<T>(values: T[]): T[] {
  const seen = new Set<string>()
  return values.filter(value => { const key = canonical(value); if (seen.has(key)) return false; seen.add(key); return true })
}

/** On a merge the target ID wins a duplicate pair; uncertain confirmation never becomes confirmed. */
function mergeBindings<T extends RoleResponsibility | MemberResponsibility>(rows: T[], sourceId: string, targetId: string, personKey: (row: T) => string): T[] {
  const result = new Map<string, T>()
  for (const row of [...rows].sort((a, b) => Number(b.responsibilityId === targetId) - Number(a.responsibilityId === targetId) || a.id.localeCompare(b.id))) {
    const next = row.responsibilityId === sourceId ? { ...row, responsibilityId: targetId } : row
    const key = canonical([personKey(next), next.responsibilityId])
    const old = result.get(key)
    if (old) result.set(key, { ...old, confirmed: old.confirmed && next.confirmed })
    else result.set(key, next)
  }
  return [...result.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function mergeResponsibility(state: MatchingState, sourceId: string, targetId: string): MatchingState {
  if (sourceId === targetId) throw new MatchingError("invalid_input", "Choose two different responsibilities to merge.")
  const source = foundResponsibility(state, sourceId), target = activeResponsibility(state, targetId)
  if (source.status === "archived") {
    if (source.mergedIntoId === targetId) return state
    throw new MatchingError("invalid_input", "Choose a responsibility that has not already been archived.")
  }
  const sourcePolicy = state.policies.find(row => row.responsibilityId === sourceId)
  const targetPolicy = state.policies.find(row => row.responsibilityId === targetId)
  if (sourcePolicy && targetPolicy && (sourcePolicy.primaryMemberId !== targetPolicy.primaryMemberId || sourcePolicy.backupMemberId !== targetPolicy.backupMemberId))
    throw new MatchingError("merge_conflict", "Resolve the conflicting primary or backup members before merging.")
  const decisions = new Map<string, string>()
  for (const row of state.memberResponsibilities.filter(value => value.responsibilityId === sourceId || value.responsibilityId === targetId)) {
    const previous = decisions.get(row.memberId)
    if (previous && previous !== row.decision) throw new MatchingError("merge_conflict", "Resolve conflicting include/exclude decisions before merging.")
    decisions.set(row.memberId, row.decision)
  }
  const policy = targetPolicy ?? sourcePolicy
  return {
    ...state,
    responsibilities: state.responsibilities.map(row => row.id === sourceId ? { ...row, status: "archived", mergedIntoId: targetId, revision: row.revision + 1 }
      : row.id === targetId ? { ...row, status: "draft", revision: row.revision + 1,
        exclusions: uniqueValues([...target.exclusions, ...source.exclusions]),
        requiredQualificationIds: uniqueValues([...target.requiredQualificationIds, ...source.requiredQualificationIds]),
        sources: uniqueValues([...target.sources, ...source.sources]),
      } : row),
    roleResponsibilities: mergeBindings(state.roleResponsibilities, sourceId, targetId, row => row.roleId),
    memberResponsibilities: mergeBindings(state.memberResponsibilities, sourceId, targetId, row => row.memberId),
    requirements: state.requirements.map(row => row.responsibilityId === sourceId || row.responsibilityId === targetId
      ? { ...row, responsibilityId: targetId, status: row.status === "needs_split" ? "needs_split" : "draft", revision: row.revision + 1 } : row),
    policies: [...state.policies.filter(row => row.responsibilityId !== sourceId && row.responsibilityId !== targetId),
      ...(policy ? [{ ...policy, responsibilityId: targetId, revision: policy.revision + 1 }] : [])],
    // Assignment receipts deliberately retain their original IDs, revisions and members.
  }
}

/** Pure data mutations. The future application boundary must authorize the actor before calling. */
export function applyMatchingCommand(state: MatchingState, rawCommand: MatchingCommand, rawContext: MatchingMutationContext): MatchingState {
  const current = validateMatchingState(state)
  const command = parseMatchingCommand(rawCommand)
  const context = parseMatchingMutationContext(rawContext)
  if (context.references.organizationId !== current.organizationId) throw new MatchingError("organization_mismatch", "Use references from this organization.")
  const replay = current.events.find(event => event.operationId === context.operationId)
  if (replay) {
    if (replay.actorId !== context.actorId || canonical(replay.command) !== canonical(command)) throw new MatchingError("conflict", "This operation ID was already used for a different action.")
    return state
  }
  if (context.expectedRevision !== current.revision) throw new MatchingError("conflict", "Matching data changed. Reload before applying this action.")
  let next = current
  switch (command.type) {
    case "responsibility.create": {
      if (current.responsibilities.some(row => row.id === command.value.id)) throw new MatchingError("duplicate", "This responsibility ID already exists.")
      next = { ...current, responsibilities: [...current.responsibilities, { ...command.value, status: "draft", revision: 1 }] }
      break
    }
    case "responsibility.update": {
      const old = activeResponsibility(current, command.id)
      const fields = { ...old, ...command.patch }
      if (canonical(fields) === canonical(old)) return state
      next = { ...current, responsibilities: current.responsibilities.map(row => row.id === old.id ? { ...fields, status: "draft", revision: old.revision + 1 } : row) }
      break
    }
    case "responsibility.confirm": {
      const old = activeResponsibility(current, command.id)
      if (old.status === "confirmed") return state
      if (!old.description.trim() || !old.deliverable.trim()) throw new MatchingError("invalid_input", "Describe the responsibility and its deliverable before confirming.")
      next = { ...current, responsibilities: current.responsibilities.map(row => row.id === old.id ? { ...row, status: "confirmed" } : row) }
      break
    }
    case "responsibility.archive": {
      const old = foundResponsibility(current, command.id)
      if (old.status === "archived") return state
      next = { ...current, responsibilities: current.responsibilities.map(row => row.id === old.id ? { ...row, status: "archived", revision: row.revision + 1 } : row) }
      break
    }
    case "responsibility.merge": next = mergeResponsibility(current, command.sourceId, command.targetId); break
    case "roleBinding.upsert": {
      activeResponsibility(current, command.value.responsibilityId); roleExists(context, command.value.roleId)
      retainIdentity(current.roleResponsibilities, command.value, ["roleId", "responsibilityId"])
      const rows = upsert(current.roleResponsibilities, command.value)
      if (rows === current.roleResponsibilities) return state
      next = { ...current, roleResponsibilities: rows }; break
    }
    case "membership.upsert": {
      roleExists(context, command.value.roleId); memberExists(context, command.value.memberId)
      retainIdentity(current.memberships, command.value, ["roleId", "memberId"])
      const rows = upsert(current.memberships, command.value)
      if (rows === current.memberships) return state
      next = { ...current, memberships: rows }; break
    }
    case "memberBinding.upsert": {
      activeResponsibility(current, command.value.responsibilityId); memberExists(context, command.value.memberId)
      retainIdentity(current.memberResponsibilities, command.value, ["memberId", "responsibilityId"])
      const rows = upsert(current.memberResponsibilities, command.value)
      if (rows === current.memberResponsibilities) return state
      next = { ...current, memberResponsibilities: rows }; break
    }
    case "requirement.upsert": {
      if (command.value.responsibilityId !== null) activeResponsibility(current, command.value.responsibilityId)
      if (command.value.status === "confirmed" && command.value.responsibilityId === null) throw new MatchingError("invalid_input", "A confirmed requirement needs a responsibility.")
      const old = current.requirements.find(row => row.id === command.value.id)
      if (old && (old.workflowId !== command.value.workflowId || old.stepId !== command.value.stepId)) throw new MatchingError("invalid_input", "A requirement ID must keep its workflow and step identity.")
      if (old && canonical(withoutRevision(old)) === canonical(command.value)) return state
      next = { ...current, requirements: upsert(current.requirements, { ...command.value, revision: (old?.revision ?? 0) + 1 }) }; break
    }
    case "policy.upsert": {
      activeResponsibility(current, command.value.responsibilityId)
      if (command.value.primaryMemberId !== null) memberExists(context, command.value.primaryMemberId)
      if (command.value.backupMemberId !== null) memberExists(context, command.value.backupMemberId)
      const old = current.policies.find(row => row.id === command.value.id)
      if (old && old.responsibilityId !== command.value.responsibilityId) throw new MatchingError("invalid_input", "A policy ID must keep its responsibility identity.")
      if (old && canonical(withoutRevision(old)) === canonical(command.value)) return state
      next = { ...current, policies: upsert(current.policies, { ...command.value, revision: (old?.revision ?? 0) + 1 }) }; break
    }
    case "assignment.record": {
      const value = command.value
      const responsibility = activeResponsibility(current, value.responsibilityId)
      const requirement = current.requirements.find(row => row.workflowId === value.workflowId && row.stepId === value.stepId)
      const policy = current.policies.find(row => row.responsibilityId === value.responsibilityId)
      if (current.assignments.some(row => row.id === value.id)) throw new MatchingError("duplicate", "Assignment receipts cannot be overwritten.")
      memberExists(context, value.memberId)
      if (!requirement || requirement.responsibilityId !== responsibility.id) throw new MatchingError("invalid_input", "The assignment does not match this workflow step's responsibility.")
      if (value.requirementRevision !== requirement.revision || value.responsibilityRevision !== responsibility.revision || value.policyRevision !== (policy?.revision ?? null))
        throw new MatchingError("conflict", "The assignment was prepared from an older requirement, responsibility or policy.")
      if (value.status === "confirmed" && (requirement.status !== "confirmed" || responsibility.status !== "confirmed")) throw new MatchingError("invalid_input", "Confirm the responsibility and requirement before confirming an assignment.")
      next = { ...current, assignments: [...current.assignments, { ...value, stateRevision: current.revision + 1, actorId: context.actorId, at: context.at }] }; break
    }
  }
  if (next === current) return state
  return validateMatchingState({ ...next, revision: current.revision + 1, updatedAt: context.at,
    events: [...current.events, { operationId: context.operationId, actorId: context.actorId, at: context.at, revision: current.revision + 1, command }],
  })
}
