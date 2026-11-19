import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import type { DemoState } from "../../data/types"
import { seedDemo } from "../../data/seed"
import { reducer } from "../../data/store"
import { ensureWorkflowPresetTeams } from "../../data/workflowTeamDefaults"
import { RolesTeams } from "./RolesTeams"

let state: DemoState
// The fake store applies the real reducer, so the component sees what it saved.
const tryDispatch = vi.fn((action: Parameters<typeof reducer>[1]) => { const next = reducer(state, action); if (next === state) return false; state = next; return true })
vi.mock("../../data/store", async importOriginal => ({ ...(await importOriginal<typeof import("../../data/store")>()), useStore: () => ({ state, tryDispatch }) }))
vi.mock("../rail/RailContext", () => ({ useRail: () => ({ tab: "details", setOpen: vi.fn() }) }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

const view = () => {
  state = ensureWorkflowPresetTeams(seedDemo(undefined, "v2"))
  const onChange = vi.fn()
  const utils = render(<RolesTeams roles={state.roles} people={state.people} onChange={onChange} status={null} />)
  return { ...utils, onChange, rerender: () => utils.rerender(<RolesTeams roles={state.roles} people={state.people} onChange={onChange} status={null} />) }
}
const inspector = () => screen.getByTestId("roles-inspector")

describe("Roles & teams", () => {
  it("opens on the president and shows the four preset team areas with their step counts", () => {
    view()
    expect(within(inspector()).getByRole("heading", { level: 2 }).textContent).toBe("President")
    expect(screen.getByRole("button", { name: "President, Alex Rivera" }).getAttribute("aria-pressed")).toBe("true")
    for (const name of ["Club leadership · 1 step", "Operations · 25 steps", "Marketing · 8 steps", "Finance · 12 steps"]) expect(screen.getByRole("button", { name: `${name}, edit team` })).toBeTruthy()
  })

  it("moves a role to another team at once, and Undo puts it back", () => {
    const { rerender } = view()
    fireEvent.click(screen.getByRole("button", { name: "Secretary, Priya Nair" }))
    const team = within(inspector()).getByLabelText("Team") as HTMLSelectElement
    expect(team.selectedOptions[0].textContent).toBe("Operations")
    fireEvent.change(team, { target: { value: "workflow-marketing" } })
    expect(tryDispatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: "saveWorkflowTeams", teams: state.org.workflowTeams, roleTeams: expect.objectContaining({ "r-sec": "workflow-marketing" }) }))
    rerender()
    expect(screen.getByTestId("team-save-status").textContent).toContain("Team saved for Secretary.")
    expect(screen.getByText("Secretary, reports to President, Marketing")).toBeTruthy()
    fireEvent.click(within(screen.getByTestId("team-save-status")).getByRole("button", { name: "Undo" }))
    expect(state.org.workflowRoleTeams!["r-sec"]).toBe("workflow-operations")
  })

  it("edits role fields through the ClubSettings draft", () => {
    const { onChange } = view()
    fireEvent.click(screen.getByRole("button", { name: "Treasurer, Maya Chen" }))
    fireEvent.change(within(inspector()).getByLabelText("ASU ID"), { target: { value: "99a99" } })
    expect(onChange.mock.lastCall![1].find((p: { id: string }) => p.id === "maya").asuId).toBe("9999")
    fireEvent.change(within(inspector()).getByLabelText("Duties"), { target: { value: "Keeps the books." } })
    expect(onChange.mock.lastCall![0].find((r: { id: string }) => r.id === "r-fin").duties).toBe("Keeps the books.")
    fireEvent.keyDown(inspector(), { key: "Escape" })
    expect(within(inspector()).getByRole("heading", { level: 2 }).textContent).toBe("President")
  })

  it("adds, renames and deletes a team; a used team cannot be deleted", () => {
    const { rerender } = view()
    fireEvent.click(screen.getByRole("button", { name: "Finance · 12 steps, edit team" }))
    expect((within(inspector()).getByRole("button", { name: "Delete team" }) as HTMLButtonElement).disabled).toBe(true)
    expect(inspector().textContent).toContain("Roles are in this team.")
    fireEvent.click(screen.getByRole("button", { name: "+ Team" }))
    rerender()
    expect(state.org.workflowTeams!.at(-1)!.name).toBe("New team")
    const name = within(inspector()).getByLabelText("Team name")
    fireEvent.focus(name)
    fireEvent.change(name, { target: { value: "Finance" } })
    expect(screen.getByRole("alert").textContent).toBe("Another team has this name.")
    fireEvent.change(name, { target: { value: "Outreach" } })
    rerender()
    expect(state.org.workflowTeams!.at(-1)!.name).toBe("Outreach")
    fireEvent.click(within(inspector()).getByRole("button", { name: "Delete team" }))
    rerender()
    expect(state.org.workflowTeams!.map(t => t.name)).toEqual(["Club leadership", "Operations", "Marketing", "Finance"])
    expect(within(inspector()).getByRole("heading", { level: 2 }).textContent).toBe("President")
  })

  it("shows the contact list with a Team column", () => {
    view()
    fireEvent.click(screen.getByRole("button", { name: "Contact list" }))
    expect(screen.queryByTestId("roles-inspector")).toBeNull()
    expect(screen.getByRole("columnheader", { name: "Team" })).toBeTruthy()
    expect(screen.getByRole("row", { name: /Secretary/ }).textContent).toContain("Operations")
  })
})
