import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { seedDemo } from "../../data/seed"
import { EVENT_CHECKLIST } from "../../data/eventChecklist"
import { WorkflowBranchDialog, type BranchDraft } from "./WorkflowBranchDialog"

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const roles = seedDemo(undefined, "v2").roles
const food = () => screen.getByRole("checkbox", { name: "Food or beverage" })
const speaker = () => screen.getByRole("checkbox", { name: "External speaker, artist, or performer" })
function nameBranch() {
  fireEvent.change(screen.getByLabelText("Branch name"), { target: { value: " Guest support " } })
  fireEvent.change(screen.getByLabelText("First task"), { target: { value: " Save guest notes " } })
}

describe("new workflow branch checklist", () => {
  it("uses the actual event checklist and explains that all selections must match", () => {
    render(<WorkflowBranchDialog roles={roles} onAdd={() => null} onClose={vi.fn()} />)
    const group = screen.getByRole("group", { name: "Include this branch when" })
    expect(within(group).getAllByRole("checkbox")).toHaveLength(18)
    expect(within(group).getAllByRole("checkbox").map(input => input.closest("label")?.textContent)).toEqual(EVENT_CHECKLIST.map(item => item.label))
    expect(group.getAttribute("aria-describedby")).toBe("workflow-branch-conditions-description")
    expect(screen.getByText(/only when every selected item is checked/)).toBeTruthy()
    expect(screen.getByRole("status").textContent).toBe("Every event")
    expect(speaker()).toBeTruthy()
    expect(screen.getByRole("checkbox", { name: "Partner, sponsor, co-host, vendor, or contract" })).toBeTruthy()
    expect(screen.queryByRole("checkbox", { name: "Speaker or partner" })).toBeNull()
    expect(screen.queryByLabelText("Applies to")).toBeNull()
  })

  it("submits multiple checklist requirements together with the branch and first task", () => {
    const add = vi.fn<(draft: BranchDraft) => string | null>(() => null)
    render(<WorkflowBranchDialog roles={roles} onAdd={add} onClose={vi.fn()} />)
    nameBranch()
    fireEvent.change(screen.getByLabelText("When"), { target: { value: "after_event" } })
    fireEvent.click(food())
    fireEvent.click(speaker())
    expect(screen.getByRole("status").textContent).toBe("All 2 selected items must be checked.")
    fireEvent.click(screen.getByRole("button", { name: "Add branch" }))
    expect(add).toHaveBeenCalledOnce()
    expect(add).toHaveBeenCalledWith({ title: "Guest support", side: "after_event", conditions: ["food", "speaker"], defaultRoleId: "r-events", firstStepTitle: "Save guest notes" })
  })

  it("unchecks one requirement without clearing the other", () => {
    const add = vi.fn<(draft: BranchDraft) => string | null>(() => null)
    render(<WorkflowBranchDialog roles={roles} onAdd={add} onClose={vi.fn()} />)
    nameBranch()
    fireEvent.click(food())
    fireEvent.click(speaker())
    fireEvent.click(food())
    expect((food() as HTMLInputElement).checked).toBe(false)
    expect((speaker() as HTMLInputElement).checked).toBe(true)
    expect(screen.getByRole("status").textContent).toBe("1 selected item must be checked.")
    fireEvent.click(screen.getByRole("button", { name: "Add branch" }))
    expect(add).toHaveBeenLastCalledWith(expect.objectContaining({ conditions: ["speaker"] }))
  })

  it("clears all requirements to the explicit every-event selection", () => {
    const add = vi.fn<(draft: BranchDraft) => string | null>(() => null)
    render(<WorkflowBranchDialog roles={roles} onAdd={add} onClose={vi.fn()} />)
    nameBranch()
    fireEvent.click(food())
    fireEvent.click(speaker())
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }))
    expect(screen.getAllByRole("checkbox").every(input => !(input as HTMLInputElement).checked)).toBe(true)
    expect(screen.getByRole("status").textContent).toBe("Every event")
    fireEvent.click(screen.getByRole("button", { name: "Add branch" }))
    expect(add).toHaveBeenLastCalledWith(expect.objectContaining({ conditions: [] }))
  })

  it("keeps the full checklist draft after a rejected creation so it can be retried", () => {
    const close = vi.fn(), add = vi.fn<(draft: BranchDraft) => string | null>(() => "That branch could not be saved.")
    render(<WorkflowBranchDialog roles={roles} onAdd={add} onClose={close} />)
    nameBranch()
    fireEvent.click(food())
    fireEvent.click(speaker())
    fireEvent.click(screen.getByRole("button", { name: "Add branch" }))
    expect(screen.getByRole("alert").textContent).toContain("could not be saved")
    expect((screen.getByLabelText("Branch name") as HTMLInputElement).value).toBe(" Guest support ")
    expect((food() as HTMLInputElement).checked).toBe(true)
    expect((speaker() as HTMLInputElement).checked).toBe(true)
    expect(close).not.toHaveBeenCalled()
    add.mockReturnValueOnce(null)
    fireEvent.click(screen.getByRole("button", { name: "Add branch" }))
    expect(add).toHaveBeenCalledTimes(2)
    expect(add).toHaveBeenLastCalledWith(expect.objectContaining({ conditions: ["food", "speaker"] }))
  })

  it("cancels without creating branch metadata", () => {
    const add = vi.fn(), close = vi.fn()
    render(<WorkflowBranchDialog roles={roles} onAdd={add} onClose={close} />)
    nameBranch()
    fireEvent.click(speaker())
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(close).toHaveBeenCalledOnce()
    expect(add).not.toHaveBeenCalled()
  })

  it("keeps keyboard focus and selections when only the close callback changes, then uses its latest callback", () => {
    const oldClose = vi.fn(), nextClose = vi.fn()
    const view = render(<WorkflowBranchDialog roles={roles} onAdd={() => null} onClose={oldClose} />)
    fireEvent.click(speaker())
    speaker().focus()
    const focused = document.activeElement
    view.rerender(<WorkflowBranchDialog roles={roles} onAdd={() => null} onClose={nextClose} />)
    expect(document.activeElement).toBe(focused)
    expect((speaker() as HTMLInputElement).checked).toBe(true)
    fireEvent.keyDown(speaker(), { key: "Escape" })
    expect(nextClose).toHaveBeenCalledOnce()
    expect(oldClose).not.toHaveBeenCalled()
  })

  it("never offers the advisor as the task default", () => {
    render(<WorkflowBranchDialog roles={[...roles, { id: "advisor", displayName: "Faculty advisor", fn: "advisor", holderId: null, reportsToId: null }]} onAdd={() => null} onClose={vi.fn()} />)
    expect(screen.queryByRole("option", { name: "Faculty advisor" })).toBeNull()
  })
})
