import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { webcrypto } from "node:crypto"
import { RailProvider } from "../components/rail/RailContext"
import { StoreProvider, reducer, STORAGE_KEY, useStore } from "../data/store"
import { seedDemo } from "../data/seed"
import { applySchedule } from "../engine/schedule"
import type { DemoState, ReminderMode } from "../data/types"
import { createReminderRuntime } from "../reminders/engine"
import Today from "./Today"

let latest: DemoState
function Observer() { latest = useStore().state; return null }
function fixture(mode: ReminderMode = "review_then_auto", active = true): DemoState {
  const s = seedDemo(undefined, "v2")
  const event = { ...s.events[0], id: "centre-event", name: "Speaker Night", date: "2026-11-19", headcount: 40, venue: "campus" as const, budgetItems: [] }
  const original = s.nodes.find(n => n.id === "t-room")!
  const nodes = ["room", "room-two"].map(id => ({ ...original, id, eventId: event.id, title: id === "room" ? "Reserve a room" : "Confirm the room layout", ownerVersion: 0,
    dependsOn: [], status: "accepted" as const, anchor: { kind: "fixed" as const, official: null, club: "2026-11-05" } }))
  const scheduled = applySchedule({ ...s, nodes, events: [event], nudges: [], protocolLog: [], notifications: [], funding: [], silenceCases: [], extensionRequests: [],
    org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode } } })
  const state = { ...scheduled, today: scheduled.nodes[0].latestStart! }
  return active ? reducer(state, { type: "upgradeReminderPlan" }) : state
}
const show = (state = fixture()) => render(<MemoryRouter><StoreProvider initial={state}><RailProvider><Observer /><Today /></RailProvider></StoreProvider></MemoryRouter>)
const section = (id: string) => within(screen.getByTestId(id))
beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe("reminder centre with the actual provider and preparation service", () => {
  it("batch approval saves complete checked mail and task entries before displaying demo history", async () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Approve all (2)" }))
    await screen.findByText("2 reminders saved as a demo. Nothing was sent.")
    expect(latest.reminderRuntime!.deliveries).toHaveLength(2)
    expect(latest.taskAccessGrants).toHaveLength(2)
    for (const d of latest.reminderRuntime!.deliveries) {
      expect(d.message).toMatchObject({ source: "rules", checked: true, channel: "email", recipientId: "jordan" })
      expect(d.message!.body.match(/https?:\/\/\S+/g)).toEqual([d.message!.taskUrl])
      expect(d.message!.subject).toMatch(/^Speaker Night · /)
    }
    expect(section("rq-sent").getAllByText("Approved demo")).toHaveLength(2)
    expect(section("rq-sent").queryByText(/Would be sent/)).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).reminderRuntime.deliveries).toHaveLength(2)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("failed batch persistence creates no grants, history or success claim", async () => {
    show()
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY) throw new Error("No storage")
      original.call(this, key, value)
    })
    fireEvent.click(screen.getByRole("button", { name: "Approve all (2)" }))
    await screen.findByText(/0 reminders saved as a demo/)
    expect(latest.reminderRuntime!.deliveries).toEqual([])
    expect(latest.taskAccessGrants).toBeUndefined()
    expect(section("rq-sent").queryByText("Approved demo")).toBeNull()
  })

  it("automatic preparation exposes a real failure and retries only on request", async () => {
    const original = Storage.prototype.setItem
    let fail = true
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY && fail) throw new Error("No storage")
      original.call(this, key, value)
    })
    show(fixture("auto_email"))
    const retry = await screen.findByRole("button", { name: "Retry automatic reminders" })
    expect(latest.reminderRuntime!.deliveries).toEqual([])
    const calls = write.mock.calls.length
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(write.mock.calls).toHaveLength(calls)
    fail = false
    fireEvent.click(retry)
    await waitFor(() => expect(latest.reminderRuntime!.deliveries).toHaveLength(2))
    expect(section("rq-sent").getAllByText("Automatic demo")).toHaveLength(2)
    expect(latest.reminderRuntime!.deliveries.every(d => !!d.message?.checked)).toBe(true)
    expect(screen.queryByRole("button", { name: "Retry automatic reminders" })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("upgrades v1 explicitly, keeps custom settings and earlier history, then saves a legacy review", async () => {
    const s = fixture("review_then_self", false)
    const old = { id: "old", nodeId: "room", channel: "email" as const, text: "Earlier mail", sentBy: "alex", sentOn: s.today, response: null }
    show({ ...s, reminderRuntime: { ...createReminderRuntime(s.today), legacyUnresolvedNodeIds: ["room"] }, nudges: [old] })
    expect(section("rq-needs-ok").queryByRole("button", { name: "Review & open draft" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Enable updated reminders" }))
    await screen.findByText("Updated reminders are enabled.")
    expect(latest.org.settings).toEqual(s.org.settings)
    expect(latest.nudges).toEqual([old])
    fireEvent.click(screen.getByRole("button", { name: "I checked · allow future reminders" }))
    await screen.findByText("Future reminders are enabled for the current assignment. Earlier history is unchanged.")
    expect(latest.reminderRuntime!.legacyUnresolvedNodeIds).toEqual([])
    expect(latest.reminderRuntime!.deliveries).toEqual([])
    expect(section("rq-sent").getByText("Earlier reminder · recipient not recorded")).toBeTruthy()
  })

  it("failed activation and legacy review keep their prior saved state", async () => {
    const s = fixture("review_then_self", false)
    show(s)
    const original = Storage.prototype.setItem
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY) throw new Error("No storage")
      original.call(this, key, value)
    })
    fireEvent.click(screen.getByRole("button", { name: "Enable updated reminders" }))
    await screen.findByText("The reminder plan was not saved. Restore saving and try again.")
    expect(latest.reminderRuntime).toBeUndefined()
    expect(screen.queryByText("Updated reminders are enabled.")).toBeNull()
    write.mockRestore(); cleanup(); localStorage.clear()
    const active = fixture("review_then_self")
    show({ ...active, reminderRuntime: { ...active.reminderRuntime!, legacyUnresolvedNodeIds: ["room"] } })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("No storage") })
    fireEvent.click(screen.getByRole("button", { name: "I checked · allow future reminders" }))
    await screen.findByText("This review was not saved. Check the current assignment and browser saving.")
    expect(latest.reminderRuntime!.legacyUnresolvedNodeIds).toEqual(["room"])
    expect(latest.reminderRuntime!.deliveries).toEqual([])
  })

  it.each([null, false, 0, "", { version: 12 }])("preserves an invalid saved plan and offers no overwrite (%j)", invalid => {
    show({ ...fixture(), reminderRuntime: invalid as unknown as NonNullable<DemoState["reminderRuntime"]> })
    expect(screen.getByRole("heading", { name: "Reminder plan needs review" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Enable updated reminders" })).toBeNull()
    expect(screen.queryByTestId("approve-all")).toBeNull()
    expect(latest.reminderRuntime).toBe(invalid)
    expect(latest.taskAccessGrants).toBeUndefined()
  })

  it("ordinary members cannot approve, enable or review legacy reminders and only see their recorded recipient history", async () => {
    const s = fixture()
    show({ ...s, viewerId: "sam" })
    expect(screen.getByTestId("your-reminders")).toBeTruthy()
    expect(screen.queryByTestId("reminder-centre")).toBeNull()
    expect(screen.queryByRole("button", { name: /Approve|Enable|allow future/ })).toBeNull()
    expect(latest.reminderRuntime!.deliveries).toEqual([])
    cleanup()
    const recorded = { ...s, reminderRuntime: { ...createReminderRuntime(s.today), sequence: 1, deliveries: [{ id: "old-delivery", candidateId: "old", nodeId: "room", ownerId: "jordan", ownerVersion: 0, recipientId: "jordan", recipientName: "Jordan when sent", taskTitle: "Original room task", eventName: "Earlier event", due: s.today, reason: "start" as const, planKey: "old", scheduledOn: s.today, sentOn: s.today, sequence: 1, via: "manual" as const, outcome: "recorded_by_sender" as const }] } }
    show({ ...recorded, viewerId: "jordan", nodes: recorded.nodes.map(n => ({ ...n, ownerId: "sam", ownerVersion: 1 })) })
    expect(section("your-reminders").getByText("Jordan when sent")).toBeTruthy()
    expect(section("your-reminders").getByText("Original room task")).toBeTruthy()
    expect(section("your-reminders").queryByText("Sam Okafor")).toBeNull()
  })
})
