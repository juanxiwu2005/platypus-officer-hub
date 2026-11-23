import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { clubDraft, completeSetup } from "../data/settings"
import { parseCommand } from "../lib/commands"
import { freshDraft } from "../onboarding/draft"
import { EVENT_STEP, finishSetup } from "../onboarding/founder/team/finish"
import { onboardingCopy } from "../onboarding/copy"
import { firstEventChoice, firstEventStep, type OnboardingAttempt } from "../lib/onboardingRecord"

// Phase 3: the founder walkthrough's first event can be skipped. Start workspace (on Team since ob-6; Confirm before) then calls completeSetup
// with no event (null) and no date ("").
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
  it("Team's Start workspace: no event after Skip for now on screen 1, the planned event otherwise, and a typed address still asks for one", () => {
    const s = base(), d = freshDraft(s); d.club.name = "Fictional Skip Club"
    const none = finishSetup(d, d.club, s.today)
    expect(none).toEqual({ ok: false, problem: onboardingCopy.founder.team.missing, needsEvent: true })
    const skipped = finishSetup({ ...d, skipped: [EVENT_STEP] }, d.club, s.today)
    expect(skipped.ok && skipped.event === null && skipped.date === "").toBe(true)
    const event = parseCommand("Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding", s)[0]
    const planned = finishSetup({ ...d, event: event as never, date: "2026-11-19" }, d.club, s.today)
    expect(planned.ok && planned.date === "2026-11-19").toBe(true)
    expect(finishSetup({ ...d, event: event as never, date: "2026-10-01" }, d.club, s.today).ok).toBe(false)   // a date before today
  })
  it("no mission is asked any more: an empty one becomes the standard line, a read or typed one stays, and no goals are written", () => {
    const s = base(), d = freshDraft(s); d.club.name = "Fictional Skip Club"
    const plain = finishSetup({ ...d, skipped: [EVENT_STEP] }, d.club, s.today)
    expect(plain.ok && plain.club.mission).toBe(onboardingCopy.founder.team.mission)
    expect(plain.ok && plain.club.goals).toEqual([])
    const own = finishSetup({ ...d, skipped: [EVENT_STEP], club: { ...d.club, mission: "Build robots together." } }, d.club, s.today)
    expect(own.ok && own.club.mission).toBe("Build robots together.")
    expect(plain.ok && completeSetup(s, plain.club, null, "", code)).not.toBe(s)
  })
})

describe("firstEventChoice across flow versions (the export's plan-or-skip answer)", () => {
  const attempt = (flowVersion: string, step: string, events: string[]): OnboardingAttempt => ({ id: "a", entry: "start", flowVersion, replay: 0, startedAt: 1, steps: events.map((event, i) => ({ step, event: event as never, at: 10 + i })) })
  it("reads the First event screen up to ob-5 and screen 1 since ob-6, so older files export the same answer", () => {
    expect(firstEventStep("ob-3")).toBe("founder.first-event")
    expect(firstEventStep("ob-5")).toBe("founder.first-event")
    expect(firstEventStep("ob-6")).toBe("founder.name")
    expect(firstEventChoice(attempt("ob-5", "founder.first-event", ["enter", "skip", "leave"]))).toBe("skipped")
    expect(firstEventChoice(attempt("ob-4", "founder.first-event", ["enter", "leave"]))).toBe("planned")
    expect(firstEventChoice(attempt("ob-6", "founder.name", ["enter", "skip", "leave"]))).toBe("skipped")
    expect(firstEventChoice(attempt("ob-6", "founder.name", ["enter", "leave"]))).toBe("planned")
    // an ob-5 attempt's founder.name leave is not the first event's answer
    expect(firstEventChoice(attempt("ob-5", "founder.name", ["enter", "leave"]))).toBeNull()
  })
})
