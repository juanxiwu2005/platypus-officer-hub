import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import type { DemoState, Event, Node } from "../data/types"
import { computeSchedule } from "../engine/schedule"
import { effortEditPatch } from "../lib/workflowEffort"

const EVENT: Event = { id: "effort", name: "Fictional workshop", date: "2027-04-16", type: "social", headcount: 30, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: "asu-event-v2" }
const node = (key: string, patch: Partial<Node> = {}): Node => ({
  id: `effort:${key}`, title: key, eventId: EVENT.id, stepKey: key, phase: "prepare", fn: "president", ownerId: "alex", approverRoleId: null, consultedRoleIds: [], informedRoleIds: [],
  dependsOn: [], tier: "light", estDays: 2, timing: { startDays: 60, dueDays: 58 }, anchor: null, clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null, ruleIds: [],
  status: "accepted", acceptedOn: "2027-01-04", waitingOn: null, draftLink: null, why: "", source: "Fictional effort test", lastUpdate: null, ...patch,
})
const world = (nodes: Node[], person: Partial<DemoState["people"][number]> = {}): DemoState => {
  const base = seedDemo("2027-01-04", "v2")
  return { ...base, events: [EVENT], nodes, contributions: [], people: base.people.map(p => ({ ...p, personalBufferDays: 1, personalBufferEnabled: true, busyWeeks: [], ...(p.id === "alex" ? person : {}) })) }
}
const plan = (nodes: Node[], key = "work", person: Partial<DemoState["people"][number]> = {}) => computeSchedule(world(nodes, person)).nodes[`effort:${key}`]

describe("explicit work estimates and calibrated windows", () => {
  it("preserves the legacy and explicit window policies without recalculating an untouched standard start", () => {
    for (const startPolicy of [undefined, "window"] as const) {
      const result = plan([node("work", { estDays: 10, startPolicy })])
      expect([result.latestStart, result.club]).toEqual(["2027-02-15", "2027-02-17"])
      expect(result.issues).toEqual([])
    }
  })

  it("dates two and ten explicitly edited working days differently, without changing the due date or removing timing", () => {
    const two = node("work", effortEditPatch("2")!)
    const ten = node("work", effortEditPatch("10")!)
    expect([plan([two]).latestStart, plan([ten]).latestStart]).toEqual(["2027-02-12", "2027-02-02"])
    expect(plan([ten]).club).toBe("2027-02-17")
    expect(ten.timing).toEqual({ startDays: 60, dueDays: 58 })
    expect(plan([ten]).explain.latestStart).toContain("10 days of work")
  })

  it.each([[0, "2027-02-03"], [1, "2027-02-02"], [3, "2027-01-29"]] as const)("uses the full %i-day buffer once", (buffer, start) => {
    expect(plan([node("work", { ...effortEditPatch(10)! })], "work", { personalBufferDays: buffer }).latestStart).toBe(start)
  })

  it("skips the owner's busy week", () => {
    const result = plan([node("work", effortEditPatch(10)!)], "work", { busyWeeks: ["2027-02-08"] })
    expect(result.latestStart).toBe("2027-01-26")
    expect(result.explain.latestStart).toContain("Alex's busy week")
  })

  it("skips an ASU holiday when counting effort before a person's target", () => {
    const result = plan([node("work", { ...effortEditPatch(2)!, clubDeadlineOverride: "2027-01-20" })])
    expect([result.latestStart, result.club]).toEqual(["2027-01-14", "2027-01-20"])
  })

  it("finishes the work on a working day when the target falls on a weekend", () => {
    const result = plan([node("work", { ...effortEditPatch(2)!, clubDeadlineOverride: "2027-02-21" })])
    expect([result.latestStart, result.club]).toEqual(["2027-02-16", "2027-02-21"])
    expect(result.explain.latestStart).toContain("Feb 19")
    expect(result.issues.map(i => i.code)).not.toContain("effort_window")
  })

  it("uses the final finish-order due after an upstream change overrides a person's early target", () => {
    const upstream = node("up", { timing: { startDays: 65, dueDays: 60 }, clubDeadlineOverride: "2027-02-25" })
    const downstream = node("work", { ...effortEditPatch(2)!, clubDeadlineOverride: "2027-02-01", dependsOn: [upstream.id] })
    const result = plan([upstream, downstream])
    expect([result.latestStart, result.club, result.recommendedClub, result.pushedBy]).toEqual(["2027-02-22", "2027-02-25", "2027-02-17", upstream.id])
    expect(downstream.clubDeadlineOverride).toBe("2027-02-01")
    expect(result.issues.map(i => i.code)).toContain("pushed")
    expect(result.issues.map(i => i.code)).not.toContain("effort_window")
  })

  it("keeps unfinished calibrated dependencies as finish order, allowing their work to overlap", () => {
    const upstream = node("up", { timing: { startDays: 65, dueDays: 60 } })
    const result = plan([upstream, node("work", { ...effortEditPatch(10)!, dependsOn: [upstream.id] })])
    expect([result.latestStart, result.club, result.pushedBy]).toEqual(["2027-02-02", "2027-02-17", null])
  })
})

describe("explicit effort that cannot fit a real start constraint", () => {
  it("shows a feasible finish and a conflict instead of putting post-event work before the event", () => {
    const result = plan([node("work", { ...effortEditPatch(2)!, phase: "close", timing: { startDays: 0, dueDays: -1 } })])
    expect([result.latestStart, result.club, result.recommendedClub]).toEqual(["2027-04-19", "2027-04-22", "2027-04-19"])
    expect(result.latestStart <= result.club).toBe(true)
    expect(result.issues.map(i => i.code)).toContain("effort_window")
    expect(result.explain.club).toContain("original target")
    expect(result.explain.club).toContain("Apr 19")
  })

  it("also reports a newly estimated custom close-out task without timing", () => {
    const result = plan([node("work", { ...effortEditPatch(2)!, phase: "close", timing: undefined, anchor: { kind: "target", days: -1, unit: "calendar", label: "After the event" } })])
    expect([result.latestStart, result.club, result.recommendedClub]).toEqual(["2027-04-19", "2027-04-22", "2027-04-19"])
    expect(result.issues.map(i => i.code)).toContain("effort_window")
  })

  it("retains the official deadline and reports it missed when a prerequisite leaves too little work time", () => {
    const upstream = node("up", { timing: undefined, anchor: { kind: "target", days: 30, unit: "calendar", label: "Upstream target" }, clubDeadlineOverride: "2027-04-05" })
    const downstream = node("work", { ...effortEditPatch(2)!, timing: { startDays: 30, dueDays: 10 }, anchor: { kind: "rule", ruleId: "R09", days: 10, unit: "business" }, ruleIds: ["R09"], dependsOn: [upstream.id] })
    const result = plan([upstream, downstream])
    expect([result.latestStart, result.club, result.recommendedClub, result.official]).toEqual(["2027-04-06", "2027-04-09", "2027-03-30", "2027-04-02"])
    expect(result.pushedBy).toBe(upstream.id)
    expect(result.issues.map(i => i.code)).toEqual(expect.arrayContaining(["effort_window", "official_missed", "pushed"]))
    expect(downstream.anchor).toEqual({ kind: "rule", ruleId: "R09", days: 10, unit: "business" })
  })

  it("keeps an explicitly zero-day headcount on event day when no buffer is selected", () => {
    const result = plan([node("work", { ...effortEditPatch(0)!, phase: "close", timing: { startDays: 0, dueDays: 0 } })], "work", { personalBufferDays: 0 })
    expect([result.latestStart, result.club]).toEqual(["2027-04-16", "2027-04-16"])
    expect(result.issues).toEqual([])
  })

  it("makes an approved recovery start explicit without losing the original target", () => {
    const result = plan([node("work", { ...effortEditPatch(2)!, timing: { startDays: 20, dueDays: 10 }, recoveryFrom: "2027-04-15" })])
    expect([result.latestStart, result.club, result.recommendedClub]).toEqual(["2027-04-15", "2027-04-20", "2027-04-06"])
    expect(result.issues.map(i => i.code)).toEqual(expect.arrayContaining(["effort_window", "after_event"]))
    expect(result.explain.club).toContain("recovery plan")
  })

  it("uses the same working-day estimate for an explicitly edited standalone task", () => {
    const task = node("work", { ...effortEditPatch(2)!, eventId: null, stepKey: null, timing: undefined, anchor: { kind: "fixed", club: "2027-02-21", official: null } })
    const result = plan([task])
    expect([result.latestStart, result.club, result.recommendedClub]).toEqual(["2027-02-16", "2027-02-21", "2027-02-21"])
    expect(result.issues).toEqual([])
  })

  it("retains a standalone target and reports the work-window conflict after recovery", () => {
    const task = node("work", { ...effortEditPatch(2)!, eventId: null, stepKey: null, timing: undefined, anchor: { kind: "fixed", club: "2027-02-17", official: null }, recoveryFrom: "2027-02-22" })
    const result = plan([task])
    expect([result.latestStart, result.club, result.recommendedClub]).toEqual(["2027-02-22", "2027-02-25", "2027-02-17"])
    expect(result.issues.map(i => i.code)).toContain("effort_window")
  })
})
