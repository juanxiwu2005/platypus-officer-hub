import type {
  MatchingAssignment, MatchingCandidate, MatchingCandidateReason, MatchingReferences, MatchingRequest,
  MatchingResolution, MatchingResolutionReason, MatchingState, Responsibility,
} from "./contracts"
import { MATCHING_SCHEMA_VERSION } from "./contracts"

const id = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0
const revision = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const oneOf = (value: unknown, values: readonly unknown[]) => values.includes(value)
const unique = (values: string[]) => new Set(values).size === values.length
const pair = (a: string, b: string) => JSON.stringify([a, b])
const sorted = (values: Iterable<string>) => [...values].sort()

/** Check the identities and fields this reader uses; import/command validation lives in the data layer. */
function consistent(state: MatchingState, refs: MatchingReferences): boolean {
  if (!record(state) || !record(refs) || state.schemaVersion !== MATCHING_SCHEMA_VERSION || !id(state.organizationId)
    || state.organizationId !== refs.organizationId || !Number.isSafeInteger(state.revision) || state.revision < 0) return false
  const arrays = [state.responsibilities, state.roleResponsibilities, state.memberships, state.memberResponsibilities,
    state.requirements, state.policies, state.assignments, refs.roles, refs.members]
  if (!arrays.every(xs => Array.isArray(xs) && xs.every(x => record(x) && id(x.id)) && unique(xs.map(x => x.id)))) return false
  if (!refs.roles.every(r => typeof r.title === "string")) return false
  if (!refs.members.every(m => typeof m.name === "string" && typeof m.active === "boolean"
    && oneOf(m.availability, ["available", "unavailable", "unknown"]) && record(m.qualifications)
    && Object.values(m.qualifications).every(v => oneOf(v, ["confirmed", "missing", "unknown"])))) return false
  if (!state.responsibilities.every(r => revision(r.revision) && oneOf(r.status, ["draft", "confirmed", "archived"])
    && Array.isArray(r.requiredQualificationIds) && r.requiredQualificationIds.every(id) && unique(r.requiredQualificationIds))) return false
  if (!state.roleResponsibilities.every(b => id(b.roleId) && id(b.responsibilityId) && typeof b.confirmed === "boolean")) return false
  if (!state.memberships.every(m => id(m.roleId) && id(m.memberId) && typeof m.confirmed === "boolean")) return false
  if (!state.memberResponsibilities.every(b => id(b.memberId) && id(b.responsibilityId) && typeof b.confirmed === "boolean"
    && oneOf(b.decision, ["include", "exclude"]))) return false
  if (!unique(state.memberResponsibilities.map(b => pair(b.memberId, b.responsibilityId)))) return false
  if (!state.requirements.every(r => id(r.workflowId) && id(r.stepId) && revision(r.revision)
    && (r.responsibilityId === null || id(r.responsibilityId)) && oneOf(r.status, ["draft", "confirmed", "needs_split"]))) return false
  if (!unique(state.requirements.map(r => pair(r.workflowId, r.stepId)))) return false
  if (!state.policies.every(p => id(p.responsibilityId) && revision(p.revision)
    && (p.primaryMemberId === null || id(p.primaryMemberId)) && (p.backupMemberId === null || id(p.backupMemberId)))) return false
  if (!unique(state.policies.map(p => p.responsibilityId))) return false
  return state.assignments.every(a => id(a.taskId) && id(a.workflowId) && id(a.stepId) && id(a.responsibilityId) && id(a.memberId)
    && revision(a.stateRevision) && a.stateRevision <= state.revision && revision(a.requirementRevision) && revision(a.responsibilityRevision)
    && (a.policyRevision === null || revision(a.policyRevision)) && oneOf(a.status, ["proposed", "confirmed"])
    && oneOf(a.method, ["manual", "default", "backup", "sole_candidate"]))
}

interface Path { roles: Set<string>; direct: boolean; excluded: boolean }

function candidatesFor(state: MatchingState, refs: MatchingReferences, duty: Responsibility): MatchingCandidate[] {
  const roles = new Set(refs.roles.map(r => r.id))
  const assignedRoles = new Set(state.roleResponsibilities.filter(b => b.confirmed && b.responsibilityId === duty.id && roles.has(b.roleId)).map(b => b.roleId))
  const paths = new Map<string, Path>()
  const path = (memberId: string) => {
    let found = paths.get(memberId)
    if (!found) { found = { roles: new Set(), direct: false, excluded: false }; paths.set(memberId, found) }
    return found
  }
  for (const membership of state.memberships) {
    if (membership.confirmed && assignedRoles.has(membership.roleId)) path(membership.memberId).roles.add(membership.roleId)
  }
  for (const binding of state.memberResponsibilities) {
    if (!binding.confirmed || binding.responsibilityId !== duty.id) continue
    const found = path(binding.memberId)
    if (binding.decision === "exclude") found.excluded = true
    else found.direct = true
  }
  const members = new Map(refs.members.map(m => [m.id, m]))
  return sorted(paths.keys()).map(memberId => {
    const found = paths.get(memberId)!, member = members.get(memberId)
    const reasons: MatchingCandidateReason[] = []
    if (!member) reasons.push("member_missing")
    else {
      if (!member.active) reasons.push("inactive")
      if (member.availability === "unavailable") reasons.push("unavailable")
      if (member.availability === "unknown") reasons.push("availability_unknown")
      const qualifications = duty.requiredQualificationIds.map(q => Object.hasOwn(member.qualifications, q) ? member.qualifications[q] : "unknown")
      if (qualifications.includes("missing")) reasons.push("qualification_missing")
      if (qualifications.includes("unknown")) reasons.push("qualification_unknown")
    }
    if (found.excluded) reasons.push("excluded")
    const disqualified = reasons.some(r => ["member_missing", "inactive", "qualification_missing", "excluded"].includes(r))
    const eligibility = disqualified ? "ineligible" : reasons.includes("unavailable") ? "unavailable"
      : reasons.length ? "unknown" : "eligible"
    const via: MatchingCandidate["via"] = []
    if (found.roles.size) via.push("role")
    if (found.direct) via.push("direct")
    return { memberId, memberName: member?.name ?? null, eligibility, reasons, roleIds: sorted(found.roles), via }
  })
}

/** Return every confirmed candidate path, including why a bound member cannot currently take the work. */
export function getMatchingCandidates(state: MatchingState, references: MatchingReferences, responsibilityId: string): MatchingCandidate[] {
  if (!consistent(state, references) || !id(responsibilityId)) return []
  const duty = state.responsibilities.find(r => r.id === responsibilityId)
  return duty?.status === "confirmed" ? candidatesFor(state, references, duty) : []
}

function latestConfirmed(state: MatchingState, request: MatchingRequest): { receipt: MatchingAssignment | null; conflict: boolean } {
  const matching = state.assignments.filter(a => a.status === "confirmed" && a.taskId === request.taskId
    && a.workflowId === request.workflowId && a.stepId === request.stepId)
  if (!matching.length) return { receipt: null, conflict: false }
  const lastRevision = Math.max(...matching.map(a => a.stateRevision))
  const latest = matching.filter(a => a.stateRevision === lastRevision).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  const receipt = latest[0]
  const basis = (a: MatchingAssignment) => JSON.stringify([a.memberId, a.responsibilityId, a.requirementRevision, a.responsibilityRevision, a.policyRevision, a.method])
  return { receipt, conflict: latest.some(a => basis(a) !== basis(receipt)) }
}

/** Resolve a task without mutating its state, accepting a suggestion, or changing a recorded owner. */
export function resolveMatchingAssignment(state: MatchingState, references: MatchingReferences, request: MatchingRequest): MatchingResolution {
  const result: MatchingResolution = {
    status: "unassigned", reason: "invalid_reference", ownerId: null, existingOwnerId: null, suggestedOwnerId: null,
    candidates: [], requirementId: null, requirementRevision: null, responsibilityId: null, responsibilityRevision: null, policyRevision: null,
  }
  if (!consistent(state, references) || !record(request) || !id(request.taskId) || !id(request.workflowId) || !id(request.stepId)) return result
  const existing = latestConfirmed(state, request)
  if (existing.conflict) return result
  result.existingOwnerId = existing.receipt?.memberId ?? null
  const unresolved = (reason: MatchingResolutionReason): MatchingResolution => ({ ...result, reason, status: existing.receipt ? "needs_review" : "unassigned" })
  const requirement = state.requirements.find(r => r.workflowId === request.workflowId && r.stepId === request.stepId)
  if (!requirement) return unresolved("requirement_missing")
  result.requirementId = requirement.id
  result.requirementRevision = requirement.revision
  result.responsibilityId = requirement.responsibilityId
  if (requirement.status === "needs_split") return unresolved("compound_requirement")
  if (requirement.status !== "confirmed") return unresolved("requirement_unconfirmed")
  const duty = state.responsibilities.find(r => r.id === requirement.responsibilityId)
  if (!duty) return unresolved("responsibility_missing")
  result.responsibilityRevision = duty.revision
  if (duty.status === "archived") return unresolved("responsibility_archived")
  if (duty.status !== "confirmed") return unresolved("responsibility_unconfirmed")
  result.candidates = candidatesFor(state, references, duty)
  const policy = state.policies.find(p => p.responsibilityId === duty.id)
  result.policyRevision = policy?.revision ?? null
  const eligible = result.candidates.filter(c => c.eligibility === "eligible")
  if (existing.receipt) {
    const receipt = existing.receipt
    if (receipt.responsibilityId !== duty.id || receipt.requirementRevision !== requirement.revision
      || receipt.responsibilityRevision !== duty.revision || !eligible.some(c => c.memberId === receipt.memberId)) return unresolved("assignment_needs_review")
    return { ...result, status: "preserved", reason: receipt.method === "manual" ? "manual_assignment_preserved" : "assignment_preserved", ownerId: receipt.memberId }
  }
  const suggest = (memberId: string, reason: "primary_candidate" | "sole_candidate" | "backup_requires_confirmation"): MatchingResolution => ({
    ...result, status: reason === "backup_requires_confirmation" ? "needs_review" : "suggested", reason, suggestedOwnerId: memberId,
  })
  if (policy) {
    const configured = [policy.primaryMemberId, policy.backupMemberId].filter((m): m is string => m !== null)
    if ((!policy.primaryMemberId && policy.backupMemberId) || (policy.primaryMemberId !== null && policy.primaryMemberId === policy.backupMemberId)
      || configured.some(memberId => !references.members.some(m => m.id === memberId) || !result.candidates.some(c => c.memberId === memberId))) return unresolved("policy_invalid")
    if (policy.primaryMemberId) {
      if (eligible.some(c => c.memberId === policy.primaryMemberId)) return suggest(policy.primaryMemberId, "primary_candidate")
      if (policy.backupMemberId && eligible.some(c => c.memberId === policy.backupMemberId)) return suggest(policy.backupMemberId, "backup_requires_confirmation")
      // A configured owner failing a condition must not quietly turn into some unrelated sole candidate.
      return unresolved(unavailableReason(result.candidates.filter(c => configured.includes(c.memberId))))
    }
  }
  if (eligible.length === 1) return suggest(eligible[0].memberId, "sole_candidate")
  if (eligible.length > 1) return unresolved("multiple_candidates")
  return unresolved(unavailableReason(result.candidates))
}

function unavailableReason(candidates: MatchingCandidate[]): MatchingResolutionReason {
  if (!candidates.length) return "no_candidates"
  if (candidates.some(c => c.reasons.includes("qualification_unknown"))) return "qualification_unknown"
  if (candidates.some(c => c.reasons.includes("availability_unknown"))) return "availability_unknown"
  return "no_available_candidates"
}
