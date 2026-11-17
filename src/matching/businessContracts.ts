import type { MatchingAvailability, MatchingQualificationStatus, MatchingResolutionReason } from "./contracts"
import type { MatchingSetupDocument } from "./setupContracts"

export interface MatchingMemberSettings {
  active: boolean
  availability: MatchingAvailability
  qualifications: Record<string, MatchingQualificationStatus>
}
export interface MatchingManualOverride {
  id: string
  taskId: string
  memberId: string | null
  responsibilityId: string | null
  actorId: string
  at: string
  reason: "explicit_manual_assignment"
}
/** The matching graph is stored only in DemoState.matching; roster names remain in existing people/roles. */
export interface OrganizationMatchingContext {
  setup: Omit<MatchingSetupDocument, "matching" | "references">
  memberSettings: Record<string, MatchingMemberSettings>
  overrides: MatchingManualOverride[]
  importedPreviewId?: string
}
export interface MatchingNodeLink {
  workflowId: string
  stepId: string
  responsibilityId: string | null
  reason: MatchingResolutionReason | "manual_override"
}
export interface MatchingTaskChoice {
  memberId: string | null
  /** A visible one-task exception. It never grants the member this responsibility globally. */
  manualOverride?: boolean
  responsibilityId?: string | null
}
export interface MatchingConfirmation {
  revision: number
  /** Event template step key, or standalone node ID. Missing choices stay unassigned. */
  choices: Record<string, MatchingTaskChoice>
}
