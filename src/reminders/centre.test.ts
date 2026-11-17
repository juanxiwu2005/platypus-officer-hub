import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { addDays } from "../lib/dates"
import { createReminderRuntime } from "./engine"
import { reminderCentre, taskReminderSummary } from "./centre"
import type { DemoState } from "../data/types"
import type { ReminderDelivery, ReminderRuntime, ReminderUpdate } from "./contracts"

const NODE = "t-room"
const base = (): DemoState => {
  const s = seedDemo(undefined, "v2")
  return { ...s, nodes: s.nodes.filter(n => n.id === NODE).map(n => ({ ...n, dependsOn: [] })),
    nudges: [], protocolLog: [], reminderRuntime: createReminderRuntime(s.today) }
}
const delivery = (s: DemoState, patch: Partial<ReminderDelivery> = {}): ReminderDelivery => ({
  id: "delivery:1", sequence: 1, candidateId: "saved", nodeId: NODE, recipientId: "jordan",
  ownerId: "jordan", ownerVersion: s.nodes.find(n => n.id === NODE)!.ownerVersion ?? 0,
  planKey: "saved-plan", reason: "start", scheduledOn: s.today, sentOn: s.today,
  via: "manual", recipientName: "Jordan at send time", taskTitle: "Original room task",
  eventName: "Original event", due: "2026-11-19", outcome: "recorded_by_sender", ...patch,
})
const withLedger = (s: DemoState, d: ReminderDelivery[], updates: ReminderUpdate[] = []): DemoState => ({
  ...s, reminderRuntime: { ...s.reminderRuntime!, sequence: Math.max(0, ...d.map(x => x.sequence), ...updates.map(x => x.sequence)), deliveries: d, updates },
})
const reply = (s: DemoState, patch: Partial<ReminderUpdate> = {}): ReminderUpdate => ({
  id: "update:2", sequence: 2, nodeId: NODE, ownerId: "jordan", ownerVersion: s.nodes.find(n => n.id === NODE)!.ownerVersion ?? 0,
  actorId: "jordan", on: s.today, status: "in_progress", ownerReply: true, ...patch,
})

describe("shared reminder centre presentation", () => {
  it("keeps absent/v1 plans inactive without inventing automatic sends", () => {
    const { reminderRuntime: _old, ...s } = base(); void _old
    for (const saved of [s, base()]) {
      const q = reminderCentre({ ...saved, org: { ...saved.org, settings: { ...saved.org.settings, reminderMode: "auto_email" } } })
      expect(q.runtimeState).toBe("legacy")
      expect(q.needsOk).toEqual([])
      expect(q.sent).toEqual([])
      expect(q.noReply).toEqual([])
      expect(taskReminderSummary(saved, NODE)).toMatchObject({ canPrepare: false, blockedReason: "Enable updated reminders in the reminder centre." })
    }
  })

  it.each([null, false, 0, "", { version: 9 }, { ...createReminderRuntime("2026-11-01"), deliveries: [null] }])("does not execute or replace invalid runtime %j", invalid => {
    const s = { ...base(), reminderRuntime: invalid as unknown as ReminderRuntime }
    expect(reminderCentre(s)).toMatchObject({ runtimeState: "invalid", needsOk: [], sent: [], noReply: [] })
    expect(taskReminderSummary(s, NODE).canPrepare).toBe(false)
    expect(s.reminderRuntime).toBe(invalid)
  })

  it("keeps immutable history when the task is renamed, reassigned or deleted", () => {
    const s = base(), d = delivery(s)
    const saved = withLedger(s, [d])
    const changed = { ...saved, nodes: saved.nodes.map(n => n.id === NODE ? { ...n, ownerId: "sam", title: "New task title", ownerVersion: 4 } : n) }
    for (const current of [changed, { ...changed, nodes: changed.nodes.filter(n => n.id !== NODE) }]) {
      expect(reminderCentre(current).sent[0]).toMatchObject({ recipientId: "jordan", recipientName: "Jordan at send time", taskTitle: "Original room task", eventName: "Original event", due: "2026-11-19" })
      expect(reminderCentre(current).noReply).toEqual([])
      expect(taskReminderSummary(current, NODE).history).toHaveLength(1)
    }
  })

  it("keeps legacy reminder records with unknown recipients outside no-reply calculations", () => {
    const s = base()
    const q = reminderCentre({ ...s, today: addDays(s.today, 5), nudges: [{ id: "old", nodeId: NODE, channel: "email", text: "Old draft", sentBy: "alex", sentOn: s.today, response: null }],
      protocolLog: [{ id: "protocol", nodeId: NODE, kind: "reminder", caseId: "case", day: 1, scheduledOn: s.today, recipientIds: ["jordan"], text: "Old follow-up" }] })
    expect(q.sent).toHaveLength(2)
    expect(q.sent.every(x => x.legacy && x.recipientId === null && x.explanation.includes("recipient not recorded"))).toBe(true)
    expect(q.noReply).toEqual([])
  })

  it("uses operation sequence for same-day owner replies and ignores another person's edits", () => {
    const s = base(), d = delivery(s)
    expect(reminderCentre(withLedger(s, [d], [reply(s)])).replies[0].reply).toBe("Working on it")
    expect(reminderCentre(withLedger(s, [{ ...d, id: "delivery:3", sequence: 3 }], [reply(s)])).replies).toEqual([])
    const leaderEdit = reply(s, { actorId: "alex", ownerReply: false })
    expect(reminderCentre(withLedger(s, [d], [leaderEdit])).replies).toEqual([])
  })

  it("starts no reply only after two actual recorded days and stops for reassignment or completion", () => {
    const s = base(), saved = withLedger(s, [delivery(s)])
    expect(reminderCentre({ ...saved, today: addDays(s.today, 1) }).noReply).toEqual([])
    expect(reminderCentre({ ...saved, today: addDays(s.today, 2) }).noReply[0]).toMatchObject({ days: 2, deliveryId: "delivery:1" })
    for (const patch of [{ status: "done" as const }, { ownerId: "sam", ownerVersion: 1 }]) {
      expect(reminderCentre({ ...saved, today: addDays(s.today, 3), nodes: saved.nodes.map(n => n.id === NODE ? { ...n, ...patch } : n) }).noReply).toEqual([])
    }
  })

  it("matches helper replies only to their own waiting request and recipient", () => {
    const s = base(), d = delivery(s, { reason: "waiting_on", recipientId: "sam", recipientName: "Sam", waitingRequestId: "waiting:1" })
    const helperReply = reply(s, { actorId: "sam", ownerReply: false, waitingRequestId: "waiting:1", waitingResponse: "provided" })
    expect(reminderCentre(withLedger(s, [d], [helperReply])).replies[0].reply).toBe("Input provided")
    for (const patch of [{ actorId: "jordan" }, { waitingRequestId: "waiting:other" }]) {
      expect(reminderCentre(withLedger(s, [d], [{ ...helperReply, ...patch }])).replies).toEqual([])
    }
  })
})
