import type { MatchingCandidate, MatchingResolutionReason } from "../contracts"

export const setupId = () => crypto.randomUUID()
export const lines = (value: string) => [...new Set(value.split(/\n/).map(line => line.trim()).filter(Boolean))]
export const qualificationIds = (value: string) => [...new Set(value.split(/[,\n]/).map(line => line.trim()).filter(Boolean))]

export const resolutionLabels: Record<MatchingResolutionReason, string> = {
  manual_assignment_preserved: "The confirmed manual assignment stays.",
  assignment_preserved: "The confirmed assignment stays.",
  assignment_needs_review: "Review the existing owner; their assignment needs attention.",
  primary_candidate: "The default person is qualified and available.",
  backup_requires_confirmation: "The default person cannot take this work. Confirm the backup before assigning.",
  sole_candidate: "Only one qualified, available person can take this work.",
  multiple_candidates: "Several people can do this. Set a default person or choose when assigning.",
  no_candidates: "No members are linked to this responsibility.",
  no_available_candidates: "No linked member is currently qualified and available.",
  qualification_unknown: "Check the required qualifications before assigning.",
  availability_unknown: "Check member availability before assigning.",
  responsibility_missing: "Choose a responsibility for this step.",
  responsibility_unconfirmed: "Review and confirm this responsibility first.",
  responsibility_archived: "This responsibility is archived. Choose an active one.",
  requirement_missing: "Link this workflow step to a responsibility first.",
  requirement_unconfirmed: "Review and confirm the step's responsibility link first.",
  compound_requirement: "Split this step or clarify who coordinates its different kinds of work.",
  invalid_reference: "Some setup references are invalid. Review the configuration.",
  policy_invalid: "The default person or backup is no longer a valid candidate. Review this rule.",
}

const candidateLabels = {
  inactive: "not a current member", unavailable: "unavailable", availability_unknown: "availability unknown",
  qualification_missing: "required qualification not met", qualification_unknown: "required qualification unknown",
  excluded: "explicitly excluded", member_missing: "member no longer exists",
}
export const candidateExplanation = (candidate: MatchingCandidate) => candidate.reasons.length
  ? candidate.reasons.map(reason => candidateLabels[reason]).join("; ") : "Qualified and available"
