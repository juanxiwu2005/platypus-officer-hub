import { describe, expect, it } from "vitest"
import { createReminderRuntime } from "./engine"
import { isReminderRuntime } from "./runtime"
import { loadState, reducer, STORAGE_KEY } from "../data/store"
import { seedDemo } from "../data/seed"

describe("saved reminder ledger validation", () => {
  it("accepts an empty initialized ledger and preserves JSON round trips", () => {
    const r = createReminderRuntime("2026-11-02")
    expect(isReminderRuntime(r)).toBe(true)
    expect(isReminderRuntime(JSON.parse(JSON.stringify(r)))).toBe(true)
  })

  it.each([
    { deliveries: [null] }, { updates: [null] }, { waitingRequests: [null] },
    { activatedOn: "2026-02-30" }, { activatedOn: "later" }, { sequence: -1 },
    { legacyUnresolvedNodeIds: [null] }, { version: 2 },
    { updates: [{ id: "u", nodeId: "n", sequence: 1, ownerId: "jordan", ownerVersion: 0, actorId: "jordan", on: "2026-11-02", status: "done", ownerReply: true }] },
  ])("rejects malformed records without losing the original saved field: %j", patch => {
    const saved = { ...seedDemo(undefined, "v2"), reminderRuntime: { ...createReminderRuntime("2026-11-02"), ...patch }, org: { ...seedDemo().org, settings: { ...seedDemo().org.settings, reminderMode: "auto_email" } } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadState()
    const original = structuredClone(loaded.reminderRuntime)
    expect(isReminderRuntime(original)).toBe(false)
    expect(() => reducer(loaded, { type: "setViewer", viewerId: "sam" })).not.toThrow()
    const viewed = reducer(loaded, { type: "setViewer", viewerId: "sam" })
    expect(viewed.reminderRuntime).toEqual(original)
    expect(reducer(loaded, { type: "advanceClock", days: 1 }).today).toBe(loaded.today)
    expect(reducer(loaded, { type: "enableReminderPlan" }).reminderRuntime).toEqual(original)
    localStorage.clear()
  })
})
