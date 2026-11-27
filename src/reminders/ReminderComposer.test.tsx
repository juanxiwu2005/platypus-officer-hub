import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { webcrypto } from "node:crypto"
import { StoreProvider, reducer, STORAGE_KEY, useStore } from "../data/store"
import { seedDemo } from "../data/seed"
import { applySchedule } from "../engine/schedule"
import type { DemoState, ReminderMode } from "../data/types"
import ReminderComposer from "./ReminderComposer"
import { makeTaskAccessGrant, taskAccessUrl } from "./taskAccess"
import { buildReminderFacts, reminderPeople } from "./facts"
import { buildReminderMail } from "./mail"

const NODE = "mail-room"
let latest: DemoState
function Controls() {
  const { state, dispatch } = useStore()
  latest = state
  return <>
    <button type="button" onClick={() => dispatch({ type: "updateNode", id: NODE, patch: { ownerId: "sam" } })}>Reassign to Sam</button>
    <button type="button" onClick={() => dispatch({ type: "setViewer", viewerId: "sam" })}>View as Sam</button>
  </>
}
function fixture(mode: ReminderMode = "review_then_self", enable = true): DemoState {
  const s = seedDemo(undefined, "v2")
  const event = { ...s.events[0], id: "mail-speaker", name: "Speaker Night", date: "2026-11-19", headcount: 40, venue: "campus" as const, budgetItems: [] }
  const node = { ...s.nodes.find(n => n.id === "t-room")!, id: NODE, eventId: event.id, stepKey: "venue", title: "Reserve a room", ownerVersion: 0, dependsOn: [], status: "accepted" as const,
    why: "Confirming the room lets us share the location with everyone.", anchor: { kind: "fixed" as const, official: null, club: "2026-11-05" } }
  const scheduled = applySchedule({ ...s, nodes: [node], events: [event], funding: [], notifications: [], nudges: [], protocolLog: [], silenceCases: [], extensionRequests: [], org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode } } })
  const current = { ...scheduled, today: scheduled.nodes[0].latestStart! }
  return enable ? reducer(current, { type: "enableReminderPlan" }) : current
}
const show = (state = fixture(), onClose = vi.fn()) => render(<MemoryRouter><StoreProvider initial={state}><Controls /><ReminderComposer nodeId={NODE} onClose={onClose} /></StoreProvider></MemoryRouter>)
const preview = () => within(screen.getByRole("region", { name: "Reminder email" }))
const emailDraft = () => screen.getByRole("link", { name: "Open Gmail draft" })

beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto) })
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })

describe("real reminder composer state integration", () => {
  it("prepares an immediate rule-only mail with one reusable entry and no AI controls or requests", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    show({ ...fixture(), aiEnabled: true })
    await waitFor(() => expect(preview().getByRole("link", { name: "Open task" })).toBeTruthy())
    expect(preview().getByRole("heading", { name: "Speaker Night · Reserve a room" })).toBeTruthy()
    expect(preview().getAllByRole("link")).toHaveLength(1)
    expect(preview().getByRole("link").getAttribute("href")).toContain("/#/events?event=")
    expect(screen.getByTestId("nudge-body").textContent).toContain("40 attendees")
    expect(screen.getByTestId("nudge-body").textContent).toContain("booking confirmation")
    expect(screen.queryByRole("button", { name: /Skip AI|Done|Working on it/ })).toBeNull()
    expect(screen.queryByRole("group", { name: "Recipient status choices" })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.queryByTestId("reminder-mode-note")).toBeNull()
    expect(latest.nudges).toEqual([])
  })

  it("opening the task or email draft does not record a send; explicit confirmation saves the exact checked snapshot", async () => {
    show()
    await waitFor(() => expect(preview().getByRole("link", { name: "Open task" })).toBeTruthy())
    expect(screen.queryByRole("button", { name: "I sent this reminder" })).toBeNull()
    fireEvent.click(preview().getByRole("link", { name: "Open task" }))
    expect(latest.nudges).toEqual([])
    fireEvent.change(screen.getByLabelText("Preferred channel"), { target: { value: "email" } })
    fireEvent.click(emailDraft())
    expect(latest.nudges).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: "I sent this reminder" }))
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Recorded as sent by you"))
    expect(latest.nudges).toEqual([])
    expect(latest.reminderRuntime!.deliveries).toHaveLength(1)
    const recorded = latest.reminderRuntime!.deliveries[0].message!
    expect(recorded.source).toBe("rules")
    expect(recorded.recipientId).toBe("jordan")
    expect(recorded.channel).toBe("email")
    expect(recorded.text).toBe(`${recorded.subject}\n\n${recorded.body}`)
    expect(recorded.body.match(/https?:\/\/\S+/g)).toEqual([recorded.taskUrl])
    expect(latest.taskAccessGrants?.some(g => g.id === recorded.accessId)).toBe(true)
  })

  it("platform approval uses email and succeeds only once the new runtime records the message", async () => {
    show(fixture("review_then_auto", true))
    const approve = await screen.findByRole("button", { name: "Send" })
    expect(screen.queryByLabelText("Preferred channel")).toBeNull()
    expect(screen.queryByTestId("reminder-mode-note")).toBeNull()
    expect(latest.reminderRuntime!.deliveries).toEqual([])
    fireEvent.click(approve)
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Sent."))
    expect(latest.reminderRuntime!.deliveries).toHaveLength(1)
    expect(latest.reminderRuntime!.deliveries[0]).toMatchObject({ via: "platypus", outcome: "simulated", message: { source: "rules", channel: "email", recipientId: "jordan" } })
    expect(latest.nudges).toEqual([])
  })

  it("waiting follow-up goes to the helper with its own scope and keeps that recipient after recording", async () => {
    const enabled = fixture("review_then_self", true)
    const waiting = reducer({ ...enabled, viewerId: "jordan" }, { type: "replyTask", nodeId: NODE, reply: "waiting", input: { waitingOn: "Please confirm which room layout is needed", waitingOnPersonId: "sam" } })
    show({ ...waiting, viewerId: "alex" })
    await screen.findByRole("link", { name: "Open Gmail draft" })
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Sam Okafor")
    expect(screen.getByTestId("nudge-body").textContent).toContain("Jordan Patel is waiting for your input")
    expect(screen.getByTestId("nudge-body").textContent).not.toContain("Reserve a room for 40 attendees")
    expect(latest.taskAccessGrants!.at(-1)).toMatchObject({ scope: "waiting", ownerId: "jordan", recipientId: "sam" })
    fireEvent.click(emailDraft())
    fireEvent.click(screen.getByRole("button", { name: "I sent this reminder" }))
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Recorded as sent by you"))
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Sam Okafor")
    expect(latest.reminderRuntime!.deliveries[0].message).toMatchObject({ recipientId: "sam", channel: "email", intendedEmail: "sam.okafor@example.org" })
    expect(latest.nodes[0].ownerId).toBe("jordan")
  })

  it("changing channels or assignment invalidates an opened draft before it can be confirmed", async () => {
    show()
    await waitFor(() => expect(preview().getByRole("link", { name: "Open task" })).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Preferred channel"), { target: { value: "email" } })
    fireEvent.click(emailDraft())
    expect(screen.getByRole("button", { name: "I sent this reminder" })).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Preferred channel"), { target: { value: "whatsapp" } })
    expect(screen.queryByRole("button", { name: "I sent this reminder" })).toBeNull()
    fireEvent.click(screen.getByRole("link", { name: "Open WhatsApp draft" }))
    fireEvent.click(screen.getByRole("button", { name: "Reassign to Sam" }))
    await waitFor(() => expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Sam Okafor"))
    expect(screen.queryByRole("button", { name: "I sent this reminder" })).toBeNull()
    expect(latest.nudges).toEqual([])
  })

  it("respects recipient limits, unavailable waiting targets and sender permissions", async () => {
    const enabled = fixture("review_then_auto", true)
    const waiting = reducer({ ...enabled, viewerId: "jordan" }, { type: "replyTask", nodeId: NODE, reply: "waiting", input: { waitingOn: "School approval" } })
    show({ ...waiting, viewerId: "alex" })
    expect(screen.getByRole("status").textContent).toContain("Choose who this task is waiting on")
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull()
    cleanup()
    show({ ...fixture(), viewerId: "sam" })
    expect(screen.getByRole("status").textContent).toContain("Only the president or vice president")
    expect(latest.taskAccessGrants).toBeUndefined()
  })

  it("returns focus to its heading and closes on Escape", async () => {
    const close = vi.fn()
    show(fixture(), close)
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }))
    await waitFor(() => expect(preview().getByRole("link", { name: "Open task" })).toBeTruthy())
    fireEvent.keyDown(window, { key: "Escape" })
    expect(close).toHaveBeenCalledTimes(1)
  })

  it("never exposes an unsaved task link when browser persistence fails", async () => {
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable") })
    try {
      show()
      await screen.findByText(/This browser could not save your changes/)
      expect(screen.queryByRole("link", { name: "Open task" })).toBeNull()
      expect(screen.queryByRole("link", { name: "Open Gmail draft" })).toBeNull()
      expect(latest.taskAccessGrants).toBeUndefined()
      expect(latest.nudges).toEqual([])
    } finally { write.mockRestore() }
  })

  it("does not assume an existing in-memory grant was saved", async () => {
    const state = fixture()
    const grant = await makeTaskAccessGrant(state, NODE)
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable") })
    try {
      show({ ...state, taskAccessGrants: [grant] })
      await screen.findByText(/This browser could not save your changes/)
      expect(screen.queryByRole("link", { name: "Open task" })).toBeNull()
      expect(screen.queryByRole("link", { name: "Open Gmail draft" })).toBeNull()
      expect(latest.nudges).toEqual([])
    } finally { write.mockRestore() }
  })

  it("blocks a malformed reminder ledger without reading its invalid delivery entries", () => {
    const state = fixture()
    const invalid = { version: 1, activatedOn: state.today, sequence: 1, updates: [], waitingRequests: [], deliveries: [null] }
    expect(() => show({ ...state, reminderRuntime: invalid as unknown as NonNullable<DemoState["reminderRuntime"]> })).not.toThrow()
    expect(screen.getByRole("status").textContent).toContain("Review the saved reminder plan")
    expect(screen.queryByRole("link", { name: "Open task" })).toBeNull()
    expect(latest.reminderRuntime).toEqual(invalid)
  })

  it.each([null, 0, false, ""])("preserves and disables a saved falsy reminder ledger (%s)", async invalid => {
    const state = { ...fixture(), reminderRuntime: invalid as unknown as NonNullable<DemoState["reminderRuntime"]> }
    expect(() => show(state)).not.toThrow()
    await screen.findByText("Review the saved reminder plan before preparing another message.")
    expect(screen.queryByRole("link", { name: "Open task" })).toBeNull()
    expect(screen.queryByRole("link", { name: /Open .* draft/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull()
    expect(latest.taskAccessGrants).toBeUndefined()
    expect(latest.nudges).toEqual([])
    expect(latest.reminderRuntime).toBe(invalid)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).reminderRuntime).toBe(invalid)
  })

  it("a failed confirmation write cannot publish an in-memory send or display success", async () => {
    show()
    await waitFor(() => expect(preview().getByRole("link", { name: "Open task" })).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Preferred channel"), { target: { value: "email" } })
    fireEvent.click(emailDraft())
    const confirm = screen.getByRole("button", { name: "I sent this reminder" })
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable") })
    try {
      fireEvent.click(confirm)
      await screen.findByText(/This browser could not save your changes/)
      expect(latest.nudges).toEqual([])
      expect(screen.queryByText(/Recorded as sent by you/)).toBeNull()
      expect(screen.queryByRole("button", { name: "I sent this reminder" })).toBeNull()
    } finally { write.mockRestore() }
  })

  it.each([false, true])("a previous message is history rather than a new confirmation on reopening (saving fails: %s)", async fail => {
    const s = fixture("review_then_auto")
    const grant = await makeTaskAccessGrant(s, NODE)
    const issued = reducer(s, { type: "issueTaskAccessGrant", grant })
    const recipient = reminderPeople(issued).find(p => p.id === "jordan")!
    const mail = buildReminderMail({ today: issued.today, facts: buildReminderFacts(issued, NODE)!, recipient, taskUrl: taskAccessUrl(window.location.origin, grant) })
    const snapshot = { ...mail, channel: "email" as const, preparedOn: issued.today, accessId: grant.id }
    const first = reducer(issued, { type: "confirmNudgeSent", nodeId: NODE, text: mail.text, channel: "email", via: "platypus", message: snapshot })
    expect(first.reminderRuntime!.deliveries).toHaveLength(1)
    const write = Storage.prototype.setItem
    const failed = fail ? vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY) throw new Error("Storage unavailable")
      return write.call(this, key, value)
    }) : null
    try {
      show(first)
      await screen.findByRole("button", {name: "Reminder unavailable"})
      expect(latest.reminderRuntime!.deliveries).toEqual(first.reminderRuntime!.deliveries)
      expect(screen.queryByText("Sent.")).toBeNull()
      expect(screen.queryByRole("button", { name: "Send" })).toBeNull()
    } finally { failed?.mockRestore() }
  })

  it("prepares nothing for absent and v1 plans and says only that the plan is unavailable", async () => {
    // S2: loads upgrade the plan themselves, so a legacy plan here can only be data held back for download; there is no setup link.
    const old = fixture("review_then_self", false)
    for (const state of [old, {...fixture(), reminderRuntime: {...fixture().reminderRuntime!, version: 1 as const}}]) {
      show(state)
      await screen.findByText("Reminder plan unavailable.")
      expect(screen.queryByRole("link", {name: "Set up reminders"})).toBeNull()
      expect(screen.queryByText(/Enable updated reminders/)).toBeNull()
      expect(screen.queryByRole("link", {name: "Open task"})).toBeNull()
      expect(latest.taskAccessGrants).toBeUndefined()
      cleanup()
    }
  })
})
