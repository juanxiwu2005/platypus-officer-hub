import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import type { Node } from "../data/types"
import { taskActionLink } from "./actionLinks"

const base = seedDemo(undefined, "v2").nodes[0]
const step = (stepKey: string | null): Node => ({ ...base, stepKey })

describe("task-page action links", () => {
  it("chooses one published ASU space-request entry and explains the routing limitation", () => {
    const link = taskActionLink(step("venue"))!
    expect(link.url).toBe("https://eoss.asu.edu/student-unions/submit-a-space-request")
    expect(link.explanation).toContain("choose the applicable process at this request entry")
    expect(Object.keys(link).sort()).toEqual(["explanation", "label", "url"])
  })

  it("uses known request and speaker entries without inventing an individual request URL", () => {
    expect(taskActionLink(step("budgetRequest"))?.url).toBe("https://sundevilcentral.eoss.asu.edu/")
    expect(taskActionLink(step("purchaseRequest"))?.explanation).toContain("Sign in")
    expect(taskActionLink(step("speakerPacket"))?.url).toBe("https://cfo.asu.edu/speaker-artist-performer-agreements")
  })

  it("does not present catering information as a food-exception application", () => {
    expect(taskActionLink(step("quotes"))?.explanation).toContain("not an order or food-exception application")
    expect(taskActionLink(step("foodCompliance"))).toBeNull()
    expect(taskActionLink(step("permit"))).toBeNull()
  })

  it("does not infer an application from an unknown step, title, policy or draft link", () => {
    const unknown = { ...step("custom-room"), title: "Book an ASU room", ruleIds: ["R03"], draftLink: "https://example.org/draft" }
    expect(taskActionLink(unknown)).toBeNull()
    expect(taskActionLink(step(null))).toBeNull()
  })

  it("returns values that cannot mutate the catalog for a later preview", () => {
    const first = taskActionLink(step("venue"))!
    first.url = "https://example.org/changed"
    expect(taskActionLink(step("venue"))?.url).toBe("https://eoss.asu.edu/student-unions/submit-a-space-request")
  })
})
