import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import type { DemoState, Event, Node, StepTiming } from "../data/types"
import { computeSchedule } from "../engine/schedule"

/**
 * FB-6: calibrated steps (a node with `timing`) are dated from their own window (docs/feedback-fix/PLAN.md §7.2).
 * These tests use hand-made nodes, so they do not depend on the standard workflow template.
 * The event is Fri Apr 16, 2027 (the owner's timing table). Checked by hand against the ASU calendar.
 */
const EV: Event = { id: "cal", name: "Calibration event", date: "2027-04-16", type: "social", headcount: 60, venue: "campus", food: "offsite", funding: "usg", speaker: false, checks: {}, goalId: null, playbookId: "seo-event" }

const node = (key: string, timing: StepTiming | undefined, patch: Partial<Node> = {}): Node => ({
  id: `cal:${key}`, title: key, eventId: "cal", stepKey: key, phase: "prepare", fn: "president", ownerId: "alex", approverRoleId: null, consultedRoleIds: [], informedRoleIds: [],
  dependsOn: [], tier: "light", estDays: 1, anchor: null, clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null, ruleIds: [],
  status: "accepted", acceptedOn: "2027-01-04", waitingOn: null, draftLink: null, why: "", source: "test", lastUpdate: null, ...(timing ? { timing } : {}), ...patch,
})
const world = (nodes: Node[], patch: (s: DemoState) => DemoState = s => s): DemoState => patch({ ...seedDemo("2027-01-04", "legacy"), events: [EV], nodes })
const plan = (s: DemoState, key: string) => computeSchedule(s).nodes[`cal:${key}`]
const dates = (s: DemoState, key: string) => [plan(s, key).latestStart, plan(s, key).club]
const codes = (s: DemoState, key: string) => plan(s, key).issues.map(i => i.code)
const person = (id: string, p: Partial<DemoState["people"][number]>) => (s: DemoState): DemoState => ({ ...s, people: s.people.map(x => x.id === id ? { ...x, ...p } : x) })

describe("calibrated steps: the club deadline", () => {
  it("is the event day minus dueDays", () => {
    const s = world([node("plan", { startDays: 65, dueDays: 60 })])
    expect(dates(s, "plan")).toEqual(["2027-02-10", "2027-02-15"])
    expect(plan(s, "plan").explain.club).toContain("60 days before the event")
  })

  it("moves a closed day to the business day before", () => {
    const s = world([node("budget", { startDays: 60, dueDays: 55 })])
    expect(plan(s, "budget").club).toBe("2027-02-19") // Sat Feb 20 → Fri Feb 19
    expect(plan(s, "budget").explain.club).toContain("weekend")
  })

  it("uses the ASU deadline minus the club buffer when that is earlier", () => {
    const R09 = { kind: "rule" as const, ruleId: "R09", days: 10, unit: "business" as const }
    const own = world([node("pr", { startDays: 30, dueDays: 18 }, { anchor: R09 })])
    expect([plan(own, "pr").official, plan(own, "pr").club]).toEqual(["2027-04-02", "2027-03-29"]) // T-18 is earlier than Apr 2 minus 3 business days
    const buffered = world([node("pr", { startDays: 30, dueDays: 10 }, { anchor: R09 })])
    expect(plan(buffered, "pr").club).toBe("2027-03-30")
    expect(plan(buffered, "pr").explain.club).toContain("club buffer")
  })

  it("counts business days when the unit says so", () => {
    const s = world([node("spending", { startDays: 0, dueDays: -5, unit: "business" }, { phase: "close" })])
    expect(plan(s, "spending").club).toBe("2027-04-23")
  })
})

describe("calibrated steps: the latest start (reminder day)", () => {
  it("is the event day minus startDays, moved earlier to the owner's working day", () => {
    const s = world([node("checkin", { startDays: 5, dueDays: 0 }, { phase: "run" })])
    expect(dates(s, "checkin")).toEqual(["2027-04-09", "2027-04-16"]) // Sun Apr 11 → Fri Apr 9; due on the event day
    expect(codes(s, "checkin")).not.toContain("after_event")
  })

  it("skips the owner's busy week", () => {
    const s = world([node("plan", { startDays: 65, dueDays: 60 })], person("alex", { busyWeeks: ["2027-02-08"] }))
    expect(plan(s, "plan").latestStart).toBe("2027-02-05")
    expect(plan(s, "plan").explain.latestStart).toContain("Alex's busy week")
  })

  it("counts only the personal buffer above the default one day", () => {
    const one = world([node("plan", { startDays: 65, dueDays: 60 })])
    expect(plan(one, "plan").latestStart).toBe("2027-02-10")
    const three = world([node("plan", { startDays: 65, dueDays: 60 })], person("alex", { personalBufferDays: 3 }))
    expect(plan(three, "plan").latestStart).toBe("2027-02-08") // two more working days
    expect(plan(three, "plan").explain.latestStart).toContain("Alex's personal buffer")
    expect(plan(three, "plan").club).toBe("2027-02-15") // the deadline does not move
    const off = world([node("plan", { startDays: 65, dueDays: 60 })], person("alex", { personalBufferDays: 3, personalBufferEnabled: false }))
    expect(plan(off, "plan").latestStart).toBe("2027-02-10")
  })

  it("never starts after its own deadline", () => {
    const s = world([node("odd", { startDays: 2, dueDays: 10 })])
    const p = plan(s, "odd")
    expect(p.latestStart <= p.club).toBe(true)
  })
})

describe("calibrated steps: links mean finish order", () => {
  const pair = (child: StepTiming, patch: Partial<Node> = {}) => [node("up", { startDays: 65, dueDays: 60 }, patch), node("down", child, { dependsOn: ["cal:up"] })]

  it("an overlapping window is fine: the later step is not squeezed and the earlier step is not pulled earlier", () => {
    const s = world(pair({ startDays: 65, dueDays: 60 }))
    expect(dates(s, "up")).toEqual(["2027-02-10", "2027-02-15"])
    expect(dates(s, "down")).toEqual(["2027-02-10", "2027-02-15"]) // the same deadline is allowed
    expect(codes(s, "down")).not.toContain("pushed")
    const wide = world(pair({ startDays: 60, dueDays: 25 }))
    expect(plan(wide, "up").club).toBe("2027-02-15") // not the business day before "down" starts
    expect(dates(wide, "down")).toEqual(["2027-02-15", "2027-03-22"])
  })

  it("an unfinished upstream step that finishes later moves the deadline later, with a warning", () => {
    const s = world(pair({ startDays: 65, dueDays: 60 }, { clubDeadlineOverride: "2027-02-25" }))
    const down = plan(s, "down")
    expect([down.latestStart, down.club, down.pushedBy]).toEqual(["2027-02-10", "2027-02-25", "cal:up"])
    expect(down.explain.club).toContain("Moved later")
    expect(down.issues.find(i => i.code === "pushed")?.severity).toBe("warn")
  })

  it("a finished upstream step moves nothing", () => {
    const s = world(pair({ startDays: 65, dueDays: 60 }, { clubDeadlineOverride: "2027-02-25", status: "done" }))
    expect(plan(s, "down").club).toBe("2027-02-15")
    expect(plan(s, "down").pushedBy).toBe(null)
  })

  it("a timing later than the next step's moves the next step's recommended deadline, never the earlier one; it is the plan, not a slip", () => {
    const s = world(pair({ startDays: 65, dueDays: 60 }).map(n => n.stepKey === "up" ? { ...n, timing: { startDays: 65, dueDays: 20 } } : n))
    expect(plan(s, "up").club).toBe("2027-03-26") // Sat Mar 27 → Fri Mar 26
    const down = plan(s, "down")
    expect([down.club, down.recommendedClub, down.pushedBy]).toEqual(["2027-03-26", "2027-03-26", null])
    expect(down.explain.club).toContain("stay in order")
    expect(codes(s, "down")).not.toContain("pushed")
  })

  it("an uncalibrated step on its recommended date between calibrated steps moves only the next step's start", () => {
    // A conditional step placed by its own timing after a calibrated step, while the next calibrated window already opened.
    const a = node("a", { startDays: 60, dueDays: 38 })
    const mid = node("mid", undefined, { dependsOn: ["cal:a"], anchor: { kind: "target", days: 21, unit: "calendar", label: "Three weeks ahead" } })
    const b = node("b", { startDays: 40, dueDays: 10 }, { dependsOn: ["cal:mid"], estDays: 7 })
    const s = world([a, mid, b])
    // "mid" should finish before "b" opens (Fri Mar 5), but cannot finish before "a" (Tue Mar 9): the order wins.
    expect(plan(s, "mid").club).toBe("2027-03-09")
    const p = plan(s, "b")
    expect([p.latestStart, p.club, p.pushedBy]).toEqual(["2027-03-10", "2027-04-06", null])
    expect(codes(s, "b")).not.toContain("pushed")
  })

  it("a later step's ASU deadline is a hard limit for the calibrated step before it", () => {
    const R09 = { kind: "rule" as const, ruleId: "R09", days: 10, unit: "business" as const }
    const steps = [node("approval", { startDays: 30, dueDays: 18 }), node("request", { startDays: 30, dueDays: 18 }, { anchor: R09, dependsOn: ["cal:approval"] })]
    const tight = world(steps, s => ({ ...s, org: { ...s.org, settings: { ...s.org.settings, clubBufferBusinessDays: 10 } } }))
    expect(plan(tight, "request").club).toBe("2027-03-19") // Apr 2 minus 10 business days
    expect(plan(tight, "approval").club).toBe("2027-03-19") // finishes by then instead of Mar 29, so nothing is pushed
    expect(plan(tight, "approval").explain.club).toContain("ASU deadline")
    expect(codes(tight, "request")).not.toContain("pushed")
  })

  it("an early deadline set by a person that an unfinished step overrides does not start the work early", () => {
    const s = world([node("approval", { startDays: 30, dueDays: 18 }), node("order", { startDays: 30, dueDays: 10 }, { dependsOn: ["cal:approval"], estDays: 2, clubDeadlineOverride: "2027-03-01" })])
    const p = plan(s, "order")
    expect([p.latestStart, p.club, p.pushedBy]).toEqual(["2027-03-17", "2027-03-29", "cal:approval"])
  })

  it("an uncalibrated upstream step keeps the old rule: start the business day after it finishes", () => {
    const up = node("up", undefined, { anchor: { kind: "target", days: 70, unit: "calendar", label: "Earlier step" } })
    const down = node("down", { startDays: 65, dueDays: 60 }, { dependsOn: ["cal:up"], estDays: 5 })
    const s = world([up, down])
    expect(plan(s, "up").club).toBe("2027-02-05")
    expect(dates(s, "down")).toEqual(["2027-02-10", "2027-02-15"])
    const late = world([{ ...up, clubDeadlineOverride: "2027-02-12" }, down])
    const p = plan(late, "down")
    expect([p.latestStart, p.club, p.pushedBy]).toEqual(["2027-02-15", "2027-02-23", "cal:up"]) // 5 days of work + 1 day buffer
    expect(codes(late, "down")).toContain("pushed")
  })

  it("an uncalibrated step before a calibrated one finishes before the calibrated step starts", () => {
    const before = node("before", undefined, { estDays: 2 })
    const cal = node("cal", { startDays: 30, dueDays: 18 }, { dependsOn: ["cal:before"] })
    const s = world([before, cal])
    expect(plan(s, "before").club).toBe("2027-03-16") // the business day before Wed Mar 17
    expect(dates(s, "cal")).toEqual(["2027-03-17", "2027-03-29"])
  })
})

describe("calibrated close-out steps", () => {
  it("a step due on the event day starts and finishes on the event day", () => {
    const s = world([node("headcount", { startDays: 0, dueDays: 0 }, { phase: "close" })])
    expect(dates(s, "headcount")).toEqual(["2027-04-16", "2027-04-16"])
    expect(plan(s, "headcount").issues.filter(i => i.severity === "error")).toEqual([])
  })

  it("other close-out steps start on the first business day after the event; after-event closed days move later", () => {
    const s = world([node("thankyou", { startDays: 0, dueDays: -1 }, { phase: "close" }), node("photo", { startDays: 0, dueDays: -7 }, { phase: "close" })])
    expect(dates(s, "thankyou")).toEqual(["2027-04-19", "2027-04-19"]) // Sat Apr 17 → Mon Apr 19
    expect(plan(s, "thankyou").explain.club).toContain("business day after")
    expect(dates(s, "photo")).toEqual(["2027-04-19", "2027-04-23"])
  })

  it("an early deadline set by a person cannot put close-out work before the event", () => {
    const s = world([node("photo", { startDays: 0, dueDays: -7 }, { phase: "close", clubDeadlineOverride: "2027-04-01" })])
    const p = plan(s, "photo")
    expect(p.latestStart).toBe("2027-04-19")
    expect(p.club >= p.latestStart).toBe(true)
  })
})

describe("calibrated steps: a deadline set by a person", () => {
  const mod = (override: string | null) => world([node("moderator", { startDays: 60, dueDays: 25 }, { estDays: 10, clubDeadlineOverride: override })])

  it("uses the person's deadline; the start is the earlier of the calibrated start and the deadline minus the work", () => {
    const early = plan(mod("2027-03-01"), "moderator")
    expect([early.latestStart, early.club, early.recommendedClub]).toEqual(["2027-02-12", "2027-03-01", "2027-03-22"]) // 10 days of work + 1 day buffer
    const later = plan(mod("2027-04-01"), "moderator")
    expect([later.latestStart, later.club]).toEqual(["2027-02-15", "2027-04-01"])
    expect(later.issues.map(i => i.code)).toContain("override_later")
  })

  it("no deadline ever makes a calibrated step start after its own deadline", () => {
    const steps = [
      node("a", { startDays: 65, dueDays: 60 }), node("b", { startDays: 60, dueDays: 25 }, { dependsOn: ["cal:a"], estDays: 10 }),
      node("c", { startDays: 14, dueDays: 1 }, { dependsOn: ["cal:b"], phase: "run" }), node("d", { startDays: 0, dueDays: -7 }, { dependsOn: ["cal:c"], phase: "close" }),
    ]
    for (const key of ["a", "b", "c", "d"]) for (const d of ["2027-01-20", "2027-02-12", "2027-03-30", "2027-04-20", "2027-05-01"]) {
      const s = world(steps.map(n => n.stepKey === key ? { ...n, clubDeadlineOverride: d } : n))
      const sched = computeSchedule(s)
      for (const n of s.nodes) expect(sched.nodes[n.id].latestStart <= sched.nodes[n.id].club).toBe(true)
    }
  })
})

describe("steps without timing are dated exactly as before", () => {
  it("a calibrated event next to the legacy fixture leaves the fixture's dates alone", () => {
    const legacy = seedDemo("2026-10-22", "legacy")
    const before = computeSchedule(legacy).nodes
    const withCal = { ...legacy, events: [...legacy.events, EV], nodes: [...legacy.nodes, node("plan", { startDays: 65, dueDays: 60 })] }
    const after = computeSchedule(withCal).nodes
    for (const n of legacy.nodes) expect(after[n.id]).toEqual(before[n.id])
  })
})
