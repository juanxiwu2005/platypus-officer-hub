import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { newTaskNotice } from "../data/board"
import { newEventForm } from "../lib/assistant"
import { newEventBlocked } from "../pages/Events"
import { defaultTaskDue } from "../engine/taskDates"
import type { DemoState } from "../data/types"

/**
 * FB-5 (docs/feedback-fix/PLAN.md §8): a task without an owner can never be reminded about, so the Tasks page form
 * names a person, and "+ New event" opens the event form at once. Every task has one date, Due.
 */
const base = seedDemo("2026-10-22")
const as = (id: string, s: DemoState = base): DemoState => ({ ...s, viewerId: id })
const create = (s: DemoState, ownerId: string | null, date = defaultTaskDue(s)) =>
  reducer(s, { type: "createTasks", id: "fb5", sentence: "Order name tags", tasks: [{ title: "Order name tags", ownerId, eventId: null }], date, buffered: false, source: "Added on the Tasks page" })
const made = (s: DemoState) => s.nodes.find(n => n.id === "fb5:0")
const withCreators = (mode: "leads" | "chosen" | "everyone", ids: string[] = []) => ({ ...base, org: { ...base.org, settings: { ...base.org.settings, eventCreators: mode, eventCreatorIds: ids } } })
// A next officer named for a role who has not taken it yet (handoff): they may read, not create (store.tsx READ_ONLY_OK).
const withIncoming = (s: DemoState): DemoState => ({ ...s, people: [...s.people, { ...s.people.find(p => p.id === "maya")!, id: "riley", name: "Riley Example", incomingFor: "r-fin" }] })

describe("assigning a person when adding a task (PLAN 8.2)", () => {
  it("for yourself it is To do at once, with no notice", () => {
    const next = create(as("maya"), "maya")
    expect(made(next)).toMatchObject({ ownerId: "maya", status: "accepted", acceptedOn: next.today })
    expect(next.notifications.filter(n => n.nodeId === "fb5:0")).toEqual([])
    expect(newTaskNotice(as("maya"), "maya")).toBe("Added to your To do.")
  })
  it("for someone else it waits in Not claimed until they accept it, and they get a notice", () => {
    const next = create(as("maya"), "sam")
    expect(made(next)).toMatchObject({ ownerId: "sam", status: "unclaimed", acceptedOn: null })
    expect(next.notifications.find(n => n.nodeId === "fb5:0")).toMatchObject({ recipientId: "sam", text: expect.stringContaining("Maya gave you a new task") })
    expect(newTaskNotice(as("maya"), "sam")).toBe("Sent to Sam. It stays in Not claimed until Sam accepts.")
    const accepted = reducer(as("sam", next), { type: "claimTask", nodeId: "fb5:0" })
    expect(made(accepted)).toMatchObject({ ownerId: "sam", status: "accepted" })
  })
  it("Anyone (open) from the president or VP has no owner; from an officer the task is their own", () => {
    expect(made(create(base, null))).toMatchObject({ ownerId: null, status: "unclaimed" })
    expect(newTaskNotice(base, null)).toBe("Posted in Not claimed. Anyone can claim it.")
    expect(made(create(as("maya"), null))).toMatchObject({ ownerId: "maya", status: "accepted" })
  })
  it("the notice uses the board's own names for the columns", () => {
    const renamed = { ...base, viewerId: "maya", org: { ...base.org, board: { labels: { unclaimed: "Up for grabs", accepted: "Ready" } } } }
    expect(newTaskNotice(renamed, "maya")).toBe("Added to your Ready.")
    expect(newTaskNotice(renamed, "jordan")).toBe("Sent to Jordan. It stays in Up for grabs until Jordan accepts.")
  })
  it("Undo takes the task and its notice away", () => {
    const next = create(as("maya"), "sam")
    const undone = reducer(next, { type: "undoAuto", id: "fb5" })
    expect(made(undone)).toBeUndefined()
    expect(undone.notifications.some(n => n.nodeId === "fb5:0")).toBe(false)
  })
  it("incoming and former officers viewed as still cannot create tasks", () => {
    const incoming = as("riley", withIncoming(base))
    expect(create(incoming, "riley")).toBe(incoming)
    const former = { ...base, viewerId: "maya", people: base.people.map(p => p.id === "maya" ? { ...p, leftOn: "2026-10-01" } : p) }
    expect(create(former, "maya")).toBe(former)
  })
})

describe("one date when adding a task (PLAN 8.3)", () => {
  it("the task's club deadline is the chosen Due, with no buffer taken off", () => {
    const next = create(as("maya"), "maya", "2026-11-06")
    expect(made(next)).toMatchObject({ clubDeadline: "2026-11-06", officialDeadline: "2026-11-06" })
  })
  it("the default Due still comes from the engine: today + the days set in Settings", () => {
    expect(made(create(as("maya"), "maya"))!.clubDeadline).toBe(defaultTaskDue(base))
  })
})

describe("+ New event (PLAN 8.1)", () => {
  it("opens the same event form with every field empty", () => {
    const card = newEventForm()
    expect(card).toMatchObject({ kind: "form", prefill: {}, date: "" })
    expect(card.thinking).toBeUndefined()
    expect(newEventForm().id).not.toBe(card.id)
  })
  it("says why it is off, in the words of the Settings choice", () => {
    expect(newEventBlocked(base)).toBeNull()
    expect(newEventBlocked(as("maya"))).toBe("Only the president or VP can create events.")
    expect(newEventBlocked(as("maya", withCreators("chosen", ["sam"])))).toBe("Only the president, VP and officers they choose can create events.")
    expect(newEventBlocked(as("sam", withCreators("chosen", ["sam"])))).toBeNull()
    expect(newEventBlocked(as("maya", withCreators("everyone")))).toBeNull()
    expect(newEventBlocked(as("riley", withIncoming(withCreators("everyone"))))).toBe("Only current officers can create events.")
  })
})
