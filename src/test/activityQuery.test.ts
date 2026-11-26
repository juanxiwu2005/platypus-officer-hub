import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer, type Action } from "../data/store"
import type { ActivityEvent, DemoState } from "../data/types"
import { deliveredWithDetails, eventsForPerson, eventsForTask, firstResponse } from "../lib/activityQuery"

const seed = () => seedDemo(undefined, "v2")
const run = (s: DemoState, ...actions: Action[]) => actions.reduce((state, action) => reducer(state, action), s)
const node = (s: DemoState, id: string) => s.nodes.find(n => n.id === id)!
const submit = (s: DemoState, nodeId: string, details: string): Action => {
  const n = node(s, nodeId)
  return { type: "saveTaskWork", nodeId, input: { details, attachments: [], expectedRevision: n.taskWork?.revision ?? 0, expectedOwnerId: n.ownerId, expectedOwnerVersion: n.ownerVersion ?? 0, submit: true } }
}
const event = (seq: number, patch: Partial<ActivityEvent>): ActivityEvent =>
  ({ id: `act:${seq}`, seq, on: "2026-10-31", actorId: "alex", kind: "task.status", personIds: [], source: "live", ...patch })

describe("eventsForPerson and eventsForTask", () => {
  it("select by person (about them or done by them) and by task, in recording order", () => {
    const s = run(seed(),
      { type: "updateNode", id: "t-news", patch: { ownerId: "jordan" } },
      { type: "setViewer", viewerId: "priya" },
      { type: "replyTask", nodeId: "t-agenda", reply: "working" },
      { type: "setViewer", viewerId: "jordan" },
      { type: "replyTask", nodeId: "t-room", reply: "waiting", input: { waitingOn: "Fictional receipt", waitingOnPersonId: "maya" } },
    )
    const record = s.activity!
    expect(record.map(e => e.kind)).toEqual(["task.assigned", "task.status", "task.status", "task.status", "task.waiting_on"])

    const jordan = eventsForPerson(s, "jordan")
    // Alex's assignment is about Jordan; Jordan's own waiting update is done by Jordan; Priya's update is neither.
    expect(jordan.map(e => [e.kind, e.nodeId])).toEqual([["task.assigned", "t-news"], ["task.status", "t-news"], ["task.status", "t-room"], ["task.waiting_on", "t-room"]])
    expect(eventsForPerson(s, "maya").map(e => e.kind)).toEqual(["task.waiting_on"])
    expect(eventsForPerson(s, "priya").map(e => e.nodeId)).toEqual(["t-agenda"])
    expect(eventsForPerson(s, "nobody")).toEqual([])

    expect(eventsForTask(s, "t-room").map(e => e.kind)).toEqual(["task.status", "task.waiting_on"])
    expect(eventsForTask(s, "t-sdc")).toEqual([])
  })

  it("sort by seq without changing the record, and accept a state without a record", () => {
    const activity = [event(3, { nodeId: "a", personIds: ["sam"] }), event(1, { nodeId: "a", actorId: "sam" }), event(2, { nodeId: "b", personIds: ["sam"] })]
    const s = { activity }
    expect(eventsForPerson(s, "sam").map(e => e.seq)).toEqual([1, 2, 3])
    expect(eventsForTask(s, "a").map(e => e.seq)).toEqual([1, 3])
    expect(activity.map(e => e.seq)).toEqual([3, 1, 2])
    expect(eventsForTask({}, "a")).toEqual([])
    expect(firstResponse({}, "a")).toBeNull()
    expect(deliveredWithDetails({}, "sam", "2026-01-01", "2027-01-01")).toEqual([])
  })
})

describe("firstResponse", () => {
  it("measures the owner's first update after the latest assignment, ignoring the assignment's own status change", () => {
    const assigned = reducer(seed(), { type: "updateNode", id: "t-news", patch: { ownerId: "jordan" } })
    // The lead's assignment moves the task from Waiting to To do in the same action; that is not Jordan's response.
    expect(firstResponse(assigned, "t-news")).toMatchObject({ trigger: { kind: "task.assigned", on: "2026-10-31" }, response: null, days: null })

    const later = run(assigned, { type: "advanceClock", days: 2 }, { type: "setViewer", viewerId: "jordan" }, { type: "replyTask", nodeId: "t-news", reply: "working" })
    const answer = firstResponse(later, "t-news")!
    expect(answer.response).toMatchObject({ kind: "task.status", actorId: "jordan", on: "2026-11-02", facts: { from: "accepted", to: "in_progress" } })
    expect(answer.days).toBe(2)

    // A newer assignment starts a new wait.
    const reassigned = run(later, { type: "setViewer", viewerId: "alex" }, { type: "updateNode", id: "t-news", patch: { ownerId: "priya" } })
    expect(firstResponse(reassigned, "t-news")).toMatchObject({ trigger: { kind: "task.assigned", personIds: ["priya"], on: "2026-11-02" }, response: null, days: null })
  })

  it("counts a reminder as the trigger, and a claim as the response", () => {
    const reminded = reducer(seed(), { type: "confirmNudgeSent", nodeId: "t-room", channel: "email", text: "Fictional reminder" })
    const replied = run(reminded, { type: "advanceClock", days: 1 }, { type: "setViewer", viewerId: "jordan" }, { type: "replyTask", nodeId: "t-room", reply: "working" })
    expect(firstResponse(replied, "t-room")).toMatchObject({ trigger: { kind: "reminder.recorded", personIds: ["jordan"] }, response: { kind: "task.status", actorId: "jordan" }, days: 1 })

    // Claiming a task nobody owned: the claim answers the assignment it made, on the same day.
    const claimed = reducer(seed(), { type: "claimTask", nodeId: "t-tabling" })
    expect(firstResponse(claimed, "t-tabling")).toMatchObject({ trigger: { kind: "task.assigned" }, response: { kind: "task.claimed", actorId: "alex" }, days: 0 })
  })

  it("is null for a task that was never assigned or reminded", () => {
    const s = run(seed(), { type: "setViewer", viewerId: "jordan" }, { type: "replyTask", nodeId: "t-room", reply: "working" })
    expect(eventsForTask(s, "t-room")).toHaveLength(1)
    expect(firstResponse(s, "t-room")).toBeNull()
  })
})

describe("deliveredWithDetails", () => {
  it("lists a person's completions with written details or files inside the date range", () => {
    const jordan = run(seed(), { type: "setViewer", viewerId: "jordan" })
    const withDetails = reducer(jordan, submit(jordan, "t-room", "Fictional booking confirmation"))
    const bare = reducer(withDetails, { type: "replyTask", nodeId: "t-volunteers", reply: "done" })
    const nextDay = run(bare, { type: "setViewer", viewerId: "alex" }, { type: "advanceClock", days: 1 }, { type: "setViewer", viewerId: "jordan" })
    const s = reducer(nextDay, submit(nextDay, "t-studyroom", "Fictional room notes"))
    expect(node(s, "t-studyroom").status).toBe("done")

    const done = s.activity!.filter(e => e.kind === "task.done")
    expect(done.map(e => [e.nodeId, e.on])).toEqual([["t-room", "2026-10-31"], ["t-volunteers", "2026-10-31"], ["t-studyroom", "2026-11-01"]])

    expect(deliveredWithDetails(s, "jordan", "2026-10-01", "2026-11-30").map(e => e.nodeId)).toEqual(["t-room", "t-studyroom"])
    // Both ends are included.
    expect(deliveredWithDetails(s, "jordan", "2026-10-31", "2026-10-31").map(e => e.nodeId)).toEqual(["t-room"])
    expect(deliveredWithDetails(s, "jordan", "2026-11-01", "2026-11-01").map(e => e.nodeId)).toEqual(["t-studyroom"])
    expect(deliveredWithDetails(s, "jordan", "2026-11-02", "2026-12-01")).toEqual([])
    expect(deliveredWithDetails(s, "maya", "2026-10-01", "2026-11-30")).toEqual([])
  })

  it("counts files alone as details, and only task.done events", () => {
    const s = { activity: [
      event(1, { kind: "task.done", personIds: ["sam"], facts: { detailsChars: 0, files: 2 } }),
      event(2, { kind: "task.done", personIds: ["sam"], facts: { detailsChars: 0, files: 0 } }),
      event(3, { kind: "task.submitted", personIds: ["sam"], facts: { detailsChars: 40, files: 0 } }),
      event(4, { kind: "task.done", personIds: ["sam"] }),
    ] }
    expect(deliveredWithDetails(s, "sam", "2026-10-31", "2026-10-31").map(e => e.seq)).toEqual([1])
  })
})
