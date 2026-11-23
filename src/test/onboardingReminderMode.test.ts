import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { seedDemo } from "../data/seed"
import { clubDraft, completeSetup, saveClubSettings, startWorkspace } from "../data/settings"
import { reducer } from "../data/store"
import { REMINDER_MODES, isReminderMode } from "../data/reminderMode"
import type { ReminderMode } from "../data/types"
import { parseCommand } from "../lib/commands"
import { FOUNDER_STEPS } from "../onboarding/engine/flows"
import { FLOW_VERSION } from "../onboarding/record"
import { onboardingCopy } from "../onboarding/copy"
import { reminderLine } from "../onboarding/founder/confirm/summary"

// P3-H (Juanxi 2026-11-08): the founder walkthrough asks how reminders should reach officers. The answer is only stored and exported:
// org.settings.reminderMode, absent after Skip for now. Nothing in the app sends because of it.
const base = () => seedDemo("2026-10-22")
const code = "12345678-1234-1234-1234-123456789abc"
const c = onboardingCopy.founder.reminders
const words = (s: string) => s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length

describe("the Reminders screen in the founder flow", () => {
  it("is optional and sits after First event and before Confirm; the flow version says so", () => {
    const ids = FOUNDER_STEPS.map(s => s.id)
    expect(ids.indexOf("founder.reminders")).toBe(ids.indexOf("founder.first-event") + 1)
    expect(ids.indexOf("founder.confirm")).toBe(ids.indexOf("founder.reminders") + 1)
    expect(FOUNDER_STEPS.find(s => s.id === "founder.reminders")).toMatchObject({ path: "founder/reminders", label: "Reminders", optional: true })
    expect(FLOW_VERSION).toBe("ob-4")
  })
  it("offers the three answers in a fixed order, each a short title and one line, within the 60-word screen", () => {
    expect(REMINDER_MODES).toEqual(["auto_email", "review_then_self", "review_then_auto"])
    expect(REMINDER_MODES.map(m => c.options[m].title)).toEqual(["Send automatically", "I review, then I send", "I review, Platypus sends"])
    const text = [c.title, c.lead, ...REMINDER_MODES.flatMap(m => [c.options[m].title, c.options[m].body]), c.demo, onboardingCopy.back, onboardingCopy.next, onboardingCopy.skip].join(" ")
    expect(words(text)).toBeLessThanOrEqual(60)
    expect(c.demo).toMatch(/no email is ever sent/)
  })
  it("starts with nothing chosen: the draft default is null and no radio is checked by default in the screen", () => {
    const screen = readFileSync(join(__dirname, "../onboarding/founder/ReminderMode.tsx"), "utf8")
    expect(screen).toMatch(/checked=\{draft\.reminderMode === mode\}/)
    expect(screen).not.toMatch(/defaultChecked/)
    expect(screen).toMatch(/disabled=\{!draft\.reminderMode\}/)
    expect(readFileSync(join(__dirname, "../onboarding/draft.tsx"), "utf8")).toMatch(/reminderMode: null/)
    // The screen never reaches the network or storage itself; the shared draft keeps the answer.
    expect(screen).not.toMatch(/fetch\(|localStorage|indexedDB|\/api\//)
  })
  it("isReminderMode accepts only the three values", () => {
    for (const m of REMINDER_MODES) expect(isReminderMode(m)).toBe(true)
    for (const v of ["auto", "review", "", null, undefined, 1, "AUTO_EMAIL"]) expect(isReminderMode(v)).toBe(false)
  })
})

describe("Start workspace keeps the answer in org.settings.reminderMode", () => {
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
  it("survives saving the club's settings page (old data without it stays valid)", () => {
    const s = base()
    const club = completeSetup(s, clubDraft(s), null, "", code, undefined, undefined, undefined, "review_then_self")
    expect(saveClubSettings(club, clubDraft(club), structuredClone(club.org.settings)).org.settings.reminderMode).toBe("review_then_self")
    const { reminderMode: _none, ...oldSettings } = s.org.settings; void _none
    const old = { ...s, org: { ...s.org, settings: oldSettings } }
    expect(saveClubSettings(old, clubDraft(old), { ...oldSettings, clubBufferBusinessDays: 4 }).org.settings.reminderMode).toBeUndefined()
  })
  it("Confirm names the answer in a few words", () => {
    expect(reminderLine("auto_email")).toBe("Reminders: Send automatically.")
    expect(reminderLine("review_then_self")).toBe("Reminders: I review, then I send.")
    expect(reminderLine("review_then_auto")).toBe("Reminders: I review, Platypus sends.")
  })
})

describe("the Reminders stylesheet", () => {
  it("uses tokens only, no !important and no motion (a choice shows at once)", () => {
    const css = readFileSync(join(__dirname, "../styles/ob-10-reminder-mode.css"), "utf8")
    expect(css).not.toMatch(/!important/)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\b(transition|animation)\s*:/)
    expect(readFileSync(join(__dirname, "../styles/index.css"), "utf8")).toMatch(/@import "\.\/ob-10-reminder-mode\.css";/)
  })
})
