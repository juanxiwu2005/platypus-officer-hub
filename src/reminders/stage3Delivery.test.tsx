import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { reducer, STORAGE_KEY, StoreProvider, useStore, type Action } from "../data/store"
import type { DemoState, ReminderMode } from "../data/types"
import { applySchedule } from "../engine/schedule"
import { createReminderRuntime, planReminders } from "./engine"
import { buildReminderInput } from "./facts"
import { isReminderRuntime } from "./runtime"
import { sendReminderBatch } from "./delivery"
import { taskAccessToken, verifyTaskAccessGrant } from "./taskAccess"

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
  it("upgrades existing history without changing settings or inventing messages", () => {
    const s = fixture(), old = createReminderRuntime(s.today)
    const v1 = { ...s, reminderRuntime: old }
    const upgraded = reducer(v1, {type: "upgradeReminderPlan"})
    expect(upgraded.org.settings).toEqual(s.org.settings)
    expect(upgraded.reminderRuntime).toEqual({...old, version: 2, mailRequiredAfter: 0})
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
    expect(result.recordedIds).toHaveLength(6)
    expect(result.failedIds).toHaveLength(2)
    expect(api.getState().taskAccessGrants).toHaveLength(6)
    expect(api.getState().reminderRuntime!.deliveries.every(d => d.message?.checked)).toBe(true)
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
    expect(store.getLog().find(l => l.type === "recordReminderBatch")?.actor).toBe("system:reminders")
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
})
