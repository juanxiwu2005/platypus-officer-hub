import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { TimelineTask } from "./TimelineTask"
import { taskShortTitle } from "./taskLabel"
import type { TaskBox } from "./timeline"

const box: TaskBox = { step: { key: "alcohol", title: "Alcohol permit submission", fn: "programs", phase: "prepare", estDays: 4, tier: "medium", dependsOn: ["previous"], why: "Instructions", source: "School", ruleIds: ["R06"], anchor: { kind: "rule", days: 14, unit: "calendar", ruleId: "R06" } }, x: 184, y: 62, width: 132, height: 52, start: -21, finish: -14, col: 0, teamId: "ops" }
afterEach(cleanup)

describe("compact task card", () => {
  it("shows only a continuous two-word title and one target label", () => {
    render(<TimelineTask box={box} selected={false} connecting={false} onSelect={() => {}} onReorder={() => {}} />)
    expect(screen.getByTestId("task-title").textContent).toBe("Alcohol permit")
    expect(screen.getByTestId("task-date").textContent).toBe("T-14")
    expect(screen.getByTestId("workflow-task-alcohol").textContent).toBe("Alcohol permitT-14")
    expect(screen.getByRole("button", { name: "Edit Alcohol permit submission" })).toBeTruthy()
    expect(taskShortTitle("  Confirm   the pickup point ")).toBe("Confirm the")
    expect(taskShortTitle("")).toBe("Untitled task")
  })

  it("uses an empty date marker when the calendar cannot support the preview", () => {
    render(<TimelineTask box={{ ...box, dateUnavailable: true, finish: -16941 }} selected={false} connecting={false} onSelect={() => {}} onReorder={() => {}} />)
    expect(screen.getByTestId("task-date").textContent).toBe("—")
    expect(screen.queryByText("T-16941")).toBeNull()
  })

  it("reports the dropped canvas center for reordering even for a school task, without changing its date", () => {
    const onReorder = vi.fn(), onSelect = vi.fn()
    render(<TimelineTask box={box} selected={false} connecting={false} onSelect={onSelect} onReorder={onReorder} />)
    const card = screen.getByTestId("workflow-task-alcohol")
    const before = structuredClone(box)
    fireEvent.pointerDown(card, { pointerId: 1, button: 0, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 356, clientY: 102 })
    expect(screen.getByTestId("task-date").textContent).toBe("T-14")
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 356, clientY: 102 })
    expect(onReorder).toHaveBeenCalledWith(184 + 66 + 156)
    expect(onSelect).not.toHaveBeenCalled()
    expect(box).toEqual(before)
  })

  it("keeps small pointer motion as a click and ignores vertical scrolling as a reorder", () => {
    const onReorder = vi.fn(), onSelect = vi.fn()
    render(<TimelineTask box={box} selected={false} connecting={false} onSelect={onSelect} onReorder={onReorder} />)
    const card = screen.getByTestId("workflow-task-alcohol")
    fireEvent.pointerDown(card, { pointerId: 1, button: 0, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 203, clientY: 102 })
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 203, clientY: 102 })
    fireEvent.click(card, { detail: 1 })
    expect(onSelect).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(card, { pointerId: 2, button: 0, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(card, { pointerId: 2, clientX: 204, clientY: 140 })
    fireEvent.pointerCancel(card)
    expect(onReorder).not.toHaveBeenCalled()
  })
})
