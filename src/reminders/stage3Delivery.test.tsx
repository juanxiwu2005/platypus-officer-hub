import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { reducer, STORAGE_KEY, StoreProvider, useStore, type Action } from "../data/store"
import type { DemoState, ReminderMode } from "../data/types"
import { applySchedule } from "../engine/schedule"
import { confirmReminderDelivery, createReminderRuntime, planReminders } from "./engine"
import { buildReminderInput } from "./facts"
import { isReminderRuntime } from "./runtime"
import { sendReminderBatch } from "./delivery"
import { taskAccessToken, verifyTaskAccessGrant } from "./taskAccess"
import { addDays } from "../lib/dates"

const NODE = "t-room"
function fixture(mode: ReminderMode = "review_then_auto", count = 1): DemoState {
  const s = seedDemo(undefined, "v2"), source = s.nodes.find(n => n.id === NODE)!
  const scheduled = applySchedule({ ...s, org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode } },
    nodes: Array.from({length: count}, (_, i) => ({ ...source, id: i ? `${NODE}-${i}` : NODE, ownerId: "jordan", ownerVersion: 0, status: "accepted", dependsOn: [], eventId: null, anchor: { kind: "fixed", official: null, club: "2026-11-05" }, waitingOn: null, waitingOnPersonId: null, clubDeadlineOverride: null })),
    events: [], funding: [], nudges: [], protocolLog: [], notifications: [], silenceCases: [], extensionRequests: [],
  })
  return { ...scheduled, today: scheduled.nodes[0].latestStart! }
}
const active = (mode?: ReminderMode, count?: number) => reducer(fixture(mode, count), {type: "upgradeReminderPlan"})
const ids = (s: DemoState) => planReminders(buildReminderInput(s, s.reminderRuntime!)).ready.map(c => c.id)
function memory(initial: DemoState, intercept?: (s: DemoState, a: Action) => DemoState) {
  let state = initial
  return { getState: () => state, tryDispatch: (a: Action) => { const next = reducer(intercept ? intercept(state, a) : state, a); if (next === state) return false; state = next; return true } }
}
let store: ReturnType<typeof useStore>
function Probe() { store = useStore(); return null }
const show = (s: DemoState) => render(<MemoryRouter><StoreProvider initial={s}><Probe /></StoreProvider></MemoryRouter>)
beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear() })

describe("stage three complete-mail delivery", () => {
  it.each(["auto_email", "review_then_auto", "review_then_self"] as const)("validates email for platform sending in %s even when the recipient prefers another channel", mode => {
    const s = active(mode)
    const missingEmail = {...s, people: s.people.map(p => p.id === "jordan" ? {...p, email: "", channels: ["whatsapp" as const]} : p)}
    const plan = planReminders(buildReminderInput(missingEmail, missingEmail.reminderRuntime!))
    expect(plan.ready.length).toBe(mode === "review_then_self" ? 1 : 0)
    expect(plan.blocked.some(b => b.reason === "unavailable_recipient")).toBe(mode !== "review_then_self")
    expect(missingEmail.reminderRuntime!.deliveries).toEqual([])
  })
  it("upgrades existing history without changing settings or inventing messages", () => {
    const s = fixture(), empty = {...s, reminderRuntime: createReminderRuntime(s.today)}
    const old = confirmReminderDelivery(buildReminderInput(empty, empty.reminderRuntime), ids(empty)[0], "platypus")
    const v1 = { ...s, reminderRuntime: old }
    const upgraded = reducer(v1, {type: "upgradeReminderPlan"})
    expect(upgraded.org.settings).toEqual(s.org.settings)
    expect(old.deliveries).toHaveLength(1)
    expect(old.deliveries[0].message).toBeUndefined()
    expect(upgraded.reminderRuntime).toEqual({...old, version: 2, mailRequiredAfter: old.sequence})
    expect(isReminderRuntime(upgraded.reminderRuntime)).toBe(true)
    expect(reducer(upgraded, {type: "upgradeReminderPlan"})).toBe(upgraded)
    expect(reducer({...v1, viewerId: "jordan"}, {type: "upgradeReminderPlan"})).toMatchObject({reminderRuntime: old})
    for (const invalid of [null, false, 0, {version: 99}, {version: 2, deliveries: []}]) {
      const bad = {...s, reminderRuntime: invalid as unknown as DemoState["reminderRuntime"]}
      expect(reducer(bad, {type: "upgradeReminderPlan"})).toEqual(bad)
    }
  })

  it("records only complete signed rule mails and replays do not create another delivery", async () => {
    const initial = active(), api = memory(initial), requested = ids(initial)
    const result = await sendReminderBatch(api, requested, "https://demo.example.org", "platypus")
    expect(result).toMatchObject({failedIds: [], error: null})
    expect(result.recordedIds).toHaveLength(1)
    const state = api.getState(), delivery = state.reminderRuntime!.deliveries[0]
    expect(delivery.message).toMatchObject({source: "rules", channel: "email", recipientId: "jordan"})
    expect(delivery.message!.body.match(/https?:\/\/\S+/g)).toEqual([delivery.message!.taskUrl])
    expect(await verifyTaskAccessGrant(state, taskAccessToken(state.taskAccessGrants![0]))).toBe(true)
    expect(isReminderRuntime(state.reminderRuntime)).toBe(true)
    expect(isReminderRuntime({...state.reminderRuntime, deliveries: state.reminderRuntime!.deliveries.map(d => ({...d, message: undefined}))})).toBe(false)
    expect((await sendReminderBatch(api, requested, "https://demo.example.org", "platypus")).recordedIds).toEqual([])
    expect(api.getState().reminderRuntime!.deliveries).toHaveLength(1)
  })

  it("v2 rejects old no-body confirmation and missing snapshots corrupt only new-format records", () => {
    const s = active(), candidateId = ids(s)[0]
    expect(reducer(s, {type: "confirmPlannedReminder", candidateId, via: "platypus"})).toBe(s)
    expect(reducer(s, {type: "confirmNudgeSent", nodeId: NODE, channel: "email", text: "Old path", via: "platypus"})).toBe(s)
  })

  it("rechecks aggregate recipient limits for each prepared entry", async () => {
    const s = active("review_then_auto", 8), api = memory(s)
    const result = await sendReminderBatch(api, ids(s), "https://demo.example.org", "platypus")
    expect(result.recordedIds).toHaveLength(1)
    expect(result.failedIds).toHaveLength(7)
    expect(api.getState().taskAccessGrants).toHaveLength(1)
    expect(api.getState().reminderRuntime!.deliveries.every(d => d.message?.checked)).toBe(true)
  })
  it("sorts both requested IDs and reversed prepared entries before consuming scarce daily slots", async () => {
    const base = active("review_then_auto", 3)
    const s = { ...base, nodes: base.nodes.map((n, i) => ({ ...n, clubDeadline: i === 0 ? addDays(base.today, 10) : i === 1 ? base.today : addDays(base.today, -3), latestStart: addDays(base.today, -10) })) }
    const saved = memory(s)
    const api = { getState: saved.getState, tryDispatch: (a: Action) => saved.tryDispatch(a.type === "recordReminderBatch" ? { ...a, entries: [...a.entries].reverse() } : a) }
    await sendReminderBatch(api, ids(s).reverse(), "https://demo.example.org", "platypus")
    expect(api.getState().reminderRuntime!.deliveries.map(d => d.reason)).toEqual(["overdue", "due"])
    expect(api.getState().taskAccessGrants).toHaveLength(2)
  })

  it("does not publish a prepared grant or mail after reassignment, mode change or workspace replacement", async () => {
    const s = active()
    const changes = [
      (s: DemoState) => reducer(s, {type: "updateNode", id: NODE, patch: {ownerId: "sam"}}),
      (s: DemoState) => ({...s, org: {...s.org, settings: {...s.org.settings, reminderMode: "review_then_self" as const}}}),
      (s: DemoState) => ({...s, demoLinkKey: "replacement-workspace-key"}),
    ]
    for (const change of changes) {
      const api = memory(s, state => change(state))
      expect((await sendReminderBatch(api, ids(s), "https://demo.example.org", "platypus")).recordedIds).toEqual([])
      expect(api.getState().reminderRuntime!.deliveries).toEqual([])
      expect(api.getState().taskAccessGrants ?? []).toEqual([])
    }
  })

  it("cancellation before commit records nothing and an ordinary viewer cannot approve a review batch", async () => {
    const s = active(), api = memory(s)
    expect((await sendReminderBatch(api, ids(s), "https://demo.example.org", "platypus", () => false)).recordedIds).toEqual([])
    const officer = memory({...s, viewerId: "jordan"})
    expect((await sendReminderBatch(officer, ids(s), "https://demo.example.org", "platypus")).recordedIds).toEqual([])
    expect(officer.getState().taskAccessGrants ?? []).toEqual([])
  })

  it("a lead explicitly reviews legacy ambiguity for future mail, keeping old history and settings", () => {
    const raw = fixture(), nudge = {id: "old", nodeId: NODE, sentOn: raw.today, sentBy: "alex", channel: "email" as const, text: "Earlier content", response: null}
    const s = reducer({...raw, nudges: [nudge]}, {type: "upgradeReminderPlan"})
    expect(ids(s)).toEqual([])
    expect(reducer({...s, viewerId: "jordan"}, {type: "reviewLegacyReminder", nodeId: NODE})).toMatchObject({reminderRuntime: s.reminderRuntime})
    const next = reducer(s, {type: "reviewLegacyReminder", nodeId: NODE})
    expect(ids(next)).toHaveLength(1)
    expect(next.nudges).toEqual([nudge])
    expect(next.org.settings).toEqual(s.org.settings)
    expect(next.reminderRuntime!.updates.at(-1)).toMatchObject({actorId: "alex", ownerReply: false})
  })

  it("automatic mode prepares through the real Provider, persists once, and attributes system activity", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch)
    show({...active("auto_email"), viewerId: "jordan"})
    await waitFor(() => expect(store.state.reminderRuntime!.deliveries).toHaveLength(1))
    const delivery = store.state.reminderRuntime!.deliveries[0]
    expect(delivery).toMatchObject({via: "automatic", outcome: "simulated", recipientId: "jordan"})
    expect(delivery.message?.checked).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).reminderRuntime.deliveries).toEqual([delivery])
    // Automatic mode records one person digest per recipient (2026-11-19), so the log shows the digest action.
    expect(delivery.digestId).toBe(store.state.reminderRuntime!.digests![0].id)
    expect(store.getLog().find(l => l.type === "recordReminderDigests")?.actor).toBe("system:reminders")
    expect(JSON.stringify(store.getLog())).not.toContain(store.state.demoLinkKey)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("automatic Waiting on addresses the selected helper without impersonating a leader or changing ownership", async () => {
    const s = active("auto_email")
    const waiting = reducer({...s, viewerId: "jordan"}, {type: "replyTask", nodeId: NODE, reply: "waiting", input: {waitingOn: "Please confirm the accessible room requirements", waitingOnPersonId: "sam"}})
    expect(waiting.reminderRuntime!.deliveries).toEqual([])
    show(waiting)
    await waitFor(() => expect(store.state.reminderRuntime!.deliveries).toHaveLength(1))
    const delivery = store.state.reminderRuntime!.deliveries[0]
    expect(delivery).toMatchObject({recipientId: "sam", ownerId: "jordan", reason: "waiting_on"})
    expect(store.state.taskAccessGrants![0]).toMatchObject({recipientId: "sam", scope: "waiting"})
    expect(store.state.nodes[0]).toMatchObject({status: "waiting", ownerId: "jordan"})
    expect(store.state.viewerId).toBe("jordan")
  })

  it("failed automatic persistence stops, leaves no grant or success, and explicit retry saves once", async () => {
    const original = Storage.prototype.setItem, writes = vi.fn()
    const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY) { writes(); throw new Error("Full storage") }
      original.call(this, key, value)
    })
    show(active("auto_email"))
    await waitFor(() => expect(store.automaticReminders.error).toBeTruthy())
    expect(store.state.reminderRuntime!.deliveries).toEqual([])
    expect(store.state.taskAccessGrants ?? []).toEqual([])
    expect(writes.mock.calls.length).toBeLessThanOrEqual(3)
    failure.mockRestore()
    act(() => store.automaticReminders.retry())
    await waitFor(() => expect(store.state.reminderRuntime!.deliveries).toHaveLength(1))
    expect(store.automaticReminders.error).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).reminderRuntime.deliveries).toHaveLength(1)
  })

  it.each([false, true])("browser saving can recover explicitly without overriding a newer tab (newer tab: %s)", async changed => {
    const original = Storage.prototype.setItem
    const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(this: Storage, key, value) {
      if (key === STORAGE_KEY) throw new Error("Storage full")
      original.call(this, key, value)
    })
    show(active())
    await screen.findByRole("button", {name: "Retry browser saving"})
    const before = store.getState()
    failure.mockRestore()
    const external = JSON.stringify({...before, today: "2026-12-01"})
    if (changed) localStorage.setItem(STORAGE_KEY, external)
    fireEvent.click(screen.getByRole("button", {name: "Retry browser saving"}))
    if (changed) {
      await screen.findByText(/This organization changed in another tab/)
      expect(localStorage.getItem(STORAGE_KEY)).toBe(external)
      expect(screen.queryByRole("button", {name: "Retry browser saving"})).toBeNull()
    } else {
      await waitFor(() => expect(store.persistenceFailed).toBe(false))
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(before)
    }
    expect(store.getState()).toBe(before)
  })
})
