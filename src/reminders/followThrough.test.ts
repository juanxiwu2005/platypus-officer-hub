import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import type { DemoState } from "../data/types"
import { addDays } from "../lib/dates"
import { runFollowupDay } from "../engine/followup"
import { applySchedule } from "../engine/schedule"
import { createReminderRuntime, confirmReminderDelivery, planReminders, runAutomaticReminders, transitionReminderRuntime } from "./engine"
import type { ReminderDelivery, ReminderInput, ReminderTaskFacts } from "./contracts"
import { buildReminderInput } from "./facts"
import { makeTaskAccessGrant, taskAccessToken } from "./taskAccess"
import { isReminderRuntime } from "./runtime"
import { buildReminderMail } from "./mail"
import { reminderCentre } from "./centre"

beforeAll(() => vi.stubGlobal("crypto", webcrypto))
afterAll(() => vi.unstubAllGlobals())
const START = "2027-03-28", DUE = "2027-04-10"
function task(patch: Partial<ReminderTaskFacts> = {}): ReminderTaskFacts {
  const t: ReminderTaskFacts = { nodeId: "room", eventId: null, eventName: null, eventDate: null, title: "Reserve a room", requirement: "Confirm the room.",
    importance: "The event needs a location.", ownerId: "jordan", ownerVersion: 0, status: "accepted", due: DUE, startOn: START,
    waitingOn: null, waitingOnPersonId: null, actionLink: null, source: "Fictional audit fixture", planKey: "", ...patch }
  t.planKey = JSON.stringify([t.nodeId, t.ownerId, t.ownerVersion, t.due, t.startOn])
  return t
}
function input(patch: Partial<ReminderInput> = {}): ReminderInput {
  return { today: START, mode: "review_then_self", maxPerTask: 3, tasks: [task()], runtime: createReminderRuntime(START), people: [
    { id: "jordan", name: "Jordan", email: "jordan@example.org", active: true, lead: false, channel: "email" },
    { id: "sam", name: "Sam", email: "sam@example.org", active: true, lead: false, channel: "whatsapp" },
  ], ...patch }
}
function sent(i: ReminderInput): ReminderInput {
  const id = planReminders(i).ready[0]?.id
  expect(id).toBeDefined()
  return { ...i, runtime: confirmReminderDelivery(i, id!, "manual") }
}
const advance = (i: ReminderInput, days: number) => ({ ...i, today: addDays(START, days) })

describe("milestone history and bounded no-reply follow-up", () => {
  it.each([
    [DUE, { startOn: "2027-03-29" }, "2027-04-11", "due"],
    [START, { due: "2027-04-11" }, "2027-03-29", "start"],
    ["2027-04-13", { startOn: "2027-03-29" }, "2027-04-14", "overdue"],
  ] as const)("preserves the %s send after editing the other date", (today, patch, nextDay, reason) => {
    const i = sent(input({ today }))
    expect(i.runtime.deliveries[0].reason).toBe(reason)
    expect(planReminders({ ...i, today: nextDay, tasks: [task(patch)] }).ready).toEqual([])
    expect(i.runtime.deliveries).toHaveLength(1)
  })
  it("keeps a delivered due stage even when the due date itself moves, including old candidate IDs", () => {
    const i = sent(input({ today: DUE }))
    i.runtime.deliveries[0].candidateId = "an-earlier-dated-candidate"
    expect(planReminders({ ...i, today: "2027-04-11", tasks: [task({ due: "2027-04-11" })] }).ready).toEqual([])
  })
  it("keeps every old duplicate in history without consuming the unused due milestone", () => {
    const i = sent(input()), first = i.runtime.deliveries[0]
    i.runtime = { ...i.runtime, sequence: 3, deliveries: [first, { ...first, id: "old-duplicate-2", sequence: 2 }, { ...first, id: "old-duplicate-3", sequence: 3 }] }
    expect(planReminders({ ...i, today: DUE }).ready[0].reason).toBe("due")
    expect(i.runtime.deliveries).toHaveLength(3)
  })
  it("rejects stale pending drafts while preserving the future unsent milestone", () => {
    const i = input(), old = planReminders(i).ready[0].id
    const next = { ...i, tasks: [task({ startOn: "2027-04-12", due: "2027-04-15" })] }
    expect(confirmReminderDelivery(next, old, "manual")).toBe(next.runtime)
    expect(planReminders(next).upcoming[0].scheduledOn).toBe("2027-04-12")
  })
  it("follows up exactly once after two days, leaving three milestone slots available", () => {
    let i = sent(input())
    expect(planReminders(advance(i, 1)).ready).toEqual([])
    expect(planReminders(advance(i, 2)).ready[0].reason).toBe("no_reply")
    i = sent(advance(i, 2))
    expect(planReminders(advance(i, 4)).ready).toEqual([])
    i = sent({ ...i, today: DUE })
    i = sent({ ...i, today: "2027-04-13" })
    expect(i.runtime.deliveries.map(d => d.reason)).toEqual(["start", "no_reply", "due", "overdue"])
  })
  it("merges a no-reply check into the reached due milestone", () => {
    const i = sent(input({ tasks: [task({ due: "2027-03-30" })] }))
    expect(planReminders(advance(i, 2)).ready.map(c => c.reason)).toEqual(["due"])
  })
  it.each([1, 2])("honors a lower configured limit of %s without an extra follow-up", maxPerTask => {
    expect(planReminders(advance(sent(input({ maxPerTask })), 2)).ready).toEqual([])
  })
  it("cancels an unanswered candidate after an owner reply, pause, reassignment or date change", () => {
    const i = sent(input()), facts = i.tasks[0]
    const runtime = transitionReminderRuntime({ runtime: i.runtime, before: [facts], after: [facts], actorId: "jordan", updatedNodeIds: [facts.nodeId], today: addDays(START, 1) })
    expect(planReminders({ ...advance(i, 2), runtime }).ready).toEqual([])
    for (const patch of [{ status: "done" }, { status: "waiting" }, { status: "blocked" }, { ownerId: "sam", ownerVersion: 1 }, { due: "2027-04-12" }] as const) {
      expect(planReminders({ ...advance(i, 2), tasks: [task(patch)] }).ready.some(c => c.reason === "no_reply")).toBe(false)
    }
  })
})

function waiting() {
  const i = input({ tasks: [task({ status: "waiting", waitingOn: "Please provide the room confirmation", waitingOnPersonId: "sam" })] })
  i.runtime = transitionReminderRuntime({ runtime: i.runtime, today: START, before: [], after: i.tasks, actorId: "jordan" })
  return i
}
describe("waiting requests remain open until input is provided", () => {
  it("follows up an unanswered request once; acknowledgement has a separate, bounded promised-date check", () => {
    let i = sent(waiting())
    expect(planReminders(advance(i, 1)).upcoming[0].scheduledOn).toBe(addDays(START, 2))
    i = sent(advance(i, 2))
    expect(planReminders(advance(i, 3)).ready).toEqual([])
    i.runtime.waitingRequests[0] = { ...i.runtime.waitingRequests[0], response: "acknowledged", respondedOn: addDays(START, 2), responseBy: "sam", expectedOn: addDays(START, 5) }
    expect(planReminders(advance(i, 4)).ready).toEqual([])
    i = sent(advance(i, 5))
    expect(i.runtime.deliveries.map(d => d.reason)).toEqual(["waiting_on", "waiting_followup", "waiting_followup"])
    expect(planReminders(advance(i, 9)).ready).toEqual([])
  })
  it("uses a deterministic default for an old acknowledgement and does not resend the initial request", () => {
    const i = waiting()
    i.runtime.waitingRequests[0] = { ...i.runtime.waitingRequests[0], response: "acknowledged", respondedOn: START, responseBy: "sam" }
    expect(planReminders(i).upcoming[0]).toMatchObject({ reason: "waiting_followup", scheduledOn: addDays(START, 2) })
  })
  it("writes the correct reason in both kinds of follow-up email, with one task entry", () => {
    const ordinary = advance(sent(input()), 2), helper = advance(sent(waiting()), 2)
    for (const i of [ordinary, helper]) {
      const candidate = planReminders(i).ready[0], request = i.runtime.waitingRequests[0]
      const mail = buildReminderMail({ today: i.today, facts: i.tasks[0], recipient: i.people.find(p => p.id === candidate.recipientId)!, candidate, request, requesterName: "Jordan", taskUrl: "https://demo.example.org/#/officer?access=fictional.signature" })
      expect(mail.checked).toBe(true)
      expect(mail.body.toLowerCase()).toContain("no reply")
      expect(mail.body.match(/https:\/\/\S+/g)).toHaveLength(1)
    }
  })
})

function history(reason: ReminderDelivery["reason"], sentOn: string, index: number): ReminderDelivery {
  return { id: `prior-${index}`, sequence: index + 1, candidateId: `prior-${index}`, nodeId: `prior-${index}`, recipientId: "jordan", ownerId: "jordan", ownerVersion: 0,
    planKey: "old", reason, scheduledOn: sentOn, sentOn, via: "manual", recipientName: "Jordan", taskTitle: "Fictional previous task", eventName: null, due: reason === "due" ? sentOn : DUE, outcome: "recorded_by_sender" }
}
describe("recipient priority and reserved capacity", () => {
  it("orders overdue and due ahead of a much older start, independently of task IDs", () => {
    const i = input({ mode: "auto_email", tasks: [task({ nodeId: "a-start", startOn: "2027-03-20" }), task({ nodeId: "z-due", due: START }), task({ nodeId: "y-overdue", due: "2027-03-25" })] })
    expect(planReminders(i).ready.map(c => c.reason)).toEqual(["overdue", "due", "start"])
    expect(runAutomaticReminders(i).deliveries.map(d => d.reason)).toEqual(["overdue", "due"])
  })
  it("allows one ordinary and one important reminder per day, never six starts together", () => {
    const i = input({ mode: "auto_email", tasks: Array.from({ length: 6 }, (_, index) => task({ nodeId: `start-${index}` })) })
    const runtime = runAutomaticReminders(i)
    expect(runtime.deliveries).toHaveLength(1)
    const next = { ...i, runtime, tasks: [task({ nodeId: "due", due: START }), ...i.tasks] }
    const added = runAutomaticReminders(next)
    expect(added.deliveries).toHaveLength(2)
    expect(added.deliveries[1].reason).toBe("due")
    expect(planReminders({ ...next, runtime: added, tasks: [task({ nodeId: "other-due", due: START })] }).blocked[0].reason).toBe("daily_limit")
  })
  it("reserves two weekly slots even after four ordinary reminders, and releases old actual sends", () => {
    const i = input()
    i.runtime = { ...i.runtime, sequence: 4, deliveries: Array.from({ length: 4 }, (_, j) => history("start", addDays(START, j - 6), j)) }
    expect(planReminders(i).blocked[0].reason).toBe("weekly_reserved")
    expect(planReminders({ ...i, tasks: [task({ due: START })] }).ready[0].reason).toBe("due")
    expect(planReminders({ ...i, today: addDays(START, 1) }).ready[0].reason).toBe("start")
  })
  it("counts important sends against six total, but not against the four ordinary slots", () => {
    const i = input()
    const deliveries = [history("due", addDays(START, -5), 0), history("due", addDays(START, -4), 1), ...Array.from({ length: 3 }, (_, j) => history("start", addDays(START, j - 3), j + 2))]
    i.runtime = { ...i.runtime, sequence: 5, deliveries }
    expect(planReminders(i).ready).toHaveLength(1)
    const full = sent(i)
    expect(planReminders({ ...full, tasks: [task({ nodeId: "due", due: START })] }).blocked[0].reason).toBe("weekly_limit")
  })
})

describe("real helper actions and owner notifications", () => {
  async function fixture() {
    const s = seedDemo(undefined, "v2"), original = s.nodes.find(n => n.id === "t-room")!
    const initial: DemoState = applySchedule({ ...s, nodes: [{ ...original, ownerId: "jordan", ownerVersion: 0, status: "waiting", waitingOn: "Please provide the room confirmation", waitingOnPersonId: "sam", eventId: null, dependsOn: [], anchor: { kind: "fixed", official: null, club: "2026-11-20" } }],
      events: [], funding: [], nudges: [], protocolLog: [], notifications: [], silenceCases: [], reminderRuntime: undefined })
    const enabled = reducer(initial, { type: "enableReminderPlan" })
    const grant = await makeTaskAccessGrant(enabled, "t-room", enabled.reminderRuntime!.waitingRequests[0].id)
    const state = reducer(enabled, { type: "issueTaskAccessGrant", grant })
    return { state, grant, token: taskAccessToken(grant) }
  }
  it("persists a promise through reload, rejects invalid dates and cannot use it to complete the task", async () => {
    const { state, token } = await fixture()
    for (const expectedOn of ["2026-02-30", "2020-01-01", "not-a-date"]) {
      expect(reducer(state, { type: "taskAccessAction", token, update: { kind: "acknowledge", expectedOn } }).reminderRuntime).toBe(state.reminderRuntime)
    }
    const expectedOn = addDays(state.today, 3)
    const ack = reducer(state, { type: "taskAccessAction", token, update: { kind: "acknowledge", expectedOn } })
    expect(ack.nodes[0]).toMatchObject({ status: "waiting", ownerId: "jordan" })
    expect(ack.reminderRuntime!.waitingRequests[0]).toMatchObject({ response: "acknowledged", expectedOn })
    const reload = JSON.parse(JSON.stringify(ack)) as DemoState
    expect(isReminderRuntime(reload.reminderRuntime)).toBe(true)
    expect(planReminders(buildReminderInput({ ...reload, today: expectedOn }, reload.reminderRuntime!)).ready[0].reason).toBe("waiting_followup")
    expect(reducer(ack, { type: "taskAccessAction", token, update: { kind: "done" } }).nodes[0].status).toBe("waiting")
  })
  it("notifies only the actual owner once on provision, and the owner must explicitly resume", async () => {
    const { state, token } = await fixture()
    const provided = reducer(state, { type: "taskAccessAction", token, update: { kind: "provided" } })
    expect(provided.nodes[0].status).toBe("waiting")
    expect(provided.notifications.filter(n => n.id.startsWith("waiting-provided:")).map(n => n.recipientId)).toEqual(["jordan"])
    expect(reducer(provided, { type: "taskAccessAction", token, update: { kind: "provided" } }).notifications).toEqual(provided.notifications)
    expect(planReminders(buildReminderInput(provided, provided.reminderRuntime!)).ready).toEqual([])
    const ownerGrant = await makeTaskAccessGrant(provided, "t-room")
    const issued = reducer(provided, { type: "issueTaskAccessGrant", grant: ownerGrant })
    const resumed = reducer(issued, { type: "taskAccessAction", token: taskAccessToken(ownerGrant), update: { kind: "working" } })
    expect(resumed.nodes[0].status).toBe("in_progress")
    expect(resumed.reminderRuntime!.waitingRequests[0].closedOn).toBe(state.today)
  })
  it("unresolved waiting produces one owner action notice rather than disappearing behind the old pause", async () => {
    const { state } = await fixture()
    const later = runFollowupDay(state, addDays(state.today, 2))
    const again = runFollowupDay(later, addDays(state.today, 3))
    expect(again.notifications.filter(n => n.id.startsWith("waiting-needs-action:")).map(n => n.recipientId)).toEqual(["jordan"])
    expect(again.protocolLog).toEqual([])
    expect(reminderCentre(again).runtimeState).toBe("active")
  })
})
