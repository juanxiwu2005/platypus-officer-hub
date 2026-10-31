import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import type { DemoState, Event } from "../data/types"
import { isBusinessDay, onOrBefore, personalWorkDay, shiftWork, studentOffReason } from "../engine/calendar"
import { buildEventNodes, stepsFor } from "../engine/playbooks"
import { applySchedule, computeSchedule } from "../engine/schedule"

// Legacy scheduling remains covered explicitly while v2 coverage lives in seed and Event Budget tests.
const base = () => seedDemo("2026-10-22", "legacy")
const plan = (s: DemoState, key: string, ev = "e-night") => computeSchedule(s).nodes[`${ev}:${key}`]
const codes = (s: DemoState, key: string, ev = "e-night") => plan(s, key, ev).issues.map(i => i.code)
const setClub = (s: DemoState, key: string, date: string | null) => reducer(s, { type: "updateNode", id: `e-night:${key}`, patch: { clubDeadlineOverride: date } })

describe("ASU calendar", () => {
  it("skips weekends and ASU holidays, but not days the university is open", () => {
    expect(isBusinessDay("2026-11-11")).toBe(false) // Veterans Day
    expect(isBusinessDay("2026-11-26")).toBe(false) // Thanksgiving
    expect(isBusinessDay("2026-11-27")).toBe(false)
    expect(isBusinessDay("2026-12-24")).toBe(false) // winter break closure
    expect(isBusinessDay("2026-12-31")).toBe(true) // not an ASU holiday in 2026
    expect(isBusinessDay("2027-03-09")).toBe(true) // spring break: classes excused, university open
    expect(isBusinessDay("2026-10-24")).toBe(false) // Saturday
  })

  it("counts business days across a holiday", () => {
    expect(shiftWork("2026-11-19", -10)).toBe("2026-11-04")
    expect(shiftWork("2026-11-04", -3)).toBe("2026-10-30")
    expect(shiftWork("2026-11-19", 5)).toBe("2026-11-30") // over Thanksgiving
    expect(onOrBefore("2026-11-15")).toBe("2026-11-13")
  })

  it("keeps club work out of busy weeks, finals week and the break between semesters", () => {
    const sam = personalWorkDay(["2026-11-02"])
    expect(sam("2026-11-04")).toBe(false)
    expect(sam("2026-11-09")).toBe(true)
    expect(studentOffReason("2026-12-08")).toBe("finals week")
    expect(studentOffReason("2026-12-21")).toBe("break between semesters")
    expect(studentOffReason("2026-11-18")).toBe(null)
  })
})

describe("three deadlines: the plan's own example (§4)", () => {
  it("USG food request for Networking Night on Thu Nov 19", () => {
    const p = plan(base(), "usg")
    expect(p.latestStart).toBe("2026-10-28")
    expect(p.club).toBe("2026-10-30")
    expect(p.official).toBe("2026-11-04")
    expect(p.explain.official).toContain("R09")
    expect(p.explain.club).toContain("club buffer")
    expect(p.explain.latestStart).toContain("Maya")
  })
})

describe("every date of the example event", () => {
  // [latest start, club deadline, ASU deadline]. Checked by hand against the ASU calendar (Veterans Day 11/11, Thanksgiving 11/26–27).
  const expected: Record<string, [string, string, string | null]> = {
    draft: ["2026-09-22", "2026-09-28", null],
    mktneeds: ["2026-09-29", "2026-10-01", null],
    budget: ["2026-10-02", "2026-10-07", null],
    approve: ["2026-10-08", "2026-10-12", null],
    registry: ["2026-10-13", "2026-10-15", "2026-10-20"],
    flyer: ["2026-10-16", "2026-10-21", null],
    venue: ["2026-10-22", "2026-10-27", "2026-11-03"],
    rsvp: ["2026-10-22", "2026-10-26", null],
    quote: ["2026-10-23", "2026-10-27", null],
    promo: ["2026-10-27", "2026-11-05", null],
    ritm: ["2026-10-28", "2026-11-02", "2026-11-05"],
    usg: ["2026-10-28", "2026-10-30", "2026-11-04"],
    foodex: ["2026-10-29", "2026-11-02", "2026-11-05"],
    review: ["2026-11-03", "2026-11-05", null],
    runshow: ["2026-11-06", "2026-11-12", null],
    advisor: ["2026-11-09", "2026-11-12", null],
    headcount: ["2026-11-09", "2026-11-13", null],
    feedback: ["2026-11-20", "2026-11-24", null],
    closeout: ["2026-11-23", "2026-11-30", null],
    archive: ["2026-12-01", "2026-12-03", null],
  }

  it("has exactly these 20 steps", () => {
    const keys = base().nodes.filter(n => n.eventId === "e-night").map(n => n.stepKey).sort()
    expect(keys).toEqual(Object.keys(expected).sort())
  })

  for (const [key, [start, club, official]] of Object.entries(expected)) {
    it(`${key}: start ${start}, club ${club}, ASU ${official ?? "none"}`, () => {
      const p = plan(base(), key)
      expect([p.latestStart, p.club, p.official]).toEqual([start, club, official])
    })
  }

  it("writes the same dates into the stored nodes", () => {
    const s = base()
    const sched = computeSchedule(s)
    for (const n of s.nodes) {
      expect(n.latestStart).toBe(sched.nodes[n.id].latestStart)
      expect(n.clubDeadline).toBe(sched.nodes[n.id].club)
      expect(n.officialDeadline).toBe(sched.nodes[n.id].official)
    }
  })

  it("explains a busy week and the day-of-event rules", () => {
    expect(plan(base(), "promo").explain.latestStart).toContain("Sam's busy week")
    expect(plan(base(), "registry").explain.official).toContain("stricter 30 days")
    expect(plan(base(), "headcount").explain.club).toContain("3–4 days ahead")
  })

  it("is deterministic and does not change its input", () => {
    const s = base()
    const before = JSON.stringify(s)
    expect(JSON.stringify(computeSchedule(s))).toBe(JSON.stringify(computeSchedule(s)))
    applySchedule(s)
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe("changing a date moves later steps and flags rule breaks", () => {
  it("a later flyer pushes the USG request past its ASU deadline (red)", () => {
    const s = setClub(base(), "flyer", "2026-11-02")
    const usg = plan(s, "usg")
    expect(usg.latestStart).toBe("2026-11-03")
    expect(usg.club).toBe("2026-11-05")
    expect(usg.pushedBy).toBe("e-night:flyer")
    expect(codes(s, "usg")).toContain("official_missed")
    expect(plan(s, "usg").issues.find(i => i.code === "official_missed")?.severity).toBe("error")
    // and the steps after it move too
    expect(plan(s, "review").latestStart).toBe("2026-11-06")
    expect(codes(s, "review")).toContain("pushed")
    expect(plan(s, "promo").latestStart).toBe("2026-11-09") // after Sam's busy week
    expect(computeSchedule(s).events["e-night"].issues.map(i => i.code)).toContain("plan_misses")
  })

  it("clearing the change restores the recommended plan", () => {
    const s = setClub(setClub(base(), "flyer", "2026-11-02"), "flyer", null)
    expect(plan(s, "usg").club).toBe("2026-10-30")
    expect(codes(s, "usg")).not.toContain("official_missed")
  })

  it("an earlier date for one step does not move the steps after it", () => {
    const s = setClub(base(), "usg", "2026-10-29")
    expect(plan(s, "usg").latestStart).toBe("2026-10-27")
    expect(plan(s, "review").latestStart).toBe("2026-11-03")
  })

  it("a later date within the ASU deadline is allowed, with a note", () => {
    const s = setClub(base(), "usg", "2026-11-03")
    expect(codes(s, "usg")).toContain("override_later")
    expect(codes(s, "usg")).not.toContain("official_missed")
  })

  it("a club deadline after the ASU deadline is red", () => {
    const s = setClub(base(), "usg", "2026-11-06")
    expect(codes(s, "usg")).toContain("official_missed")
  })

  it("close-out steps never start before the event, even with an early date", () => {
    const s = setClub(base(), "closeout", "2026-11-10")
    const p = plan(s, "closeout")
    expect(p.latestStart >= "2026-11-20").toBe(true)
    expect(p.latestStart <= p.club).toBe(true)
  })

  it("no change ever makes a step start after its own club deadline", () => {
    const start = base()
    const dates = ["2026-10-01", "2026-10-30", "2026-11-12", "2026-11-25"]
    for (const n of start.nodes.filter(x => x.eventId)) {
      for (const d of dates) {
        const s = reducer(start, { type: "updateNode", id: n.id, patch: { clubDeadlineOverride: d } })
        const sched = computeSchedule(s)
        for (const m of s.nodes) expect(sched.nodes[m.id].latestStart <= sched.nodes[m.id].club).toBe(true)
      }
    }
  })

  it("moving the event recomputes every date", () => {
    const s = reducer(base(), { type: "updateEvent", id: "e-night", patch: { date: "2026-12-03" } })
    expect(plan(s, "usg").official).toBe("2026-11-17")
    expect(plan(s, "registry").official).toBe("2026-11-03")
  })

  it("a new owner changes the personal buffer and has to claim the task again", () => {
    const s = reducer(base(), { type: "updateNode", id: "e-night:usg", patch: { ownerId: "jordan" } })
    const n = s.nodes.find(x => x.id === "e-night:usg")!
    expect(n.status).toBe("unclaimed")
    expect(plan(s, "usg").latestStart).toBe("2026-10-27") // Jordan keeps a 2-day buffer
  })

  it("more effort means an earlier start", () => {
    const s = reducer(base(), { type: "updateNode", id: "e-night:usg", patch: { estDays: 3 } })
    expect(plan(s, "usg").latestStart).toBe("2026-10-26")
  })
})

describe("event checks", () => {
  const moved = (date: string) => computeSchedule(reducer(base(), { type: "updateEvent", id: "e-night", patch: { date } })).events["e-night"].issues
  it("flags events in finals week (R13)", () => {
    const i = moved("2026-12-09").find(x => x.code === "finals")
    expect(i?.severity).toBe("error")
    expect(i?.ruleId).toBe("R13")
  })
  it("flags ASU holidays and breaks", () => {
    expect(moved("2026-11-11").map(i => i.code)).toContain("holiday")
    expect(moved("2026-12-22").map(i => i.code)).toContain("no_term")
  })
  it("flags ASU deadlines that already passed when the event is too soon", () => {
    const s = reducer(base(), { type: "updateEvent", id: "e-night", patch: { date: "2026-11-02" } })
    expect(codes(s, "foodex")).toContain("official_passed")
    expect(computeSchedule(s).events["e-night"].issues.map(i => i.code)).toContain("official_passed")
  })
  it("reports steps that wait for each other in a loop", () => {
    const s = base()
    const looped = applySchedule({ ...s, nodes: s.nodes.map(n => (n.id === "e-night:approve" ? { ...n, dependsOn: [...n.dependsOn, "e-night:review"] } : n)) })
    expect(computeSchedule(looped).events["e-night"].issues.map(i => i.code)).toContain("loop")
  })
})

describe("warnings on the demo date", () => {
  it("amber for a passed club deadline and for a step without an owner; nothing red", () => {
    const s = base()
    expect(codes(s, "flyer")).toContain("club_passed")
    expect(codes(s, "rsvp")).toContain("no_owner")
    const sched = computeSchedule(s)
    const red = s.nodes.filter(n => sched.nodes[n.id].issues.some(i => i.severity === "error"))
    expect(red).toEqual([])
  })
  it("done steps carry no warnings", () => {
    expect(plan(base(), "registry").issues).toEqual([])
  })
  it("standalone tasks keep their own dates", () => {
    const p = computeSchedule(base()).nodes["t-news"]
    expect(p.club).toBe("2026-10-21")
    expect(p.issues.map(i => i.code)).toContain("club_passed")
  })
})

describe("playbook (OA101 + OA102 + OA201 + T-checklist + rules)", () => {
  const ev = (patch: Partial<Event>): Event => ({ id: "e", name: "E", date: "2026-11-19", type: "social", headcount: 30, venue: "campus", food: "offsite", funding: "usg", speaker: false, goalId: null, playbookId: "seo-event", ...patch })
  const keys = (patch: Partial<Event>) => stepsFor(ev(patch)).map(s => s.key)

  it("adds rule steps only when they apply", () => {
    expect(keys({})).toEqual(expect.arrayContaining(["registry", "venue", "ritm", "quote", "foodex", "usg"]))
    expect(keys({ food: "dining" })).toContain("dining")
    expect(keys({ food: "dining" })).not.toContain("foodex")
    expect(keys({ food: "onsite" })).toContain("permit")
    expect(keys({ food: "none" })).not.toEqual(expect.arrayContaining(["usg"]))
    expect(keys({ food: "none" })).not.toContain("headcount")
    expect(keys({ venue: "offcampus" })).toContain("offvenue")
    expect(keys({ venue: "offcampus" })).not.toContain("registry")
    expect(keys({ speaker: true })).toEqual(expect.arrayContaining(["partner", "sap", "usgspeaker", "partnerreview"]))
    expect(keys({ speaker: true, funding: "dues" })).not.toContain("sap")
  })

  it("passes links through skipped steps", () => {
    const rsvp = stepsFor(ev({})).find(s => s.key === "rsvp")!
    expect(rsvp.dependsOn).toEqual(["flyer"])
    const review = stepsFor(ev({ food: "none", venue: "offcampus" })).find(s => s.key === "review")!
    expect(review.dependsOn).toEqual(["offvenue", "rsvp"])
  })

  it("builds nodes whose links all exist, one owner per step", () => {
    const s = base()
    for (const patch of [{}, { speaker: true }, { food: "dining" as const }, { venue: "offcampus" as const, food: "none" as const }]) {
      const nodes = buildEventNodes(ev(patch), s.roles)
      const ids = new Set(nodes.map(n => n.id))
      expect(ids.size).toBe(nodes.length)
      for (const n of nodes) for (const d of n.dependsOn) expect(ids.has(d)).toBe(true)
      for (const n of nodes) expect(n.ownerId === null || s.people.some(p => p.id === n.ownerId)).toBe(true)
    }
  })

  it("adds the Business Meals rule when food costs $25 or more per person", () => {
    const close = (amount: number) => buildEventNodes(ev({}), base().roles, { fundingAmount: amount }).find(n => n.stepKey === "closeout")!.ruleIds
    expect(close(2000)).toContain("R12")
    expect(close(300)).not.toContain("R12")
  })

  it("routes work to the closest role when a club lacks one", () => {
    const nodes = buildEventNodes(ev({ speaker: true }), base().roles)
    expect(nodes.find(n => n.stepKey === "partner")!.ownerId).toBe("alex") // no outreach role → president
    expect(nodes.find(n => n.stepKey === "feedback")!.ownerId).toBe("priya") // no EVP → secretary
  })

  it("plans Spring Speaker Night work before finals and winter break", () => {
    const s = base()
    const sched = computeSchedule(s)
    for (const n of s.nodes.filter(x => x.eventId === "e-speaker")) {
      const start = sched.nodes[n.id].latestStart
      expect(studentOffReason(start)).toBe(null)
    }
  })
})
