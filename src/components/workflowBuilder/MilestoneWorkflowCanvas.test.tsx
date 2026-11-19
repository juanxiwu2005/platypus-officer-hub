import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import type { StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { MilestoneWorkflowCanvas } from "./MilestoneWorkflowCanvas"
import { buildLaneLayout, laneDropSlots } from "./laneLayout"

const task = (key: string, title: string, phase: StepTemplate["phase"] = "prepare"): StepTemplate => ({ key, title, fn: "programs", phase, estDays: 1, tier: "light", dependsOn: [], why: "Saved details", source: "Fictional test" })
const steps = [task("A", "Prepare event materials", "plan"), task("B", "Send thank you", "close"), task("check", "Full check")]
const graph = (): WorkflowMilestoneGraph => ({ version: 1, start: { title: "Start here", details: "Entry" }, done: { title: "Wrap up", details: "Finish" }, eventDays: [{ id: "__event__", title: "Show day", offsetDays: 0, details: "Main day" }], spine: ["__start__", "check", "__event__", "__end__"], teamBranches: [{ id: "prepare", teamId: "ops", fromId: "__start__", toId: "check", stepIds: ["A"] }, { id: "after", teamId: "ops", fromId: "__event__", toId: "__end__", stepIds: ["B"] }, { id: "empty", teamId: "finance", fromId: "__start__", toId: "check", stepIds: [] }], taskAnchors: {} })
const props = () => ({ steps, graph: graph(), teams: [{ id: "ops", name: "Operations" }, { id: "finance", name: "Finance" }], eventDate: "2027-05-14", selected: null, selectMode: false, checked: new Set<string>() as ReadonlySet<string>, onSelect: vi.fn(), onToggleCheck: vi.fn(), onMove: vi.fn(), onAddTask: vi.fn() })
// jsdom reports no width, so the canvas measures its 1040px fallback and fits at 100%.
const layoutFor = (value: ReturnType<typeof props>) => buildLaneLayout(value.steps, value.graph, { availableWidth: 1036 })
afterEach(cleanup)
const zoomLevel = () => within(screen.getByRole("group", { name: "Canvas zoom" })).getByRole("status")

describe("editable lane workflow canvas", () => {
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
    expect(screen.getByTestId("workflow-main-track")).toBeTruthy()
    expect(screen.getAllByTestId("workflow-branch-track").map(track => track.getAttribute("data-branch-id"))).toEqual(["prepare", "after", "empty"])
  })

  it("shows full task titles with the whole title kept in the tooltip", () => {
    const value = props(), long = "Event Registry (SDC & Special Event)"
    render(<MilestoneWorkflowCanvas {...value} steps={steps.map(step => step.key === "A" ? { ...step, title: long } : step)} />)
    const button = screen.getByRole("button", { name: `Edit ${long}` })
    expect(button.textContent).toBe(long)
    expect(button.getAttribute("title")).toBe(long)
  })

  it("labels each lane with a team pill that opens the branch inspector and an add button", () => {
    const value = props()
    value.graph.teamBranches.push({ id: "orphan", teamId: "gone", fromId: "__event__", toId: "__end__", stepIds: [] })
    render(<MilestoneWorkflowCanvas {...value} />)
    const pill = screen.getByTestId("workflow-branch-pill-prepare")
    expect(pill.textContent).toBe("Operations · 1 step")
    expect(screen.getByTestId("workflow-branch-pill-empty").textContent).toBe("Finance · 0 steps")
    expect(screen.getByTestId("workflow-branch-pill-orphan").textContent).toBe("Choose team · 0 steps")
    expect(screen.getByTestId("workflow-segment-orphan").className).toContain("wfx-tone-none")
    expect(screen.getByTestId("workflow-segment-prepare").className).toContain("wfx-tone-0")
    expect(screen.getByTestId("workflow-segment-empty").className).toContain("wfx-tone-1")
    fireEvent.click(screen.getAllByRole("button", { name: /^Operations · .*, edit branch$/ })[0])
    expect(value.onSelect).toHaveBeenLastCalledWith("branch:prepare")
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
    const add = screen.getByRole("button", { name: "Add task to Finance branch" })
    expect(add.textContent).toBe("+")
    fireEvent.click(add)
    expect(value.onAddTask).toHaveBeenCalledWith("empty")
  })

  it("marks the selected lane and shows the phase header and legend", () => {
    const value = props()
    render(<MilestoneWorkflowCanvas {...value} selected="branch:empty" />)
    expect(screen.getByTestId("workflow-segment-empty").className).toContain("is-selected")
    expect(screen.getByTestId("workflow-branch-pill-empty").getAttribute("aria-pressed")).toBe("true")
    expect(["plan", "prepare", "event", "close"].map(id => screen.getByTestId(`workflow-phase-${id}`).textContent)).toEqual(["Plan", "Prepare", "Event day", "Close"])
    for (const text of ["Core step", "Required in all events", "Conditional step", "Used only when needed", "Team area", "Owned by an organization team", "Event day", "fixed date"]) expect(screen.getAllByText(text).length).toBeGreaterThan(0)
  })

  it("toggles task checks instead of opening Details in select mode", () => {
    const value = props()
    render(<MilestoneWorkflowCanvas {...value} selectMode checked={new Set(["A"])} />)
    const checkedTask = screen.getByRole("button", { name: "Select Prepare event materials" })
    expect(checkedTask.getAttribute("aria-pressed")).toBe("true")
    expect(checkedTask.className).toContain("is-checked")
    const other = screen.getByRole("button", { name: "Select Send thank you" })
    expect(other.getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(other, { detail: 0 })
    expect(value.onToggleCheck).toHaveBeenCalledWith("B")
    expect(value.onSelect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId("workflow-event-day-1"))
    expect(value.onSelect).toHaveBeenCalledWith("__event__")
  })

  it("shows one or two fixed dates from the engine regardless of changes to task estimates", () => {
    const value = props()
    value.graph.eventDays.push({ id: "__event2__", title: "Workshop", offsetDays: 2, details: "Second session" })
    value.graph.spine.splice(3, 0, "__event2__")
    const { rerender } = render(<MilestoneWorkflowCanvas {...value} />)
    expect(screen.getByTestId("workflow-event-day-1").textContent).toContain("May 14")
    expect(screen.getByTestId("workflow-event-day-2").textContent).toContain("May 16")
    expect(screen.getByTestId("workflow-phase-event").textContent).toBe("Event days")
    fireEvent.click(screen.getByRole("button", { name: "Edit Workshop" }))
    expect(value.onSelect).toHaveBeenLastCalledWith("__event2__")
    rerender(<MilestoneWorkflowCanvas {...value} steps={steps.map(step => ({ ...step, estDays: 20 }))} />)
    expect(screen.getByTestId("workflow-event-day-1").textContent).toContain("May 14")
    expect(screen.getByTestId("workflow-event-day-2").textContent).toContain("May 16")
    expect(screen.queryByTestId("workflow-event-day-3")).toBeNull()
  })

  it("drags a task vertically into an empty branch and suppresses the incidental click", () => {
    const value = props(), layout = layoutFor(value), point = layout.points.find(item => item.step.key === "A")!, empty = layout.lanes.find(lane => lane.branch.id === "empty")!
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
    const value = props(), layout = layoutFor(value), point = layout.points.find(item => item.step.key === "A")!, empty = layout.lanes.find(lane => lane.branch.id === "empty")!
    render(<MilestoneWorkflowCanvas {...value} />)
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))
    expect(zoomLevel().textContent).toBe("115%")
    const scale = 1.15, button = screen.getByTestId("workflow-task-A"), target = { x: (empty.x + empty.width / 2) * scale, y: (empty.y + 70) * scale }
    fireEvent.pointerDown(button, { pointerId: 4, pointerType: "touch", button: 0, clientX: point.x * scale, clientY: point.y * scale })
    fireEvent.pointerMove(button, { pointerId: 4, pointerType: "touch", clientX: target.x, clientY: target.y })
    fireEvent.pointerUp(button, { pointerId: 4, pointerType: "touch", clientX: target.x, clientY: target.y })
    expect(value.onMove).toHaveBeenCalledWith("A", "empty", undefined, undefined)
    fireEvent.click(screen.getByRole("button", { name: "Fit" }))
    expect(zoomLevel().textContent).toBe("100%")
    for (let index = 0; index < 8; index++) fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    expect(zoomLevel().textContent).toBe("50%")
    expect((screen.getByRole("button", { name: "Zoom out" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("cancels Escape and outside drops without changing the selected node", () => {
    const value = props(), layout = layoutFor(value), point = layout.points[0]
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

  it("shows every legal diamond while dragging, grows the nearest one and drops on the main line", () => {
    const value = props(), layout = layoutFor(value), point = layout.points.find(item => item.step.key === "A")!
    const main = laneDropSlots(layout, "A").find(slot => slot.branchId === "__main__" && slot.targetId === "__event__")!
    render(<MilestoneWorkflowCanvas {...value} />)
    expect(screen.queryAllByTestId("workflow-drop-slot")).toHaveLength(0)
    const button = screen.getByTestId("workflow-task-A")
    fireEvent.pointerDown(button, { pointerId: 5, button: 0, clientX: point.x, clientY: point.y })
    fireEvent.pointerMove(button, { pointerId: 5, clientX: main.x + 6, clientY: main.y - 6 })
    const diamonds = screen.getAllByTestId("workflow-drop-slot")
    expect(diamonds).toHaveLength(laneDropSlots(layout, "A").length)
    expect(diamonds.every(diamond => diamond.getAttribute("aria-hidden") === "true")).toBe(true)
    expect(new Set(diamonds.map(diamond => diamond.getAttribute("data-branch-id")))).toEqual(new Set(["__main__", "after", "empty"]))
    const near = diamonds.filter(diamond => diamond.className.includes("is-near"))
    expect(near).toHaveLength(1)
    expect(near[0].getAttribute("data-branch-id")).toBe("__main__")
    fireEvent.pointerUp(button, { pointerId: 5, clientX: main.x + 6, clientY: main.y - 6 })
    expect(value.onMove).toHaveBeenCalledWith("A", "__main__", "__event__", true)
    expect(screen.queryAllByTestId("workflow-drop-slot")).toHaveLength(0)
  })

  it("drags a main-line task into a lane but never an event day, Start or Done", () => {
    const value = props(), layout = layoutFor(value), check = layout.stations.find(item => item.id === "check")!, empty = layout.lanes.find(lane => lane.branch.id === "empty")!
    render(<MilestoneWorkflowCanvas {...value} />)
    const button = screen.getByTestId("workflow-task-check"), target = { x: empty.x + empty.width / 2, y: empty.y + 57 }
    fireEvent.pointerDown(button, { pointerId: 6, button: 0, clientX: check.x, clientY: check.y })
    fireEvent.pointerMove(button, { pointerId: 6, clientX: target.x, clientY: target.y })
    expect(button.className).toContain("is-dragging")
    expect(screen.getAllByTestId("workflow-drop-slot").filter(diamond => diamond.getAttribute("data-branch-id") === "__main__")).toHaveLength(layout.stations.length - 3)
    fireEvent.pointerUp(button, { pointerId: 6, clientX: target.x, clientY: target.y })
    expect(value.onMove).toHaveBeenCalledWith("check", "empty", undefined, undefined)
    fireEvent.click(button, { detail: 1 })
    expect(value.onSelect).not.toHaveBeenCalled()
    for (const id of ["workflow-event-day-1", "workflow-start", "workflow-done"]) {
      const station = screen.getByTestId(id), at = layout.stations.find(item => item.id === station.getAttribute("data-station-id"))!
      fireEvent.pointerDown(station, { pointerId: 7, button: 0, clientX: at.x, clientY: at.y })
      fireEvent.pointerMove(station, { pointerId: 7, clientX: target.x, clientY: target.y })
      expect(screen.queryAllByTestId("workflow-drop-slot")).toHaveLength(0)
      fireEvent.pointerUp(station, { pointerId: 7, clientX: target.x, clientY: target.y })
    }
    expect(value.onMove).toHaveBeenCalledTimes(1)
  })

  it("changes nothing when dropped away from a diamond and says so politely", () => {
    const value = props(), layout = layoutFor(value), point = layout.points.find(item => item.step.key === "A")!
    render(<MilestoneWorkflowCanvas {...value} />)
    const note = screen.getByTestId("workflow-drop-note"), button = screen.getByTestId("workflow-task-A")
    expect(note.getAttribute("role")).toBe("status")
    expect(note.textContent).toBe("")
    fireEvent.pointerDown(button, { pointerId: 8, button: 0, clientX: point.x, clientY: point.y })
    fireEvent.pointerMove(button, { pointerId: 8, clientX: layout.width - 4, clientY: layout.height - 4 })
    expect(screen.getAllByTestId("workflow-drop-slot").some(diamond => diamond.className.includes("is-near"))).toBe(false)
    fireEvent.pointerUp(button, { pointerId: 8, clientX: layout.width - 4, clientY: layout.height - 4 })
    expect(value.onMove).not.toHaveBeenCalled()
    expect(note.textContent).toBe("Dropped away from a diamond, so nothing changed. Drop a step on a diamond.")
    // The next drag clears the message.
    fireEvent.pointerDown(button, { pointerId: 9, button: 0, clientX: point.x, clientY: point.y })
    fireEvent.pointerMove(button, { pointerId: 9, clientX: point.x + 30, clientY: point.y + 30 })
    expect(note.textContent).toBe("")
  })

  it("keeps an unresolved task available as a Details button rather than hiding it", () => {
    const value = props(); value.graph.teamBranches[0].stepIds = []
    render(<MilestoneWorkflowCanvas {...value} />)
    expect(screen.getByTestId("workflow-branch-pill-prepare").textContent).toBe("Operations · 0 steps")
    fireEvent.click(screen.getByTestId("workflow-task-A"))
    expect(value.onSelect).toHaveBeenCalledWith("A")
  })
})
