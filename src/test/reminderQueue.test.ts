import { describe, expect, it } from "vitest"
import { DEMO_TODAY, seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import type { DemoState, Nudge, ProtocolEntry, ReminderMode } from "../data/types"
import { approvable, NO_REPLY_DAYS, reminderQueue, yourReminders } from "../lib/reminderQueue"
import { nudgeBlocked } from "../lib/nudges"
import { advanceClock } from "../engine/followup"
import { forecastFor } from "../engine/forecast"
import { addDays } from "../lib/dates"

// FB-8 (docs/feedback-fix/PLAN.md §12.2): the reminder centre's five sections come from one pure function.
const base = seedDemo(undefined, "v2")
const withMode = (mode: ReminderMode | undefined, s: DemoState = base): DemoState => {
  const { reminderMode: _old, ...settings } = s.org.settings; void _old
  return { ...s, org: { ...s.org, settings: mode ? { ...settings, reminderMode: mode } : settings } }
}
const ids = (xs: { node: { id: string } }[]) => xs.map(x => x.node.id)
const nudge = (nodeId: string, sentOn: string, over: Partial<Nudge> = {}): Nudge => ({ id: `nudge-9-${nodeId}`, nodeId, channel: "email", text: "x", sentBy: "alex", sentOn, response: null, ...over })
const send = (s: DemoState, nodeId: string, via?: "president" | "platypus") => reducer(s, { type: "confirmNudgeSent", nodeId, channel: "email", text: "A checked demo reminder", ...(via ? { via } : {}) })

describe("reminderQueue: the sections", () => {
  const q = reminderQueue(base)
  it("the sample club has no mode: send-day items wait under Needs your OK, nothing has been sent", () => {
    expect(q.mode).toBeNull()
    expect(q.review).toBe(true)
    expect(q.sent).toEqual([])
    expect(q.replies).toEqual([])
    expect(q.noReply).toEqual([])
    expect(q.needsOk.length).toBeGreaterThan(0)
  })
  it("Needs your OK: open tasks with an owner whose engine send day is today or earlier", () => {
    for (const x of q.needsOk) {
      expect(x.node.status).not.toBe("done")
      expect(x.node.ownerId).toBeTruthy()
      expect(x.sendDay).toBe(x.node.latestStart)
      expect(x.sendDay! <= base.today).toBe(true)
    }
    const expected = base.nodes.filter(n => n.ownerId && n.status !== "done" && n.latestStart && n.latestStart <= base.today).map(n => n.id).sort()
    expect(ids(q.needsOk).sort()).toEqual(expected)
    // A task nobody owns is nobody's reminder.
    expect(ids(q.needsOk)).not.toContain("t-photos")
  })
  it("This week: a send day from tomorrow up to seven days ahead, nothing else", () => {
    const end = addDays(base.today, 7)
    for (const x of q.thisWeek) expect(x.sendDay! > base.today && x.sendDay! <= end).toBe(true)
    const expected = base.nodes.filter(n => n.ownerId && n.status !== "done" && n.latestStart && n.latestStart > base.today && n.latestStart <= end).map(n => n.id).sort()
    expect(ids(q.thisWeek).sort()).toEqual(expected)
    expect(q.thisWeek.length).toBeGreaterThan(0)
  })
  it("forecast-red tasks come first in each section and carry the risk mark", () => {
    const f = forecastFor(base)
    for (const list of [q.needsOk, q.thisWeek]) {
      list.forEach(x => expect(x.risk).toBe(f.nodes[x.node.id].color === "red"))
      const firstCalm = list.findIndex(x => !x.risk)
      if (firstCalm >= 0) expect(list.slice(firstCalm).some(x => x.risk)).toBe(false)
    }
    expect(q.needsOk.some(x => x.risk)).toBe(true)
  })
  it("a reminder sent on or after the send day leaves Needs your OK for Sent", () => {
    const id = q.needsOk[0].node.id
    const next = reminderQueue(send(base, id, "president"))
    expect(ids(next.needsOk)).not.toContain(id)
    expect(next.sent.map(x => [x.node.id, x.kind, x.on])).toEqual([[id, "president", base.today]])
    // One sent before the send day does not count: on the day, the task waits again.
    const early = reminderQueue({ ...base, nudges: [nudge(id, addDays(q.needsOk[0].sendDay!, -1))] })
    expect(ids(early.needsOk)).toContain(id)
  })
  it("Replies: the owner's answer in the reply buttons' words; or any later update of the task", () => {
    const id = "t-room"
    const s = { ...send(base, id), today: addDays(base.today, 1) }
    const replied = reducer({ ...s, viewerId: "jordan" }, { type: "replyTask", nodeId: id, reply: "waiting", input: { waitingOn: "the caterer" } })
    expect(reminderQueue(replied).replies.map(x => [x.node.id, x.reply])).toEqual([[id, "Waiting on the caterer"]])
    const done = reducer({ ...s, viewerId: "jordan" }, { type: "replyTask", nodeId: id, reply: "done" })
    const dq = reminderQueue(done)
    expect(dq.replies.map(x => [x.node.id, x.reply])).toEqual([[id, "Done"]])
    expect(ids(dq.needsOk)).not.toContain(id)
    // No reply button pressed, but the task moved after the reminder: still an answer.
    const moved = { ...s, nodes: s.nodes.map(n => n.id === id ? { ...n, lastUpdate: s.today, status: "in_progress" as const } : n) }
    expect(reminderQueue(moved).replies.map(x => x.reply)).toEqual(["Working on it"])
    const claimed = { ...base, nudges: [nudge("t-room", base.today, { response: "accepted" })] }
    expect(reminderQueue(claimed).replies.map(x => x.reply)).toEqual(["Claimed"])
  })
  it(`No reply yet: ${NO_REPLY_DAYS} days or more after the latest reminder without any update`, () => {
    const s = send(base, "t-room")
    expect(reminderQueue({ ...s, today: addDays(s.today, 1) }).noReply).toEqual([])
    const later = reminderQueue({ ...s, today: addDays(s.today, 2) })
    expect(later.noReply.map(x => [x.node.id, x.days, x.sentOn])).toEqual([["t-room", 2, base.today]])
  })
  it("Follow up respects the reminder limits (nudgeBlocked)", () => {
    let s = base
    for (let i = 0; i < 3; i++) s = { ...send(s, "t-room"), today: addDays(s.today, 3) }
    const row = reminderQueue(s).noReply.find(x => x.node.id === "t-room")!
    expect(row.blocked).toBe(nudgeBlocked(s, row.node))
    expect(row.blocked).toMatch(/limit/)
  })
})

describe("reminderQueue: the three reminder modes", () => {
  it("Send automatically: nothing waits for a lead; send-day items are derived under Sent and nothing is written", () => {
    const s = withMode("auto_email")
    const q = reminderQueue(s)
    expect(q.review).toBe(false)
    expect(q.needsOk).toEqual([])
    const would = q.sent.filter(x => x.kind === "would")
    expect(ids(would).sort()).toEqual(ids(reminderQueue(base).needsOk).sort())
    would.forEach(x => expect(x.on).toBe(x.node.latestStart))
    expect(s.nudges).toEqual([])
    // Derived on the send day, so an old one with no update since is "No reply yet".
    expect(q.noReply.length).toBeGreaterThan(0)
    expect(approvable(q)).toEqual([])
  })
  it("I review, then I send: Needs your OK, and Approve all does not apply", () => {
    const q = reminderQueue(withMode("review_then_self"))
    expect(q.needsOk.length).toBeGreaterThan(0)
    expect(approvable(q)).toEqual([])
  })
  it("I review, Platypus sends: Approve all covers every item that is not held back; once per item it records via platypus", () => {
    const s = withMode("review_then_auto")
    const q = reminderQueue(s)
    const ok = approvable(q)
    expect(ok.length).toBe(q.needsOk.filter(x => !x.blocked).length)
    expect(ok.length).toBeGreaterThan(1)
    const after = ok.reduce((st, x) => send(st, x.node.id, "platypus"), s)
    expect(after.nudges).toHaveLength(ok.length)
    expect(after.nudges.every(x => x.via === "platypus")).toBe(true)
    const next = reminderQueue(after)
    expect(next.needsOk.filter(x => !x.blocked)).toEqual([])
    expect(next.sent.every(x => x.kind === "platypus")).toBe(true)
  })
  it("no mode behaves like I review, then I send", () => {
    expect(ids(reminderQueue(base).needsOk)).toEqual(ids(reminderQueue(withMode("review_then_self")).needsOk))
  })
  it("the silence protocol's simulated reminders are under Sent as follow-ups", () => {
    const later = advanceClock(base, 3)
    const reminders = later.protocolLog.filter((e: ProtocolEntry) => e.kind === "reminder" && e.recipientIds.length)
    expect(reminders.length).toBeGreaterThan(0)
    const follow = reminderQueue(later).sent.filter(x => x.kind === "followup")
    expect(follow.map(x => x.id).sort()).toEqual(reminders.map(e => e.id).sort())
    follow.forEach(x => expect(x.on).toBe(reminders.find(e => e.id === x.id)!.scheduledOn))
  })
})

describe("confirmNudgeSent's optional via", () => {
  it("is kept only when it is one of the two values, and is absent when not given", () => {
    expect(send(base, "t-room", "platypus").nudges[0].via).toBe("platypus")
    expect(send(base, "t-room", "president").nudges[0].via).toBe("president")
    expect("via" in send(base, "t-room").nudges[0]).toBe(false)
    const odd = reducer(base, { type: "confirmNudgeSent", nodeId: "t-room", channel: "email", text: "x", via: "robot" as never })
    expect("via" in odd.nudges[0]).toBe(false)
  })
})

describe("yourReminders: the read-only view for an officer", () => {
  it("lists only their own open tasks from today on, by send day, and reminders that went out for them", () => {
    const s = { ...withMode("auto_email"), viewerId: "jordan" }
    const mine = yourReminders(s, "jordan")
    expect(mine.upcoming.length).toBeGreaterThan(0)
    mine.upcoming.forEach(x => { expect(x.node.ownerId).toBe("jordan"); expect(x.sendDay! >= s.today).toBe(true) })
    expect(mine.upcoming.map(x => x.sendDay)).toEqual([...mine.upcoming.map(x => x.sendDay)].sort())
    expect(mine.received.length).toBeGreaterThan(0)
    mine.received.forEach(x => expect(x.node.ownerId).toBe("jordan"))
    expect(yourReminders(base, "jordan").received).toEqual([])
  })
})

it("uses the demo date", () => expect(base.today).toBe(DEMO_TODAY))
