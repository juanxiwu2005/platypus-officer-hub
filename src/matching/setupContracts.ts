import type { MatchingCommand, MatchingMembership, MatchingReferences, MatchingState } from "./contracts"

/** Stage 2 is an isolated, local setup preview; it does not change actual tasks or team records. */
export const MATCHING_SETUP_VERSION = 1 as const
export const MATCHING_SETUP_KEY = "platypus.matching.setup.v1"
export const MATCHING_TEXT_LIMIT = 60_000

export interface MatchingExtractionRequest {
  part: "responsibilities"
  requestId: string
  sourceId: string
  text: string
  roles: { id: string; title: string }[]
  existingResponsibilities: { id: string; title: string; description: string; deliverable: string }[]
  /** An explicit partial retry; an empty array asks for general responsibilities only. */
  targetRoleIds?: string[]
}

export interface MatchingResponsibilityProposal {
  id: string
  title: string
  description: string
  deliverable: string
  exclusions: string[]
  requiredQualificationIds: string[]
  roleIds: string[]
  source: { kind: "constitution" | "suggestion"; sourceId: string; quote: string; verified: boolean }
}

export interface MatchingExtractionResponse {
  part: "responsibilities"
  requestId: string
  sourceId: string
  proposals: MatchingResponsibilityProposal[]
  warnings: string[]
  model?: string
  provider?: string
}

export interface MatchingSetupSource { name: string; text: string }
export interface MatchingSetupRead {
  id: string
  at: string
  actorId: string
  request: MatchingExtractionRequest
  status: "pending" | "completed" | "failed" | "stopped" | "stale" | "interrupted"
  response: MatchingExtractionResponse | null
  message: string | null
}
export interface MatchingProposalDecision {
  readId: string
  proposalId: string
  decision: "accepted" | "rejected"
  responsibilityId: string | null
  actorId: string
  at: string
}
export interface MatchingSetupAudit {
  revision: number
  actorId: string
  at: string
  kind: "commands" | "references" | "source" | "read" | "decision" | "example"
  detail: unknown
}
export interface MatchingSetupDocument {
  version: typeof MATCHING_SETUP_VERSION
  id: string
  /** Scope from current legacy workspace identity + roster, without changing legacy data. */
  contextKey: string
  revision: number
  updatedAt: string
  matching: MatchingState
  references: MatchingReferences
  source: MatchingSetupSource
  reads: MatchingSetupRead[]
  decisions: MatchingProposalDecision[]
  audit: MatchingSetupAudit[]
}

export interface MatchingSetupViewProps {
  document: MatchingSetupDocument
  canEdit: boolean
  aiEnabled?: boolean
  busy: boolean
  error: string | null
  /** Mutations are validated and persisted by the controller before its document changes. */
  onCommand: (command: MatchingCommand) => void
  onReferencesChange: (references: MatchingReferences) => void
  onSourceChange: (source: MatchingSetupSource) => void
  onRead: (source: MatchingSetupSource, targetRoleIds?: string[]) => void
  onStop: () => void
  onProposal: (readId: string, proposalId: string, decision: "accepted" | "rejected") => void
  onExample: () => void
  onExport: () => void
}

export interface MatchingSetupInitial {
  references: MatchingReferences
  memberships: MatchingMembership[]
  contextKey: string
  /** Supplied only for an explicitly opened fictional example. */
  matching?: MatchingState
}
