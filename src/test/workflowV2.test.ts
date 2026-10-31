import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { buildEventNodes, CORE_EVENT_STEP_KEYS, stepsFor } from "../engine/playbooks"
import { computeSchedule } from "../engine/schedule"
import type { Event } from "../data/types"

const event = (checks: Event["checks"], headcount = 80): Event => ({ id: "v2", name: "V2", date: "2027-03-20", type: "social", headcount, venue: "campus", food: "none", funding: "none", speaker: false, checks, goalId: null, playbookId: "asu-event-v2" })
const blue = ["plan", "venuechoice", "registry", "venue", "materials", "checkin", "headcount", "thankyou", "feedback", "postmarketing", "photoBackup", "spending", "attendance", "financeRecord", "documentation", "finalcheck", "quotes", "content"]

describe("ASU event workflow v2", () => {
  it("keeps every blue lifecycle node for a basic event", () => {
    const keys = stepsFor(event({})).map(s => s.key)
    expect(keys).toEqual(expect.arrayContaining(blue))
    expect(keys).not.toContain("drone")
    expect(keys).not.toContain("alcohol")
    expect(keys).not.toContain("rsvp")
    expect(keys).not.toContain("partnerReview")
    expect(keys).not.toContain("photos")
  })
  it("keeps every core step for every checklist combination", () => {
    const cases: Event["checks"][] = [{}, { funding: true }, { food: true, externalFood: true }, { partner: true, rsvp: true, access: true }, { safety: true, alcohol: true, drone: true, schoolApproval: true }]
    for (const checks of cases) expect(stepsFor(event(checks)).map(step => step.key)).toEqual(expect.arrayContaining([...CORE_EVENT_STEP_KEYS]))
  })
  it("shows the partner route only for a partner or speaker, and RSVPs only when requested", () => {
    expect(stepsFor(event({ partner: true })).map(s => s.key)).toEqual(expect.arrayContaining(["partner", "partnerReview", "parking"]))
    expect(stepsFor(event({ rsvp: true })).map(s => s.key)).toContain("rsvp")
  })
  it("creates only the selected situation routes and makes 250+ a school approval route", () => {
    const keys = stepsFor(event({ drone: true, alcohol: true, funding: true, food: true, externalFood: true }, 250)).map(s => s.key)
    expect(keys).toEqual(expect.arrayContaining(["drone", "alcohol", "quotes", "foodCompliance", "budgetRequest", "schoolApproval"]))
    expect(stepsFor(event({ funding: true })).map(s => s.key)).not.toContain("drone")
  })
  it("assigns Event Registry and all risk permits to the Events lead", () => {
    const state = seedDemo(undefined, "v2")
    const nodes = buildEventNodes(event({ drone: true, safety: true, alcohol: true }), state.roles)
    for (const key of ["registry", "permit", "drone", "alcohol"]) expect(nodes.find(n => n.stepKey === key)?.ownerId).toBe("jordan")
  })
  it("requires check-in materials one business day before every event", () => {
    const checkin = buildEventNodes(event({}), seedDemo(undefined, "v2").roles).find(node => node.stepKey === "checkin")
    expect(checkin?.anchor).toEqual({ kind: "target", days: 1, unit: "business", label: "Check-in materials ready" })
  })
  it("warns about an incomplete check-in only on event day, not while the event is still ahead", () => {
    const base = seedDemo(undefined, "v2")
    const delayed = { ...base, nodes: base.nodes.map(node => node.id === "e-founder:checkin" ? { ...node, clubDeadlineOverride: "2026-12-03" } : node) }
    expect(computeSchedule(delayed).events["e-founder"].issues.map(issue => issue.code)).not.toContain("plan_misses")

    const eventDay = { ...delayed, today: "2026-12-03" }
    expect(computeSchedule(eventDay).events["e-founder"].issues.map(issue => issue.code)).toContain("plan_misses")
  })
})
