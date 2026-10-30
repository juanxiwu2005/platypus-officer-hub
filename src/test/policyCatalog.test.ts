import { describe, expect, it } from "vitest"
import { POLICY_CATALOG } from "../policy/catalog"
import { applicablePolicies, hardDeadline, policyContextForAi } from "../policy/query"

describe("policy catalog SSOT", () => {
  it("imports the 24 workflow rules with stable source references", () => {
    expect(POLICY_CATALOG.policies).toHaveLength(24)
    expect(new Set(POLICY_CATALOG.policies.map(policy => policy.id)).size).toBe(24)
    for (const policy of POLICY_CATALOG.policies) {
      expect(policy.sources.length).toBeGreaterThan(0)
      for (const source of policy.sources) expect(POLICY_CATALOG.sources.some(candidate => candidate.id === source)).toBe(true)
    }
  })

  it("routes only applicable specialist policies and preserves official deadlines", () => {
    const ids = applicablePolicies({ onCampus: true, alcohol: true, drone: true, food: "onsite" }).map(policy => policy.id)
    expect(ids).toEqual(expect.arrayContaining(["PLAN-02", "SPECIAL-02", "SPECIAL-03", "SPECIAL-06"]))
    expect(hardDeadline("SPECIAL-03")).toMatchObject({ daysBeforeEvent: 15, unit: "business_days" })
    expect(hardDeadline("FUND-02")).toBeUndefined()
  })

  it("gives AI a citation-ready, scoped policy view", () => {
    const view = policyContextForAi({ drone: true })
    const drone = view.find(policy => policy.id === "SPECIAL-06")
    expect(drone?.sources).toContainEqual(expect.objectContaining({ id: "SAFETY_R08", evidence: "public" }))
    expect(view.some(policy => policy.id === "SPECIAL-03")).toBe(false)
  })
})
