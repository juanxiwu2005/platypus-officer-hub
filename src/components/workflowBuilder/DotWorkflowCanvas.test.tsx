import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { StepTemplate } from "../../data/types"
import { DotWorkflowCanvas } from "./DotWorkflowCanvas"
import { buildDotLayout } from "./dotLayout"

const teams = [{ id: "operations", name: "Operations" }, { id: "marketing", name: "Marketing" }]
const task = (key: string, title = `Task ${key}`, dependsOn: string[] = []): StepTemplate => ({ key, title, fn: "programs", phase: "prepare", estDays: 2, tier: "medium", dependsOn, why: "Saved instructions", source: "Fictional test" })
const steps = [task("A", "Event plan requirements"), task("B", "Event plan requirements", ["A"])]
const stepTeams = { A: "operations", B: "operations" }
const props = () => ({ steps, stepTeams, teams, selected: null, connecting: false, onSelect: vi.fn(), onMove: vi.fn(), onAddTask: vi.fn() })
afterEach(cleanup)

describe("team dot editor canvas", () => {
  it("always renders the virtual endpoints and a grey main line without manufacturing tasks", () => {
    render(<DotWorkflowCanvas {...props()} steps={[]} stepTeams={{}} teams={[]} />)
    expect(screen.getByTestId("workflow-start").textContent).toBe("Start")
    expect(screen.getByTestId("workflow-done").textContent).toBe("Done")
    expect(screen.getByTestId("workflow-main-track").getAttribute("d")).toContain("H")
    expect(screen.queryAllByTestId(/^workflow-task-/)).toHaveLength(0)
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull()
  })

  it("keeps duplicate task names as separate accessible stations and displays only short labels", () => {
    render(<DotWorkflowCanvas {...props()} />)
    expect(screen.getAllByRole("button", { name: "Edit Event plan requirements" })).toHaveLength(2)
    expect(screen.getAllByTestId("task-title").map(element => element.textContent)).toEqual(["Event plan", "Event plan"])
    expect(screen.getAllByTestId(/^workflow-team-(operations|marketing)$/)).toHaveLength(2)
    expect(screen.getAllByTestId("workflow-dependency")).toHaveLength(1)
  })

  it("adds to the chosen empty branch and selects nodes with keyboard-compatible clicks", () => {
    const value = props()
    render(<DotWorkflowCanvas {...value} />)
    fireEvent.click(screen.getByRole("button", { name: "Add task to Marketing" }))
    expect(value.onAddTask).toHaveBeenCalledWith("marketing")
    fireEvent.click(screen.getByTestId("workflow-task-A"), { detail: 0 })
    expect(value.onSelect).toHaveBeenCalledWith("A")
  })

  it("supports vertical pointer movement to an empty team and suppresses the drag's follow-up click", () => {
    const value = props(), graph = buildDotLayout(steps, stepTeams, teams), point = graph.points[0], target = graph.lanes[1]
    render(<DotWorkflowCanvas {...value} />)
    const button = screen.getByTestId("workflow-task-A")
    fireEvent.pointerDown(button, { pointerId: 1, button: 0, clientX: point.x, clientY: point.y })
    fireEvent.pointerMove(button, { pointerId: 1, clientX: point.x + 6, clientY: target.top + 60 })
    expect(screen.getByTestId("workflow-team-marketing").className).toContain("is-drop-target")
    fireEvent.pointerUp(button, { pointerId: 1, clientX: point.x + 6, clientY: target.top + 60 })
    expect(value.onMove).toHaveBeenCalledWith("A", "marketing", undefined, undefined)
    fireEvent.click(button, { detail: 1 })
    expect(value.onSelect).not.toHaveBeenCalled()
  })

  it("uses inverse zoom coordinates for a touch-style cross-team drag", () => {
    const value = props(), graph = buildDotLayout(steps, stepTeams, teams), point = graph.points[0], target = graph.lanes[1]
    render(<DotWorkflowCanvas {...value} />)
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))
    const button = screen.getByTestId("workflow-task-A"), scale = 1.15
    fireEvent.pointerDown(button, { pointerId: 3, pointerType: "touch", button: 0, clientX: point.x * scale, clientY: point.y * scale })
    fireEvent.pointerMove(button, { pointerId: 3, pointerType: "touch", clientX: (point.x + 15) * scale, clientY: (target.top + 60) * scale })
    fireEvent.pointerUp(button, { pointerId: 3, pointerType: "touch", clientX: (point.x + 15) * scale, clientY: (target.top + 60) * scale })
    expect(value.onMove).toHaveBeenCalledWith("A", "marketing", undefined, undefined)
  })

  it("keeps small motion as a click and rejects Escape, pointer cancellation and out-of-bounds drops", () => {
    const value = props()
    render(<DotWorkflowCanvas {...value} />)
    const button = screen.getByTestId("workflow-task-A")
    fireEvent.pointerDown(button, { pointerId: 1, button: 0, clientX: 140, clientY: 146 })
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 142, clientY: 148 })
    fireEvent.pointerUp(button, { pointerId: 1, clientX: 142, clientY: 148 })
    fireEvent.click(button, { detail: 1 })
    expect(value.onSelect).toHaveBeenCalledOnce()
    fireEvent.pointerDown(button, { pointerId: 2, button: 0, clientX: 140, clientY: 146 })
    fireEvent.pointerMove(button, { pointerId: 2, clientX: 240, clientY: 220 })
    fireEvent.keyDown(window, { key: "Escape" })
    fireEvent.pointerUp(button, { pointerId: 2, clientX: 240, clientY: 220 })
    fireEvent.pointerDown(button, { pointerId: 3, button: 0, clientX: 140, clientY: 146 })
    fireEvent.pointerMove(button, { pointerId: 3, clientX: 240, clientY: 220 })
    fireEvent.pointerCancel(button)
    fireEvent.pointerUp(button, { pointerId: 3, clientX: 240, clientY: 220 })
    fireEvent.pointerDown(button, { pointerId: 4, button: 0, clientX: 140, clientY: 146 })
    fireEvent.pointerMove(button, { pointerId: 4, clientX: 15, clientY: 220 })
    fireEvent.pointerUp(button, { pointerId: 4, clientX: 15, clientY: 220 })
    expect(value.onMove).not.toHaveBeenCalled()
  })

  it("keeps a failed team rename visible and only closes after the parent confirms saving", () => {
    const rename = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<DotWorkflowCanvas {...props()} onRenameTeam={rename} />)
    fireEvent.click(screen.getByRole("button", { name: "Rename Operations" }))
    fireEvent.change(screen.getByLabelText("Team name"), { target: { value: "Studio" } })
    fireEvent.click(screen.getByRole("button", { name: "Save name" }))
    expect(screen.getByRole("alert").textContent).toContain("Could not rename")
    expect(screen.getByLabelText("Team name")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Save name" }))
    expect(rename).toHaveBeenCalledWith("operations", "Studio")
    expect(screen.queryByLabelText("Team name")).toBeNull()
  })

  it("can show all prerequisites and highlights only the selected node's relevant connections", () => {
    render(<DotWorkflowCanvas {...props()} selected="B" />)
    expect(screen.getByTestId("workflow-dependency").getAttribute("class")).toContain("is-related")
    fireEvent.click(screen.getByLabelText("Show all prerequisites"))
    expect(screen.getByTestId("workflow-dependency").getAttribute("class")).toContain("is-shown")
  })
})
