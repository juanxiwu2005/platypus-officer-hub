import { describe, expect, it } from "vitest"
import { walkthroughEnabled } from "../onboarding/gate/enabled"
import { FLOWS, stepAt } from "../onboarding/engine/flows"

describe("walkthrough switch", () => {
  it("is off unless the build or the link turns it on", () => {
    expect(walkthroughEnabled({})).toBe(false)
    expect(walkthroughEnabled({ buildFlag: "false", windowSearch: "", routerSearch: "" })).toBe(false)
    expect(walkthroughEnabled({ windowSearch: "?walkthrough=0" })).toBe(false)
  })
  it("reads the flag before the # (what a normal link looks like) and after it", () => {
    expect(walkthroughEnabled({ windowSearch: "?walkthrough=1" })).toBe(true)
    expect(walkthroughEnabled({ routerSearch: "?walkthrough=1" })).toBe(true)
    expect(walkthroughEnabled({ buildFlag: "true" })).toBe(true)
  })
})

describe("walkthrough flows", () => {
  it("gives every step a unique id and path, and maps each path back to its step", () => {
    for (const [flow, steps] of Object.entries(FLOWS)) {
      expect(new Set(steps.map(s => s.id)).size).toBe(steps.length)
      expect(new Set(steps.map(s => s.path)).size).toBe(steps.length)
      steps.forEach((s, i) => expect(stepAt(`/welcome/${s.path}`)).toEqual({ flow, index: i }))
    }
    expect(stepAt("/welcome")).toBeNull()
    expect(stepAt("/welcome/classic")).toBeNull()
  })
  it("ob-6: three founder screens and four member screens, in this order", () => {
    expect(FLOWS.founder.map(s => s.id)).toEqual(["founder.name", "founder.team", "founder.invite"])
    expect(FLOWS.member.map(s => s.id)).toEqual(["member.invitation", "member.reminders", "member.busy-weeks", "member.done"])
    for (const old of ["founder/constitution", "founder/goals", "founder/first-event", "founder/confirm", "member/you", "member/about"]) expect(stepAt(`/welcome/${old}`), old).toBeNull()
  })
  it("never lets a required step be optional: Team (it finishes setup), Invite and the member Invitation, Reminders, Done are required", () => {
    const required = ["founder.team", "founder.invite", "member.invitation", "member.reminders", "member.done"]
    for (const id of required) expect(Object.values(FLOWS).flat().find(s => s.id === id)?.optional).toBe(false)
  })
  it("lets the president skip the first event on screen 1 (Phase 3: the study watches plan vs skip) and an officer skip Busy weeks", () => {
    for (const id of ["founder.name", "member.busy-weeks"]) expect(Object.values(FLOWS).flat().find(s => s.id === id)?.optional).toBe(true)
  })
})
