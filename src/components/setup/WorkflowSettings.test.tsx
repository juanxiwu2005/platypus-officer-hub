import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Settings from "../../pages/Settings"
import { RailProvider, useRail } from "../rail/RailContext"
import { seedDemo } from "../../data/seed"
import { STORAGE_KEY, StoreProvider, useStore } from "../../data/store"
import type { DemoState, WorkflowBranch } from "../../data/types"
import { presetSteps } from "../../engine/workflow"
import type { StepEdit } from "../../lib/stepOrder"

// These cases exercise the real settings state, rail and persistence. Graph gestures have their own tests.
const operation = vi.hoisted(() => ({ accepted: undefined as boolean | void, error: undefined as string | undefined, edits: 0 }))
vi.mock("../flow/MetroChart", async () => {
  const { moveBetween } = await import("../../lib/flowEdit")
  return { MetroChart: ({ onSelect, port, state }: { state: DemoState; onSelect: (id: string) => void; port: { applyEdits: (edits: StepEdit[]) => boolean | void; addBranch?: (branch: WorkflowBranch, id: string, title: string) => boolean | void } }) => <div>
    <button onClick={() => onSelect("budget")}>Select budget</button><button onClick={() => onSelect("partnerReview")}>Select partner review</button><button onClick={() => onSelect("guest-followup")}>Select custom step</button>
    <button onClick={() => port.addBranch?.({ id: "new-support", title: "New support", side: "before_event", condition: "externalGuest", order: 20, defaultRoleId: "r-events" }, "new-step", "Guest arrival")}>Add test branch</button>
    <button onClick={() => {
      const result = moveBetween(state.nodes, "purchaseRequest", "budgetRequest", "budgetApproval", { target: { branchId: "finance", afterId: "budgetRequest", beforeId: "budgetApproval", source: "gap" }, branches: state.events[0].workflowBranches! })
      operation.error = result.error; operation.edits = result.edits.length
      operation.accepted = result.error ? false : port.applyEdits(result.edits)
    }}>Move purchase before approval</button>
  </div> }
})

let latest: DemoState
function Details() { latest = useStore().state; return <>{useRail().workflowDetail}</> }
function show(initial = seedDemo(undefined, "v2")) {
  render(<MemoryRouter><StoreProvider initial={initial}><RailProvider><Settings /><Details /></RailProvider></StoreProvider></MemoryRouter>)
  fireEvent.click(screen.getByRole("button", { name: "Workflow" }))
  fireEvent.click(screen.getByRole("button", { name: "Select budget" }))
}
beforeEach(() => { localStorage.clear(); operation.accepted = undefined; operation.error = undefined; operation.edits = 0 })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe("workflow settings editing", () => {
  it("does not write an empty draft into another node when selection changes", async () => {
    show()
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Select partner review" }))
    expect((screen.getByLabelText("Days of work") as HTMLInputElement).value).toBe("1")
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "9" } })
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "partnerReview")?.estDays).toBe(9))
    expect(latest.org.eventWorkflow?.steps.find(step => step.key === "budget")?.estDays).toBe(3)
    expect(latest.org.eventWorkflow?.steps.find(step => step.key === "partnerReview")?.startPolicy).toBe("effort")
  })

  it("retains the edited draft after a failed save and persists it on Retry saving", async () => {
    show()
    const original = Storage.prototype.setItem
    const save = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY) throw new Error("Storage is full")
      return original.call(this, key, value)
    })
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "10" } })
    const settings = screen.getByTestId("workflow-settings")
    await waitFor(() => expect(within(settings).getByRole("status").textContent).toContain("Saving failed"))
    expect((screen.getByLabelText("Days of work") as HTMLInputElement).value).toBe("10")
    expect(latest.org.eventWorkflow).toBeUndefined()
    save.mockRestore()
    fireEvent.click(within(settings).getByRole("button", { name: "Retry saving" }))
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "budget")?.estDays).toBe(10))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).org.eventWorkflow.steps.find((step: { key: string }) => step.key === "budget").startPolicy).toBe("effort")
    expect(within(settings).getByRole("status").textContent).toContain("Saved")
  })

  it("removes a custom branch with its final task and restores both with Settings Undo", async () => {
    const base = seedDemo(undefined, "v2")
    const steps = [...presetSteps(), { key: "guest-followup", title: "Guest follow-up", fn: "programs" as const, ownerRoleId: "r-events", phase: "prepare" as const, estDays: 1, tier: "light" as const, dependsOn: [], why: "Confirm guest arrangements.", source: "Added by the club", custom: true, placement: { branchId: "guest-support", order: 0 } }]
    const branch = { id: "guest-support", title: "Guest support", side: "before_event" as const, condition: "externalGuest" as const, order: 20 }
    show({ ...base, org: { ...base.org, eventWorkflow: { steps, branches: [branch], updatedOn: base.today } } })
    fireEvent.click(screen.getByRole("button", { name: "Select custom step" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete this step" }))
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.some(step => step.key === "guest-followup")).toBe(false))
    expect(latest.org.eventWorkflow?.branches?.some(item => item.id === branch.id)).toBe(false)
    const settings = screen.getByTestId("workflow-settings")
    fireEvent.click(within(settings).getByRole("button", { name: "Undo" }))
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.some(step => step.key === "guest-followup")).toBe(true))
    expect(latest.org.eventWorkflow?.branches?.find(item => item.id === branch.id)).toEqual(branch)
  })

  it("clears a newly saved branch when Undo restores the original standard template", async () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Add test branch" }))
    await waitFor(() => expect(latest.org.eventWorkflow?.branches?.some(branch => branch.id === "new-support")).toBe(true))
    const settings = screen.getByTestId("workflow-settings")
    fireEvent.click(within(settings).getByRole("button", { name: "Undo" }))
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.some(step => step.key === "new-step")).toBe(false))
    expect(latest.org.eventWorkflow?.branches?.some(branch => branch.id === "new-support")).toBe(false)
  })

  it("rejects a graph move that would break the required approval dependency before claiming success", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Move purchase before approval" }))
    expect(operation.error).toBeUndefined()
    expect(operation.edits).toBeGreaterThan(0)
    expect(operation.accepted).toBe(false)
    expect(latest.org.eventWorkflow).toBeUndefined()
    expect(screen.queryByRole("status")).toBeNull()
  })
})
