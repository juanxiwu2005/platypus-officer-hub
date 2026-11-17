import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { appendLog, reducer } from "../data/store"
import type { DemoState, ReminderMode } from "../data/types"
import { addDays } from "../lib/dates"
import { applySchedule } from "../engine/schedule"
import { buildReminderFacts, buildReminderInput, reminderPeople } from "./facts"
import { planReminders } from "./engine"
import { isReminderRuntime } from "./runtime"
import { buildReminderMail } from "./mail"
import type { ReminderMailSnapshot, TaskAccessGrant, TaskAccessUpdate } from "./accessContracts"
import { makeTaskAccessGrant, taskAccessToken, taskAccessUrl, usableTaskAccessGrant, verifyTaskAccessGrant } from "./taskAccess"

beforeAll(() => vi.stubGlobal("crypto", webcrypto))
afterAll(() => vi.unstubAllGlobals())
const id = "t-room"
function fixture(mode: ReminderMode = "review_then_self") {
  const s = seedDemo(undefined, "v2")
  const node = s.nodes.find(n => n.id === id)!
  const fixed = applySchedule({ ...s, org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode } }, nodes: [{ ...node, anchor: { kind: "fixed", official: null, club: "2026-11-05" }, clubDeadlineOverride: null, ownerVersion: 0, dependsOn: [], status: "accepted", waitingOn: null, waitingOnPersonId: null }], events: [], funding: [], nudges: [], protocolLog: [], silenceCases: [], notifications: [] })
  return { ...fixed, today: fixed.nodes[0].latestStart! }
}
async function issue(s = fixture(), requestId?: string) {
  const grant = await makeTaskAccessGrant(s, id, requestId)
  return { grant, token: taskAccessToken(grant), state: reducer(s, { type: "issueTaskAccessGrant", grant }) }
}
const act = (s: DemoState, g: TaskAccessGrant, update: TaskAccessUpdate) => reducer(s, { type: "taskAccessAction", token: taskAccessToken(g), update })
const queue = (s: DemoState) => planReminders(buildReminderInput(s, s.reminderRuntime!))
function snapshot(s: DemoState, grant: TaskAccessGrant, planned = false): ReminderMailSnapshot {
  const candidate = planned ? queue(s).ready.find(c => c.nodeId === id) : undefined
  const request = candidate?.waitingRequestId ? s.reminderRuntime!.waitingRequests.find(r => r.id === candidate.waitingRequestId) : undefined
  const facts = buildReminderFacts(s, id)!
  return { ...buildReminderMail({ today: s.today, facts, recipient: reminderPeople(s).find(p => p.id === grant.recipientId)!, taskUrl: taskAccessUrl("https://demo.example.org", grant), candidate, request, requesterName: s.people.find(p => p.id === facts.ownerId)?.name }), channel: "email", preparedOn: s.today, accessId: grant.id }
}

describe("reusable task entry and effective actor", () => {
  it("viewing is read-only, Working then Done uses the same token, and completed work stays readable", async () => {
    const { state, token, grant } = await issue()
    const before = structuredClone(state)
    expect(await verifyTaskAccessGrant(state, token)).toBe(true)
    expect(state).toEqual(before)
    const working = act(state, grant, { kind: "working" })
    expect(working.nodes[0].status).toBe("in_progress")
    expect(working.extensionRequests).toEqual([])
    expect(working.viewerId).toBe("alex")
    const done = act(working, grant, { kind: "done" })
    expect(done.nodes[0].status).toBe("done")
    expect(await verifyTaskAccessGrant(done, token)).toBe(true)
    expect(usableTaskAccessGrant(JSON.parse(JSON.stringify(done)), token)?.id).toBe(grant.id)
    expect(act(done, grant, { kind: "working" }).nodes[0].status).toBe("done")
    expect(await makeTaskAccessGrant(working, id)).toEqual(grant)
  })
  it("claiming a proposed task does not consume its link or skip the handshake", async () => {
    const s = fixture()
    const { state, grant } = await issue({ ...s, nodes: s.nodes.map(n => ({ ...n, status: "unclaimed", acceptedOn: null })) })
    expect(act(state, grant, { kind: "working" }).nodes[0].status).toBe("unclaimed")
    const claimed = act(state, grant, { kind: "claim" })
    expect(claimed.nodes[0].status).toBe("accepted")
    expect(act(claimed, grant, { kind: "working" }).nodes[0].status).toBe("in_progress")
  })
  it("keeps archived matching data inert when claiming through a reminder after the preview 14 rollback", async () => {
    const s = fixture()
    s.org.settings.matchingMode = "responsibilities"
    s.matching = { schemaVersion: 99, opaque: "Fictional retired responsibility configuration" }
    s.matchingContext = { retired: true }
    s.nodes = s.nodes.map(n => ({ ...n, status: "unclaimed", acceptedOn: null, matching: { retired: true, eligiblePersonIds: [] } }))
    const { state, grant } = await issue(s)
    expect(act(state, grant, { kind: "working" }).nodes[0].status).toBe("unclaimed")
    const claimed = act(state, grant, { kind: "claim" })
    const working = act(claimed, grant, { kind: "working" })
    expect(claimed.nodes[0]).toMatchObject({ status: "accepted", ownerId: state.nodes[0].ownerId })
    expect(working.nodes[0].status).toBe("in_progress")
    expect(working.matching).toEqual(s.matching)
    expect(working.matchingContext).toEqual(s.matchingContext)
    expect(working.nodes[0].matching).toEqual(s.nodes[0].matching)
    const reassigned = reducer(working, { type: "updateNode", id, patch: { ownerId: "sam" } })
    expect(usableTaskAccessGrant(reassigned, taskAccessToken(grant))).toBeUndefined()
    expect(act(reassigned, grant, { kind: "done" })).toBe(reassigned)
  })
  it("scope follows assignment, membership and expiry, not arbitrary URL values", async () => {
    const { state, token, grant } = await issue()
    const moved = reducer(state, { type: "updateNode", id, patch: { ownerId: "sam" } })
    expect(usableTaskAccessGrant(moved, token)).toBeUndefined()
    expect(usableTaskAccessGrant({ ...state, today: addDays(grant.expiresOn, 1) }, token)).toBeUndefined()
    expect(usableTaskAccessGrant({ ...state, people: state.people.map(p => p.id === "jordan" ? { ...p, leftOn: state.today } : p) }, token)).toBeUndefined()
    expect(await verifyTaskAccessGrant(state, `${token}a`)).toBe(false)
    const tampered = { ...state, taskAccessGrants: [{ ...grant, expiresOn: addDays(grant.expiresOn, 1) }] }
    expect(await verifyTaskAccessGrant(tampered, token)).toBe(false)
  })
  it("a scoped active owner can update even if the browser last viewed a former member", async () => {
    const base = fixture()
    const s = reducer(base, { type: "enableReminderPlan" })
    const { state, grant } = await issue(s)
    const former = { ...state.people[0], id: "former", name: "A fictional predecessor", leftOn: state.today }
    const before = { ...state, people: [...state.people, former], viewerId: former.id }
    const after = act(before, grant, { kind: "working" })
    expect(after.nodes[0].status).toBe("in_progress")
    expect(after.viewerId).toBe("former")
    expect(after.reminderRuntime!.updates.at(-1)).toMatchObject({ actorId: "jordan", ownerReply: true })
    const update = { type: "taskAccessAction", token: taskAccessToken(grant), update: { kind: "working" } } as const
    const log = appendLog([], before, after, update, 100)
    expect(log[0].actor).toBe("jordan")
    expect(JSON.stringify(log)).not.toContain(grant.signature)
  })
  it("cannot bypass the existing budget completion rule", async () => {
    const s = fixture()
    const { state, grant } = await issue({ ...s, nodes: s.nodes.map(n => ({ ...n, eventId: "budget-event", stepKey: "budgetRequest" })) })
    expect(act(state, grant, { kind: "done" }).nodes[0].status).toBe("accepted")
  })
  it("only leaders can register links and malformed registry data is retained without executing it", async () => {
    const { state, grant } = await issue()
    const ordinary = { ...state, viewerId: "sam", taskAccessGrants: [] }
    expect(reducer(ordinary, { type: "issueTaskAccessGrant", grant }).taskAccessGrants).toEqual([])
    const corrupt = { ...state, taskAccessGrants: { preserve: true } as unknown as TaskAccessGrant[] }
    expect(usableTaskAccessGrant(corrupt, taskAccessToken(grant))).toBeUndefined()
    expect(reducer(corrupt, { type: "issueTaskAccessGrant", grant }).taskAccessGrants).toEqual({ preserve: true })
  })
})

describe("waiting entry is an independent request", () => {
  async function waiting() {
    const { state, grant } = await issue(reducer(fixture("review_then_auto"), { type: "enableReminderPlan" }))
    const requested = act(state, grant, { kind: "waiting", waitingOn: "Please confirm the room requirements", waitingOnPersonId: "sam" })
    const request = requested.reminderRuntime!.waitingRequests.find(r => !r.closedOn)!
    const target = await issue(requested, request.id)
    return { ...target, ownerGrant: grant, request }
  }
  it("target can acknowledge and provide an update, while original task remains owned by Jordan and Waiting", async () => {
    const { state, grant } = await waiting()
    expect(grant.scope).toBe("waiting")
    expect(grant.recipientId).toBe("sam")
    for (const kind of ["done", "claim", "working", "stuck", "waiting"] as const) {
      expect(act(state, grant, { kind }).nodes).toEqual(state.nodes)
    }
    const ack = act(state, grant, { kind: "acknowledge" })
    expect(ack.reminderRuntime!.waitingRequests[0]).toMatchObject({ response: "acknowledged", responseBy: "sam" })
    expect(queue(ack).ready).toEqual([])
    const provided = act(ack, grant, { kind: "provided" })
    expect(provided.reminderRuntime!.waitingRequests[0].response).toBe("provided")
    expect(provided.nodes[0]).toMatchObject({ ownerId: "jordan", status: "waiting" })
    expect(isReminderRuntime(provided.reminderRuntime)).toBe(true)
    expect(provided.reminderRuntime!.updates.at(-1)).toMatchObject({ actorId: "sam", ownerReply: false, waitingResponse: "provided" })
    expect(act(provided, grant, { kind: "acknowledge" }).reminderRuntime).toEqual(provided.reminderRuntime)
  })
  it("withdraws old target rights when the owner changes the request, and completion is read-only", async () => {
    const { state, grant, ownerGrant } = await waiting()
    const changed = act(state, ownerGrant, { kind: "waiting", waitingOn: "Please confirm room requirements", waitingOnPersonId: "maya" })
    expect(usableTaskAccessGrant(changed, taskAccessToken(grant))).toBeUndefined()
    const completed = act(state, ownerGrant, { kind: "done" })
    expect(await verifyTaskAccessGrant(completed, taskAccessToken(grant))).toBe(true)
    expect(act(completed, grant, { kind: "provided" }).nodes).toEqual(completed.nodes)
  })
  it("records the correct target snapshot; a source-owner entry or wrong channel cannot be substituted", async () => {
    const { state, grant, ownerGrant } = await waiting()
    const candidate = queue(state).ready[0]
    const good = snapshot(state, grant, true)
    expect(good.checked).toBe(true)
    const wrongLink = { ...good, taskUrl: taskAccessUrl("https://demo.example.org", ownerGrant), accessId: ownerGrant.id }
    expect(reducer(state, { type: "confirmPlannedReminder", candidateId: candidate.id, via: "platypus", message: wrongLink }).reminderRuntime!.deliveries).toEqual([])
    expect(reducer(state, { type: "confirmPlannedReminder", candidateId: candidate.id, via: "platypus", message: { ...good, channel: "sms" } }).reminderRuntime!.deliveries).toEqual([])
    const saved = reducer(state, { type: "confirmPlannedReminder", candidateId: candidate.id, via: "platypus", message: good })
    expect(saved.reminderRuntime!.deliveries[0]).toMatchObject({ recipientId: "sam", ownerId: "jordan", message: good })
    expect(isReminderRuntime(saved.reminderRuntime)).toBe(true)
    expect(reducer(saved, { type: "confirmPlannedReminder", candidateId: candidate.id, via: "platypus", message: good }).reminderRuntime!.deliveries).toHaveLength(1)
    good.body = "Caller changed its copy"
    expect(saved.reminderRuntime!.deliveries[0].message!.body).not.toBe(good.body)
  })
})

describe("reviewed message snapshots", () => {
  it("revalidates current facts and intended address, without trusting stale prepared prose", async () => {
    const { state, grant } = await issue()
    const mail = snapshot(state, grant)
    const action = { type: "confirmNudgeSent", nodeId: id, channel: "email", text: mail.text, via: "president", message: mail } as const
    const saved = reducer(state, action)
    expect(saved.nudges[0].message).toEqual(mail)
    expect(reducer(state, { ...action, via: "platypus" }).nudges).toEqual([])
    const edited = reducer(state, { type: "updateNode", id, patch: { instructions: "Reserve a room for 40 attendees and save its confirmation." } })
    expect(reducer(edited, action).nudges).toEqual([])
    const changedAddress = { ...state, people: state.people.map(p => p.id === "jordan" ? { ...p, email: "new-address@example.org" } : p) }
    expect(reducer(changedAddress, action).nudges).toEqual([])
    const log = appendLog([], state, saved, action, 100)
    expect(JSON.stringify(log)).not.toContain(grant.signature)
    expect(JSON.stringify(log)).not.toContain(mail.taskUrl)
    const fresh = snapshot(edited, grant)
    expect(reducer(edited, { ...action, text: fresh.text, message: fresh }).nudges[0].message).toEqual(fresh)
  })
})
