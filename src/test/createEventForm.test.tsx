import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { seedDemo } from "../data/seed"
import { reducer, type Action } from "../data/store"
import { COMMON_EVENT_CHECKS, EVENT_CHECKLIST, OTHER_EVENT_CHECKLIST } from "../data/eventChecklist"
import { addDays } from "../lib/dates"
import type { DemoState } from "../data/types"
import type { ChatCard } from "../lib/assistant"

/**
 * New event, Option A (Juanxi, 2026-11-28): one compact card; Create event creates and applies the event at once through the
 * same store path as Review changes (draftChanges, then reviewChange "applied"), and the chat card's Undo removes it again.
 */
const store = vi.hoisted(() => ({ state: undefined as unknown as DemoState }))
const rail = vi.hoisted(() => ({ requestReview: vi.fn(), show: vi.fn() }))
const dispatch = (action: Action) => { store.state = reducer(store.state, action) }
vi.mock("../data/store", async importOriginal => ({ ...(await importOriginal<typeof import("../data/store")>()), useStore: () => ({ state: store.state, dispatch, getState: () => store.state }) }))
vi.mock("../components/rail/RailContext", () => ({ useRail: () => rail }))

import PlanFormCard, { CreatedCard, eventFromForm, PlanForm } from "../components/rail/PlanForm"

const base = seedDemo(undefined, "v2")
const as = (id: string, s: DemoState = base): DemoState => ({ ...s, viewerId: id })
const choice = { templateId: "standard-event", templateVersion: 1 }
const date = addDays(base.today, 60)
const form = (prefill: Extract<ChatCard, { kind: "form" }>["prefill"] = { name: "Fictional mixer" }): Extract<ChatCard, { kind: "form" }> => ({ kind: "form", id: "f1", date, prefill })
const everyone = (s: DemoState): DemoState => ({ ...s, org: { ...s.org, settings: { ...s.org.settings, eventCreators: "everyone" } } })
/** What Create event dispatches, run through the real reducer. */
function create(s: DemoState, id = "made", prefill?: Extract<ChatCard, { kind: "form" }>["prefill"]): DemoState {
  const plan = eventFromForm(s, form(prefill), choice, id)
  if ("error" in plan) throw new Error(plan.error)
  const drafted = reducer(s, { type: "draftChanges", changeSet: plan.changeSet })
  return reducer(drafted, { type: "reviewChange", id, index: 0, decision: "applied", op: plan.op, human: plan.human })
}

beforeEach(() => { vi.clearAllMocks(); store.state = base })
afterEach(cleanup)

describe("the common checklist chips", () => {
  it("are six items defined once, and the other checklists are the remaining eleven (food has its own select)", () => {
    expect(COMMON_EVENT_CHECKS).toEqual(["speaker", "funding", "externalFood", "partner", "advisor", "rsvp"])
    expect(OTHER_EVENT_CHECKLIST).toHaveLength(11)
    expect(new Set([...COMMON_EVENT_CHECKS, ...OTHER_EVENT_CHECKLIST.map(item => item.key), "food"])).toEqual(new Set(EVENT_CHECKLIST.map(item => item.key)))
  })
})

describe("Create event applies at once", () => {
  it("creates the event with the same approval inputs the Review changes card sends, and leaves nothing pending", () => {
    const plan = eventFromForm(base, form(), choice, "made")
    expect(plan).toMatchObject({ human: { date, buffered: false, workflowTemplateId: "standard-event", workflowTemplateVersion: 1 }, changeSet: { by: "alex", workflowChoices: { 0: choice } } })
    const next = create(base)
    expect(next.events.find(e => e.id === "made:0")).toMatchObject({ name: "Fictional mixer", date })
    expect(next.nodes.some(n => n.eventId === "made:0")).toBe(true)
    expect(next.changeSets.find(c => c.id === "made")).toMatchObject({ status: "applied", reviews: ["applied"] })
  })
  it("returns the same validation the review card gives, before anything is drafted", () => {
    expect(eventFromForm(base, { ...form(), date: addDays(base.today, -1) }, choice, "x")).toEqual({ error: "Pick a date from today on." })
    expect(eventFromForm(as("maya"), form(), choice, "x")).toMatchObject({ error: expect.stringMatching(/create events/) })
    expect(eventFromForm(base, form(), { templateId: "missing", templateVersion: 1 }, "x")).toMatchObject({ error: expect.stringMatching(/saved workflow/) })
  })
})

describe("undoCreatedEvent", () => {
  it("removes the event, its tasks and their notices, and marks the change set undone, once", () => {
    const made = create(base)
    const step = made.nodes.find(n => n.eventId === "made:0")!
    const noticed = { ...made, notifications: [...made.notifications, { id: "n-test", recipientId: "maya", nodeId: step.id, kind: "info" as const, text: "Fictional notice", createdOn: made.today, read: false }] }
    const undone = reducer(noticed, { type: "undoCreatedEvent", id: "made" })
    expect(undone.events.some(e => e.id === "made:0")).toBe(false)
    expect(undone.nodes.some(n => n.eventId === "made:0")).toBe(false)
    expect(undone.notifications.some(n => n.id === "n-test")).toBe(false)
    expect(undone.changeSets.find(c => c.id === "made")?.undone).toBe(true)
    expect(undone.events).toEqual(base.events)
    expect(reducer(undone, { type: "undoCreatedEvent", id: "made" })).toBe(undone)
  })
  it("is allowed for the creator or a lead, not for another officer", () => {
    const made = create(as("maya", everyone(base)))
    expect(reducer(as("sam", made), { type: "undoCreatedEvent", id: "made" }).events.some(e => e.id === "made:0")).toBe(true)
    expect(reducer(made, { type: "undoCreatedEvent", id: "made" }).events.some(e => e.id === "made:0")).toBe(false)
    expect(reducer(as("alex", made), { type: "undoCreatedEvent", id: "made" }).events.some(e => e.id === "made:0")).toBe(false)
  })
  it("keeps a club task someone linked to the event, unlinked", () => {
    const made = create(base)
    const linked = reducer(made, { type: "createTasks", id: "ct", sentence: "Print name badges", tasks: [{ title: "Print name badges", ownerId: "alex", eventId: null, link: { eventId: "made:0", branchId: "event-lead", order: 0 } }], date: addDays(base.today, 5), buffered: false })
    expect(linked.nodes.find(n => n.id === "ct:0")?.eventId).toBe("made:0")
    const undone = reducer(linked, { type: "undoCreatedEvent", id: "made" })
    expect(undone.nodes.find(n => n.id === "ct:0")).toMatchObject({ eventId: null, clubTask: true })
    expect(undone.nodes.find(n => n.id === "ct:0")?.placement).toBeUndefined()
  })
  it("leaves change sets that created no event alone, and is written to the research log like other actions", async () => {
    const tasks = reducer(base, { type: "createTasks", id: "t", sentence: "Order name tags", tasks: [{ title: "Order name tags", ownerId: "alex", eventId: null }], date: addDays(base.today, 5), buffered: false })
    expect(reducer(tasks, { type: "undoCreatedEvent", id: "t" })).toBe(tasks)
    const { loggedReducer } = await import("../data/store")
    const root = loggedReducer({ app: create(base), log: [] }, { action: { type: "undoCreatedEvent", id: "made" }, at: 1 })
    expect(root.log.at(-1)).toMatchObject({ type: "undoCreatedEvent", payload: { id: "made" }, applied: true })
  })
})

describe("the compact New event card", () => {
  it("shows Date, People and Food, the six chips by their labels, and the other checklists folded with a count", () => {
    render(<PlanForm card={form()} onDone={vi.fn()} />)
    const chips = screen.getByRole("group", { name: "This event has…" })
    expect(within(chips).getAllByRole("checkbox").map(box => box.closest("label")?.textContent)).toEqual(["Guest speaker or performer", "Need funding or reimbursement", "External food provider", "Partner, sponsor, co-host, vendor, or contract", "Advisor involvement required", "RSVP registration needed"])
    expect(screen.getByLabelText("Date")).toBeTruthy()
    expect(screen.getByLabelText("People")).toBeTruthy()
    expect(screen.getByLabelText("Food")).toBeTruthy()
    const more = screen.getByTestId("other-checklists") as HTMLDetailsElement
    expect(more.open).toBe(false)
    expect(more.querySelector("summary")?.textContent).toBe("Other checklists · 11 more")
    expect(screen.getByRole("button", { name: "Create event" })).toBeTruthy()
  })
  it("opens Other checklists when one of its items is ticked, including by the AI reading", () => {
    const { rerender } = render(<PlanForm card={form()} onDone={vi.fn()} />)
    const more = screen.getByTestId("other-checklists") as HTMLDetailsElement
    rerender(<PlanForm card={{ ...form(), ai: { checks: { alcohol: true, media: true } } }} onDone={vi.fn()} />)
    expect(more.open).toBe(true)
    expect(more.querySelector("summary")?.textContent).toBe("Other checklists · 11 more, 2 ticked")
    expect((screen.getByLabelText("Alcohol") as HTMLInputElement).checked).toBe(true)
  })
  it("the speaker chip sets the speaker field and its checklist item", () => {
    const done = vi.fn()
    render(<PlanForm card={form()} onDone={done} />)
    fireEvent.click(screen.getByLabelText("Guest speaker or performer"))
    fireEvent.click(screen.getByLabelText("RSVP registration needed"))
    fireEvent.click(screen.getByRole("button", { name: "Create event" }))
    expect(done.mock.calls[0][0].prefill).toMatchObject({ speaker: true, checks: { speaker: true, rsvp: true } })
  })
  it("shows a problem the form's owner returns in the form itself", () => {
    render(<PlanForm card={form()} onDone={() => "Choose a saved workflow version before creating this event."} />)
    fireEvent.click(screen.getByRole("button", { name: "Create event" }))
    expect(screen.getByRole("alert").textContent).toBe("Choose a saved workflow version before creating this event.")
  })
})

describe("Create event in the chat", () => {
  const Where = () => { const l = useLocation(); return <output data-testid="where">{l.pathname + l.search}</output> }
  it("creates the event at once, opens it and starts the plan check, with no Review changes step", async () => {
    vi.useFakeTimers()
    try {
      const created = vi.fn()
      render(<MemoryRouter><PlanFormCard card={form()} onCreated={created} /><Where /></MemoryRouter>)
      fireEvent.click(screen.getByRole("button", { name: "Create event" }))
      const result = created.mock.calls[0][1]
      expect(result).toMatchObject({ eventId: `${result.changeSetId}:0`, name: "Fictional mixer" })
      expect(store.state.events.some(e => e.id === result.eventId)).toBe(true)
      expect(store.state.changeSets.some(c => c.status === "pending")).toBe(false)
      await act(async () => { vi.runAllTimers() })
      expect(screen.getByTestId("where").textContent).toBe(`/events?event=${encodeURIComponent(result.eventId)}`)
      expect(rail.requestReview).toHaveBeenCalledWith(result.eventId)
    } finally { vi.useRealTimers() }
  })
  it("the created card opens the event and Undo removes it", () => {
    store.state = create(base)
    render(<MemoryRouter><CreatedCard card={{ kind: "created", changeSetId: "made", eventId: "made:0", name: "Fictional mixer" }} /><Where /></MemoryRouter>)
    expect(screen.getByTestId("event-created").textContent).toContain("Fictional mixer created")
    fireEvent.click(screen.getByRole("button", { name: "Open event" }))
    expect(screen.getByTestId("where").textContent).toBe("/events?event=made%3A0")
    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(store.state.events.some(e => e.id === "made:0")).toBe(false)
    expect(store.state.changeSets.find(c => c.id === "made")?.undone).toBe(true)
  })
  it("another officer sees no Undo on someone else's event", () => {
    store.state = as("sam", create(as("maya", everyone(base))))
    render(<MemoryRouter><CreatedCard card={{ kind: "created", changeSetId: "made", eventId: "made:0", name: "Fictional mixer" }} /></MemoryRouter>)
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
  })
})
