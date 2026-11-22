import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { DemoState } from "../../data/types"
import { seedDemo } from "../../data/seed"
import { WorkflowTeams } from "./WorkflowTeams"

let state: DemoState
const tryDispatch = vi.fn(() => true)
vi.mock("../../data/store", () => ({ useStore: () => ({ state, tryDispatch }) }))
const fixture = (): DemoState => {
  const saved = seedDemo(undefined, "v2")
  return { ...saved, org: { ...saved.org, workflowTeams: [{ id: "operations", name: "Operations" }, { id: "finance", name: "Finance" }], workflowRoleTeams: {} } }
}
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe("team editor and canvas changes", () => {
  it("saves an unchanged source after editing a team name", () => {
    state = fixture()
    const close = vi.fn()
    render(<WorkflowTeams onClose={close} />)
    const first = state.org.workflowTeams![0]
    fireEvent.change(screen.getByLabelText(`Team name: ${first.name}`), { target: { value: "Renamed team" } })
    fireEvent.click(screen.getByRole("button", { name: "Save teams" }))
    expect(tryDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "saveWorkflowTeams", teams: expect.arrayContaining([expect.objectContaining({ id: first.id, name: "Renamed team" })]) }))
    expect(close).toHaveBeenCalledOnce()
  })

  it.each(["new branch", "renamed team"])("keeps canvas %s and local unsaved edits instead of overwriting a stale source", change => {
    state = fixture()
    const close = vi.fn(), first = state.org.workflowTeams![0]
    const rendered = render(<WorkflowTeams onClose={close} />)
    fireEvent.change(screen.getByLabelText(`Team name: ${first.name}`), { target: { value: "My unsaved name" } })
    state = { ...state, org: { ...state.org, workflowTeams: change === "new branch" ? [...state.org.workflowTeams!, { id: "new-team", name: "New team" }] : state.org.workflowTeams!.map(team => team.id === first.id ? { ...team, name: "Canvas name" } : team) } }
    rendered.rerender(<WorkflowTeams onClose={close} />)
    fireEvent.click(screen.getByRole("button", { name: "Save teams" }))
    expect(tryDispatch).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByRole("alert").textContent).toContain("Teams changed on the canvas")
    expect(screen.getByDisplayValue("My unsaved name")).toBeTruthy()
    expect(change === "new branch" ? state.org.workflowTeams!.some(team => team.id === "new-team") : state.org.workflowTeams![0].name === "Canvas name").toBe(true)
  })
})
