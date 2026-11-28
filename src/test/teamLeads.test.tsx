import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { seedDemo } from "../data/seed"
import { reducer, type Action } from "../data/store"
import { ensureWorkflowPresetTeams } from "../data/workflowTeamDefaults"
import { addDays } from "../lib/dates"
import { draftEventNodes, validateReview, type HumanInputs } from "../data/changeReview"
import { sanitizeOps } from "../lib/commands"
import { teamLeadChoices, teamMembers } from "../data/teamLeads"
import type { DemoState } from "../data/types"
import type { ChatCard } from "../lib/assistant"

/**
 * Team leads (option A, Juanxi 2026-11-28): the New event form names one lead per team for this event; the lead gets the
 * team's tasks and hands them out to teammates, so middle officers assign work themselves.
 */
const store = vi.hoisted(() => ({ state: undefined as unknown as DemoState }))
const dispatch = (action: Action) => { store.state = reducer(store.state, action) }
vi.mock("../data/store", async importOriginal => ({ ...(await importOriginal<typeof import("../data/store")>()), useStore: () => ({ state: store.state, dispatch, getState: () => store.state }) }))
vi.mock("../components/rail/RailContext", () => ({ useRail: () => ({ requestReview: vi.fn(), show: vi.fn() }) }))

import { eventFromForm, PlanForm } from "../components/rail/PlanForm"

const base = ensureWorkflowPresetTeams(seedDemo(undefined, "v2"))
const choice = { templateId: "standard-event", templateVersion: 1 }
const date = addDays(base.today, 60)
const form = (): Extract<ChatCard, { kind: "form" }> => ({ kind: "form", id: "f1", date, prefill: { name: "Pitch Workshop" } })
const teamId = (name: string) => base.org.workflowTeams!.find(team => team.name === name)!.id
const ops = teamId("Operations")
function create(s: DemoState, teamLeads?: Record<string, string>): DemoState {
  const plan = eventFromForm(s, form(), choice, "made", teamLeads)
  if ("error" in plan) throw new Error(plan.error)
  const drafted = reducer(s, { type: "draftChanges", changeSet: plan.changeSet })
  return reducer(drafted, { type: "reviewChange", id: "made", index: 0, decision: "applied", op: plan.op, human: plan.human })
}
const tasksOf = (s: DemoState, team: string) => s.nodes.filter(node => node.eventId === "made:0" && node.teamId === team)

beforeEach(() => { store.state = base })
afterEach(cleanup)

describe("team lead choices", () => {
  it("lists each team with work in the event, its current members, and the member the workflow gives most tasks as default", () => {
    expect(teamMembers(base, ops)).toEqual(["jordan", "priya"])
    const op = sanitizeOps([{ name: "Pitch Workshop", op: "create_event" }], base)[0]
    const human: HumanInputs = { date, workflowTemplateId: "standard-event", workflowTemplateVersion: 1 }
    const operations = teamLeadChoices(base, draftEventNodes(base, op, human)).find(item => item.teamId === ops)!
    expect(operations).toMatchObject({ name: "Operations", members: ["jordan", "priya"], defaultLeadId: "jordan" })
    expect(operations.steps).toBeGreaterThan(1)
  })
})

describe("creating an event with team leads", () => {
  it("gives every task of a team to its lead and records the leads on the event", () => {
    const next = create(base, { [ops]: "priya" })
    const event = next.events.find(item => item.id === "made:0")!
    expect(event.teamLeads).toMatchObject({ [ops]: "priya", [teamId("Finance")]: "maya" })
    expect(tasksOf(next, ops).length).toBeGreaterThan(1)
    expect(tasksOf(next, ops).every(node => node.ownerId === "priya" && node.status === "accepted")).toBe(true)
    expect(tasksOf(next, teamId("Finance")).every(node => node.ownerId === "maya")).toBe(true)
  })
  it("keeps the workflow's owners when no leads are given, as the review card does", () => {
    const next = create(base)
    expect(next.events.find(item => item.id === "made:0")!.teamLeads).toBeUndefined()
    expect(new Set(tasksOf(next, ops).map(node => node.ownerId))).toEqual(new Set(["jordan", "priya"]))
  })
  it("refuses a lead who is not on the team, before anything is drafted", () => {
    expect(eventFromForm(base, form(), choice, "x", { [ops]: "maya" })).toEqual({ error: "Choose someone on the Operations team to lead it." })
    const op = sanitizeOps([{ name: "Pitch Workshop", op: "create_event" }], base)[0]
    expect(validateReview(base, op, { date, workflowTemplateId: "standard-event", workflowTemplateVersion: 1, teamLeads: { [ops]: "jordan" } })).toBeNull()
  })
})

describe("a team lead hands out the team's tasks", () => {
  const made = () => create(base, { [ops]: "priya" })
  it("lets the lead give an open team task to a teammate, who is told", () => {
    const s = { ...made(), viewerId: "priya" }
    const task = tasksOf(s, ops)[0]
    const next = reducer(s, { type: "assignTeamTask", nodeId: task.id, ownerId: "jordan" })
    expect(next.nodes.find(node => node.id === task.id)).toMatchObject({ ownerId: "jordan", status: "accepted" })
    expect(next.notifications.some(notice => notice.nodeId === task.id && notice.recipientId === "jordan")).toBe(true)
  })
  it("refuses someone who is not the lead, a person off the team, and a done task", () => {
    const s = made(), task = tasksOf(s, ops)[0]
    const asJordan = { ...s, viewerId: "jordan" }
    expect(reducer(asJordan, { type: "assignTeamTask", nodeId: task.id, ownerId: "jordan" })).toBe(asJordan)
    const asPriya = { ...s, viewerId: "priya" }
    expect(reducer(asPriya, { type: "assignTeamTask", nodeId: task.id, ownerId: "maya" })).toBe(asPriya)
    const done = { ...asPriya, nodes: asPriya.nodes.map(node => node.id === task.id ? { ...node, status: "done" as const } : node) }
    expect(reducer(done, { type: "assignTeamTask", nodeId: task.id, ownerId: "jordan" })).toBe(done)
  })
})

describe("the New event form", () => {
  it("asks who leads each team with more than one member, and sends the choice", () => {
    const done = vi.fn(() => null)
    render(<PlanForm card={form()} onDone={done} />)
    const group = screen.getByRole("group", { name: "Who leads each team this time?" })
    const select = within(group).getByLabelText("Operations lead") as HTMLSelectElement
    expect(select.value).toBe("jordan")
    expect(within(group).getByText("Maya Chen")).toBeTruthy()
    fireEvent.change(select, { target: { value: "priya" } })
    fireEvent.click(screen.getByRole("button", { name: "Create event" }))
    expect(done).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ [ops]: "priya", [teamId("Finance")]: "maya" }))
  })
})
