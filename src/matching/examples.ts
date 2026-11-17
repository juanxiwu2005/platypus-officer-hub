import type { MatchingCommand, MatchingMember, MatchingReferences, MatchingRequest, MatchingResolutionReason, MatchingState } from "./contracts"
import { applyMatchingCommand, createEmptyMatchingState } from "./library"

export interface MatchingExampleScenario {
  title: string
  request: MatchingRequest
  expectedReason: MatchingResolutionReason
  expectedOwnerId: string | null
  expectedSuggestedOwnerId: string | null
  state?: MatchingState
}

/** Fictional, repeatable inputs for two workflows; no product state, network or browser storage is touched. */
export function createMatchingExample(): { references: MatchingReferences; state: MatchingState; scenarios: MatchingExampleScenario[] } {
  const names = ["Morgan", "Riley", "Casey", "Jordan", "Taylor", "Skyler", "Quinn", "Drew", "Sam", "Alex", "Robin", "Jamie"]
  const references: MatchingReferences = {
    organizationId: "example-robotics-club",
    roles: [
      { id: "role-lead", title: "Team Captain" },
      { id: "role-space", title: "Facilities Crew" },
      { id: "role-code", title: "Firmware Engineers" },
      { id: "role-media", title: "Visual Studio" },
      { id: "role-showcase", title: "Robot Demonstrators" },
      { id: "role-flight", title: "Flight Demonstrators" },
    ],
    members: names.map((name, i): MatchingMember => {
      const qualifications: MatchingMember["qualifications"] = {}
      if (i === 1 || i === 2 || i === 10 || i === 11) qualifications["space-account"] = "confirmed"
      return {
        id: `member-${String(i + 1).padStart(2, "0")}`,
        name: `Demo ${name}`,
        active: true,
        availability: "available",
        qualifications,
      }
    }),
  }
  let state = createEmptyMatchingState(references.organizationId)
  let operation = 0
  const apply = (command: MatchingCommand) => {
    operation++
    state = applyMatchingCommand(state, command, {
      operationId: `example-operation-${operation}`,
      actorId: "member-01",
      at: "2026-11-16T16:00:00.000Z",
      expectedRevision: state.revision,
      references,
    })
  }
  const responsibilities = [
    ["duty-space", "Space coordination", "A confirmed space reservation", ["space-account"]],
    ["duty-code", "Firmware testing", "A tested firmware build", []],
    ["duty-visual", "Visual production", "An approved event graphic", []],
    ["duty-showcase", "Robot demonstration", "A prepared robot demonstration", []],
    ["duty-registration", "Organization renewal", "An organization renewal submission", []],
    ["duty-flight", "Flight demonstration", "An authorized flight demonstration", ["flight-authorization"]],
    ["duty-transport", "Equipment transport", "An agreed equipment transport plan", []],
  ] as const
  for (const [id, title, deliverable, requiredQualificationIds] of responsibilities) {
    apply({ type: "responsibility.create", value: {
      id, title, deliverable,
      description: `Coordinate and deliver ${title.toLowerCase()} for this fictional club.`,
      exclusions: [], requiredQualificationIds: [...requiredQualificationIds], origin: "manual",
      sources: [{ kind: "manual", sourceId: "example-planning-session", note: "Fictional demonstration data." }],
    } })
    apply({ type: "responsibility.confirm", id })
  }
  for (const [roleId, responsibilityId] of [
    ["role-space", "duty-space"], ["role-code", "duty-code"], ["role-media", "duty-visual"],
    ["role-showcase", "duty-showcase"], ["role-flight", "duty-flight"],
  ]) apply({ type: "roleBinding.upsert", value: { id: `binding-${responsibilityId}`, roleId, responsibilityId, confirmed: true } })
  for (const [roleId, memberIds] of [
    ["role-lead", ["member-01"]], ["role-space", ["member-02", "member-03", "member-04", "member-11", "member-12"]],
    ["role-code", ["member-05", "member-06"]], ["role-media", ["member-07", "member-08"]],
    ["role-showcase", ["member-09"]], ["role-flight", ["member-10"]],
  ] as const) {
    for (const memberId of memberIds) apply({ type: "membership.upsert", value: { id: `membership-${roleId}-${memberId}`, roleId, memberId, confirmed: true } })
  }
  // A second qualification path must not duplicate Riley in the candidate list.
  apply({ type: "memberBinding.upsert", value: { id: "direct-space-riley", memberId: "member-02", responsibilityId: "duty-space", decision: "include", confirmed: true } })
  apply({ type: "memberBinding.upsert", value: { id: "direct-transport-robin", memberId: "member-11", responsibilityId: "duty-transport", decision: "include", confirmed: true } })
  apply({ type: "policy.upsert", value: { id: "policy-space", responsibilityId: "duty-space", primaryMemberId: "member-02", backupMemberId: "member-03" } })
  apply({ type: "policy.upsert", value: { id: "policy-visual", responsibilityId: "duty-visual", primaryMemberId: "member-07", backupMemberId: "member-08" } })
  const steps = [
    ["meeting", "space", "Book a meeting room", "duty-space"],
    ["competition", "space", "Reserve a competition space", "duty-space"],
    ["competition", "visual", "Prepare the competition poster", "duty-visual"],
    ["competition", "firmware", "Test the firmware", "duty-code"],
    ["competition", "showcase", "Prepare the robot demonstration", "duty-showcase"],
    ["meeting", "renewal", "Renew organization registration", "duty-registration"],
    ["competition", "flight", "Prepare a flight demonstration", "duty-flight"],
    ["meeting", "transport", "Plan equipment transport", "duty-transport"],
  ] as const
  for (const [workflowId, stepId, title, responsibilityId] of steps) {
    apply({ type: "requirement.upsert", value: { id: `requirement-${workflowId}-${stepId}`, workflowId, stepId, title, responsibilityId, status: "confirmed", origin: "manual" } })
  }
  apply({ type: "requirement.upsert", value: { id: "requirement-compound", workflowId: "competition", stepId: "compound", title: "Write copy and design graphics", responsibilityId: "duty-visual", status: "needs_split", origin: "manual" } })
  const firmware = state.requirements.find(x => x.workflowId === "competition" && x.stepId === "firmware")!
  const coding = state.responsibilities.find(x => x.id === "duty-code")!
  apply({ type: "assignment.record", value: {
    id: "assignment-confirmed-firmware", taskId: "competition-firmware-confirmed", workflowId: "competition", stepId: "firmware",
    responsibilityId: coding.id, memberId: "member-06", method: "manual", status: "confirmed",
    requirementRevision: firmware.revision, responsibilityRevision: coding.revision, policyRevision: null,
  } })
  const unchangedState = state
  apply({ type: "policy.upsert", value: { id: "policy-code", responsibilityId: "duty-code", primaryMemberId: "member-05", backupMemberId: "member-06" } })
  const changedPolicyState = state
  // These are changes in live member references, not a rewrite of matching history.
  references.members = references.members.map(member => ({
    ...member,
    active: member.id !== "member-12",
    availability: member.id === "member-07" ? "unavailable" : member.id === "member-11" ? "unknown" : "available",
  }))
  const scenario = (title: string, workflowId: string, stepId: string, expectedReason: MatchingResolutionReason, owner: string | null = null, suggested: string | null = null, taskId = `${workflowId}-${stepId}`): MatchingExampleScenario => ({
    title, request: { taskId, workflowId, stepId }, expectedReason, expectedOwnerId: owner, expectedSuggestedOwnerId: suggested,
  })
  return {
    references, state: unchangedState,
    scenarios: [
      scenario("Meeting room: qualified primary", "meeting", "space", "primary_candidate", null, "member-02"),
      scenario("Competition space: shared responsibility", "competition", "space", "primary_candidate", null, "member-02"),
      scenario("Poster: primary unavailable, review backup", "competition", "visual", "backup_requires_confirmation", null, "member-08"),
      scenario("Firmware: two candidates, no default", "competition", "firmware", "multiple_candidates"),
      scenario("Robot demonstration: only one candidate", "competition", "showcase", "sole_candidate", null, "member-09"),
      scenario("Organization renewal: no candidates", "meeting", "renewal", "no_candidates"),
      scenario("Flight demonstration: qualification unknown", "competition", "flight", "qualification_unknown"),
      scenario("Equipment transport: availability unknown", "meeting", "transport", "availability_unknown"),
      scenario("Compound work: clarify or split first", "competition", "compound", "compound_requirement"),
      scenario("New work: requirement not configured", "meeting", "new-work", "requirement_missing"),
      scenario("Confirmed manual assignment stays", "competition", "firmware", "manual_assignment_preserved", "member-06", null, "competition-firmware-confirmed"),
      { ...scenario("Changed default does not replace confirmed owner", "competition", "firmware", "manual_assignment_preserved", "member-06", null, "competition-firmware-confirmed"), state: changedPolicyState },
    ],
  }
}
