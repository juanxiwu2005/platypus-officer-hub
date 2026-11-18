import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { seedDemo } from "../../data/seed"
import { WorkflowBranchDialog } from "./WorkflowBranchDialog"

afterEach(cleanup)
const roles = seedDemo(undefined, "v2").roles

describe("new workflow branch dialog", () => {
  it("creates one complete request with an explicit scope and first task", () => {
    const add = vi.fn(() => null)
    render(<WorkflowBranchDialog roles={roles} onAdd={add} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Branch name"), { target: { value: " Guest support " } })
    fireEvent.change(screen.getByLabelText("When"), { target: { value: "after_event" } })
    fireEvent.change(screen.getByLabelText("Applies to"), { target: { value: "externalGuest" } })
    fireEvent.change(screen.getByLabelText("First task"), { target: { value: " Save guest notes " } })
    fireEvent.click(screen.getByRole("button", { name: "Add branch", exact: true }))
    expect(add).toHaveBeenCalledOnce()
    expect(add).toHaveBeenCalledWith({ title: "Guest support", side: "after_event", condition: "externalGuest", defaultRoleId: "r-events", firstStepTitle: "Save guest notes" })
  })

  it("keeps a rejected draft visible so it can be corrected or retried", () => {
    const close = vi.fn()
    render(<WorkflowBranchDialog roles={roles} onAdd={() => "That branch could not be saved."} onClose={close} />)
    fireEvent.change(screen.getByLabelText("Branch name"), { target: { value: "Guest support" } })
    fireEvent.change(screen.getByLabelText("First task"), { target: { value: "Save guest notes" } })
    fireEvent.click(screen.getByRole("button", { name: "Add branch", exact: true }))
    expect(screen.getByRole("alert").textContent).toContain("could not be saved")
    expect((screen.getByLabelText("Branch name") as HTMLInputElement).value).toBe("Guest support")
    expect(close).not.toHaveBeenCalled()
  })

  it("cancels without creating branch metadata", () => {
    const add = vi.fn(), close = vi.fn()
    render(<WorkflowBranchDialog roles={roles} onAdd={add} onClose={close} />)
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(close).toHaveBeenCalledOnce()
    expect(add).not.toHaveBeenCalled()
  })

  it("supports Escape and never offers the advisor as the task default", () => {
    const close = vi.fn()
    render(<WorkflowBranchDialog roles={[...roles, { id: "advisor", displayName: "Faculty advisor", fn: "advisor", holderId: null, reportsToId: null }]} onAdd={() => null} onClose={close} />)
    expect(screen.queryByRole("option", { name: "Faculty advisor" })).toBeNull()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(close).toHaveBeenCalledOnce()
  })
})
