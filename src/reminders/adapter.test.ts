import { beforeEach, describe, expect, it, vi } from "vitest"
import { seedDemo } from "../data/seed"
import { loadState, reducer, saveState, STORAGE_KEY } from "../data/store"
import type { DemoState, ReminderMode } from "../data/types"
import { applySchedule } from "../engine/schedule"
import { addDays } from "../lib/dates"
import { buildReminderFacts, buildReminderInput, reminderPeople, reminderSenderName } from "./facts"
import { buildReminderMail } from "./mail"
import { makeTaskAccessGrant, taskAccessUrl } from "./taskAccess"
import { planReminders } from "./engine"
import { planReminderDigests, sendReminderDigests } from "./digest"
import { remindersEnabled } from "./adapter"
import { clubDraft } from "../data/settings"
import { grantToken, makeOfficerGrant } from "../lib/officerLinks"
import { webcrypto } from "node:crypto"

const NODE = "t-room"
function fixture(mode: ReminderMode = "review_then_self"): DemoState {
  const s = seedDemo(undefined, "v2")
  const n = s.nodes.find(n => n.id === NODE)!
  const scheduled = applySchedule({ ...s, org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode } }, events: [], funding: [], nodes: [{ ...n, anchor: { kind: "fixed", official: null, club: "2026-11-05" }, clubDeadlineOverride: null, ownerVersion: 0, dependsOn: [], status: "accepted", waitingOn: null, waitingOnPersonId: null }], nudges: [], protocolLog: [], notifications: [], silenceCases: [], extensionRequests: [] })
  return { ...scheduled, today: scheduled.nodes[0].latestStart! }
}
const enable = (s = fixture()) => reducer(s, { type: "enableReminderPlan" })
const plan = (s: DemoState) => planReminders(buildReminderInput(s, s.reminderRuntime!))
const replyWaiting = (s: DemoState, recipient = "sam") => reducer({ ...s, viewerId: "jordan" }, { type: "replyTask", nodeId: NODE, reply: "waiting", input: { waitingOn: "Please confirm the room requirements", waitingOnPersonId: recipient } })
async function record(s: DemoState) {
  const candidate = plan(s).ready[0]
  if (s.org.settings.reminderMode === "auto_email") {
    // The live automatic path (useAutomaticReminders): one person digest per recipient, recorded all-or-nothing.
    let current = s
    const store = { getState: () => current, tryDispatch: (a: Parameters<typeof reducer>[1]) => { const next = reducer(current, a); if (next === current) return false; current = next; return true } }
    await sendReminderDigests(store, planReminderDigests(current).groups.map(g => g.id), "https://demo.example.org", "automatic")
    return current
  }
  const grant = await makeTaskAccessGrant(s, candidate.nodeId, candidate.waitingRequestId)
  const issued = reducer(s, {type: "issueTaskAccessGrant", grant})
  const facts = buildReminderFacts(issued, candidate.nodeId)!
  const people = reminderPeople(issued)
  const mail = buildReminderMail({today: s.today, facts, candidate, recipient: people.find(p => p.id === candidate.recipientId)!, taskUrl: taskAccessUrl("https://demo.example.org", grant), senderName: reminderSenderName(issued)})
  return reducer(issued, {type: "confirmPlannedReminder", candidateId: candidate.id, via: "manual", message: {...mail, channel: "email", preparedOn: s.today, accessId: grant.id}})
}

beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto) })

describe("stage one: actual reducer integration", () => {
  it("upgrades an old saved club automatically on load (S2), while the explicit action stays lead-only", () => {
    const s = fixture()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    const loaded = loadState()
    expect(loaded.reminderRuntime?.version).toBe(2)
    expect(loaded.reminderRuntime).toEqual(enable(s).reminderRuntime)
    expect(loaded.nodes).toEqual(s.nodes)
    const officer = { ...s, viewerId: "jordan" }
    expect(reducer(officer, { type: "enableReminderPlan" }).reminderRuntime).toBeUndefined()
    expect(enable(s).reminderRuntime?.version).toBe(2)
  })

  it("creates rule-only candidates without calling AI or sending a network request", () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    try {
      const s = enable()
      expect(plan(s).ready.map(c => c.reason)).toEqual(["start"])
      expect(s.reminderRuntime!.deliveries).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    } finally { vi.unstubAllGlobals() }
  })

  it("records a same-day owner board update but never mistakes a lead's title edit for an owner reply", async () => {
    const s = enable()
    const sent = await record(s)
    const edited = reducer({ ...sent, today: addDays(s.today, 1) }, { type: "updateNode", id: NODE, patch: { title: "Room booking (lead clarified title)" } })
    expect(edited.reminderRuntime!.updates.filter(u => u.ownerReply)).toEqual([])
    const moved = reducer({ ...sent, viewerId: "jordan" }, { type: "moveTask", nodeId: NODE, status: "in_progress" })
    const update = moved.reminderRuntime!.updates.find(u => u.ownerReply)!
    expect(update.on).toBe(sent.today)
    expect(update.sequence).toBeGreaterThan(sent.reminderRuntime!.deliveries[0].sequence)
    expect(plan(moved).ready.some(c => c.reason === "start")).toBe(false)
    expect(plan(moved).upcoming.some(c => c.reason === "due")).toBe(true)
  })

  it.each(["review_then_self", "review_then_auto"] as const)("Waiting on automatically creates a separate, deduplicated target mail in %s", mode => {
    const s = replyWaiting(enable(fixture(mode)))
    const q = plan(s)
    expect(q.ready.map(c => [c.reason, c.recipientId])).toEqual([["waiting_on", "sam"]])
    expect(s.nodes[0].ownerId).toBe("jordan")
    expect(s.reminderRuntime!.deliveries).toHaveLength(0)
    const repeated = replyWaiting(s)
    expect(repeated.reminderRuntime!.waitingRequests.filter(w => !w.closedOn)).toHaveLength(1)
    expect(plan(repeated).ready[0].id).toBe(q.ready[0].id)
    const targetView = { ...s, viewerId: "sam" }
    const denied = reducer(targetView, { type: "replyTask", nodeId: NODE, reply: "done" })
    expect(denied.nodes[0].status).toBe("waiting")
    expect(denied.reminderRuntime!.waitingRequests).toEqual(s.reminderRuntime!.waitingRequests)
  })

  it("auto mode persists a prepared target mail once, with the original task still owned by the requester", async () => {
    const pending = replyWaiting(enable(fixture("auto_email")))
    expect(pending.reminderRuntime!.deliveries).toEqual([])
    const s = await record(pending)
    const mail = s.reminderRuntime!.deliveries.filter(d => d.reason === "waiting_on")
    expect(mail).toHaveLength(1)
    expect(mail[0]).toMatchObject({ recipientId: "sam", ownerId: "jordan", outcome: "simulated", sentOn: s.today })
    expect(replyWaiting(s).reminderRuntime!.deliveries.filter(d => d.reason === "waiting_on")).toHaveLength(1)
    expect(s.nodes[0].ownerId).toBe("jordan")
    const done = reducer(s, { type: "replyTask", nodeId: NODE, reply: "done" })
    expect(plan(done).ready).toEqual([])
    expect(done.reminderRuntime!.deliveries).toEqual(s.reminderRuntime!.deliveries)
    expect(done.reminderRuntime!.waitingRequests.every(w => !!w.closedOn)).toBe(true)
    expect(saveState(done)).toBe(true)
    expect(loadState().reminderRuntime).toEqual(done.reminderRuntime)
  })

  it("changes and cancellation withdraw only the old pending waiting request, keeping its history", () => {
    const first = replyWaiting(enable())
    const second = replyWaiting(first, "maya")
    expect(second.reminderRuntime!.waitingRequests.filter(w => !w.closedOn).map(w => w.recipientId)).toEqual(["maya"])
    expect(second.reminderRuntime!.waitingRequests.find(w => w.recipientId === "sam")!.closedOn).toBe(first.today)
    expect(plan(second).ready.map(c => c.recipientId)).toEqual(["maya"])
    const working = reducer(second, { type: "moveTask", nodeId: NODE, status: "in_progress" })
    expect(working.reminderRuntime!.waitingRequests.every(w => !!w.closedOn)).toBe(true)
    expect(plan(working).ready.some(c => c.reason === "waiting_on")).toBe(false)
  })

  it("free text, a former recipient and self-waiting never become an automatic target delivery", () => {
    const s = enable(fixture("auto_email"))
    const unknown = replyWaiting(s, "")
    expect(unknown.reminderRuntime!.deliveries.some(d => d.reason === "waiting_on")).toBe(false)
    expect(plan(unknown).blocked.some(b => b.reason === "unresolved_waiting")).toBe(true)
    const former = { ...s, people: s.people.map(p => p.id === "sam" ? { ...p, leftOn: s.today } : p) }
    const unavailable = replyWaiting(former)
    expect(unavailable.reminderRuntime!.deliveries.some(d => d.reason === "waiting_on")).toBe(false)
    expect(plan(unavailable).blocked.some(b => b.reason === "unavailable_recipient")).toBe(true)
    expect(replyWaiting(s, "jordan").reminderRuntime!.deliveries.some(d => d.reason === "waiting_on")).toBe(false)
  })

  it("reassignment retains the real recipient snapshot, and a returning owner gets another assignment version", async () => {
    const s = enable()
    const sent = await record(s)
    const reassigned = reducer(sent, { type: "updateNode", id: NODE, patch: { ownerId: "sam" } })
    expect(reassigned.reminderRuntime!.deliveries[0]).toEqual(sent.reminderRuntime!.deliveries[0])
    expect(reassigned.reminderRuntime!.deliveries[0].recipientId).toBe("jordan")
    expect(reassigned.nodes[0].ownerVersion).toBe(1)
    const returned = reducer(reassigned, { type: "updateNode", id: NODE, patch: { ownerId: "jordan" } })
    expect(returned.nodes[0].ownerVersion).toBe(2)
    expect(plan(returned).ready.every(c => c.ownerVersion === 2)).toBe(true)
  })

  it("postponement cancels the old silence timeline, with no duplicate old day-three/five reminders", () => {
    const s = enable()
    const day1 = reducer(s, { type: "advanceClock", days: 1 })
    const changed = reducer(day1, { type: "updateNode", id: NODE, patch: { clubDeadlineOverride: "2026-12-04" } })
    const later = reducer(changed, { type: "advanceClock", days: 10 })
    expect(later.nodes.find(n => n.id === NODE)!.latestStart! > later.today).toBe(true)
    expect(later.protocolLog.filter(e => e.nodeId === NODE)).toEqual([])
    expect(later.silenceCases.filter(c => c.startedOn < changed.nodes[0].latestStart!).every(c => !!c.closedOn)).toBe(true)
    expect(plan(later).ready).toEqual([])
  })

  it("activation closes an unproven old silence case before it can replay obsolete leader escalations", () => {
    const s = fixture()
    const future = applySchedule({ ...s, nodes: s.nodes.map(n => ({ ...n, clubDeadlineOverride: "2026-12-04" })), silenceCases: [{ id: "old-case", nodeId: NODE, ownerId: "jordan", startedOn: "2026-10-22", closedOn: null }] })
    const past: DemoState["protocolLog"] = [{ id: "old-private", caseId: "old-case", nodeId: NODE, day: 7, scheduledOn: "2026-10-29", recipientIds: ["alex"], kind: "private_check", text: "A previously recorded fictional check" }]
    const enabled = enable({ ...future, protocolLog: past })
    expect(enabled.silenceCases[0].closedOn).toBe(future.today)
    expect(enabled.protocolLog).toEqual(past)
    const later = reducer(enabled, { type: "advanceClock", days: 1 })
    expect(later.protocolLog).toEqual(past)
    expect(later.nodes.some(n => n.id.startsWith("retro:"))).toBe(false)
  })

  it("does not guess old recipients or reset their budget when enabling over an old send", () => {
    const s = fixture("auto_email")
    const old = { id: "legacy-mail", nodeId: NODE, channel: "email" as const, text: "An old fictional mail", sentBy: "alex", sentOn: s.today, response: null }
    const enabled = enable({ ...s, nudges: [old] })
    expect(enabled.nudges).toEqual([old])
    expect(enabled.reminderRuntime!.deliveries).toEqual([])
    expect(plan(enabled).blocked.some(b => b.reason === "legacy_history")).toBe(true)
  })

  it("ordinary members cannot approve another person's mail or turn on automatic processing", () => {
    const s = enable()
    const id = plan(s).ready[0].id
    const officer = { ...s, viewerId: "sam" }
    expect(reducer(officer, { type: "confirmPlannedReminder", candidateId: id, via: "platypus" }).reminderRuntime!.deliveries).toEqual([])
  })

  it("a scoped officer link attributes the update to its owner rather than the browser's lead viewer", async () => {
    vi.stubGlobal("crypto", webcrypto)
    try {
      const s = enable()
      const grant = await makeOfficerGrant(s, NODE)
      const issued = reducer(s, { type: "issueOfficerGrant", grant })
      const updated = reducer(issued, { type: "officerAction", token: grantToken(grant), reply: "waiting", input: { waitingOn: "Please confirm room details", waitingOnPersonId: "sam" } })
      expect(updated.viewerId).toBe("alex")
      expect(updated.reminderRuntime!.updates.at(-1)).toMatchObject({ actorId: "jordan", ownerReply: true })
      expect(plan(updated).ready.map(c => c.recipientId)).toEqual(["sam"])
    } finally { vi.unstubAllGlobals() }
  })

  it("starting a new club workspace does not inherit the previous club's reminder requests", () => {
    const s = { ...replyWaiting(enable()), viewerId: "alex" }
    const created = reducer(s, { type: "completeSetup", draft: clubDraft(s), event: null, date: s.today, inviteCode: "00000000-0000-4000-8000-000000000001" })
    expect(created).not.toBe(s)
    expect(created.reminderRuntime?.version).toBe(2)
    expect(created.reminderRuntime!.deliveries).toEqual([])
    expect(created.reminderRuntime!.waitingRequests.some(r => r.waitingOn === "Please confirm the room requirements")).toBe(false)
    expect(s.reminderRuntime!.waitingRequests).toHaveLength(1)
  })

  it("reopening early completed work resumes the remaining due check while preserving the original send", async () => {
    const s = enable()
    const sent = await record(s)
    expect(sent.reminderRuntime!.deliveries).toHaveLength(1)
    const done = reducer({ ...sent, viewerId: "jordan" }, { type: "replyTask", nodeId: NODE, reply: "done" })
    expect(plan(done).ready).toEqual([])
    const reopened = reducer({ ...done, viewerId: "alex" }, { type: "moveTask", nodeId: NODE, status: "in_progress" })
    expect(plan(reopened).upcoming.some(c => c.reason === "due")).toBe(true)
    expect(reopened.reminderRuntime!.deliveries).toEqual(sent.reminderRuntime!.deliveries)
  })

  it("keeps an unknown runtime version intact and inactive", () => {
    const s = { ...fixture(), reminderRuntime: { version: 9, sequence: 0, activatedOn: "2026-11-01", updates: [], deliveries: [], waitingRequests: [] } as unknown as NonNullable<DemoState["reminderRuntime"]> }
    expect(remindersEnabled(s)).toBe(false)
    expect(reducer(s, { type: "advanceClock", days: 3 }).today).toBe(s.today)
    expect(reducer(s, { type: "enableReminderPlan" }).reminderRuntime).toEqual(s.reminderRuntime)
  })

  it.each([null, 0, false, ""])("preserves a malformed falsy runtime (%s) instead of activating or falling back to legacy sends", invalid => {
    const s = { ...fixture(), reminderRuntime: invalid as unknown as NonNullable<DemoState["reminderRuntime"]> }
    expect(remindersEnabled(s)).toBe(false)
    for (const action of [
      { type: "enableReminderPlan" } as const,
      { type: "advanceClock", days: 3 } as const,
      { type: "confirmNudgeSent", nodeId: NODE, channel: "email", text: "Should not be sent" } as const,
    ]) expect(reducer(s, action)).toEqual(s)
  })
})
