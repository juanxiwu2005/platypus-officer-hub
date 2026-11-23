import { beforeEach, describe, expect, it, vi } from "vitest"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { clubDraft } from "../data/settings"
import { loadLog, loadState, loadStateWithNotice, loggedReducer, reducer, STORAGE_KEY, withCurrentReminders } from "../data/store"
import type { DemoState } from "../data/types"
import { upgradeReminderPlan } from "./adapter"
import type { ReminderRuntime } from "./contracts"

// S2 (Juanxi, 2026-11-22): every loaded, reset or imported state runs on the current reminder plan, without a lead pressing
// "Enable updated reminders". Settings and history are kept; an invalid runtime stays for recovery; nothing is logged.
const code = "12345678-1234-1234-1234-123456789abc"
const withoutMode = (s: DemoState): DemoState => { const { reminderMode: _gone, ...settings } = s.org.settings; void _gone; return { ...s, org: { ...s.org, settings } } }
/** An old save: no reminder plan yet, no sending choice, custom limits, and earlier reminder history in nudges and the protocol log. */
function legacySave(): DemoState {
  const s = withoutMode(seedDemo(undefined, "v2"))
  const node = s.nodes.find(n => n.ownerId && n.status !== "done")!
  const { reminderRuntime: _none, ...rest } = s; void _none
  return {
    ...rest,
    org: { ...s.org, settings: { ...s.org.settings, maxRemindersPerTask: 2, silenceProtocol: { ...s.org.settings.silenceProtocol, nudgeDays: [4, 6] } } },
    nudges: [{ id: "nudge-old", nodeId: node.id, channel: "email", text: "Old reminder", sentOn: s.today, sentBy: "alex", response: null }],
    silenceCases: [{ id: "case-old", nodeId: node.id, ownerId: node.ownerId!, startedOn: s.today, closedOn: null }],
  }
}
/** A valid version 1 runtime with a delivery, an update and a waiting request: all of it must survive the upgrade. */
function v1Save(): DemoState {
  const s = legacySave(), node = s.nodes.find(n => n.ownerId && n.status !== "done")!
  const runtime: ReminderRuntime = {
    version: 1, activatedOn: s.today, sequence: 3,
    updates: [{ id: "reminder-update:1", sequence: 1, nodeId: node.id, ownerId: node.ownerId, ownerVersion: 0, actorId: "alex", on: s.today, status: node.status, ownerReply: false }],
    deliveries: [{ id: "reminder-delivery:2", sequence: 2, nodeId: node.id, ownerVersion: 0, candidateId: "c-1", recipientId: node.ownerId!, ownerId: node.ownerId!, planKey: "p", recipientName: "Someone", taskTitle: node.title, scheduledOn: s.today, sentOn: s.today, eventName: null, due: null, reason: "start", via: "manual", outcome: "recorded_by_sender" }],
    waitingRequests: [{ id: `waiting-request:${node.id}:3`, sequence: 3, nodeId: node.id, ownerId: node.ownerId!, ownerVersion: 0, recipientId: null, waitingOn: "Room approval", createdOn: s.today, closedOn: null }],
  } as ReminderRuntime
  return { ...s, nudges: [], silenceCases: [], reminderRuntime: runtime }
}
const save = (s: unknown) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s))

beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto) })

describe("automatic upgrade of old reminder plans", () => {
  it("a legacy save without a plan is upgraded on load, keeping settings, nodes and earlier reminder history", () => {
    const s = legacySave()
    save(s)
    const loaded = loadState()
    expect(loaded.reminderRuntime).toMatchObject({ version: 2, mailRequiredAfter: 0, activatedOn: s.today, deliveries: [] })
    expect(loaded.reminderRuntime!.legacyUnresolvedNodeIds).toEqual([s.nudges[0].nodeId])
    expect(loaded.org.settings).toEqual(s.org.settings)
    expect(loaded.nodes).toEqual(s.nodes)
    expect(loaded.nudges).toEqual(s.nudges)
    expect(loaded.protocolLog).toEqual(s.protocolLog)
    // The open case is closed on the demo day, not deleted (the same pure logic as "Enable updated reminders").
    expect(loaded.silenceCases).toEqual([{ ...s.silenceCases[0], closedOn: s.today }])
    expect(loaded).toEqual(withCurrentReminders(loadStateWithNotice().state))
  })

  it("a version 1 save keeps every delivery, update and waiting request; only new deliveries need a message", () => {
    const s = v1Save()
    save(s)
    const loaded = loadState()
    const before = s.reminderRuntime as ReminderRuntime
    expect(loaded.reminderRuntime).toEqual({ ...before, version: 2, mailRequiredAfter: before.sequence })
    expect(loaded.org.settings).toEqual(s.org.settings)
  })

  it("an invalid (corrupt or newer) runtime is kept exactly as saved for recovery", () => {
    for (const runtime of [{ version: 9, sequence: 0 }, { version: 1, sequence: "x" }, "broken"]) {
      save({ ...legacySave(), reminderRuntime: runtime })
      expect(loadState().reminderRuntime).toEqual(runtime)
      localStorage.clear()
    }
  })

  it("is idempotent: an upgraded state is returned as the same object, by the normalizer and the old action", () => {
    save(legacySave())
    const loaded = loadState()
    expect(withCurrentReminders(loaded)).toBe(loaded)
    expect(upgradeReminderPlan(loaded)).toBe(loaded)
    expect(reducer(loaded, { type: "upgradeReminderPlan" })).toBe(loaded)
    expect(reducer(loaded, { type: "enableReminderPlan" })).toBe(loaded)
    save(loaded)
    expect(loadState()).toEqual(loaded)
  })

  it("does not depend on who the viewer is", () => {
    const s = legacySave()
    save(s)
    const asLead = loadState()
    save({ ...s, viewerId: "jordan" })
    const asOfficer = loadState()
    expect({ ...asOfficer, viewerId: asLead.viewerId }).toEqual(asLead)
    expect(asOfficer.reminderRuntime?.version).toBe(2)
  })

  it("an empty browser, Reset demo and an import all start on the current plan", () => {
    const fresh = loadState()
    expect(fresh.reminderRuntime?.version).toBe(2)
    expect(fresh.org.settings.reminderMode).toBe("review_then_auto")
    const reset = reducer(legacySave(), { type: "reset" })
    expect(reset.reminderRuntime).toMatchObject({ version: 2, mailRequiredAfter: 0 })
    expect(reset.org.settings.reminderMode).toBe("review_then_auto")
    const imported = reducer(fresh, { type: "replace", state: legacySave() })
    expect(imported.reminderRuntime?.version).toBe(2)
    expect(imported.org.settings.reminderMode).toBeUndefined()
    const importedV1 = reducer(fresh, { type: "replace", state: v1Save() })
    expect(importedV1.reminderRuntime?.deliveries).toEqual((v1Save().reminderRuntime as ReminderRuntime).deliveries)
  })

  it("an unreadable save restores an upgraded demo", () => {
    localStorage.setItem(STORAGE_KEY, "{not json")
    const restored = loadStateWithNotice()
    expect(restored.notice?.kind).toBe("restored_demo")
    expect(restored.state.reminderRuntime?.version).toBe(2)
  })

  it("an old save without a sending choice keeps none; the default is only for new clubs", () => {
    save(legacySave())
    expect(loadState().org.settings.reminderMode).toBeUndefined()
    expect(seedDemo(undefined, "v2").org.settings.reminderMode).toBe("review_then_auto")
    const s = seedDemo("2026-10-22")
    const club = reducer(s, { type: "completeSetup", draft: clubDraft(s), event: null, date: "", inviteCode: code })
    expect(club.org.settings.reminderMode).toBe("review_then_auto")
    expect(club.reminderRuntime?.version).toBe(2)
  })

  it("records no user action for the automatic upgrade: loading logs nothing, and Reset logs only itself", () => {
    save(legacySave())
    loadState()
    expect(loadLog()).toEqual([])
    const root = loggedReducer({ app: legacySave(), log: [] }, { action: { type: "reset" }, at: 1, session: null })
    expect(root.log.map(e => e.type)).toEqual(["reset"])
    expect(root.app.reminderRuntime?.version).toBe(2)
  })
})
