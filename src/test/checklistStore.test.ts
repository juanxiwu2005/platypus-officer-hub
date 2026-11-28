import { beforeEach, describe, expect, it } from "vitest"
import type { DemoState, OnboardingChecklist } from "../data/types"
import { SCHEMA_VERSION, seedDemo } from "../data/seed"
import { appendLog, loadStateWithNotice, reducer, STORAGE_KEY } from "../data/store"
import { starterChecklist } from "../data/checklistStarter"
import { countItems, toggleCell } from "../lib/checklist"

const base = () => seedDemo(undefined, "v2")
const save = (s: DemoState, checklist: OnboardingChecklist | null) => reducer(s, { type: "saveOnboardingChecklist", checklist })
const withStarter = () => { const s = base(); return save(s, starterChecklist(s)) }

describe("saveOnboardingChecklist", () => {
  beforeEach(() => localStorage.clear())

  it("keeps SCHEMA_VERSION at 23 and gives the seed no checklist", () => {
    expect(SCHEMA_VERSION).toBe(23)
    expect(base().org.onboardingChecklist).toBeUndefined()
    expect("onboardingChecklist" in base().org).toBe(false)
  })

  it("lets the president save the starter, stamped with the demo day", () => {
    const s = base(), next = withStarter()
    expect(next).not.toBe(s)
    expect(next.org.onboardingChecklist?.modules).toHaveLength(5)
    expect(next.org.onboardingChecklist?.updatedOn).toBe(s.today)
    expect(next.nodes).toEqual(s.nodes)
    expect(next.roles).toEqual(s.roles)
  })

  it("refuses a viewer who is not president or vice president, and a non-officer", () => {
    const s = base()
    const officer = { ...s, viewerId: s.roles.find(r => r.fn === "finance")!.holderId! }
    expect(save(officer, starterChecklist(s))).toBe(officer)
    const saved = withStarter()
    const asOfficer = { ...saved, viewerId: officer.viewerId }
    expect(save(asOfficer, null)).toBe(asOfficer)
    const outsider = { ...s, people: s.people.map(p => p.id === s.viewerId ? { ...p, leftOn: s.today } : p) }
    expect(save(outsider, starterChecklist(s))).toBe(outsider)
  })

  it("returns the same state for invalid input and for a save that changes nothing but the day", () => {
    const s = base()
    expect(save(s, { version: 2 } as unknown as OnboardingChecklist)).toBe(s)
    expect(save(s, "junk" as unknown as OnboardingChecklist)).toBe(s)
    const saved = withStarter()
    const later = { ...saved, today: "2027-01-05" }
    expect(save(later, { ...saved.org.onboardingChecklist!, updatedOn: "1999-01-01" })).toBe(later)
    expect(save(later, structuredClone(saved.org.onboardingChecklist!))).toBe(later)
  })

  it("saves a real change and stamps today", () => {
    const saved = withStarter(), c = saved.org.onboardingChecklist!
    const later = { ...saved, today: "2027-01-05" }
    const changed: OnboardingChecklist = { ...c, modules: c.modules.map((m, k) => k === 0 ? { ...m, items: m.items.map((i, j) => j === 0 ? toggleCell(i, "r-fin") : i) } : m) }
    const next = save(later, changed)
    expect(next).not.toBe(later)
    expect(next.org.onboardingChecklist!.modules[0].items[0].hiddenFor).toEqual(["r-fin"])
    expect(next.org.onboardingChecklist!.updatedOn).toBe("2027-01-05")
  })

  it("drops unknown and archived role ids against the current roles", () => {
    const saved = withStarter(), c = saved.org.onboardingChecklist!
    const withGhost: OnboardingChecklist = { ...c, modules: c.modules.map((m, k) => k === 0 ? { ...m, items: m.items.map((i, j) => j === 0 ? { ...i, hiddenFor: ["r-ghost", "r-fin"] } : i) } : m) }
    const archived = { ...saved, roles: saved.roles.filter(r => r.id !== "r-fin") }
    const next = save(archived, withGhost)
    expect(next.org.onboardingChecklist!.modules[0].items[0].hiddenFor).toEqual([])
    const training = next.org.onboardingChecklist!.modules[1].items.find(i => i.title === "Complete Officer Training")!
    expect(training.roleIds).toEqual(["r-pres"])
  })

  it("null removes the field (start over), and is a no-op when there is nothing to remove", () => {
    const s = base()
    expect(save(s, null)).toBe(s)
    const cleared = save(withStarter(), null)
    expect("onboardingChecklist" in cleared.org).toBe(false)
  })

  it("leaves an old save without the field unaffected, and keeps a saved checklist across a reload", () => {
    const s = base()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    const old = loadStateWithNotice()
    expect(old.notice).toBeNull()
    expect(old.state.org.onboardingChecklist).toBeUndefined()
    expect(old.state.schemaVersion).toBe(SCHEMA_VERSION)
    const saved = withStarter()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadStateWithNotice()
    expect(loaded.notice).toBeNull()
    expect(loaded.state.org.onboardingChecklist).toEqual(saved.org.onboardingChecklist)
  })

  it("logs counts only, never checklist titles", () => {
    const s = base(), saved = withStarter()
    const first = appendLog([], s, saved, { type: "saveOnboardingChecklist", checklist: saved.org.onboardingChecklist! }, 1)[0]
    expect(first.before).toEqual({ onboardingModules: 0, onboardingItems: 0 })
    expect(first.payload).toEqual({ cleared: false, modules: 5, items: countItems(saved.org.onboardingChecklist!) })
    const cleared = save(saved, null)
    const second = appendLog([], saved, cleared, { type: "saveOnboardingChecklist", checklist: null }, 2)[0]
    expect(second.before).toEqual({ onboardingModules: 5, onboardingItems: 23 })
    expect(second.payload).toEqual({ cleared: true, modules: 0, items: 0 })
    expect(JSON.stringify([first, second])).not.toContain("Meet your buddy")
  })
})
