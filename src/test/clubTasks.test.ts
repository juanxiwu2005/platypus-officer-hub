import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { isClubTask, linkableEvents, linkBranch, linkError, taskKind } from "../data/clubTasks"
import { placementOf } from "../engine/workflowBranches"
import { officialLabel } from "../engine/taskDates"
import { addDays } from "../lib/dates"
import type { DemoState } from "../data/types"

/** Club tasks and event tasks (Juanxi, 2026-11-28): a Tasks-page task may link to an event and joins its owner's branch there. */
const base = seedDemo(undefined, "v2")
const as = (id: string, s: DemoState = base): DemoState => ({ ...s, viewerId: id })
const event = (id: string) => base.events.find(e => e.id === id)!
// As the Tasks page does: it works out the branch place, the store checks the event and the date.
const create = (s: DemoState, ownerId: string | null, linkEventId?: string, date = addDays(s.today, 5)) => {
  const ev = s.events.find(e => e.id === linkEventId), branch = ev ? linkBranch(s, ev, ownerId) : null
  const link = linkEventId ? { eventId: linkEventId, branchId: branch?.branchId ?? "event-lead", order: branch?.order ?? 0 } : undefined
  return reducer(s, { type: "createTasks", id: "ct", sentence: "Print name badges", tasks: [{ title: "Print name badges", ownerId, eventId: null, ...(link ? { link } : {}) }], date, buffered: false, source: "Added on the Tasks page" })
}
const made = (s: DemoState) => s.nodes.find(n => n.id === "ct:0")

describe("task kinds", () => {
  it("a task with no event, or a linked club task, is a club task; a workflow step is an event task", () => {
    expect(taskKind({ eventId: null })).toBe("club")
    expect(taskKind({ eventId: "e-night", clubTask: true })).toBe("club")
    expect(taskKind({ eventId: "e-night" })).toBe("event")
    expect(base.nodes.filter(n => n.eventId).every(n => !isClubTask(n))).toBe(true)
  })
  it("only upcoming events can be linked, soonest first", () => {
    const events = linkableEvents(base)
    expect(events.every(e => e.date > base.today)).toBe(true)
    expect(events.map(e => e.date)).toEqual([...events.map(e => e.date)].sort())
  })
})

describe("where a linked club task goes", () => {
  it("the branch where its owner has the most before-event steps in that event", () => {
    expect(linkBranch(base, event("e-night"), "sam")).toMatchObject({ branchId: "marketing", how: "owner" })
    expect(linkBranch(base, event("e-night"), "maya")).toMatchObject({ branchId: "finance", how: "owner" })
  })
  it("someone with no before-event step there, or no owner, goes to the Event lead branch", () => {
    expect(linkBranch(base, event("e-night"), "priya")).toMatchObject({ branchId: "event-lead", how: "default" })
    expect(linkBranch(base, event("e-night"), null)).toMatchObject({ branchId: "event-lead", how: "default" })
  })
  it("after the last step of that branch", () => {
    const last = Math.max(...base.nodes.filter(n => n.eventId === "e-night" && placementOf(n).branchId === "marketing").map(n => placementOf(n).order))
    expect(linkBranch(base, event("e-night"), "sam")!.order).toBe(last + 1)
  })
})

describe("creating a linked club task", () => {
  it("any officer may link; it joins the event, stays a club task and keeps its own due date", () => {
    const due = addDays(base.today, 7)
    const next = create(as("maya"), "sam", "e-night", due)
    const node = made(next)!
    expect(node).toMatchObject({ eventId: "e-night", clubTask: true, ownerId: "sam", status: "unclaimed", clubDeadline: due, placement: { branchId: "marketing" } })
    expect(isClubTask(node)).toBe(true)
    expect(officialLabel(node)).toBe("Due date")
    // The event's own steps keep their dates.
    for (const n of base.nodes.filter(x => x.eventId === "e-night")) expect(next.nodes.find(x => x.id === n.id)!.clubDeadline).toBe(n.clubDeadline)
  })
  it("a linked task is due before the event day; a past or unknown event is refused", () => {
    const night = event("e-night")
    expect(made(create(base, "sam", "e-night", night.date))).toBeUndefined()
    expect(linkError(base, "e-night", night.date)).toMatch(/^Pick a due date before Networking Night/)
    expect(made(create(base, "sam", "nope"))).toBeUndefined()
    expect(linkError(base, "nope", base.today)).toBe("Pick an upcoming event.")
  })
  it("Undo removes it from the event too", () => {
    const next = reducer(create(base, "sam", "e-night"), { type: "undoAuto", id: "ct" })
    expect(made(next)).toBeUndefined()
  })
  it("an unlinked task is unchanged: no event, no club flag", () => {
    expect(made(create(base, "sam"))).toMatchObject({ eventId: null })
    expect(made(create(base, "sam"))!.clubTask).toBeUndefined()
  })
})

describe("the optional new-task email", () => {
  it("is recorded once, for the maker, to the other officer who owns it; reminders are untouched", () => {
    const next = create(base, "sam")
    const sent = reducer(next, { type: "sendTaskEmail", nodeId: "ct:0" })
    expect(sent.taskEmails).toEqual([{ id: "mail:ct:0", nodeId: "ct:0", toId: "sam", fromId: base.viewerId, sentOn: base.today }])
    expect(reducer(sent, { type: "sendTaskEmail", nodeId: "ct:0" }).taskEmails).toHaveLength(1)
    expect(sent.reminderRuntime).toBe(next.reminderRuntime)
    expect(sent.nudges).toBe(next.nudges)
  })
  it("is not sent for your own task, a task nobody owns, someone else's task, or a seed task", () => {
    expect(reducer(create(base, base.viewerId), { type: "sendTaskEmail", nodeId: "ct:0" }).taskEmails ?? []).toEqual([])
    expect(reducer(create(base, null), { type: "sendTaskEmail", nodeId: "ct:0" }).taskEmails ?? []).toEqual([])
    expect(reducer(as("maya", create(base, "sam")), { type: "sendTaskEmail", nodeId: "ct:0" }).taskEmails ?? []).toEqual([])
    expect(reducer(base, { type: "sendTaskEmail", nodeId: base.nodes[0].id }).taskEmails ?? []).toEqual([])
  })
})
