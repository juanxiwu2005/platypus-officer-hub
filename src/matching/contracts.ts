/** Organization-owned matching data. No legacy role-function names participate in this contract. */
export const MATCHING_SCHEMA_VERSION = 1 as const

export type MatchingOrigin = "manual" | "ai" | "template"
export type MatchingAvailability = "available" | "unavailable" | "unknown"
export type MatchingQualificationStatus = "confirmed" | "missing" | "unknown"

/** A citation records provenance; quoted text must be checked against its source by the AI adapter. */
export interface MatchingSource {
  kind: "constitution" | "policy" | "workflow" | "manual" | "suggestion"
  sourceId: string
  quote?: string
  note?: string
}

export interface ResponsibilityFields {
  title: string
  description: string
  deliverable: string
  exclusions: string[]
  requiredQualificationIds: string[]
  origin: MatchingOrigin
  sources: MatchingSource[]
}

export interface Responsibility extends ResponsibilityFields {
  id: string
  status: "draft" | "confirmed" | "archived"
  revision: number
  /** Archived aliases retain their identity and immutable assignment history. */
  mergedIntoId?: string
}

export interface MatchingRole {
  id: string
  title: string
}

export interface MatchingMember {
  id: string
  name: string
  active: boolean
  availability: MatchingAvailability
  /** Missing entries are unknown, not evidence of permission. */
  qualifications: Record<string, MatchingQualificationStatus>
}

/** Existing organization data is provided by reference, never copied into the matching snapshot. */
export interface MatchingReferences {
  organizationId: string
  roles: MatchingRole[]
  members: MatchingMember[]
}

export interface RoleResponsibility {
  id: string
  roleId: string
  responsibilityId: string
  confirmed: boolean
}

export interface MatchingMembership {
  id: string
  roleId: string
  memberId: string
  confirmed: boolean
}

export interface MemberResponsibility {
  id: string
  memberId: string
  responsibilityId: string
  /** A confirmed exclusion overrides all inherited and direct inclusions. */
  decision: "include" | "exclude"
  confirmed: boolean
}

export interface MatchingRequirement {
  id: string
  workflowId: string
  stepId: string
  title: string
  responsibilityId: string | null
  status: "draft" | "confirmed" | "needs_split"
  origin: MatchingOrigin
  revision: number
}

export interface AssignmentPolicy {
  id: string
  responsibilityId: string
  primaryMemberId: string | null
  backupMemberId: string | null
  revision: number
}

export type MatchingAssignmentMethod = "manual" | "default" | "backup" | "sole_candidate"

/** A receipt is immutable. Later decisions append a receipt rather than rewriting history. */
export interface MatchingAssignment {
  id: string
  taskId: string
  workflowId: string
  stepId: string
  responsibilityId: string
  memberId: string
  method: MatchingAssignmentMethod
  status: "proposed" | "confirmed"
  requirementRevision: number
  responsibilityRevision: number
  policyRevision: number | null
  stateRevision: number
  actorId: string
  at: string
}

export type MatchingCommand =
  | { type: "responsibility.create"; value: ResponsibilityFields & { id: string } }
  | { type: "responsibility.update"; id: string; patch: Partial<ResponsibilityFields> }
  | { type: "responsibility.confirm"; id: string }
  | { type: "responsibility.archive"; id: string }
  | { type: "responsibility.merge"; sourceId: string; targetId: string }
  | { type: "roleBinding.upsert"; value: RoleResponsibility }
  | { type: "membership.upsert"; value: MatchingMembership }
  | { type: "memberBinding.upsert"; value: MemberResponsibility }
  | { type: "requirement.upsert"; value: Omit<MatchingRequirement, "revision"> }
  | { type: "policy.upsert"; value: Omit<AssignmentPolicy, "revision"> }
  | { type: "assignment.record"; value: Omit<MatchingAssignment, "stateRevision" | "actorId" | "at"> }

export interface MatchingMutationContext {
  operationId: string
  actorId: string
  /** Supplied audit time; matching never calculates task dates. */
  at: string
  expectedRevision: number
  references: MatchingReferences
}

export interface MatchingEvent {
  operationId: string
  actorId: string
  at: string
  revision: number
  command: MatchingCommand
}

export interface MatchingState {
  schemaVersion: typeof MATCHING_SCHEMA_VERSION
  organizationId: string
  revision: number
  updatedAt: string | null
  responsibilities: Responsibility[]
  roleResponsibilities: RoleResponsibility[]
  memberships: MatchingMembership[]
  memberResponsibilities: MemberResponsibility[]
  requirements: MatchingRequirement[]
  policies: AssignmentPolicy[]
  assignments: MatchingAssignment[]
  events: MatchingEvent[]
}

export type MatchingCandidateReason =
  | "inactive"
  | "unavailable"
  | "availability_unknown"
  | "qualification_missing"
  | "qualification_unknown"
  | "excluded"
  | "member_missing"

export interface MatchingCandidate {
  memberId: string
  memberName: string | null
  eligibility: "eligible" | "unavailable" | "unknown" | "ineligible"
  reasons: MatchingCandidateReason[]
  roleIds: string[]
  via: ("role" | "direct")[]
}

export type MatchingResolutionReason =
  | "manual_assignment_preserved"
  | "assignment_preserved"
  | "assignment_needs_review"
  | "primary_candidate"
  | "backup_requires_confirmation"
  | "sole_candidate"
  | "multiple_candidates"
  | "no_candidates"
  | "no_available_candidates"
  | "qualification_unknown"
  | "availability_unknown"
  | "responsibility_missing"
  | "responsibility_unconfirmed"
  | "responsibility_archived"
  | "requirement_missing"
  | "requirement_unconfirmed"
  | "compound_requirement"
  | "invalid_reference"
  | "policy_invalid"

export interface MatchingRequest {
  taskId: string
  workflowId: string
  stepId: string
}

export interface MatchingResolution {
  status: "preserved" | "suggested" | "needs_review" | "unassigned"
  reason: MatchingResolutionReason
  /** An already-confirmed, still-valid owner only; a suggestion never populates this field. */
  ownerId: string | null
  existingOwnerId: string | null
  suggestedOwnerId: string | null
  candidates: MatchingCandidate[]
  requirementId: string | null
  requirementRevision: number | null
  responsibilityId: string | null
  responsibilityRevision: number | null
  policyRevision: number | null
}

/** Minimal injected storage port: no module import reads or writes browser state. */
export interface MatchingStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface MatchingLoadResult {
  status: "empty" | "loaded" | "invalid" | "unsupported" | "unavailable" | "organization_mismatch"
  state: MatchingState | null
  /** Preserve the original text for recovery; never silently replace an unreadable snapshot. */
  raw: string | null
  issues: string[]
}
