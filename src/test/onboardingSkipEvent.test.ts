import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { clubDraft, completeSetup } from "../data/settings"
import { parseCommand } from "../lib/commands"
import { summaryLine } from "../onboarding/founder/confirm/summary"

// Phase 3: the founder walkthrough's First event can be skipped. Confirm then calls completeSetup with no event (null) and no date ("").
const base = () => seedDemo("2026-10-22")
const code = "12345678-1234-1234-1234-123456789abc"

describe("Start workspace after Skip for now on First event", () => {
  it("sets the club up without creating the setup event", () => {
    const s = base(), d = clubDraft(s); d.name = "Fictional Skip Club"
    const next = completeSetup(s, d, null, "", code)
    expect(next).not.toBe(s)
    expect(next.org.name).toBe("Fictional Skip Club")
    expect(next.org.setupCompletedOn).toBe(s.today)
    expect(next.org.inviteCode).toBe(code)
    expect(next.events.some(e => e.id.startsWith("setup-event-"))).toBe(false)
    expect(next.nodes.some(n => n.eventId?.startsWith("setup-event-"))).toBe(false)
  })
  it("still refuses what it refused before: a bad invite code, a cadre, and a planned event with a bad date", () => {
    const s = base(), d = clubDraft(s)
    expect(completeSetup(s, d, null, "", "not-a-code")).toBe(s)
    const cadre = { ...s, viewerId: "maya" }; expect(completeSetup(cadre, d, null, "", code)).toBe(cadre)
    const event = parseCommand("Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding", s)[0]
    expect(completeSetup(s, d, event, "", code)).toBe(s)
  })
  it("Confirm's sentence names only the club and officers when there is no event", () => {
    const d = clubDraft(base()); d.name = "Fictional Skip Club"
    expect(summaryLine(d, null, "")).toMatch(/^This creates Fictional Skip Club with \d+ officers?\.$/)
  })
})
