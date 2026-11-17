import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { TaskDetail } from "./TaskDetail"
import { RailProvider } from "./rail/RailContext"
import { seedDemo } from "../data/seed"
import { reducer, StoreProvider, useStore } from "../data/store"
import type { DemoState, Node } from "../data/types"
import { applySchedule, computeSchedule } from "../engine/schedule"
import { addDays, fmtShort } from "../lib/dates"
import { taskReminderSummary } from "../reminders/centre"
import { createReminderRuntime } from "../reminders/engine"
import type { ReminderDelivery } from "../reminders/contracts"

beforeEach(() => localStorage.clear())
afterEach(cleanup)
const ID = "details-test"
function fixture(patch: Partial<Node> = {}): DemoState {
  const base = seedDemo(undefined, "v2"), source = base.nodes.find(n => n.stepKey === "venue")!
  const event = { ...base.events.find(e => e.id === source.eventId)!, name: "Speaker Night", date: "2027-04-16", headcount: 40, venue: "campus" as const }
  return applySchedule({ ...base, viewerId: "alex", today: "2027-03-28", events: [event], nodes: [{ ...source, id: ID, ownerId: "jordan", status: "accepted", dependsOn: [], waitingOn: null, waitingOnPersonId: null, ...patch }], nudges: [], protocolLog: [], silenceCases: [], notifications: [], extensionRequests: [] })
}
let latest: DemoState
function Live({ actorId, token }: { actorId: string; token?: string }) {
  latest = useStore().state
  return <TaskDetail node={latest.nodes[0]} actorId={actorId} token={token} />
}
function show(state = fixture(), actorId = state.viewerId, token?: string) {
  return render(<MemoryRouter><StoreProvider initial={state}><RailProvider><Live actorId={actorId} token={token} /></RailProvider></StoreProvider></MemoryRouter>)
}
const nextStep = () => screen.getByRole("region", { name: "Your next step" })
const reminderPlan = () => screen.getByRole("region", { name: "Reminder plan" })

describe("the three task detail zones", () => {
  it("shows event/task, one prominent due and actual instructions, completion criteria and importance before folded references", async () => {
    const state = fixture({ instructions: "Reserve an accessible room for 40 attendees and a projector.", completionCriteria: "Save the booking reference and room number.", why: "We need a confirmed location before inviting guests." })
    show(state)
    const detail = screen.getByTestId("task-detail"), header = detail.querySelector(".td-head")!
    expect(header.querySelector(".td-event")!.textContent).toBe("Speaker Night")
    expect(header.querySelectorAll(".td-focus-due")).toHaveLength(1)
    expect(screen.getByTestId("task-due").textContent).toContain(fmtShort(computeSchedule(state).nodes[ID].club))
    expect(screen.getByTestId("task-due").textContent).not.toMatch(/Start by|ASU|Event date/)
    expect(nextStep().textContent).toContain("Reserve an accessible room for 40 attendees and a projector.")
    expect(nextStep().textContent).toContain("Complete when: Save the booking reference and room number.")
    expect(nextStep().textContent).toContain("We need a confirmed location before inviting guests.")
    const action = within(nextStep()).getByRole("group", { name: "Where to submit" })
    expect(within(action).getAllByRole("link")).toHaveLength(1)
    expect(action.textContent).toContain("request entry")
    expect(screen.queryByRole("link", { name: /Mazevo/ })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(within(header as HTMLElement).getByRole("heading", { level: 2 })))
  })

  it("does not offer a campus room application for an off-campus venue", () => {
    const state = fixture(); show({ ...state, events: state.events.map(e => ({ ...e, venue: "offcampus" })) })
    expect(within(nextStep()).queryByRole("group", { name: "Where to submit" })).toBeNull()
    expect(nextStep().textContent).toContain("Confirm the venue for 40 attendees")
  })

  it.each(["absent", "v1", "invalid"] as const)("uses the shared %s reminder summary without enabling or overwriting its saved runtime", shape => {
    const base = fixture(), enabled = reducer(base, { type: "upgradeReminderPlan" })
    const runtime = shape === "absent" ? undefined : shape === "v1" ? { ...enabled.reminderRuntime!, version: 1 as const } : { broken: true } as unknown as DemoState["reminderRuntime"]
    const state = { ...base, reminderRuntime: runtime }, expected = taskReminderSummary(state, ID)
    show(state)
    expect(screen.getByTestId("task-reminder-explanation").textContent).toBe(expected.explanation)
    expect(within(reminderPlan()).getByRole("link", { name: "Review reminder setup" }).getAttribute("href")).toBe("/")
    const remind = within(reminderPlan()).queryByRole("button", { name: /^Remind/ }) as HTMLButtonElement | null
    expect(remind?.disabled ?? true).toBe(true)
    expect(latest.reminderRuntime).toEqual(runtime)
    expect(screen.queryByRole("button", { name: /Enable|Upgrade/ })).toBeNull()
  })

  it("shows the actual waiting recipient and stored request detail instead of offering to remind the owner", () => {
    const enabled = reducer(fixture(), { type: "upgradeReminderPlan" })
    const waiting = reducer({ ...enabled, viewerId: "jordan" }, { type: "replyTask", nodeId: ID, reply: "waiting", input: { waitingOn: "Please confirm the accessible entrance", waitingOnPersonId: "sam" } })
    show({ ...waiting, viewerId: "alex" })
    expect(reminderPlan().textContent).toContain("Sam Okafor")
    expect(reminderPlan().textContent).toContain("Please confirm the accessible entrance")
    expect(within(reminderPlan()).getByRole("button", { name: "Remind Sam" })).toBeTruthy()
    expect(within(reminderPlan()).queryByRole("button", { name: "Remind Jordan" })).toBeNull()
  })

  it("updates the displayed reminder state from real Working then Done actions", () => {
    const enabled = reducer(fixture(), { type: "upgradeReminderPlan" })
    show({ ...enabled, viewerId: "jordan" })
    fireEvent.click(screen.getByRole("button", { name: "Working on it" }))
    expect(latest.nodes[0].status).toBe("in_progress")
    expect(screen.getByTestId("task-reminder-explanation").textContent).toBe(taskReminderSummary(latest, ID).explanation)
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }))
    expect(screen.getByTestId("task-reminder-explanation").textContent).toContain("complete")
    expect(screen.queryByRole("button", { name: /^Remind/ })).toBeNull()
  })

  it("keeps ASU deadline risks visible while private planning dates remain folded and owner-only", () => {
    const base = fixture({ anchor: { kind: "rule", ruleId: "R03", days: 16, unit: "calendar" }, timing: undefined, ruleIds: ["R03"] })
    const official = computeSchedule(base).nodes[ID].official!
    show(applySchedule({ ...base, today: addDays(official, 1), nodes: base.nodes.map(n => ({ ...n, clubDeadlineOverride: addDays(official, 2) })) }))
    expect(screen.getByRole("list", { name: "Schedule risks" }).textContent).toContain("ASU deadline")
    expect((screen.getByTestId("why-date") as HTMLDetailsElement).open).toBe(false)
    expect(screen.getByTestId("why-date").textContent).toContain("private planning preferences")
    expect(screen.getByTestId("why-date").textContent).not.toContain("Personal planning start")
  })

  it("lets a vice president edit while withholding status updates for another owner's task", () => {
    const state = fixture(), roleId = state.people.find(p => p.id === "maya")!.roleId
    show({ ...state, viewerId: "maya", roles: state.roles.map(r => r.id === roleId ? { ...r, fn: "vice_president" } : r) })
    expect(screen.getByTestId("task-edit")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Working on it" })).toBeNull()
  })

  it("keeps folded historical recipient/task/event snapshots and marks a simulated send as a demo after reassignment", () => {
    const state = fixture({ ownerId: "maya", ownerVersion: 1 })
    const sent: ReminderDelivery = { id: "delivery:1", sequence: 1, candidateId: "saved-candidate", nodeId: ID, recipientId: "jordan", recipientName: "Jordan when sent", ownerId: "jordan", ownerVersion: 0, planKey: "saved-plan", reason: "start", scheduledOn: state.today, sentOn: state.today, via: "platypus", outcome: "simulated", eventName: "Original event", taskTitle: "Original room task", due: "2027-03-31" }
    show({ ...state, reminderRuntime: { ...createReminderRuntime(state.today), sequence: 1, deliveries: [sent] } })
    const history = screen.getByText("Reminder history (1)").closest("details") as HTMLDetailsElement
    expect(history.open).toBe(false)
    expect(history.textContent).toContain("Jordan when sent")
    expect(history.textContent).toContain("Original event · Original room task")
    expect(history.textContent).toContain("Demo: no email was sent.")
    expect(history.textContent).not.toContain("Maya")
    expect(latest.reminderRuntime!.deliveries[0]).toEqual(sent)
  })

  it("does not offer lead tools through a legacy task token even when the browser viewer is a lead", () => {
    show(fixture(), "jordan", "legacy-token")
    expect(screen.queryByTestId("task-edit")).toBeNull()
    expect(screen.queryByTestId("task-matching")).toBeNull()
    expect(screen.queryByRole("button", { name: /^Remind/ })).toBeNull()
    expect(within(reminderPlan()).queryByRole("link", { name: /centre|setup/ })).toBeNull()
  })
})
