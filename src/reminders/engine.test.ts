import { describe, expect, it } from "vitest"
import { addDays } from "../lib/dates"
import type { ReminderDelivery, ReminderInput, ReminderRuntime, ReminderTaskFacts } from "./contracts"
import { confirmReminderDelivery, createReminderRuntime, planReminders, runAutomaticReminders, transitionReminderRuntime } from "./engine"

const TODAY = "2027-03-28"
const task = (patch: Partial<ReminderTaskFacts> = {}): ReminderTaskFacts => {
  const value: ReminderTaskFacts = {
    nodeId: "room", eventId: "speaker", eventName: "Speaker Night", eventDate: "2027-04-16",
    title: "Reserve a room", requirement: "Reserve a room for 40 attendees.", importance: "Confirm the location before sharing the invitation.",
    ownerId: "jordan", ownerVersion: 0, status: "accepted", due: "2027-03-31", startOn: TODAY,
    waitingOn: null, waitingOnPersonId: null, actionLink: null, source: "Fictional test fixture", planKey: "", ...patch,
  }
  value.planKey = JSON.stringify([value.nodeId, value.ownerId, value.ownerVersion, value.due, value.startOn])
  return value
}
const input = (patch: Partial<ReminderInput> = {}): ReminderInput => ({
  today: TODAY, mode: "review_then_self", maxPerTask: 3,
  people: [
    { id: "jordan", name: "Jordan", email: "jordan@example.org", active: true, lead: false, channel: "email" },
    { id: "sam", name: "Sam", email: "sam@example.org", active: true, lead: false, channel: "whatsapp" },
    { id: "maya", name: "Maya", email: "maya@example.org", active: true, lead: true, channel: "email" },
  ], tasks: [task()], runtime: createReminderRuntime(TODAY), ...patch,
})
const change = (runtime: ReminderRuntime, before: ReminderTaskFacts[], after: ReminderTaskFacts[], actorId = "jordan", updatedNodeIds?: string[], today = TODAY) =>
  transitionReminderRuntime({ runtime, before, after, actorId, updatedNodeIds, today })
const waiting = (patch: Partial<ReminderTaskFacts> = {}) => task({ status: "waiting", waitingOn: "the room confirmation", waitingOnPersonId: "sam", ...patch })
const withWaiting = (value = waiting()): ReminderInput => {
  const start = input({ tasks: [value] })
  return { ...start, runtime: change(start.runtime, [], [value]) }
}
const send = (value: ReminderInput, via: ReminderDelivery["via"] = "manual") =>
  confirmReminderDelivery(value, planReminders(value).ready[0]?.id ?? "missing", via)
function historical(patch: Partial<ReminderDelivery> = {}): ReminderDelivery {
  return {
    id: "old", candidateId: "old-candidate", nodeId: "other", recipientId: "jordan", ownerId: "jordan", ownerVersion: 0,
    planKey: "old-plan", reason: "due", scheduledOn: "2027-03-27", sentOn: "2027-03-27", sequence: 1,
    via: "manual", recipientName: "Jordan", taskTitle: "Old fictional task", eventName: "Old event", due: "2027-03-27",
    outcome: "recorded_by_sender", ...patch,
  }
}
const frozen = <T>(value: T): T => {
  if (value && typeof value === "object") {
    Object.freeze(value)
    Object.values(value).forEach(child => frozen(child))
  }
  return value
}

describe("rule-written reminder candidates", () => {
  it("starts with no invented sends, replies or waiting requests", () => {
    expect(createReminderRuntime(TODAY)).toEqual({ version: 1, activatedOn: TODAY, sequence: 0, updates: [], deliveries: [], waitingRequests: [] })
    const value = input({ mode: "auto_email" })
    expect(planReminders(value).ready.map(candidate => candidate.reason)).toEqual(["start"])
    expect(value.runtime.deliveries).toEqual([])
  })
  it("uses the rule-engine start and due, keeps start dates out of the reason sentence", () => {
    const result = planReminders(input())
    expect(result.ready[0]).toMatchObject({ reason: "start", scheduledOn: TODAY, due: "2027-03-31", overdueDays: 0 })
    expect(result.ready[0].explanation).toContain("planned start")
    expect(result.ready[0].explanation).not.toMatch(/2027|Mar 28|Time to start/)
    expect(result.upcoming.map(candidate => [candidate.reason, candidate.scheduledOn])).toEqual([["due", "2027-03-31"], ["overdue", "2027-04-03"]])
  })
  it("prefers due to start when the two dates coincide", () => {
    expect(planReminders(input({ tasks: [task({ due: TODAY })] })).ready.map(candidate => candidate.reason)).toEqual(["due"])
  })
  it("describes future checks as future rather than claiming the task is due or its start has passed", () => {
    const result = planReminders(input({ today: "2027-03-27" }))
    expect(result.ready).toEqual([])
    expect(result.upcoming.map(candidate => candidate.reason)).toEqual(["start", "due", "overdue"])
    for (const candidate of result.upcoming) {
      expect(candidate.explanation).toContain("will")
      expect(candidate.explanation).not.toMatch(/due today|has passed|past its due|Today is/)
    }
  })
  it.each([
    ["2027-03-29", "start", 0], ["2027-03-31", "due", 0], ["2027-04-01", "due", 1],
    ["2027-04-02", "due", 2], ["2027-04-03", "overdue", 3], ["2027-04-08", "overdue", 8],
  ] as const)("on %s picks only the most relevant stage and computes actual overdue days", (today, reason, overdueDays) => {
    const result = planReminders(input({ today }))
    expect(result.ready).toHaveLength(1)
    expect(result.ready[0]).toMatchObject({ reason, overdueDays })
    if (overdueDays) expect(result.ready[0].explanation).toContain(`${overdueDays} day`)
    else if (reason === "due") expect(result.ready[0].explanation).toMatch(/due today/i)
    else expect(result.ready[0].explanation).not.toContain("Today is")
  })
  it("never backfills an earlier stage after a later one was delivered", () => {
    const value = input({ today: "2027-03-31" })
    const runtime = send(value)
    expect(planReminders({ ...value, runtime, today: "2027-04-01" }).ready).toEqual([])
    expect(planReminders({ ...value, runtime, today: "2027-04-03" }).ready[0].reason).toBe("overdue")
  })
  it("does not call an old start an overdue task, and handles missing dates", () => {
    const oldStart = planReminders(input({ today: "2027-03-30" })).ready[0]
    expect(oldStart.overdueDays).toBe(0)
    expect(oldStart.explanation).not.toContain("past its due date")
    expect(planReminders(input({ tasks: [task({ due: null, startOn: null })] })).ready).toEqual([])
  })
  it("working cancels a start reminder while retaining due and overdue checks", () => {
    const tasks = [task({ status: "in_progress" })]
    expect(planReminders(input({ tasks })).ready).toEqual([])
    expect(planReminders(input({ tasks, today: "2027-03-31" })).ready[0].reason).toBe("due")
    expect(planReminders(input({ tasks, today: "2027-04-03" })).ready[0].reason).toBe("overdue")
  })
  it("pauses ordinary help requests; completion stops candidates", () => {
    expect(planReminders(input({ tasks: [task({ status: "blocked" })] })).blocked[0].reason).toBe("paused")
    expect(planReminders(input({ tasks: [task({ status: "done" })] }))).toEqual({ ready: [], upcoming: [], blocked: [] })
  })
  it("reports missing owners and unavailable recipients without assigning anyone", () => {
    expect(planReminders(input({ tasks: [task({ ownerId: null })] })).blocked[0].reason).toBe("no_owner")
    const value = input()
    value.people[0].active = false
    expect(planReminders(value).blocked[0].reason).toBe("unavailable_recipient")
  })
  it("automatic email requires an email address even when the preferred channel is WhatsApp", () => {
    const value = input({ mode: "auto_email" })
    value.people[0].channel = "whatsapp"
    expect(runAutomaticReminders(value).deliveries).toHaveLength(1)
    value.people[0].email = ""
    expect(planReminders(value).ready).toEqual([])
    expect(planReminders(value).blocked).toEqual([{ nodeId: "room", recipientId: "jordan", reason: "unavailable_recipient" }])
    expect(runAutomaticReminders(value)).toBe(value.runtime)
    const manual = { ...value, mode: "review_then_self" as const }
    expect(planReminders(manual).ready).toHaveLength(1)
    expect(send(manual).deliveries).toHaveLength(1)
  })
  it("holds ambiguous legacy history for both ordinary and waiting-object reminders", () => {
    for (const value of [input(), withWaiting()]) {
      const runtime = { ...value.runtime, legacyUnresolvedNodeIds: ["room"] }
      const result = planReminders({ ...value, runtime })
      expect(result.ready).toEqual([])
      expect(result.upcoming).toEqual([])
      expect(result.blocked).toEqual([{ nodeId: "room", reason: "legacy_history" }])
    }
  })
})

describe("meaningful updates and ownership", () => {
  it("does not mistake a title or date edit for an owner's reply", () => {
    const before = task(), titleEdit = task({ title: "Reserve the accessible room" }), dateEdit = task({ due: "2027-04-02" })
    const runtime = createReminderRuntime(TODAY)
    expect(change(runtime, [before], [titleEdit], "maya")).toBe(runtime)
    expect(change(runtime, [before], [dateEdit], "maya")).toBe(runtime)
    expect(planReminders(input({ tasks: [titleEdit], runtime })).ready[0].reason).toBe("start")
  })
  it("records same-day explicit replies in sequence rather than comparing dates", () => {
    const before = task()
    const sent = send(input())
    const first = change(sent, [before], [before], "jordan", [before.nodeId])
    const second = change(first, [before], [before], "jordan", [before.nodeId])
    expect(first.updates[0]).toMatchObject({ ownerReply: true, on: TODAY, sequence: 2 })
    expect(second.updates[1]).toMatchObject({ ownerReply: true, on: TODAY, sequence: 3 })
    expect(first.deliveries[0].sequence).toBeLessThan(first.updates[0].sequence)
    expect(planReminders(input({ runtime: first })).ready).toEqual([])
  })
  it("owner replies on or after start suppress start; early claims do not cancel future start", () => {
    const value = task()
    const runtime = change(createReminderRuntime(TODAY), [value], [value], "jordan", [value.nodeId])
    expect(planReminders(input({ runtime })).ready).toEqual([])
    expect(planReminders(input({ runtime, today: "2027-03-31" })).ready[0].reason).toBe("due")
    const early = change(createReminderRuntime("2027-03-27"), [value], [value], "jordan", [value.nodeId], "2027-03-27")
    expect(planReminders(input({ runtime: early })).ready[0].reason).toBe("start")
  })
  it("does not classify a leader's board action as the owner's reply", () => {
    const before = task(), after = task({ status: "in_progress" })
    const runtime = change(createReminderRuntime(TODAY), [before], [after], "maya", [after.nodeId])
    expect(runtime.updates[0].ownerReply).toBe(false)
    expect(runtime.updates[0].actorId).toBe("maya")
  })
  it("new owners and new owner versions do not inherit an old reply or reminder budget", () => {
    const value = input()
    const runtime = { ...value.runtime, deliveries: Array.from({ length: 3 }, (_, i) => historical({ id: `old-${i}`, nodeId: "room", sequence: i + 1, sentOn: "2027-03-20" })) }
    expect(planReminders({ ...value, runtime }).blocked[0].reason).toBe("task_limit")
    const newOwner = task({ ownerId: "sam", ownerVersion: 1 })
    expect(planReminders({ ...value, tasks: [newOwner], runtime }).ready[0].recipientId).toBe("sam")
    expect(planReminders({ ...value, tasks: [task({ ownerVersion: 2 })], runtime }).ready[0].recipientId).toBe("jordan")
  })
  it.each([{ ownerId: "sam" }, { ownerVersion: 1 }])("releases legacy blocking only for a known new owner tenure: %j", patch => {
    const value = input()
    const runtime = { ...value.runtime, legacyUnresolvedNodeIds: ["room", "another-node"], deliveries: [historical({ nodeId: "room", sentOn: "2027-03-20" })] }
    const nextTask = task(patch)
    const next = change(runtime, value.tasks, [nextTask], "maya")
    expect(next).toHaveProperty("legacyUnresolvedNodeIds", ["another-node"])
    expect(next.deliveries).toBe(runtime.deliveries)
    expect(next.deliveries[0].recipientId).toBe("jordan")
    expect(planReminders({ ...value, tasks: [nextTask], runtime: next }).ready[0].recipientId).toBe(nextTask.ownerId)
  })
  it.each([
    { title: "Edited by the lead" }, { due: "2027-04-02" }, { status: "in_progress" as const }, { ownerId: null },
  ])("preserves legacy blocking through edits, ordinary status changes and unassignment: %j", patch => {
    const value = input(), runtime = { ...value.runtime, legacyUnresolvedNodeIds: ["room"] }
    const nextTask = task(patch), next = change(runtime, value.tasks, [nextTask], "maya", ["room"])
    expect(next).toHaveProperty("legacyUnresolvedNodeIds", ["room"])
    expect(planReminders({ ...value, tasks: [nextTask], runtime: next }).blocked).toContainEqual({ nodeId: "room", reason: "legacy_history" })
  })
  it("recomputes a postponed plan and rejects an old pending candidate", () => {
    const value = input(), oldId = planReminders(value).ready[0].id
    const next = { ...value, tasks: [task({ due: "2027-04-20", startOn: "2027-04-17" })] }
    expect(planReminders(next).ready).toEqual([])
    expect(planReminders(next).upcoming[0].scheduledOn).toBe("2027-04-17")
    expect(confirmReminderDelivery(next, oldId, "manual")).toBe(next.runtime)
  })
})

describe("waiting-object follow-ups", () => {
  it("creates one separate request to the named waiting object without changing the task", () => {
    const value = withWaiting()
    const result = planReminders(value)
    expect(value.tasks[0].ownerId).toBe("jordan")
    expect(result.ready).toHaveLength(1)
    expect(result.ready[0]).toMatchObject({ reason: "waiting_on", recipientId: "sam", ownerId: "jordan" })
    expect(result.ready[0].explanation).toContain("Jordan is waiting on your help")
    expect(value.tasks).toHaveLength(1)
    expect(value.runtime.waitingRequests).toHaveLength(1)
  })
  it("deduplicates repeated same-object same-content actions, including normalized whitespace", () => {
    const value = withWaiting(), before = value.tasks[0], after = waiting({ waitingOn: "  the room confirmation  " })
    const next = change(value.runtime, [before], [after], "jordan", [before.nodeId])
    expect(next.waitingRequests).toHaveLength(1)
    const sent = send({ ...value, tasks: [after], runtime: next })
    const repeat = change(sent, [after], [after], "jordan", [after.nodeId])
    expect(planReminders({ ...value, tasks: [after], runtime: repeat, today: addDays(TODAY, 1) }).ready).toEqual([])
  })
  it("a target change closes the old request and creates a fresh, correctly routed one", () => {
    const value = withWaiting(), nextTask = waiting({ waitingOnPersonId: "maya" })
    const runtime = change(value.runtime, value.tasks, [nextTask])
    expect(runtime.waitingRequests).toHaveLength(2)
    expect(runtime.waitingRequests[0]).toMatchObject({ closedOn: TODAY, closeReason: "changed", recipientId: "sam" })
    expect(planReminders({ ...value, tasks: [nextTask], runtime }).ready[0].recipientId).toBe("maya")
  })
  it.each([
    [task({ status: "done" }), "completed"], [task({ status: "in_progress" }), "resolved"],
    [waiting({ ownerId: "maya", ownerVersion: 1 }), "reassigned"],
  ] as const)("closes the previous pending request when task state or ownership changes", (nextTask, closeReason) => {
    const value = withWaiting()
    const runtime = change(value.runtime, value.tasks, [nextTask])
    expect(runtime.waitingRequests[0]).toMatchObject({ closedOn: TODAY, closeReason })
    expect(runtime.waitingRequests.filter(request => !request.closedOn).every(request => request.ownerId === nextTask.ownerId)).toBe(true)
  })
  it("closes a removed node's request and never leaves it actionable", () => {
    const value = withWaiting(), runtime = change(value.runtime, value.tasks, [])
    expect(runtime.waitingRequests[0]).toMatchObject({ closedOn: TODAY, closeReason: "unavailable" })
    expect(planReminders({ ...value, tasks: [], runtime }).ready).toEqual([])
  })
  it("does not guess recipients from free text, route a self-request, or message an unavailable person", () => {
    for (const value of [withWaiting(waiting({ waitingOnPersonId: null })), withWaiting(waiting({ waitingOnPersonId: "jordan" }))]) {
      expect(planReminders(value).blocked[0].reason).toBe("unresolved_waiting")
      expect(planReminders(value).ready).toEqual([])
    }
    const former = withWaiting()
    former.people[1].active = false
    expect(planReminders(former).blocked[0].reason).toBe("unavailable_recipient")
    const missingEmail = withWaiting()
    missingEmail.people[1].email = ""
    expect(planReminders(missingEmail).blocked[0].reason).toBe("unavailable_recipient")
  })
  it("never sends a stale request after changing the waiting object", () => {
    const value = withWaiting(), candidate = planReminders(value).ready[0]
    const nextTask = waiting({ waitingOnPersonId: "maya" }), runtime = change(value.runtime, value.tasks, [nextTask])
    expect(confirmReminderDelivery({ ...value, tasks: [nextTask], runtime }, candidate.id, "manual")).toBe(runtime)
  })
  it("changing a due date after a waiting email does not send that same request again", () => {
    const value = withWaiting(), runtime = send(value)
    const nextTask = waiting({ due: "2027-04-02" })
    const transitioned = change(runtime, value.tasks, [nextTask])
    expect(transitioned.waitingRequests).toHaveLength(1)
    expect(planReminders({ ...value, tasks: [nextTask], runtime: transitioned, today: addDays(TODAY, 1) }).ready).toEqual([])
  })
  it("the waiting object has its own budget after the owner has received three reminders", () => {
    const value = withWaiting()
    const deliveries = Array.from({ length: 3 }, (_, i) => historical({ id: `owner-${i}`, nodeId: "room", sentOn: "2027-03-20" }))
    const runtime = { ...value.runtime, deliveries }
    const current = { ...value, runtime }
    expect(planReminders(current).ready[0]).toMatchObject({ reason: "waiting_on", recipientId: "sam" })
    expect(send(current).deliveries).toHaveLength(4)
  })
  it("waiting follow-ups do not consume the original owner's task budget", () => {
    const value = input()
    const deliveries = Array.from({ length: 3 }, (_, i) => historical({
      id: `waiting-${i}`, nodeId: "room", recipientId: "sam", reason: "waiting_on", sentOn: "2027-03-20",
    }))
    const runtime = { ...value.runtime, deliveries }
    expect(planReminders({ ...value, runtime }).ready[0].recipientId).toBe("jordan")
    const pending = withWaiting()
    expect(planReminders({ ...pending, runtime: { ...pending.runtime, deliveries } }).blocked[0]).toMatchObject({ reason: "task_limit", recipientId: "sam" })
  })
})

describe("durable delivery, modes and limits", () => {
  it.each([
    [null, ["manual"]], ["review_then_self", ["manual"]], ["review_then_auto", ["platypus"]], ["auto_email", ["automatic", "platypus"]],
  ] as const)("enforces the selected delivery mode %s at confirmation", (mode, allowed) => {
    const value = input({ mode }), candidateId = planReminders(value).ready[0].id
    for (const via of ["manual", "platypus", "automatic"] as const) {
      const next = confirmReminderDelivery(value, candidateId, via)
      if ((allowed as readonly string[]).includes(via)) expect(next.deliveries).toHaveLength(1)
      else expect(next).toBe(value.runtime)
    }
  })
  it.each([null, "review_then_self", "review_then_auto"] as const)("mode %s creates candidates without auto delivery", mode => {
    const value = withWaiting()
    value.mode = mode
    expect(runAutomaticReminders(value)).toBe(value.runtime)
    expect(confirmReminderDelivery(value, planReminders(value).ready[0].id, "automatic")).toBe(value.runtime)
    expect(planReminders(value).ready[0].reason).toBe("waiting_on")
  })
  it("records simulated automatic delivery once, on the actual day rather than the old scheduled date", () => {
    const value = input({ mode: "auto_email", today: "2027-04-06" })
    const runtime = runAutomaticReminders(value)
    expect(runtime.deliveries).toHaveLength(1)
    expect(runtime.deliveries[0]).toMatchObject({ sentOn: "2027-04-06", scheduledOn: "2027-04-03", outcome: "simulated" })
    expect(runAutomaticReminders({ ...value, runtime })).toBe(runtime)
    expect(runtime.deliveries[0].reason).toBe("overdue")
  })
  it("records sender-confirmed manual delivery distinctly from a simulated approved one", () => {
    expect(send(input()).deliveries[0].outcome).toBe("recorded_by_sender")
    expect(send(input({ mode: "review_then_auto" }), "platypus").deliveries[0].outcome).toBe("simulated")
  })
  it("retains immutable snapshots through completion, mode changes and reassignment", () => {
    const value = input(), runtime = send(value)
    const nextTask = task({ status: "done", ownerId: "sam", ownerVersion: 1, title: "An edited title" })
    const next = change(runtime, value.tasks, [nextTask])
    expect(planReminders({ ...value, tasks: [nextTask], mode: "auto_email", runtime: next }).ready).toEqual([])
    expect(next.deliveries).toBe(runtime.deliveries)
    expect(next.deliveries[0]).toMatchObject({ recipientId: "jordan", recipientName: "Jordan", taskTitle: "Reserve a room", eventName: "Speaker Night" })
  })
  it("a date edit does not reset the three-per-assignment budget", () => {
    const value = input(), runtime = { ...value.runtime, deliveries: Array.from({ length: 3 }, (_, i) => historical({ nodeId: "room", id: `historical-${i}`, sentOn: "2027-03-20" })) }
    expect(planReminders({ ...value, tasks: [task({ due: "2027-04-01" })], runtime }).blocked[0].reason).toBe("task_limit")
  })
  it("applies a smaller configured task limit and clamps an oversized one to three", () => {
    const value = input({ maxPerTask: 1 }), runtime = send(value)
    expect(planReminders({ ...value, runtime, today: "2027-03-31" }).blocked[0].reason).toBe("task_limit")
    const capped = { ...value, maxPerTask: 99, runtime: { ...runtime, deliveries: Array.from({ length: 3 }, (_, i) => historical({ nodeId: "room", id: String(i) })) } }
    expect(planReminders(capped).blocked[0].reason).toBe("task_limit")
  })
  it("does not resend the same task to the same person twice on one day even after a plan edit", () => {
    const value = input(), runtime = send(value)
    const changed = { ...value, runtime, tasks: [task({ due: TODAY })] }
    expect(planReminders(changed).blocked[0].reason).toBe("already_sent_today")
  })
  it("weekly limits use actual recipients and release a held candidate when the week rolls forward", () => {
    const value = withWaiting()
    const deliveries = Array.from({ length: 6 }, (_, i) => historical({ id: `sent-${i}`, recipientId: "sam", sentOn: addDays(TODAY, -6) }))
    const runtime = { ...value.runtime, deliveries }
    expect(planReminders({ ...value, runtime }).blocked[0]).toMatchObject({ reason: "weekly_limit", recipientId: "sam" })
    expect(planReminders({ ...value, runtime, today: addDays(TODAY, 1) }).ready[0].recipientId).toBe("sam")
    expect(planReminders(input({ runtime })).ready[0].recipientId).toBe("jordan")
  })
  it("rechecks a batch so seven eligible tasks to one person produce six deliveries", () => {
    const value = input({ mode: "auto_email", tasks: Array.from({ length: 7 }, (_, i) => task({ nodeId: `task-${i}` })) })
    expect(planReminders(value).ready).toHaveLength(7)
    const runtime = runAutomaticReminders(value)
    expect(runtime.deliveries).toHaveLength(6)
    expect(planReminders({ ...value, runtime }).blocked).toContainEqual({ nodeId: "task-6", recipientId: "jordan", reason: "weekly_limit" })
  })
  it("does not mutate frozen inputs while recording a reply, rerouting waiting, or delivering", () => {
    const value = frozen(withWaiting())
    const nextTask = frozen(waiting({ waitingOnPersonId: "maya" }))
    const transitioned = change(value.runtime, value.tasks, [nextTask], "jordan", [nextTask.nodeId])
    expect(transitioned).not.toBe(value.runtime)
    expect(value.runtime.waitingRequests[0].closedOn).toBeNull()
    const runtime = send({ ...value, tasks: [nextTask], runtime: frozen(transitioned) })
    expect(runtime.deliveries).toHaveLength(1)
    expect(transitioned.deliveries).toEqual([])
  })
})
