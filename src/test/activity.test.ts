import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { reducer, type Action } from "../data/store"
import { deriveActivity, withActivity } from "../data/activity"
import { isActivityFact } from "../data/activityIds"
import type { ActivityEvent, DemoState } from "../data/types"
import type { TaskAttachment } from "../taskDetails/contracts"
import { taskTargetKey } from "../taskDetails/targetDates"
import { planReminderDigests, sendReminderDigests } from "../reminders/digest"
import { withActivityBackfill } from "../data/activityBackfill"
import { firstResponse } from "../lib/activityQuery"
import { applySchedule } from "../engine/schedule"
import { addDays } from "../lib/dates"
import { cannotDelete } from "../lib/flowEdit"
import { makeTaskAccessGrant, taskAccessToken } from "../reminders/taskAccess"

/** Free text typed in these tests: none of it may ever reach the activity record. */
const DETAILS = "Booked the fictional photographer and shared the shot list"
const WAITING_TEXT = "Fictional receipt from the treasurer"
const TARGET_MESSAGE = "Fictional reason: the room moved"

const seed = () => seedDemo(undefined, "v2")
const run = (s: DemoState, ...actions: Action[]) => actions.reduce((state, action) => reducer(state, action), s)
const node = (s: DemoState, id: string) => s.nodes.find(n => n.id === id)!
/** Events added by the last step (the record is append only, so they are the tail). */
const added = (before: DemoState, after: DemoState): ActivityEvent[] => (after.activity ?? []).slice((before.activity ?? []).length)
const kinds = (events: ActivityEvent[]) => events.map(e => e.kind)
const file = (id: string, text: string): TaskAttachment => ({ id, name: `${id}.txt`, size: text.length, dataUrl: `data:application/octet-stream;base64,${btoa(text)}` })
const submit = (s: DemoState, nodeId: string, details: string, attachments: TaskAttachment[] = []): Action => {
  const n = node(s, nodeId)
  return { type: "saveTaskWork", nodeId, input: { details, attachments, expectedRevision: n.taskWork?.revision ?? 0, expectedOwnerId: n.ownerId, expectedOwnerVersion: n.ownerVersion ?? 0, submit: true } }
}
const PHOTO_TITLE = "Take fictional club photos"
/** The president creates a task for Jordan; it waits in Not claimed until Jordan accepts it. */
const photoId = (s: DemoState) => s.nodes.find(n => n.title === PHOTO_TITLE)!.id
const createdForJordan = () => run(seed(), { type: "createTasks", id: "photos", sentence: PHOTO_TITLE, tasks: [{ title: PHOTO_TITLE, ownerId: "jordan", eventId: null }], date: "2026-11-06", buffered: false }, { type: "setViewer", viewerId: "jordan" })
const withoutActivity = (s: DemoState): DemoState => { const { activity: _drop, ...rest } = s; void _drop; return rest }
/** The same state with its record thrown away and rebuilt from the other records (what an older save gets on load). */
const rebuilt = (s: DemoState) => withActivityBackfill(withoutActivity(s))
/** What `firstResponse` says, without the event IDs (live and rebuilt events have different IDs). */
const responseOf = (s: DemoState, nodeId: string) => {
  const r = firstResponse(s, nodeId)
  return r && { trigger: [r.trigger.kind, r.trigger.on, r.trigger.personIds], response: r.response && [r.response.kind, r.response.on, r.response.actorId], days: r.days }
}
/** Jordan's t-room, given to him on 2026-10-28 and still waiting in Not claimed for him to accept it. */
const proposedRoom = (s: DemoState): DemoState => ({ ...s, nodes: s.nodes.map(n => n.id === "t-room" ? { ...n, status: "unclaimed" as const, acceptedOn: null, assignedOn: "2026-10-28" } : n) })

beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto) })
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe("live activity through the real reducer", () => {
  it("claim, then submit with details: claimed, two status changes, submitted and done, with the right facts", () => {
    const created = createdForJordan()
    const [creation] = created.activity ?? []
    expect(created.activity).toHaveLength(1)
    expect(creation).toMatchObject({ kind: "task.created", actorId: "alex", personIds: ["jordan"], facts: { status: "unclaimed", eventId: null } })
    const id = creation.nodeId!
    expect(node(created, id)).toMatchObject({ ownerId: "jordan", status: "unclaimed" })

    const claimed = reducer(created, { type: "claimTask", nodeId: id })
    const claim = added(created, claimed)
    expect(kinds(claim)).toEqual(["task.claimed", "task.status"])
    expect(claim[0]).toMatchObject({ nodeId: id, actorId: "jordan", personIds: ["jordan"], on: created.today, source: "live" })
    expect(claim[0].facts).toBeUndefined()
    expect(claim[1].facts).toEqual({ from: "unclaimed", to: "accepted" })

    const done = reducer(claimed, submit(claimed, id, DETAILS, [file("shot-list", "fictional shot list")]))
    const delivery = added(claimed, done)
    expect(kinds(delivery)).toEqual(["task.status", "task.submitted", "task.done"])
    expect(delivery.every(e => e.actorId === "jordan" && e.nodeId === id && e.on === "2026-10-31")).toBe(true)
    expect(delivery[0].facts).toEqual({ from: "accepted", to: "done" })
    expect(delivery[1]).toMatchObject({ personIds: ["jordan"], facts: { detailsChars: DETAILS.length, files: 1, revision: 1 } })
    // Due on 2026-11-06 and finished on the demo day, 2026-10-31.
    expect(node(done, id).clubDeadline).toBe("2026-11-06")
    expect(delivery[2]).toMatchObject({ personIds: ["jordan"], facts: { onTime: true, daysEarly: 6, detailsChars: DETAILS.length, files: 1, viaBudget: false } })
    expect(JSON.stringify(done.activity)).not.toContain(PHOTO_TITLE)

    // Numbered in recording order, append only.
    const all = done.activity!
    expect(all.map(e => e.seq)).toEqual([1, 2, 3, 4, 5, 6])
    expect(all.map(e => e.id)).toEqual(["act:1", "act:2", "act:3", "act:4", "act:5", "act:6"])
    expect(all.slice(0, 3)).toEqual(claimed.activity)
  })

  it("claiming a task nobody owned also records who took it", () => {
    const s = seed(), claimed = reducer(s, { type: "claimTask", nodeId: "t-tabling" })
    const events = added(s, claimed)
    expect(kinds(events)).toEqual(["task.assigned", "task.claimed", "task.status"])
    expect(events[0]).toMatchObject({ actorId: "alex", personIds: ["alex"], facts: { from: null } })
  })

  it("a late completion is not on time and has negative days early", () => {
    // t-news (Sam) was due on 2026-10-21; the demo day is 2026-10-31.
    const s = run(seed(), { type: "setViewer", viewerId: "sam" })
    const done = reducer(s, { type: "replyTask", nodeId: "t-news", reply: "done" })
    const event = added(s, done).find(e => e.kind === "task.done")!
    expect(event).toMatchObject({ actorId: "sam", personIds: ["sam"], facts: { onTime: false, daysEarly: -10, detailsChars: 0, files: 0, viaBudget: false } })
  })

  it("reopening a finished task records the status change and the reopening", () => {
    const s = run(seed(), { type: "setViewer", viewerId: "priya" })
    expect(node(s, "t-minutes").status).toBe("done")
    const reopened = reducer(s, { type: "replyTask", nodeId: "t-minutes", reply: "working" })
    const events = added(s, reopened)
    expect(kinds(events)).toEqual(["task.status", "task.reopened"])
    expect(events[0].facts).toEqual({ from: "done", to: "in_progress" })
    expect(events[1]).toMatchObject({ actorId: "priya", personIds: ["priya"], facts: { to: "in_progress" } })
  })

  it("waiting on a teammate names the person waited on, not the text", () => {
    const s = run(seed(), { type: "setViewer", viewerId: "jordan" })
    const waiting = reducer(s, { type: "replyTask", nodeId: "t-room", reply: "waiting", input: { waitingOn: WAITING_TEXT, waitingOnPersonId: "maya" } })
    const events = added(s, waiting)
    expect(kinds(events)).toEqual(["task.status", "task.waiting_on"])
    expect(events[1]).toMatchObject({ actorId: "jordan", personIds: ["maya"], facts: { ownerId: "jordan" } })
    expect(JSON.stringify(waiting.activity)).not.toContain(WAITING_TEXT)
    // Waiting on something that is not a person records only the status change.
    const s2 = run(seed(), { type: "setViewer", viewerId: "jordan" })
    expect(kinds(added(s2, reducer(s2, { type: "replyTask", nodeId: "t-room", reply: "waiting", input: { waitingOn: WAITING_TEXT } })))).toEqual(["task.status"])
  })

  it("a target date change records the club deadline before and after, once", () => {
    const s = run(seed(), { type: "setViewer", viewerId: "jordan" })
    const n = node(s, "t-room")
    expect(n.clubDeadline).toBe("2026-11-03")
    const moved = reducer(s, { type: "updateTaskTarget", nodeId: "t-room", input: { date: "2026-11-06", message: TARGET_MESSAGE, notifyPersonIds: ["alex"], expectedTask: taskTargetKey(n) } })
    expect(node(moved, "t-room").clubDeadline).toBe("2026-11-06")
    const events = added(s, moved)
    expect(kinds(events)).toEqual(["task.target_changed"])
    expect(events[0]).toMatchObject({ nodeId: "t-room", actorId: "jordan", personIds: ["jordan"], facts: { from: "2026-11-03", to: "2026-11-06" } })
    expect(JSON.stringify(moved.activity)).not.toContain(TARGET_MESSAGE)
  })

  it("an AI change card that assigns an owner is recorded once (the nested reducer call records nothing)", () => {
    const drafted = reducer(seed(), { type: "draftChanges", changeSet: { id: "review-1", sentence: "Give the newsletter to Jordan", ops: [{ op: "assign_owner", nodeId: "t-news", ownerId: "jordan" }] as never, status: "pending" } })
    // Drafting changes no task, so nothing is recorded.
    expect(drafted.activity).toBeUndefined()
    const applied = reducer(drafted, { type: "reviewChange", id: "review-1", index: 0, decision: "applied" })
    expect(node(applied, "t-news").ownerId).toBe("jordan")
    const events = added(drafted, applied)
    expect(events.filter(e => e.kind === "task.assigned")).toHaveLength(1)
    expect(kinds(events)).toEqual(["task.assigned", "task.status"])
    expect(events[0]).toMatchObject({ nodeId: "t-news", actorId: "alex", personIds: ["jordan"], facts: { from: "sam" } })
    expect(events[1].facts).toEqual({ from: "waiting", to: "accepted" })
  })

  it("automatic reminder digests are recorded by system:reminders, one event per task reminded", async () => {
    const base = seed()
    let state = { ...reducer({ ...base, org: { ...base.org, settings: { ...base.org.settings, reminderMode: "auto_email" } } }, { type: "upgradeReminderPlan" }), viewerId: "jordan" }
    const store = { getState: () => state, tryDispatch: (a: Action) => { const next = reducer(state, a); if (next === state) return false; state = next; return true } }
    const before = state, ids = planReminderDigests(before).groups.map(g => g.id)
    expect(ids.length).toBeGreaterThan(0)
    const result = await sendReminderDigests(store, ids, "https://demo.example.org", "automatic")
    expect(result.error).toBeNull()
    const deliveries = state.reminderRuntime!.deliveries
    const events = added(before, state)
    expect(events).toHaveLength(deliveries.length)
    expect(events.every(e => e.kind === "reminder.recorded" && e.actorId === "system:reminders")).toBe(true)
    expect(events.map(e => e.nodeId).sort()).toEqual(deliveries.map(d => d.nodeId).sort())
    for (const e of events) {
      const d = deliveries.find(x => x.nodeId === e.nodeId)!
      expect(e.personIds[0]).toBe(d.ownerId)
      expect(e.personIds).toContain(d.recipientId)
      expect(e.facts).toEqual({ via: "automatic", channel: "email", recipientId: d.recipientId })
    }
  })

  it("a confirmed legacy reminder is recorded with how it was sent", () => {
    const s = seed()
    const sent = reducer(s, { type: "confirmNudgeSent", nodeId: "t-room", channel: "whatsapp", text: "Fictional reminder text", via: "president" })
    const events = added(s, sent)
    expect(kinds(events)).toEqual(["reminder.recorded"])
    expect(events[0]).toMatchObject({ nodeId: "t-room", actorId: "alex", personIds: ["jordan"], facts: { via: "president", channel: "whatsapp" } })
    // A legacy reminder goes to the task's owner (contract §3: recipientId).
    expect(events[0].facts).toEqual({ via: "president", channel: "whatsapp", recipientId: "jordan" })
    expect(JSON.stringify(sent.activity)).not.toContain("Fictional reminder text")
  })

  it("a lead's assignment is not a claim; the owner's acceptance is, in the app and through a task link", async () => {
    // The lead gives an unclaimed task to Sam: updateNode moves it to To do and sets acceptedOn, but Sam accepted nothing.
    const s = seed(), assigned = reducer(s, { type: "updateNode", id: "t-tabling", patch: { ownerId: "sam" } })
    expect(node(assigned, "t-tabling")).toMatchObject({ ownerId: "sam", status: "accepted", acceptedOn: s.today })
    expect(kinds(added(s, assigned))).toEqual(["task.assigned", "task.status"])
    expect(added(s, assigned)[1].facts).toEqual({ from: "unclaimed", to: "accepted" })

    // The owner accepts a task waiting for him, in the app (claimTask as Jordan).
    const proposed = run(withActivityBackfill(proposedRoom(seed())), { type: "setViewer", viewerId: "jordan" })
    const claimed = reducer(proposed, { type: "claimTask", nodeId: "t-room" })
    expect(kinds(added(proposed, claimed))).toEqual(["task.claimed", "task.status"])
    expect(added(proposed, claimed)[0]).toMatchObject({ actorId: "jordan", personIds: ["jordan"], nodeId: "t-room", on: "2026-10-31" })

    // The same acceptance through the task link in a reminder email: the link holder is the actor, not the viewer (Alex).
    const s0 = seed(), room = node(s0, "t-room")
    const fixed = applySchedule({ ...s0, org: { ...s0.org, settings: { ...s0.org.settings, reminderMode: "review_then_self" } }, nodes: [{ ...room, anchor: { kind: "fixed", official: null, club: "2026-11-05" }, clubDeadlineOverride: null, ownerVersion: 0, dependsOn: [], status: "unclaimed", acceptedOn: null, waitingOn: null, waitingOnPersonId: null }], events: [], funding: [], nudges: [], protocolLog: [], silenceCases: [], notifications: [] })
    const today = fixed.nodes[0].latestStart!
    const linked = withActivityBackfill({ ...fixed, today, nodes: fixed.nodes.map(n => ({ ...n, assignedOn: addDays(today, -2) })) })
    const grant = await makeTaskAccessGrant(linked, "t-room")
    const issued = reducer(linked, { type: "issueTaskAccessGrant", grant })
    const viaLink = reducer(issued, { type: "taskAccessAction", token: taskAccessToken(grant), update: { kind: "claim" } })
    expect(viaLink.viewerId).toBe("alex")
    expect(kinds(added(issued, viaLink))).toEqual(["task.claimed", "task.status"])
    expect(added(issued, viaLink)[0]).toMatchObject({ actorId: "jordan", personIds: ["jordan"], on: today })

    // firstResponse reads the same before and after the record is rebuilt from the other records.
    expect(responseOf(assigned, "t-tabling")).toEqual({ trigger: ["task.assigned", s.today, ["sam"]], response: null, days: null })
    expect(responseOf(rebuilt(assigned), "t-tabling")).toEqual(responseOf(assigned, "t-tabling"))
    expect(responseOf(claimed, "t-room")).toEqual({ trigger: ["task.assigned", "2026-10-28", ["jordan"]], response: ["task.claimed", "2026-10-31", "jordan"], days: 3 })
    expect(responseOf(rebuilt(claimed), "t-room")).toEqual(responseOf(claimed, "t-room"))
    expect(responseOf(viaLink, "t-room")).toEqual({ trigger: ["task.assigned", addDays(today, -2), ["jordan"]], response: ["task.claimed", today, "jordan"], days: 2 })
    expect(responseOf(rebuilt(viaLink), "t-room")).toEqual(responseOf(viaLink, "t-room"))
  })

  it("restoring a removed step (the chart's Undo) records its creation again, marked as restored", () => {
    const s = seed(), eventId = s.events[0].id
    const snapshot = structuredClone(s.nodes.filter(n => n.eventId === eventId))
    const step = snapshot.find(n => !cannotDelete(n) && reducer(s, { type: "removeEventStep", eventId, nodeId: n.id }) !== s)!
    expect(step).toBeDefined()
    const gone = reducer(s, { type: "removeEventStep", eventId, nodeId: step.id })
    const removal = added(s, gone).filter(e => e.nodeId === step.id)
    expect(kinds(removal)).toEqual(["task.removed"])
    const back = reducer(gone, { type: "restoreEventNodes", eventId, nodes: snapshot })
    expect(back.nodes.some(n => n.id === step.id)).toBe(true)
    const restored = added(gone, back).filter(e => e.kind === "task.created")
    expect(restored).toHaveLength(1)
    expect(restored[0]).toMatchObject({ nodeId: step.id, eventId, actorId: "alex", facts: { status: step.status, eventId, restored: true } })
    // Earlier events are untouched, and a task created for the first time carries no restored fact.
    expect(back.activity!.slice(0, gone.activity!.length)).toEqual(gone.activity)
    const fresh = added(seed(), createdForJordan())[0]
    expect(fresh.facts).toEqual({ status: "unclaimed", eventId: null })
  })

  it("undoing an AI change that applied at once records the reversal as new events", () => {
    const s = seed()
    const applied = reducer(s, { type: "aiAutoApply", changeSet: { id: "auto-1", sentence: "Fictional request", ops: [{ op: "set_status", nodeId: "t-room", status: "in_progress" }] as never, status: "pending", source: "AI draft" } })
    expect(node(applied, "t-room").status).toBe("in_progress")
    expect(kinds(added(s, applied))).toEqual(["task.status"])
    expect(added(s, applied)[0]).toMatchObject({ actorId: "alex", nodeId: "t-room", facts: { from: "accepted", to: "in_progress" } })
    const undone = reducer(applied, { type: "undoAuto", id: "auto-1" })
    expect(node(undone, "t-room").status).toBe("accepted")
    expect(kinds(added(applied, undone))).toEqual(["task.status"])
    expect(added(applied, undone)[0]).toMatchObject({ actorId: "alex", nodeId: "t-room", personIds: ["jordan"], facts: { from: "in_progress", to: "accepted" } })
    expect(undone.activity!.slice(0, applied.activity!.length)).toEqual(applied.activity)
    expect(reducer(undone, { type: "undoAuto", id: "auto-1" })).toBe(undone)

    // Undoing a created task removes it: recorded as task.removed about its owner.
    const created = reducer(s, { type: "createTasks", id: "photos", sentence: PHOTO_TITLE, tasks: [{ title: PHOTO_TITLE, ownerId: "jordan", eventId: null }], date: "2026-11-06", buffered: false })
    const removed = reducer(created, { type: "undoAuto", id: "photos" })
    expect(kinds(added(created, removed))).toEqual(["task.removed"])
    expect(added(created, removed)[0]).toMatchObject({ nodeId: "photos:0", actorId: "alex", personIds: ["jordan"], facts: { status: "unclaimed" } })
  })

  it("live events and the record rebuilt from the same end state agree on what the rebuild can know", async () => {
    // A realistic stretch on the reminder plan: assignments, a task created for Jordan, two days pass, Jordan accepts and
    // delivers it, a late completion, then the automatic reminder emails. The rebuild reads only the end state.
    const base = seed()
    const upgraded = reducer({ ...base, org: { ...base.org, settings: { ...base.org.settings, reminderMode: "auto_email" } } }, { type: "upgradeReminderPlan" })
    const start = withActivityBackfill(withoutActivity(upgraded))
    let state = run(start,
      { type: "updateNode", id: "t-tabling", patch: { ownerId: "sam" } },
      { type: "updateNode", id: "t-news", patch: { ownerId: "jordan" } },
      { type: "createTasks", id: "photos", sentence: PHOTO_TITLE, tasks: [{ title: PHOTO_TITLE, ownerId: "jordan", eventId: null }], date: "2026-11-06", buffered: false },
      { type: "advanceClock", days: 2 },
      { type: "setViewer", viewerId: "jordan" },
      { type: "claimTask", nodeId: "photos:0" },
    )
    state = run(state, submit(state, "photos:0", DETAILS, [file("shot-list", "fictional shot list")]), { type: "replyTask", nodeId: "t-news", reply: "done" }, { type: "setViewer", viewerId: "alex" })
    const store = { getState: () => state, tryDispatch: (a: Action) => { const next = reducer(state, a); if (next === state) return false; state = next; return true } }
    const ids = planReminderDigests(state).groups.map(g => g.id)
    expect(ids.length).toBeGreaterThan(0)
    expect((await sendReminderDigests(store, ids, "https://demo.example.org", "automatic")).error).toBeNull()

    const KNOWN = ["task.assigned", "task.claimed", "task.submitted", "task.done", "reminder.recorded"]
    // The rebuild cannot know whom a task was taken from, so an assignment is compared without its `from` fact.
    const shape = (e: ActivityEvent) => JSON.stringify([e.kind, e.nodeId ?? null, e.eventId ?? null, e.on, e.personIds, e.kind === "task.assigned" ? null : e.facts ?? null])
    const record = state.activity!.filter(e => e.source === "live")
    // Tasks created in this stretch (Jordan's photos task, and the retro tasks the clock opened for stalled handovers) are recorded
    // live as task.created about their owner. The rebuild reads the assignment the task holds, dated as stored (a retro task keeps
    // its stalled case's date), so for these only the owner compares.
    const created = new Map(record.filter(e => e.kind === "task.created").map(e => [e.nodeId!, e]))
    expect(created.has("photos:0")).toBe(true)
    const liveEvents = record.filter(e => KNOWN.includes(e.kind))
    // What the rebuild adds to the rebuild of the starting state is exactly what was recorded live.
    const before = new Set(rebuilt(start).activity!.map(shape))
    const rebuiltAll = rebuilt(state).activity!.filter(e => KNOWN.includes(e.kind) && !before.has(shape(e)))
    const ofCreated = (e: ActivityEvent) => e.kind === "task.assigned" && created.has(e.nodeId!)
    for (const e of rebuiltAll.filter(ofCreated)) expect(e.personIds, e.nodeId).toEqual(created.get(e.nodeId!)!.personIds)
    expect(rebuiltAll.filter(ofCreated).map(e => e.nodeId).sort()).toEqual([...created.values()].filter(e => e.personIds.length).map(e => e.nodeId).sort())
    const rebuiltEvents = rebuiltAll.filter(e => !ofCreated(e))
    expect(new Set(liveEvents.map(e => e.kind))).toEqual(new Set(KNOWN))
    expect(rebuiltEvents.map(shape).sort()).toEqual(liveEvents.map(shape).sort())
    // Where the rebuild knows who acted, it names the same person as the live record.
    for (const e of rebuiltEvents) if (e.actorId !== null) {
      const match = liveEvents.find(x => shape(x) === shape(e))!
      expect(match.actorId, shape(e)).toBe(e.actorId)
    }
    // A lead's assignment has no claim to answer it, live or rebuilt (status replies are not rebuilt, so only claims compare).
    expect(responseOf(state, "t-tabling")?.response).toBeNull()
    expect(responseOf(rebuilt(state), "t-tabling")).toEqual(responseOf(state, "t-tabling"))
  })

  it("moving the demo clock records what it triggered as system:clock, on the new demo date", () => {
    // In the seed, one day later the silence protocol opens retro tasks for stalled handovers.
    const s = seed(), later = reducer(s, { type: "advanceClock", days: 1 })
    expect(later.today).toBe("2026-11-01")
    const retros = later.nodes.filter(n => !s.nodes.some(o => o.id === n.id))
    const events = added(s, later)
    expect(retros.length).toBeGreaterThan(0)
    expect(events.map(e => [e.kind, e.nodeId])).toEqual(retros.map(n => ["task.created", n.id]))
    expect(events.every(e => e.actorId === "system:clock" && e.on === "2026-11-01" && e.facts?.status === "unclaimed")).toBe(true)
    expect(events.map(e => e.personIds)).toEqual(retros.map(n => [n.ownerId]))
  })

  it("an action that changes nothing returns the same state; one that changes no tracked record keeps the record", () => {
    const s = seed()
    expect(reducer(s, { type: "setViewer", viewerId: "nobody" })).toBe(s)
    expect(reducer(s, { type: "claimTask", nodeId: "t-room" })).toBe(s)
    const withRecord = reducer(s, { type: "claimTask", nodeId: "t-tabling" })
    const viewer = reducer(withRecord, { type: "setViewer", viewerId: "maya" })
    expect(viewer.viewerId).toBe("maya")
    expect(viewer.activity).toBe(withRecord.activity)
    expect(withActivity(withRecord, viewer, { type: "setViewer" }, "alex")).toBe(viewer)
  })

  it("new events continue the existing sequence and never edit earlier events", () => {
    const earlier: ActivityEvent = { id: "act:bf:task.claimed:t-room", seq: 7, on: "2026-10-01", actorId: "jordan", kind: "task.claimed", personIds: ["jordan"], nodeId: "t-room", source: "backfill" }
    const s = { ...seed(), activity: [earlier] }
    const next = reducer(s, { type: "claimTask", nodeId: "t-tabling" })
    expect(next.activity![0]).toBe(earlier)
    expect(next.activity!.slice(1).map(e => [e.id, e.seq])).toEqual([["act:8", 8], ["act:9", 9], ["act:10", 10]])
  })

  it("no event carries a task title, details text or a person's name or email", () => {
    const s0 = seed()
    const steps: ((s: DemoState) => Action)[] = [
      () => ({ type: "createTasks", id: "photos", sentence: PHOTO_TITLE, tasks: [{ title: PHOTO_TITLE, ownerId: "jordan", eventId: null }], date: "2026-11-06", buffered: false }),
      () => ({ type: "updateNode", id: "t-tabling", patch: { ownerId: "sam" } }),
      () => ({ type: "confirmNudgeSent", nodeId: "t-sdc", channel: "email", text: "Fictional reminder body" }),
      () => ({ type: "setViewer", viewerId: "jordan" }),
      s => ({ type: "claimTask", nodeId: photoId(s) }),
      s => submit(s, photoId(s), DETAILS, [file("notes", "fictional notes")]),
      () => ({ type: "replyTask", nodeId: "t-room", reply: "waiting", input: { waitingOn: WAITING_TEXT, waitingOnPersonId: "maya" } }),
      () => ({ type: "replyTask", nodeId: "t-volunteers", reply: "help" }),
      () => ({ type: "replyTask", nodeId: "t-checkin", reply: "working" }),
      () => ({ type: "playbookAction", action: { kind: "addAnswer", id: "pa-test", questionId: "pq-1", answerKind: "experience", text: "Fictional experience answer text" } }),
      () => ({ type: "playbookAction", action: { kind: "vote", answerId: "pa-2", vote: -1 } }),
      () => ({ type: "setViewer", viewerId: "alex" }),
      () => ({ type: "advanceClock", days: 12 }),
    ]
    const s = steps.reduce((state, step) => reducer(state, step(state)), s0)
    const record = s.activity ?? []
    for (const kind of ["task.created", "task.assigned", "reminder.recorded", "task.claimed", "task.status", "task.submitted", "task.done", "task.waiting_on", "task.reopened", "playbook.answer_added", "playbook.voted"])
      expect(kinds(record), kind).toContain(kind)
    const forbidden = [
      ...s.nodes.map(n => n.title), ...s0.nodes.map(n => n.title), ...s0.events.map(e => e.name),
      ...s0.people.flatMap(p => [p.name, p.name.split(" ")[0], p.email]), ...(s0.playbook?.questions ?? []).map(q => q.text), ...(s0.playbook?.answers ?? []).map(a => a.text),
      PHOTO_TITLE, DETAILS, WAITING_TEXT, "Fictional reminder body", "Fictional experience answer text",
    ].filter((t): t is string => typeof t === "string" && t.length >= 3)
    for (const event of record) {
      for (const value of Object.values(event.facts ?? {})) {
        expect(isActivityFact(value)).toBe(true)
        if (typeof value === "string") for (const text of forbidden) expect(value.includes(text), `${event.kind} fact "${value}" contains "${text}"`).toBe(false)
      }
      // The ID fields hold IDs only: no title, name or email, no spaces, and none longer than the sanitizer keeps.
      for (const value of [event.id, event.actorId, event.nodeId, event.eventId, ...event.personIds]) {
        if (value === null || value === undefined) continue
        expect(value, `${event.kind} ID field`).toMatch(/^[\w:.-]{1,128}$/)
        for (const text of forbidden) expect(value.includes(text), `${event.kind} ID "${value}" contains "${text}"`).toBe(false)
      }
      expect(Object.keys(event).every(k => ["id", "seq", "on", "actorId", "kind", "personIds", "nodeId", "eventId", "facts", "source"].includes(k))).toBe(true)
      expect(event.personIds.every(id => s0.people.some(p => p.id === id))).toBe(true)
    }
    const text = JSON.stringify(record)
    for (const t of [DETAILS, WAITING_TEXT, "Fictional reminder body", "Fictional experience answer text", ...s0.people.flatMap(p => [p.name, p.email])]) expect(text).not.toContain(t)
  })
})

describe("deriveActivity", () => {
  it("is deterministic and orders events by node order, then kind order", () => {
    const s = seed(), next = reducer(s, { type: "claimTask", nodeId: "t-tabling" })
    const a = deriveActivity(s, next, { type: "claimTask" }, "alex"), b = deriveActivity(s, next, { type: "claimTask" }, "alex")
    expect(a).toEqual(b)
    expect(a.every(e => !("id" in e) && !("seq" in e))).toBe(true)
    // Two tasks claimed in one change: the earlier node in next.nodes comes first.
    const both = reducer(reducer(s, { type: "claimTask", nodeId: "t-tabling" }), { type: "claimTask", nodeId: "t-photos" })
    expect(deriveActivity(s, both, { type: "test" }, "alex").map(e => [e.nodeId, e.kind])).toEqual([
      ["t-photos", "task.assigned"], ["t-photos", "task.claimed"], ["t-photos", "task.status"],
      ["t-tabling", "task.assigned"], ["t-tabling", "task.claimed"], ["t-tabling", "task.status"],
    ])
  })

  it("records created and removed tasks, new events, Playbook answers and votes, and handoff steps", () => {
    const s = seed()
    const taskNode = node(s, "t-room")
    const created = { ...taskNode, id: "t-new", ownerId: null, status: "unclaimed" as const }
    const event = { ...s.events[0], id: "e-new", date: "2027-04-02" }
    const answers = s.playbook!.answers
    const next: DemoState = {
      ...s,
      nodes: [...s.nodes.filter(n => n.id !== "t-agenda"), created],
      events: [...s.events, event],
      playbook: { ...s.playbook!, answers: [...answers.map(a => a.id === "pa-2" ? { ...a, votes: { up: [...a.votes.up, "sam"], down: ["priya"] } } : a), { ...answers[1], id: "pa-new", authorId: "maya", kind: "experience", votes: { up: [], down: [] } }] },
      handoffRoles: s.handoffRoles.map(h => h.roleId === "r-fin" ? { ...h, confirmed: true, approved: true, incomingId: "priya" } : h),
    }
    const events = deriveActivity(s, next, { type: "test" }, "alex")
    expect(events.map(e => e.kind)).toEqual(["task.created", "task.removed", "event.created", "playbook.answer_added", "playbook.voted", "playbook.voted", "handoff.step", "handoff.step"])
    expect(events[0]).toMatchObject({ nodeId: "t-new", personIds: [], facts: { status: "unclaimed", eventId: null } })
    expect(events[0].eventId).toBeUndefined()
    expect(events[1]).toMatchObject({ nodeId: "t-agenda", personIds: ["priya"], facts: { status: "accepted" } })
    expect(events[2]).toMatchObject({ eventId: "e-new", personIds: [], facts: { date: "2027-04-02" } })
    expect(events[3]).toMatchObject({ personIds: ["maya"], facts: { questionId: answers[1].questionId, answerKind: "experience" } })
    expect(events[4]).toMatchObject({ personIds: ["sam"], facts: { answerId: "pa-2", vote: "up" } })
    expect(events[5]).toMatchObject({ personIds: ["priya"], facts: { answerId: "pa-2", vote: "down" } })
    expect(events[6]).toMatchObject({ personIds: ["maya", "priya"], facts: { roleId: "r-fin", step: "confirmed" } })
    expect(events[7].facts).toEqual({ roleId: "r-fin", step: "approved" })
  })

  it("marks completions from a budget action and never lets a long value through as a fact", () => {
    const s = seed()
    const done = { ...s, nodes: s.nodes.map(n => n.id === "e-night:quotes" ? { ...n, status: "done" as const, completedOn: s.today } : n) }
    expect(deriveActivity(s, done, { type: "budgetLineUpdate" }, "maya").find(e => e.kind === "task.done")?.facts?.viaBudget).toBe(true)
    expect(deriveActivity(s, done, { type: "replyTask" }, "maya").find(e => e.kind === "task.done")?.facts?.viaBudget).toBe(false)
    const longEvent = { ...s.events[0], id: "e".repeat(80) }
    const created = deriveActivity(s, { ...s, nodes: [...s.nodes, { ...node(s, "t-room"), id: "t-long", eventId: longEvent.id }] }, { type: "test" }, "alex")
    expect(created[0]).toMatchObject({ nodeId: "t-long", eventId: longEvent.id, facts: { eventId: null } })
  })

  it("skips malformed saved entries instead of throwing, and still records the valid changes", () => {
    const s = seed()
    const broken = {
      ...s,
      nudges: [null, { id: 7 }] as never,
      events: [...s.events, null] as never,
      handoffRoles: [...s.handoffRoles, null] as never,
      reminderRuntime: { deliveries: [null, "x"] } as never,
      playbook: { ...s.playbook!, answers: [null, { ...s.playbook!.answers[1], votes: { up: null, down: [3] } }] } as never,
      nodes: s.nodes.map(n => n.id === "t-room" ? { ...n, taskWork: { version: 1, revision: 1, files: [], drafts: [], submissions: [null] } } : n) as never,
    } as DemoState
    const next = { ...broken, nodes: broken.nodes.map(n => n.id === "t-room" ? { ...n, status: "in_progress" as const } : n) }
    expect(() => deriveActivity(broken, next, { type: "replyTask" }, "jordan")).not.toThrow()
    expect(deriveActivity(broken, next, { type: "replyTask" }, "jordan").map(e => [e.kind, e.nodeId])).toEqual([["task.status", "t-room"]])
    expect(withActivity(broken, { ...next, activity: [null] as never }, { type: "replyTask" }, "jordan").activity!.at(-1)).toMatchObject({ id: "act:1", seq: 1 })
  })

  it("uses system:clock for advanceClock whoever moved the clock, and the new demo date", () => {
    const s = seed()
    const next = { ...s, today: "2026-11-01", events: [...s.events, { ...s.events[0], id: "e-clock" }] }
    expect(deriveActivity(s, next, { type: "advanceClock" }, "alex")).toEqual([{ on: "2026-11-01", actorId: "system:clock", kind: "event.created", personIds: [], eventId: "e-clock", facts: { date: s.events[0].date }, source: "live" }])
  })
})
