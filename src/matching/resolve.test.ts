import { describe, expect, it } from "vitest"
import type { AssignmentPolicy, MatchingAssignment, MatchingMember, MatchingReferences, MatchingRequest, MatchingState, Responsibility } from "./contracts"
import { getMatchingCandidates, resolveMatchingAssignment } from "./resolve"

const duty = (id = "d:space"): Responsibility => ({
  id, title: "Arrange laboratory access", description: "Coordinate the laboratory booking", deliverable: "Confirmed laboratory space",
  exclusions: ["University event registration"], requiredQualificationIds: ["q:booking"], origin: "manual",
  sources: [{ kind: "manual", sourceId: "fictional-setup" }], status: "confirmed", revision: 1,
})
const member = (id: string, over: Partial<MatchingMember> = {}): MatchingMember => ({
  id, name: `Fictional ${id}`, active: true, availability: "available", qualifications: { "q:booking": "confirmed" }, ...over,
})
const request: MatchingRequest = { taskId: "task:meeting:space", workflowId: "flow:meeting", stepId: "space" }

function fixture(): { state: MatchingState; references: MatchingReferences } {
  return {
    references: { organizationId: "robotics-club", roles: [{ id: "r:lab", title: "Laboratory Coordinator" }, { id: "r:robotics", title: "Robotics Captain" }], members: [member("a"), member("b"), member("c")] },
    state: {
      schemaVersion: 1, organizationId: "robotics-club", revision: 20, updatedAt: "2026-11-16T20:00:00Z",
      responsibilities: [duty(), duty("d:mechanics")],
      roleResponsibilities: [{ id: "rb:lab", roleId: "r:lab", responsibilityId: "d:space", confirmed: true }],
      memberships: [{ id: "membership:a", roleId: "r:lab", memberId: "a", confirmed: true }, { id: "membership:b", roleId: "r:lab", memberId: "b", confirmed: true }],
      memberResponsibilities: [], policies: [], assignments: [], events: [],
      requirements: [
        { id: "req:meeting", workflowId: "flow:meeting", stepId: "space", title: "Book the meeting laboratory", responsibilityId: "d:space", status: "confirmed", origin: "manual", revision: 1 },
        { id: "req:competition", workflowId: "flow:competition", stepId: "space", title: "Book the competition laboratory", responsibilityId: "d:space", status: "confirmed", origin: "manual", revision: 1 },
      ],
    },
  }
}

const policy = (over: Partial<AssignmentPolicy> = {}): AssignmentPolicy => ({ id: "policy:space", responsibilityId: "d:space", primaryMemberId: "a", backupMemberId: "b", revision: 1, ...over })
const receipt = (over: Partial<MatchingAssignment> = {}): MatchingAssignment => ({
  id: "assignment:first", taskId: request.taskId, workflowId: request.workflowId, stepId: request.stepId,
  responsibilityId: "d:space", memberId: "a", method: "manual", status: "confirmed", requirementRevision: 1,
  responsibilityRevision: 1, policyRevision: 1, stateRevision: 5, actorId: "fictional-manager", at: "2026-11-16T20:00:00Z", ...over,
})
const resolve = ({ state, references }: ReturnType<typeof fixture>, task = request) => resolveMatchingAssignment(state, references, task)

describe("matching candidates", () => {
  it("uses organization-owned responsibilities and confirmed relationships without fixed job functions", () => {
    const f = fixture()
    expect(getMatchingCandidates(f.state, f.references, "d:space").map(c => [c.memberId, c.eligibility])).toEqual([["a", "eligible"], ["b", "eligible"]])
    f.state.roleResponsibilities[0].confirmed = false
    expect(getMatchingCandidates(f.state, f.references, "d:space")).toEqual([])
    f.state.memberResponsibilities = [{ id: "direct:c", memberId: "c", responsibilityId: "d:space", decision: "include", confirmed: true }]
    expect(getMatchingCandidates(f.state, f.references, "d:space").map(c => c.memberId)).toEqual(["c"])
  })

  it("requires confirmed membership and direct inclusion", () => {
    const f = fixture()
    f.state.memberships.forEach(m => { m.confirmed = false })
    f.state.memberResponsibilities = [{ id: "direct:c", memberId: "c", responsibilityId: "d:space", decision: "include", confirmed: false }]
    expect(getMatchingCandidates(f.state, f.references, "d:space")).toEqual([])
  })

  it("deduplicates a person reached by several positions and a direct inclusion", () => {
    const f = fixture()
    f.state.roleResponsibilities.push({ id: "rb:robotics", roleId: "r:robotics", responsibilityId: "d:space", confirmed: true })
    f.state.memberships.push({ id: "membership:a:robotics", roleId: "r:robotics", memberId: "a", confirmed: true })
    f.state.memberResponsibilities.push({ id: "direct:a", memberId: "a", responsibilityId: "d:space", decision: "include", confirmed: true })
    const candidates = getMatchingCandidates(f.state, f.references, "d:space")
    expect(candidates).toHaveLength(2)
    expect(candidates[0]).toMatchObject({ memberId: "a", roleIds: ["r:lab", "r:robotics"], via: ["role", "direct"] })
  })

  it("a confirmed personal exclusion overrides all inherited positions", () => {
    const f = fixture()
    f.state.memberResponsibilities.push({ id: "exclude:a", memberId: "a", responsibilityId: "d:space", decision: "exclude", confirmed: true })
    expect(getMatchingCandidates(f.state, f.references, "d:space")[0]).toMatchObject({ memberId: "a", eligibility: "ineligible", reasons: ["excluded"] })
    expect(resolve(f)).toMatchObject({ reason: "sole_candidate", ownerId: null, suggestedOwnerId: "b" })
  })

  it("does not use an obsolete position as an inheritance path", () => {
    const f = fixture()
    f.references.roles = []
    expect(getMatchingCandidates(f.state, f.references, "d:space")).toEqual([])
    expect(resolve(f).reason).toBe("no_candidates")
  })

  it("retains missing members as ineligible explanations, never eligible defaults", () => {
    const f = fixture()
    f.references.members = f.references.members.filter(m => m.id !== "a")
    expect(getMatchingCandidates(f.state, f.references, "d:space")[0]).toMatchObject({ memberId: "a", memberName: null, eligibility: "ineligible", reasons: ["member_missing"] })
    f.state.policies.push(policy())
    expect(resolve(f)).toMatchObject({ reason: "policy_invalid", suggestedOwnerId: null })
  })

  it("keeps inactive, unavailable, unknown and missing qualifications separate", () => {
    const f = fixture()
    f.references.members[0] = member("a", { active: false, availability: "unavailable", qualifications: { "q:booking": "missing" } })
    f.references.members[1] = member("b", { availability: "unknown", qualifications: {} })
    expect(getMatchingCandidates(f.state, f.references, "d:space")).toMatchObject([
      { memberId: "a", eligibility: "ineligible", reasons: ["inactive", "unavailable", "qualification_missing"] },
      { memberId: "b", eligibility: "unknown", reasons: ["availability_unknown", "qualification_unknown"] },
    ])
    expect(resolve(f)).toMatchObject({ reason: "qualification_unknown", suggestedOwnerId: null })
  })

  it("does not accept a qualification inherited from an object prototype", () => {
    const f = fixture()
    f.state.responsibilities[0].requiredQualificationIds = ["constructor"]
    f.references.members.forEach(m => { m.qualifications = {} })
    expect(getMatchingCandidates(f.state, f.references, "d:space").every(c => c.reasons.includes("qualification_unknown"))).toBe(true)
    expect(resolve(f).suggestedOwnerId).toBeNull()
  })
})

describe("C2 recommendations", () => {
  it("leaves several qualified people for an explicit selection", () => {
    expect(resolve(fixture())).toMatchObject({ status: "unassigned", reason: "multiple_candidates", ownerId: null, suggestedOwnerId: null })
  })

  it("preselects a valid primary without recording acceptance", () => {
    const f = fixture()
    f.state.policies.push(policy({ primaryMemberId: "b", backupMemberId: "a" }))
    expect(resolve(f)).toMatchObject({ status: "suggested", reason: "primary_candidate", ownerId: null, suggestedOwnerId: "b", policyRevision: 1 })
  })

  it.each(["unavailable", "inactive", "qualification_missing", "excluded"])("recommends an eligible backup for a primary that is %s, requiring confirmation", condition => {
    const f = fixture()
    f.state.policies.push(policy())
    if (condition === "unavailable") f.references.members[0].availability = "unavailable"
    if (condition === "inactive") f.references.members[0].active = false
    if (condition === "qualification_missing") f.references.members[0].qualifications["q:booking"] = "missing"
    if (condition === "excluded") f.state.memberResponsibilities.push({ id: "exclude:a", memberId: "a", responsibilityId: "d:space", decision: "exclude", confirmed: true })
    expect(resolve(f)).toMatchObject({ status: "needs_review", reason: "backup_requires_confirmation", ownerId: null, suggestedOwnerId: "b" })
  })

  it("does not silently replace a configured unavailable primary with an unconfigured third person", () => {
    const f = fixture()
    f.state.policies.push(policy({ backupMemberId: null }))
    f.references.members[0].availability = "unavailable"
    expect(resolve(f)).toMatchObject({ reason: "no_available_candidates", suggestedOwnerId: null })
  })

  it("preselects a sole qualified person when no default is configured", () => {
    const f = fixture()
    f.references.members[1].qualifications = { "q:booking": "missing" }
    expect(resolve(f)).toMatchObject({ status: "suggested", reason: "sole_candidate", ownerId: null, suggestedOwnerId: "a" })
  })

  it("an explicitly empty policy still permits sole-candidate selection", () => {
    const f = fixture()
    f.state.policies.push(policy({ primaryMemberId: null, backupMemberId: null }))
    f.state.memberships = f.state.memberships.slice(0, 1)
    expect(resolve(f).reason).toBe("sole_candidate")
  })

  it.each([
    policy({ primaryMemberId: "missing" }),
    policy({ backupMemberId: "c" }),
    policy({ backupMemberId: "a" }),
    policy({ primaryMemberId: null, backupMemberId: "b" }),
  ])("fails closed on invalid primary/backup policies %#", invalidPolicy => {
    const f = fixture()
    f.state.policies.push(invalidPolicy)
    expect(resolve(f)).toMatchObject({ reason: "policy_invalid", ownerId: null, suggestedOwnerId: null })
  })

  it.each(["unavailable", "unknown"] as const)("does not treat %s availability as available", availability => {
    const f = fixture()
    f.references.members.forEach(m => { m.availability = availability })
    expect(resolve(f)).toMatchObject({ reason: availability === "unknown" ? "availability_unknown" : "no_available_candidates", ownerId: null, suggestedOwnerId: null })
  })
})

describe("requirements and organization boundaries", () => {
  it.each(["draft", "needs_split"] as const)("does not assign a %s requirement", status => {
    const f = fixture()
    f.state.requirements[0].status = status
    expect(resolve(f)).toMatchObject({ reason: status === "draft" ? "requirement_unconfirmed" : "compound_requirement", suggestedOwnerId: null })
  })

  it.each(["draft", "archived"] as const)("does not assign a %s responsibility", status => {
    const f = fixture()
    f.state.responsibilities[0].status = status
    expect(resolve(f).reason).toBe(status === "draft" ? "responsibility_unconfirmed" : "responsibility_archived")
    expect(getMatchingCandidates(f.state, f.references, "d:space")).toEqual([])
  })

  it("distinguishes absent requirements from missing responsibility mappings", () => {
    const f = fixture()
    expect(resolve(f, { ...request, workflowId: "missing-flow" }).reason).toBe("requirement_missing")
    f.state.requirements[0].responsibilityId = null
    expect(resolve(f).reason).toBe("responsibility_missing")
  })

  it("matches workflow and step as a tuple, including identifiers containing separators", () => {
    const f = fixture()
    f.state.requirements = [
      { ...f.state.requirements[0], id: "one", workflowId: "a:b", stepId: "c" },
      { ...f.state.requirements[0], id: "two", workflowId: "a", stepId: "b:c", responsibilityId: "d:mechanics" },
    ]
    expect(resolve(f, { ...request, workflowId: "a:b", stepId: "c" }).requirementId).toBe("one")
    expect(resolve(f, { ...request, workflowId: "a", stepId: "b:c" }).requirementId).toBe("two")
  })

  it("rejects organization mismatches", () => {
    const f = fixture()
    f.references.organizationId = "other-club"
    expect(resolve(f)).toMatchObject({ reason: "invalid_reference", candidates: [], ownerId: null, suggestedOwnerId: null })
    expect(getMatchingCandidates(f.state, f.references, "d:space")).toEqual([])
  })

  it("fails closed for duplicate identity or ambiguous requirement records", () => {
    const duplicateMember = fixture()
    duplicateMember.references.members.push(member("a", { name: "Different member" }))
    expect(resolve(duplicateMember).reason).toBe("invalid_reference")
    const duplicateRequirement = fixture()
    duplicateRequirement.state.requirements.push({ ...duplicateRequirement.state.requirements[0], id: "conflicting-requirement", responsibilityId: "d:mechanics" })
    expect(resolve(duplicateRequirement).reason).toBe("invalid_reference")
    const duplicateDuty = fixture()
    duplicateDuty.state.responsibilities.push({ ...duty(), title: "Conflicting duty" })
    expect(resolve(duplicateDuty).reason).toBe("invalid_reference")
  })

  it("fails closed on malformed runtime references instead of interpreting them as eligibility", () => {
    const f = fixture()
    f.references.members[0].active = "yes" as unknown as boolean
    expect(resolve(f).reason).toBe("invalid_reference")
    expect(resolveMatchingAssignment(null as unknown as MatchingState, f.references, request).reason).toBe("invalid_reference")
  })
})

describe("confirmed assignment protection", () => {
  it("preserves manual decisions when the policy chooses someone else or is removed", () => {
    const f = fixture()
    f.state.assignments.push(receipt())
    f.state.policies.push(policy({ primaryMemberId: "b", backupMemberId: "a", revision: 9 }))
    expect(resolve(f)).toMatchObject({ status: "preserved", reason: "manual_assignment_preserved", ownerId: "a", existingOwnerId: "a", suggestedOwnerId: null })
    f.state.policies = []
    expect(resolve(f).ownerId).toBe("a")
  })

  it("preserves a confirmed automatic decision as well as a manual one", () => {
    const f = fixture()
    f.state.assignments.push(receipt({ method: "default" }))
    expect(resolve(f)).toMatchObject({ status: "preserved", reason: "assignment_preserved", ownerId: "a" })
  })

  it("does not treat a proposal as a confirmed owner", () => {
    const f = fixture()
    f.state.assignments.push(receipt({ status: "proposed" }))
    expect(resolve(f)).toMatchObject({ reason: "multiple_candidates", ownerId: null, existingOwnerId: null })
  })

  it.each(["inactive", "unavailable", "qualification", "requirement", "responsibility"])("flags a confirmed decision affected by %s without assigning its backup", changed => {
    const f = fixture()
    f.state.assignments.push(receipt())
    f.state.policies.push(policy())
    if (changed === "inactive") f.references.members[0].active = false
    if (changed === "unavailable") f.references.members[0].availability = "unavailable"
    if (changed === "qualification") f.references.members[0].qualifications = {}
    if (changed === "requirement") f.state.requirements[0].revision = 2
    if (changed === "responsibility") f.state.responsibilities[0].revision = 2
    expect(resolve(f)).toMatchObject({ status: "needs_review", reason: "assignment_needs_review", ownerId: null, existingOwnerId: "a", suggestedOwnerId: null })
  })

  it("retains the old owner when the responsibility is archived or the requirement is removed", () => {
    const f = fixture()
    f.state.assignments.push(receipt())
    f.state.responsibilities[0].status = "archived"
    expect(resolve(f)).toMatchObject({ status: "needs_review", reason: "responsibility_archived", existingOwnerId: "a", ownerId: null })
    f.state.requirements = []
    expect(resolve(f)).toMatchObject({ status: "needs_review", reason: "requirement_missing", existingOwnerId: "a", ownerId: null })
  })

  it("does not reuse a receipt from a different workflow even when task and step names coincide", () => {
    const f = fixture()
    f.state.assignments.push(receipt())
    f.state.policies.push(policy({ primaryMemberId: "b", backupMemberId: "a" }))
    expect(resolve(f, { ...request, workflowId: "flow:competition" })).toMatchObject({ status: "suggested", reason: "primary_candidate", existingOwnerId: null, suggestedOwnerId: "b" })
  })

  it("uses the latest confirmed revision, not array order, audit time or a newer unconfirmed proposal", () => {
    const f = fixture()
    f.state.assignments = [receipt({ id: "new-proposal", status: "proposed", stateRevision: 10 }), receipt({ id: "new-confirmed", memberId: "b", stateRevision: 8 }), receipt()]
    expect(resolve(f).ownerId).toBe("b")
    f.state.assignments.reverse()
    expect(resolve(f).ownerId).toBe("b")
  })

  it("rejects conflicting receipts at the same latest revision", () => {
    const f = fixture()
    f.state.assignments = [receipt(), receipt({ id: "conflicting", memberId: "b" })]
    expect(resolve(f)).toMatchObject({ reason: "invalid_reference", ownerId: null, suggestedOwnerId: null })
  })
})

describe("determinism and purity", () => {
  it("returns the same candidates and recommendation with every input list reversed", () => {
    const f = fixture()
    f.state.policies.push(policy())
    const before = JSON.stringify(f), expected = resolve(f)
    const reversed = structuredClone(f)
    for (const list of [reversed.state.responsibilities, reversed.state.roleResponsibilities, reversed.state.memberships, reversed.state.memberResponsibilities,
      reversed.state.requirements, reversed.state.policies, reversed.state.assignments, reversed.references.roles, reversed.references.members]) list.reverse()
    expect(resolve(reversed)).toEqual(expected)
    expect(JSON.stringify(f)).toBe(before)
  })
})
