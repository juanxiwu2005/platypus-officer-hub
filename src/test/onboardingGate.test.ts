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
  it("never lets a required step be optional: Name, First event, Confirm, Invite and the member Invitation, You, Reminders, Done are required", () => {
    const required = ["founder.name", "founder.first-event", "founder.confirm", "founder.invite", "member.invitation", "member.you", "member.reminders", "member.done"]
    for (const id of required) expect(Object.values(FLOWS).flat().find(s => s.id === id)?.optional).toBe(false)
  })
})
