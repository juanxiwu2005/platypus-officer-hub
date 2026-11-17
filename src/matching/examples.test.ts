import { describe, expect, it } from "vitest"
import { createMatchingExample } from "./examples"
import { decodeMatchingState, encodeMatchingState, parseMatchingState } from "./repository"
import { getMatchingCandidates, resolveMatchingAssignment } from "./resolve"

describe("fictional matching examples across two workflows", () => {
  const example = createMatchingExample()

  it("uses a real command-built, serializable configuration and 12 fictional members", () => {
    expect(example.references.members).toHaveLength(12)
    expect(new Set(example.state.requirements.map(x => x.workflowId)).size).toBe(2)
    expect(example.state.events.length).toBeGreaterThan(0)
    expect(parseMatchingState(example.state, example.references.organizationId)).toEqual(example.state)
    expect(decodeMatchingState(encodeMatchingState(example.state), example.references.organizationId)).toEqual(example.state)
  })

  for (const scenario of example.scenarios) {
    it(scenario.title, () => {
      const state = scenario.state ?? example.state
      const before = JSON.stringify({ state, references: example.references })
      const resolution = resolveMatchingAssignment(state, example.references, scenario.request)
      expect(resolution.reason).toBe(scenario.expectedReason)
      expect(resolution.ownerId).toBe(scenario.expectedOwnerId)
      expect(resolution.suggestedOwnerId).toBe(scenario.expectedSuggestedOwnerId)
      expect(JSON.stringify({ state, references: example.references })).toBe(before)
      const reverse = {
        ...example.references,
        roles: [...example.references.roles].reverse(),
        members: [...example.references.members].reverse(),
      }
      expect(resolveMatchingAssignment({
        ...state,
        responsibilities: [...state.responsibilities].reverse(),
        memberships: [...state.memberships].reverse(),
        requirements: [...state.requirements].reverse(),
        roleResponsibilities: [...state.roleResponsibilities].reverse(),
        memberResponsibilities: [...state.memberResponsibilities].reverse(),
      }, reverse, scenario.request)).toEqual(resolution)
    })
  }

  it("does not duplicate a member found by role and direct inclusion, or trust missing qualifications", () => {
    const candidates = getMatchingCandidates(example.state, example.references, "duty-space")
    expect(candidates.filter(x => x.memberId === "member-02")).toHaveLength(1)
    expect(candidates.find(x => x.memberId === "member-04")?.reasons).toContain("qualification_unknown")
    expect(candidates.find(x => x.memberId === "member-11")?.reasons).toContain("availability_unknown")
    expect(candidates.find(x => x.memberId === "member-12")?.reasons).toContain("inactive")
  })
})
