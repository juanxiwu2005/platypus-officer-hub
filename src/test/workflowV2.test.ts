import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { buildEventNodes, stepsFor } from "../engine/playbooks"
import type { Event } from "../data/types"

const event = (checks: Event["checks"], headcount = 80): Event => ({ id: "v2", name: "V2", date: "2027-03-20", type: "social", headcount, venue: "campus", food: "none", funding: "none", speaker: false, checks, goalId: null, playbookId: "asu-event-v2" })
const blue = ["plan", "venuechoice", "registry", "venue", "materials", "checkin", "headcount", "eventday", "thankyou", "feedback", "postmarketing", "photos", "spending", "attendance", "financeRecord", "documentation"]

describe("ASU event workflow v2", () => {
  it("keeps every blue lifecycle node for a basic event", () => {
    const keys = stepsFor(event({})).map(s => s.key)
    expect(keys).toEqual(expect.arrayContaining(blue))
    expect(keys).not.toContain("drone")
    expect(keys).not.toContain("alcohol")
  })
  it("creates only the selected situation routes and makes 250+ a school approval route", () => {
    const keys = stepsFor(event({ drone: true, alcohol: true, funding: true, food: true, externalFood: true }, 250)).map(s => s.key)
    expect(keys).toEqual(expect.arrayContaining(["drone", "alcohol", "quotes", "foodCompliance", "budgetRequest", "schoolApproval"]))
    expect(stepsFor(event({ funding: true })).map(s => s.key)).not.toContain("drone")
  })
  it("assigns Event Registry and all risk permits to the Events lead", () => {
    const state = seedDemo()
    const nodes = buildEventNodes(event({ drone: true, safety: true, alcohol: true }), state.roles)
    for (const key of ["registry", "permit", "drone", "alcohol"]) expect(nodes.find(n => n.stepKey === key)?.ownerId).toBe("jordan")
  })
})
