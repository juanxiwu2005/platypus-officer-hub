import { describe, expect, it } from "vitest"
import { reducer } from "../data/store"
import { canChangeEvent } from "../data/changeReview"
import { seedDemo } from "../data/seed"
import type { DemoState } from "../data/types"

// Who may change an event's date, name and headcount follows who may create events (src/data/changeReview.ts).
// Event Details stay open to every officer (Juanxi, S0).
const base = seedDemo("2026-10-22", "v2")
const as = (viewerId: string, s: DemoState = base): DemoState => ({ ...s, viewerId })
const withMode = (mode: "leads" | "everyone" | "chosen", ids: string[] = []): DemoState => ({ ...base, org: { ...base.org, settings: { ...base.org.settings, eventCreators: mode, eventCreatorIds: ids } } })
const withVp = (): DemoState => ({ ...base, roles: [...base.roles, { id: "vp", fn: "vice_president" as const, displayName: "VP", holderId: "maya" }], people: base.people.map(p => p.id === "maya" ? { ...p, roleId: "vp" } : p) })
const night = (s: DemoState) => s.events.find(e => e.id === "e-night")!
const NEW_DATE = "2026-12-03"

describe("updateEvent permissions", () => {
  it("a non-lead officer cannot change the date, name or headcount", () => {
    const maya = as("maya")
    expect(reducer(maya, { type: "updateEvent", id: "e-night", patch: { date: NEW_DATE } })).toBe(maya)
    expect(reducer(maya, { type: "updateEvent", id: "e-night", patch: { name: "Renamed" } })).toBe(maya)
    expect(reducer(maya, { type: "updateEvent", id: "e-night", patch: { headcount: 999 } })).toBe(maya)
    expect(reducer(maya, { type: "updateEvent", id: "e-night", patch: { date: NEW_DATE, name: "Renamed", headcount: 999 } })).toBe(maya)
  })

  it("a non-lead officer can still edit Event Details, and only the details change", () => {
    const maya = as("maya")
    const next = reducer(maya, { type: "updateEvent", id: "e-night", patch: { details: "Bring the banner.", date: NEW_DATE, headcount: 999 } })
    expect(next).not.toBe(maya)
    expect(night(next).details).toBe("Bring the banner.")
    expect(night(next).date).toBe(night(maya).date)
    expect(night(next).headcount).toBe(night(maya).headcount)
  })

  it("the president and the VP can change the date", () => {
    expect(night(reducer(base, { type: "updateEvent", id: "e-night", patch: { date: NEW_DATE } })).date).toBe(NEW_DATE)
    expect(night(reducer(as("maya", withVp()), { type: "updateEvent", id: "e-night", patch: { date: NEW_DATE } })).date).toBe(NEW_DATE)
  })

  it("an officer the president chose can change the date; one not chosen cannot", () => {
    const chosen = as("maya", withMode("chosen", ["maya"]))
    expect(night(reducer(chosen, { type: "updateEvent", id: "e-night", patch: { date: NEW_DATE } })).date).toBe(NEW_DATE)
    const other = as("sam", withMode("chosen", ["maya"]))
    expect(reducer(other, { type: "updateEvent", id: "e-night", patch: { date: NEW_DATE } })).toBe(other)
  })

  it("with \"everyone\", any officer can change the date, name and headcount", () => {
    const next = reducer(as("sam", withMode("everyone")), { type: "updateEvent", id: "e-night", patch: { date: NEW_DATE, name: "Renamed", headcount: 42 } })
    expect(night(next)).toMatchObject({ date: NEW_DATE, name: "Renamed", headcount: 42 })
  })

  it("a former or incoming officer cannot change an event even when everyone may create events", () => {
    const open = withMode("everyone")
    const former = as("maya", { ...open, people: open.people.map(p => p.id === "maya" ? { ...p, leftOn: "2026-10-20" } : p) })
    const incoming = as("maya", { ...open, people: open.people.map(p => p.id === "maya" ? { ...p, incomingFor: open.roles[0].id } : p) })
    for (const s of [former, incoming]) {
      expect(canChangeEvent(s)).toBe(false)
      expect(reducer(s, { type: "updateEvent", id: "e-night", patch: { date: NEW_DATE } })).toBe(s)
    }
    expect(canChangeEvent(as("maya", open))).toBe(true)
  })
})
