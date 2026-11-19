import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { WorkflowSettings } from "../../pages/Settings"
import { RailProvider, useRail } from "../rail/RailContext"
import { seedDemo } from "../../data/seed"
import { STORAGE_KEY, StoreProvider, useStore } from "../../data/store"
import type { DemoState, WorkflowBranch } from "../../data/types"
import { presetSteps } from "../../engine/workflow"
import type { StepEdit } from "../../lib/stepOrder"
import type { FlowInsertionTarget } from "../../lib/flowEdit"
import * as roleBranches from "../../engine/workflowRoleBranches"

// These cases exercise the real settings state, rail and persistence. Graph gestures have their own tests.
const operation = vi.hoisted(() => ({ accepted: undefined as boolean | void, error: undefined as string | undefined, edits: 0 }))
vi.mock("../flow/MetroChart", async () => {
  const { unlinkSteps } = await import("../../lib/flowEdit")
  const { orderedBranchNodes } = await import("../../lib/flowOrder")
  const { placementOf } = await import("../../engine/workflowBranches")
  return { MetroChart: ({ onSelect, selectedId, port, state }: { state: DemoState; selectedId: string | null; onSelect: (id: string) => void; port: { newId: () => string; addStep: (id: string, afterId: string | null, beforeId: string | null, target?: FlowInsertionTarget) => boolean | void; applyEdits: (edits: StepEdit[]) => boolean | void; addBranch?: (branch: WorkflowBranch, id: string, title: string) => boolean | void } }) => <div>
    <button onClick={() => onSelect("budget")}>Select budget</button><button onClick={() => onSelect("partnerReview")}>Select partner review</button><button onClick={() => onSelect("marketingNeeds")}>Select marketing needs</button><button onClick={() => onSelect("guest-followup")}>Select custom step</button><button onClick={() => onSelect("new-step")}>Select inserted step</button>
    <button onClick={() => port.addBranch?.({ id: "new-support", title: "New support", side: "before_event", condition: "externalGuest", order: 20, defaultRoleId: "r-events" }, "new-step", "Guest arrival")}>Add test branch</button>
    <button onClick={() => port.addBranch?.({ id: "all-support", title: "All event support", side: "before_event", conditions: [], order: 20, defaultRoleId: "r-events" }, "new-step", "Event support")}>Add every-event branch</button>
    {(["before", "after"] as const).map(direction => <button key={direction} onClick={() => {
      const reference = state.nodes.find(node => node.id === selectedId)
      if (!reference) return
      const branchId = placementOf(reference).branchId
      const ordered = orderedBranchNodes(state.nodes, branchId)
      const index = ordered.findIndex(node => node.id === reference.id)
      const afterId = direction === "before" ? ordered[index - 1]?.id ?? null : reference.id
      const beforeId = direction === "after" ? ordered[index + 1]?.id ?? null : reference.id
      operation.accepted = port.addStep(port.newId(), afterId, beforeId, { branchId, afterId, beforeId, referenceId: reference.id, source: direction === "before" ? "before_node" : "after_node" })
    }}>Insert {direction} selected step</button>)}
    <button onClick={() => { operation.accepted = port.applyEdits([{ id: "budget", patch: { stepKind: "situation" } }]) }}>Classify budget through graph</button>
    <button onClick={() => { operation.accepted = port.applyEdits([{ id: "budget", patch: { stepKind: null } }]) }}>Restore legacy budget category</button>
    <button onClick={() => {
      const result = unlinkSteps(state.nodes, "purchaseRequest", "budgetApproval")
      operation.error = result.error; operation.edits = result.edits.length
      operation.accepted = result.error ? false : port.applyEdits(result.edits)
    }}>Cut purchase approval link</button>
  </div> }
})

let latest: DemoState
function Details() { latest = useStore().state; const rail = useRail(); return <><button onClick={() => rail.setOpen(false)}>Hide test details</button><output data-testid="rail-open">{String(rail.open)}</output>{rail.workflowDetail}</> }
function show(initial = seedDemo(undefined, "v2")) {
  render(<MemoryRouter><StoreProvider initial={initial}><RailProvider><WorkflowSettings /><Details /></RailProvider></StoreProvider></MemoryRouter>)
  fireEvent.click(screen.getByRole("button", { name: "Select budget" }))
}
beforeEach(() => { localStorage.clear(); operation.accepted = undefined; operation.error = undefined; operation.edits = 0 })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe("workflow settings editing", () => {
  it("puts the saved step type first and retains it when selection changes or stored data is restored", async () => {
    show()
    const panel = screen.getByTestId("workflow-step-panel")
    expect(panel.querySelector("input, select, textarea")).toBe(screen.getByLabelText("Step type"))
    expect((screen.getByLabelText("Step type") as HTMLSelectElement).value).toBe("core")
    fireEvent.change(screen.getByLabelText("Step type"), { target: { value: "situation" } })
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "budget")?.stepKind).toBe("situation"))
    fireEvent.click(screen.getByRole("button", { name: "Select partner review" }))
    expect((screen.getByLabelText("Step type") as HTMLSelectElement).value).toBe("situation")
    fireEvent.click(screen.getByRole("button", { name: "Select budget" }))
    expect((screen.getByLabelText("Step type") as HTMLSelectElement).value).toBe("situation")
    const restored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as DemoState
    cleanup()
    show(restored)
    expect((screen.getByLabelText("Step type") as HTMLSelectElement).value).toBe("situation")
  })

  it("changes the saved category without changing existing activation rules and can undo it", async () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Select partner review" }))
    fireEvent.change(screen.getByLabelText("Step type"), { target: { value: "core" } })
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "partnerReview")?.stepKind).toBe("core"))
    const updated = latest.org.eventWorkflow!.steps.find(step => step.key === "partnerReview")!
    expect(updated.cond).toBe("externalGuest")
    expect(latest.org.eventWorkflow!.branches?.find(branch => branch.id === "speaker")?.condition).toBe("externalGuest")
    fireEvent.click(within(screen.getByTestId("workflow-settings")).getByRole("button", { name: "Undo" }))
    await waitFor(() => expect((screen.getByLabelText("Step type") as HTMLSelectElement).value).toBe("situation"))
    expect(latest.org.eventWorkflow!.steps.find(step => step.key === "partnerReview")!.cond).toBe("externalGuest")
  })

  it("moves a marketing task with Done by and moves it back without changing dependencies", async () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Select marketing needs" }))
    const dependencies = presetSteps().find(step => step.key === "marketingNeeds")!.dependsOn
    fireEvent.change(screen.getByLabelText("Done by"), { target: { value: "r-events" } })
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "marketingNeeds")?.ownerRoleId).toBe("r-events"))
    expect(latest.org.eventWorkflow!.steps.find(step => step.key === "marketingNeeds")!.placement?.branchId).toBe("event-lead")
    expect(latest.org.eventWorkflow!.steps.find(step => step.key === "marketingNeeds")!.dependsOn).toEqual(dependencies)
    fireEvent.change(screen.getByLabelText("Done by"), { target: { value: "r-mkt" } })
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "marketingNeeds")?.ownerRoleId).toBe("r-mkt"))
    expect(latest.org.eventWorkflow!.steps.find(step => step.key === "marketingNeeds")!.placement?.branchId).toBe("marketing")
    fireEvent.click(within(screen.getByTestId("workflow-settings")).getByRole("button", { name: "Undo" }))
    await waitFor(() => expect((screen.getByLabelText("Done by") as HTMLSelectElement).value).toBe("r-events"))
    expect(latest.org.eventWorkflow!.steps.find(step => step.key === "marketingNeeds")!.placement?.branchId).toBe("event-lead")
  })

  it("does not apply half a role reassignment when the shared helper rejects it", () => {
    const assign = vi.spyOn(roleBranches, "reassignWorkflowStep").mockImplementation((steps, branches) => ({ steps: steps.map(step => step.key === "budget" ? { ...step, ownerRoleId: "r-events" } : step), branches: branches ?? [], error: "That assignment cannot keep this workflow valid." }))
    show()
    fireEvent.change(screen.getByLabelText("Done by"), { target: { value: "r-events" } })
    expect(assign).toHaveBeenCalledOnce()
    expect(screen.getByRole("alert").textContent).toContain("cannot keep this workflow valid")
    expect((screen.getByLabelText("Done by") as HTMLSelectElement).value).toBe("r-fin")
    expect(latest.org.eventWorkflow).toBeUndefined()
  })

  it.each(["before", "after"] as const)("inherits an explicitly authored category when inserting %s the clicked node", async direction => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Select partner review" }))
    fireEvent.change(screen.getByLabelText("Step type"), { target: { value: "core" } })
    fireEvent.click(screen.getByRole("button", { name: `Insert ${direction} selected step` }))
    expect(operation.accepted).toBe(true)
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "new-step")?.stepKind).toBe("core"))
    expect(latest.org.eventWorkflow!.steps.find(step => step.key === "new-step")!.cond).toBe("externalGuest")
    fireEvent.click(screen.getByRole("button", { name: "Select inserted step" }))
    expect((screen.getByLabelText("Step type") as HTMLSelectElement).value).toBe("core")
  })

  it("accepts category patches from the graph port", async () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Classify budget through graph" }))
    expect(operation.accepted).toBe(true)
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "budget")?.stepKind).toBe("situation"))
    expect((screen.getByLabelText("Step type") as HTMLSelectElement).value).toBe("situation")
    fireEvent.click(screen.getByRole("button", { name: "Restore legacy budget category" }))
    expect(operation.accepted).toBe(true)
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "budget")?.stepKind).toBeUndefined())
    expect((screen.getByLabelText("Step type") as HTMLSelectElement).value).toBe("core")
  })

  it.each([["Add test branch", "situation"], ["Add every-event branch", "core"]] as const)("initializes the first task category for %s", async (button, kind) => {
    show()
    fireEvent.click(screen.getByRole("button", { name: button }))
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "new-step")?.stepKind).toBe(kind))
  })

  it("keeps the selected category after saving fails and persists it on retry", async () => {
    show()
    const original = Storage.prototype.setItem
    const save = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY) throw new Error("Storage is full")
      return original.call(this, key, value)
    })
    fireEvent.change(screen.getByLabelText("Step type"), { target: { value: "situation" } })
    const settings = screen.getByTestId("workflow-settings")
    await waitFor(() => expect(within(settings).getByRole("status").textContent).toContain("Saving failed"))
    expect((screen.getByLabelText("Step type") as HTMLSelectElement).value).toBe("situation")
    expect(latest.org.eventWorkflow).toBeUndefined()
    save.mockRestore()
    fireEvent.click(within(settings).getByRole("button", { name: "Retry saving" }))
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "budget")?.stepKind).toBe("situation"))
  })

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

  it("rejects a graph edit that removes the required approval dependency before claiming success", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Cut purchase approval link" }))
    expect(operation.error).toBeUndefined()
    expect(operation.edits).toBeGreaterThan(0)
    expect(operation.accepted).toBe(false)
    expect(latest.org.eventWorkflow).toBeUndefined()
    expect(within(screen.getByTestId("workflow-settings")).queryByRole("status")).toBeNull()
  })

  it("does not reopen a dismissed details rail when autosave finishes", async () => {
    show()
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "10" } })
    fireEvent.click(screen.getByRole("button", { name: "Hide test details" }))
    expect(screen.getByTestId("rail-open").textContent).toBe("false")
    await waitFor(() => expect(latest.org.eventWorkflow?.steps.find(step => step.key === "budget")?.estDays).toBe(10))
    expect(screen.getByTestId("rail-open").textContent).toBe("false")
  })
})
