import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import type { DemoState, WorkflowTemplateVersion } from "../../data/types"
import { seedDemo } from "../../data/seed"
import { initialWorkflowChoice, WorkflowTemplatePicker } from "./WorkflowTemplatePicker"
import { PlanForm } from "./AskPanel"
import { ChangeCard } from "./ChangeCard"

const store = vi.hoisted(() => ({ state: undefined as unknown as DemoState, dispatch: vi.fn() }))
const rail = vi.hoisted(() => ({ requestReview: vi.fn(), show: vi.fn() }))
vi.mock("../../data/store", () => ({ useStore: () => store, useViewer: () => ({ person: { id: "alex", name: "Alex Example" } }) }))
vi.mock("./RailContext", () => ({ useRail: () => rail }))

const version: WorkflowTemplateVersion = { version: 1, savedOn: "2026-11-18", name: "Company visit", kind: "custom", steps: [{ key: "visit-task", title: "Confirm transport", fn: "programs", ownerRoleId: "r-events", phase: "prepare", tier: "light", estDays: 1, why: "Check the pickup point.", source: "Club workflow", custom: true }], teamMap: { version: 1, workflowId: "company-visit", stepTeams: { "visit-task": "ops" } } }
const choice = { templateId: "company-visit", templateVersion: 1 }

beforeEach(() => {
  vi.clearAllMocks()
  const state = seedDemo(undefined, "v2")
  store.state = { ...state, org: { ...state.org, defaultWorkflowTemplateId: choice.templateId, workflowTemplates: [{ id: choice.templateId, versions: [structuredClone(version)], updatedOn: state.today }], workflowTeams: [{ id: "ops", name: "Operations" }] } }
})
afterEach(cleanup)

describe("human workflow selection", () => {
  it("uses the configured default and never silently substitutes the first unrelated template", () => {
    expect(initialWorkflowChoice(store.state)).toEqual(choice)
    expect(initialWorkflowChoice({ ...store.state, org: { ...store.state.org, defaultWorkflowTemplateId: "unavailable" } })).toBeUndefined()
    expect(initialWorkflowChoice(seedDemo(undefined, "v2"))).toEqual({ templateId: "standard-event", templateVersion: 1 })
  })

  it("presents saved workflow names and returns an explicit template version", () => {
    const changed = vi.fn()
    render(<WorkflowTemplatePicker state={store.state} value={choice} onChange={changed} />)
    expect(screen.getByRole("option", { name: "Company visit · v1" })).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Workflow template"), { target: { value: "standard-event@1" } })
    expect(changed).toHaveBeenCalledWith({ templateId: "standard-event", templateVersion: 1 })
  })

  it("keeps the organizer's v1 selection visible after v2 is published", () => {
    store.state.org.workflowTemplates![0].versions.push({ ...structuredClone(version), version: 2, name: "Company visit revised" })
    render(<WorkflowTemplatePicker state={store.state} value={choice} onChange={vi.fn()} />)
    expect((screen.getByLabelText("Workflow template") as HTMLSelectElement).value).toBe("company-visit@1")
    expect(screen.getByRole("option", { name: "Company visit · v1" })).toBeTruthy()
    expect(screen.getByRole("option", { name: "Company visit revised · v2" })).toBeTruthy()
  })

  it("keeps an unavailable selected version explicit so the organizer must choose again", () => {
    render(<WorkflowTemplatePicker state={store.state} value={{ ...choice, templateVersion: 8 }} onChange={vi.fn()} />)
    expect(screen.getByRole("option", { name: /Saved version unavailable/ })).toBeTruthy()
    expect((screen.getByLabelText("Workflow template") as HTMLSelectElement).value).toBe("company-visit@8")
  })

  it("includes the pinned human selection in the actual New event form submission", () => {
    const done = vi.fn()
    render(<PlanForm card={{ kind: "form", id: "form-visit", date: "2027-04-16", prefill: { name: "Fictional company visit" } }} onDone={done} />)
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ done: true, date: "2027-04-16" }), choice)
    expect(store.dispatch).not.toHaveBeenCalled()
    expect(rail.requestReview).not.toHaveBeenCalled()
  })

  it("rejects a New event form whose saved workflow disappeared while it was open", () => {
    const done = vi.fn()
    const { rerender } = render(<PlanForm card={{ kind: "form", id: "form-visit", date: "2027-04-16", prefill: { name: "Fictional company visit" } }} onDone={done} />)
    store.state = { ...store.state, org: { ...store.state.org, workflowTemplates: [] } }
    rerender(<PlanForm card={{ kind: "form", id: "form-visit", date: "2027-04-16", prefill: { name: "Fictional company visit" } }} onDone={done} />)
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByRole("alert").textContent).toMatch(/Choose a saved workflow version/)
    expect(done).not.toHaveBeenCalled()
  })

  it("carries the saved selection into approval and opens the custom Plan without automatic AI review", async () => {
    store.state.changeSets = [{ id: "choose-visit", sentence: "Plan Company visit on 2027-04-16", status: "pending", workflowChoices: { 0: choice }, ops: [{ op: "create_event", name: "Fictional company visit", type: "offcampus", headcount: 20, venue: "offcampus", food: "none", funding: "none", speaker: false, checks: {} }] }]
    const Location = () => <output>{useLocation().pathname}</output>
    render(<MemoryRouter><ChangeCard id="choose-visit" /><Location /></MemoryRouter>)
    expect((screen.getByLabelText("Workflow template") as HTMLSelectElement).value).toBe("company-visit@1")
    fireEvent.click(screen.getByRole("button", { name: "Apply this change" }))
    expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "reviewChange", human: { date: "2027-04-16", buffered: false, workflowTemplateId: "company-visit", workflowTemplateVersion: 1 } }))
    await screen.findByText("/events")
    expect(rail.requestReview).not.toHaveBeenCalled()
  })
})
