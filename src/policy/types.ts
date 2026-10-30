/**
 * Canonical policy data model.  This is deliberately independent from pages and
 * from any one club's workflow: a policy is evidence plus scope, while a
 * workflow is only one consumer of that evidence.
 */
export type EvidenceLevel = "public" | "user_provided" | "access_restricted" | "historical"
export type PolicyScope = "university" | "tempe" | "campus_or_venue" | "college_local" | "unknown"
export type PolicyPhase = "start" | "plan" | "venue" | "special" | "funding" | "safety" | "close"
export type DeadlineUnit = "calendar_days" | "business_days"

export interface PolicySource {
  /** Stable imported source key, never a display label. */
  id: string
  title: string
  url: string | null
  evidence: EvidenceLevel
  scope: PolicyScope
  capturedOn: string
  /** The original snapshot filename(s), kept for audit and re-import. */
  snapshot: string
}

/** Facts supplied by an event form or a future workflow. Missing facts never imply applicability. */
export interface PolicyContext {
  campus?: string
  onCampus?: boolean
  publicEvent?: boolean
  headcount?: number
  food?: "none" | "provider" | "onsite"
  alcohol?: boolean
  paidSpeaker?: boolean
  musicOrStreaming?: boolean
  drone?: boolean
  raffle?: boolean
  minors?: boolean
  travel?: "none" | "domestic" | "international"
  funding?: "none" | "usg_tempe" | "usg_west" | "graduate" | "other"
  venue?: "student_union" | "outdoor" | "other" | "unknown"
}

export interface PolicyCondition {
  field: keyof PolicyContext
  equals?: string | boolean
  min?: number
}

export interface PolicyDeadline {
  kind: "hard" | "recommended"
  daysBeforeEvent: number
  unit: DeadlineUnit
  /** Official requirements are never scaled by event size. */
  scalable?: boolean
}

export interface PolicyRecord {
  id: string
  phase: PolicyPhase
  title: string
  /** Compact grounded statement used by AI and workflow generation. */
  requirement: string
  conditions: PolicyCondition[]
  sources: string[]
  deadline?: PolicyDeadline
  /** Explicit gates prevent an engine from silently scheduling an invalid path. */
  gates?: string[]
  evidenceNeeded: string[]
  status: "verified_snapshot" | "needs_live_confirmation"
  supersedes?: string[]
}

export interface PolicyCatalog {
  version: string
  importedOn: string
  sources: PolicySource[]
  policies: PolicyRecord[]
}
