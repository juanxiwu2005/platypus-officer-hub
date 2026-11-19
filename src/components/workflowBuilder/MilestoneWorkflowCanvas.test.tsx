import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { MilestoneWorkflowCanvas } from "./MilestoneWorkflowCanvas"
import { buildMilestoneLayout } from "./milestoneLayout"

const task = (key: string, title: string): StepTemplate => ({ key, title, fn: "programs", phase: "prepare", estDays: 1, tier: "light", dependsOn: [], why: "Saved details", source: "Fictional test" })
const steps = [task("A", "Prepare event materials"), task("B", "Send thank you"), task("check", "Full check")]
const graph = (): WorkflowMilestoneGraph => ({ version: 1, start: { title: "Start here", details: "Entry" }, done: { title: "Wrap up", details: "Finish" }, eventDays: [{ id: "__event__", title: "Show day", offsetDays: 0, details: "Main day" }], spine: ["__start__", "check", "__event__", "__end__"], teamBranches: [{ id: "prepare", teamId: "ops", fromId: "__start__", toId: "check", stepIds: ["A"] }, { id: "after", teamId: "ops", fromId: "__event__", toId: "__end__", stepIds: ["B"] }, { id: "empty", teamId: "finance", fromId: "__start__", toId: "check", stepIds: [] }], taskAnchors: {} })
const props = () => ({ steps, graph: graph(), teams: [{ id: "ops", name: "Operations" }, { id: "finance", name: "Finance" }], eventDate: "2027-05-14", selected: null, onSelect: vi.fn(), onMove: vi.fn(), onAddTask: vi.fn(), onBranchTeamChange: vi.fn() })
afterEach(cleanup)

describe("editable milestone workflow canvas", () => {
  it("makes both endpoints, the day, shared check and branch tasks native selectable buttons", () => {
    const value = props()
    render(<MilestoneWorkflowCanvas {...value} />)
    for (const [testId, id] of [["workflow-start", "__start__"], ["workflow-done", "__end__"], ["workflow-event-day-1", "__event__"], ["workflow-task-check", "check"], ["workflow-task-A", "A"], ["workflow-task-B", "B"]]) {
      const button = screen.getByTestId(testId)
      expect(button.tagName).toBe("BUTTON")
      fireEvent.click(button, { detail: 0 })
      expect(value.onSelect).toHaveBeenLastCalledWith(id)
    }
    expect(screen.getByRole("button", { name: "Edit Full check" })).toBeTruthy()
  })

  it("keeps a shared check's long title accessible without letting it cover the main-line dot", () => {
    const value = props()
    render(<MilestoneWorkflowCanvas {...value} steps={steps.map(step => step.key === "check" ? { ...step, title: "Full check alert the team about changes" } : step)} />)
    const shared = screen.getByRole("button", { name: "Edit Full check alert the team about changes" })
    expect(shared.textContent).toBe("Full check")
  })

  it("selects a branch inspector and changes its team using only existing native options", () => {
    const value = props()
    render(<MilestoneWorkflowCanvas {...value} />)
    fireEvent.click(screen.getByRole("button", { name: "Edit branch prepare" }))
    expect(value.onSelect).toHaveBeenLastCalledWith("branch:prepare")
    fireEvent.change(screen.getByLabelText("Team for prepare"), { target: { value: "finance" } })
    expect(value.onBranchTeamChange).toHaveBeenCalledWith("prepare", "finance")
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByRole("button", { name: /Rename/ })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Add task to branch empty" }))
    expect(value.onAddTask).toHaveBeenCalledWith("empty")
  })

  it("shows one or two fixed dates from the engine regardless of changes to task estimates", () => {
    const value = props()
    value.graph.eventDays.push({ id: "__event2__", title: "Workshop", offsetDays: 2, details: "Second session" })
    value.graph.spine.splice(3, 0, "__event2__")
    const { rerender } = render(<MilestoneWorkflowCanvas {...value} />)
    expect(screen.getByTestId("workflow-event-day-1").textContent).toContain("May 14")
    expect(screen.getByTestId("workflow-event-day-2").textContent).toContain("May 16")
    fireEvent.click(screen.getByRole("button", { name: "Edit Workshop" }))
    expect(value.onSelect).toHaveBeenLastCalledWith("__event2__")
    rerender(<MilestoneWorkflowCanvas {...value} steps={steps.map(step => ({ ...step, estDays: 20 }))} />)
    expect(screen.getByTestId("workflow-event-day-1").textContent).toContain("May 14")
    expect(screen.getByTestId("workflow-event-day-2").textContent).toContain("May 16")
    expect(screen.queryByTestId("workflow-event-day-3")).toBeNull()
  })

  it("drags a task vertically into an empty branch and suppresses the incidental click", () => {
    const value = props(), layout = buildMilestoneLayout(steps, value.graph), point = layout.points.find(point => point.step.key === "A")!, empty = layout.segments.find(segment => segment.branch.id === "empty")!
    render(<MilestoneWorkflowCanvas {...value} />)
    const button = screen.getByTestId("workflow-task-A"), target = { x: empty.x + empty.width / 2, y: empty.y + 70 }
    fireEvent.pointerDown(button, { pointerId: 1, button: 0, clientX: point.x, clientY: point.y })
    fireEvent.pointerMove(button, { pointerId: 1, clientX: target.x, clientY: target.y })
    expect(screen.getByTestId("workflow-segment-empty").className).toContain("is-drop-target")
    fireEvent.pointerUp(button, { pointerId: 1, clientX: target.x, clientY: target.y })
    expect(value.onMove).toHaveBeenCalledWith("A", "empty", undefined, undefined)
    fireEvent.click(button, { detail: 1 })
    expect(value.onSelect).not.toHaveBeenCalled()
  })

  it("uses inverse zoom for touch dragging and allows returning to the fit view", () => {
    const value = props(), layout = buildMilestoneLayout(steps, value.graph), point = layout.points.find(point => point.step.key === "A")!, empty = layout.segments.find(segment => segment.branch.id === "empty")!
    render(<MilestoneWorkflowCanvas {...value} />)
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))
    const scale = 1.15, button = screen.getByTestId("workflow-task-A"), target = { x: (empty.x + empty.width / 2) * scale, y: (empty.y + 70) * scale }
    fireEvent.pointerDown(button, { pointerId: 4, pointerType: "touch", button: 0, clientX: point.x * scale, clientY: point.y * scale })
    fireEvent.pointerMove(button, { pointerId: 4, pointerType: "touch", clientX: target.x, clientY: target.y })
    fireEvent.pointerUp(button, { pointerId: 4, pointerType: "touch", clientX: target.x, clientY: target.y })
    expect(value.onMove).toHaveBeenCalledWith("A", "empty", undefined, undefined)
    fireEvent.click(screen.getByRole("button", { name: "Fit" }))
    expect(screen.getByRole("status").textContent).toBe("100%")
  })

  it("cancels Escape and outside drops without changing the selected node", () => {
    const value = props(), layout = buildMilestoneLayout(steps, value.graph), point = layout.points[0]
    render(<MilestoneWorkflowCanvas {...value} />)
    const button = screen.getByTestId("workflow-task-A")
    fireEvent.pointerDown(button, { pointerId: 2, button: 0, clientX: point.x, clientY: point.y })
    fireEvent.pointerMove(button, { pointerId: 2, clientX: point.x + 20, clientY: point.y + 40 })
    fireEvent.keyDown(window, { key: "Escape" })
    fireEvent.pointerUp(button, { pointerId: 2, clientX: point.x + 20, clientY: point.y + 40 })
    fireEvent.pointerDown(button, { pointerId: 3, button: 0, clientX: point.x, clientY: point.y })
    fireEvent.pointerMove(button, { pointerId: 3, clientX: -20, clientY: -20 })
    fireEvent.pointerUp(button, { pointerId: 3, clientX: -20, clientY: -20 })
    expect(value.onMove).not.toHaveBeenCalled()
    expect(value.onSelect).not.toHaveBeenCalled()
  })

  it("keeps an unresolved task available as a Details button rather than hiding it", () => {
    const value = props(); value.graph.teamBranches[0].stepIds = []
    render(<MilestoneWorkflowCanvas {...value} />)
    fireEvent.click(screen.getByTestId("workflow-task-A"))
    expect(value.onSelect).toHaveBeenCalledWith("A")
  })
})
