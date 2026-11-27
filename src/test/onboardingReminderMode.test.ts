import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { seedDemo } from "../data/seed"
import { clubDraft, completeSetup, saveClubSettings, startWorkspace } from "../data/settings"
import { reducer } from "../data/store"
import { REMINDER_MODES, REMINDER_MODE_COPY, isReminderMode } from "../data/reminderMode"
import type { ReminderMode } from "../data/types"
import { parseCommand } from "../lib/commands"
import { FOUNDER_STEPS, stepAt } from "../onboarding/engine/flows"
import { FLOW_VERSION } from "../onboarding/record"
import { onboardingCopy } from "../onboarding/copy"

// S2 (Juanxi 2026-11-22): the founder walkthrough no longer asks how reminders go out (flow version ob-5; ob-6 since S6). New clubs start with the default
// (completeSetup, src/data/settings.ts); the president changes it in Settings. The three choices and their labels stay for Settings and Reminders.
// P3-H (2026-11-08) introduced the screen in ob-4; older exports still carry its answer (src/test/studySession.test.tsx).
const base = () => seedDemo("2026-10-22")
const code = "12345678-1234-1234-1234-123456789abc"
// The labels live only in src/data/reminderMode.ts now; the onboarding copy no longer carries a founder Reminders block.
const c = REMINDER_MODE_COPY
const read = (f: string) => readFileSync(join(__dirname, "..", f), "utf8")

describe("the founder flow without the Reminders screen (since ob-5)", () => {
  it("has three steps since ob-6, none of them Reminders, and the flow version says so", () => {
    expect(FLOW_VERSION).toBe("ob-6")
    expect(FOUNDER_STEPS.map(s => s.id)).toEqual(["founder.name", "founder.team", "founder.invite"])
    expect(FOUNDER_STEPS.some(s => /reminder/i.test(s.id) || /reminder/i.test(s.path) || /reminder/i.test(s.label))).toBe(false)
    expect(stepAt("/welcome/founder/reminders")).toBeNull()
  })
  it("removes the screen, its stylesheet and its draft field; Start workspace (on Team) passes no reminder choice", () => {
    expect(existsSync(join(__dirname, "../onboarding/founder/ReminderMode.tsx"))).toBe(false)
    expect(existsSync(join(__dirname, "../styles/ob-10-reminder-mode.css"))).toBe(false)
    expect(read("styles/index.css")).not.toMatch(/ob-10-reminder-mode/)
    expect(read("onboarding/draft.tsx")).not.toMatch(/reminderMode/)
    const team = read("onboarding/founder/Team.tsx")
    expect(team).not.toMatch(/reminderMode|confirm-reminders/)
    expect(team).toMatch(/type: "completeSetup"/)
    expect("reminders" in onboardingCopy.founder || "reminderMode" in onboardingCopy.founder.team).toBe(false)
  })
  it("sends the old address on to Team, which now finishes setup (Confirm folded into it in ob-6)", () => {
    expect(read("App.tsx")).toMatch(/<Route path="founder\/reminders" element=\{<Redirect to="\/welcome\/founder\/team" \/>\} \/>/)
  })
})

describe("the three reminder choices (still used by Settings and Reminders)", () => {
  it("keep a fixed order, each a short title and one line", () => {
    expect(REMINDER_MODES).toEqual(["auto_email", "review_then_self", "review_then_auto"])
    expect(REMINDER_MODES.map(m => c.options[m].title)).toEqual(["Send automatically", "I review, then I send", "I review, Platypus sends"])
    for (const m of REMINDER_MODES) expect(c.options[m].body.length).toBeGreaterThan(0)
    expect(c.title).toBe("How should reminders go out?")
  })
  it("isReminderMode accepts only the three values", () => {
    for (const m of REMINDER_MODES) expect(isReminderMode(m)).toBe(true)
    for (const v of ["auto", "review", "", null, undefined, 1, "AUTO_EMAIL"]) expect(isReminderMode(v)).toBe(false)
  })
})

describe("completeSetup with an explicit reminder choice", () => {
  it("stores each of the three answers (completeSetup and startWorkspace), and changes nothing about sending", () => {
    for (const mode of REMINDER_MODES) {
      const s = base(), d = clubDraft(s)
      const club = completeSetup(s, d, null, "", code, undefined, undefined, undefined, mode)
      expect(club.org.settings.reminderMode).toBe(mode)
      expect(club.org.settings.sendMode).toBe("review")
      const ws = startWorkspace(s, d, null, "", code, undefined, undefined, undefined, mode)
      expect(ws).not.toBe(s)
      expect(ws.org.settings.reminderMode).toBe(mode)
      expect(ws.org.settings.sendMode).toBe("review")
    }
  })
  it("without an answer (null or nothing) a new club gets the default review_then_auto (S2), never an earlier setup's answer", () => {
    const s = base(), d = clubDraft(s)
    expect(completeSetup(s, d, null, "", code).org.settings.reminderMode).toBe("review_then_auto")
    expect(completeSetup(s, d, null, "", code, undefined, undefined, undefined, null).org.settings.reminderMode).toBe("review_then_auto")
    const earlier = completeSetup(s, d, null, "", code, undefined, undefined, undefined, "auto_email")
    expect(startWorkspace(earlier, clubDraft(earlier), null, "", code, undefined, undefined, undefined, null).org.settings.reminderMode).toBe("review_then_auto")
  })
  it("refuses a value that is not one of the three", () => {
    const s = base(), d = clubDraft(s)
    expect(completeSetup(s, d, null, "", code, undefined, undefined, undefined, "auto" as ReminderMode)).toBe(s)
    expect(startWorkspace(s, d, null, "", code, undefined, undefined, undefined, "send_now" as ReminderMode)).toBe(s)
  })
  it("goes through the store's completeSetup action with a planned event too", () => {
    const s = base(), d = clubDraft(s)
    const event = parseCommand("Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding", s)[0]
    const next = reducer(s, { type: "completeSetup", draft: d, event, date: "2026-11-19", inviteCode: code, reminderMode: "review_then_auto" })
    expect(next.org.settings.reminderMode).toBe("review_then_auto")
    expect(next.events.some(e => e.id.startsWith("setup-event-"))).toBe(true)
    expect(reducer(s, { type: "completeSetup", draft: d, event: null, date: "", inviteCode: code }).org.settings.reminderMode).toBe("review_then_auto")
  })
  it("survives saving the club's settings page", () => {
    const s = base()
    const club = completeSetup(s, clubDraft(s), null, "", code, undefined, undefined, undefined, "review_then_self")
    expect(saveClubSettings(club, clubDraft(club), structuredClone(club.org.settings)).org.settings.reminderMode).toBe("review_then_self")
    const { reminderMode: _none, ...oldSettings } = s.org.settings; void _none
    const old = { ...s, org: { ...s.org, settings: oldSettings } }
    expect(saveClubSettings(old, clubDraft(old), { ...oldSettings, clubBufferBusinessDays: 4 }).org.settings.reminderMode).toBeUndefined()
  })
})
