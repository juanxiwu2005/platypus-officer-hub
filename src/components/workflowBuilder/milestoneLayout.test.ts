import { describe, expect, it } from "vitest"
import type { StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { buildMilestoneLayout, milestoneDropTarget, MILESTONE_TASKS_PER_TRACK } from "./milestoneLayout"

const task = (key: string): StepTemplate => ({ key, title: `Task ${key}`, fn: "programs", phase: "prepare", estDays: 1, tier: "light", dependsOn: [], why: "Saved details", source: "Fictional test" })
const graph = (twoDays = false): WorkflowMilestoneGraph => ({ version: 1, start: { title: "Start", details: "Entry" }, done: { title: "Done", details: "Finish" }, eventDays: [{ id: "__event__", title: "Show day", offsetDays: 0, details: "" }, ...(twoDays ? [{ id: "__event2__", title: "Workshop", offsetDays: 2, details: "" }] : [])], spine: ["__start__", "check", "__event__", ...(twoDays ? ["__event2__"] : []), "__end__"], teamBranches: [{ id: "prepare", teamId: "ops", fromId: "__start__", toId: "check", stepIds: ["A"] }, { id: "after", teamId: "ops", fromId: twoDays ? "__event2__" : "__event__", toId: "__end__", stepIds: ["B"] }], taskAnchors: {} })

describe("milestone and local-branch layout", () => {
  it("keeps boundaries, the real shared task and event day in main-line order", () => {
    const layout = buildMilestoneLayout([task("A"), task("B"), task("check")], graph())
    expect(layout.stations.map(station => station.id)).toEqual(["__start__", "check", "__event__", "__end__"])
    expect(layout.stations.map(station => station.kind)).toEqual(["endpoint", "task", "day", "endpoint"])
    expect(layout.stations.every(station => station.y === layout.mainY)).toBe(true)
    expect(layout.stations.every((station, index, all) => !index || station.x > all[index - 1].x)).toBe(true)
    expect(layout.unplaced).toEqual([])
  })

  it("spreads an empty new workflow across its main line instead of clustering the day beside Start", () => {
    const value = graph()
    value.spine = ["__start__", "__event__", "__end__"]
    value.teamBranches = []
    const layout = buildMilestoneLayout([], value)
    expect(layout.width).toBe(640)
    expect(layout.stations[1].x).toBe(320)
    expect(layout.stations[2].x).toBe(596)
  })

  it("allows the same team to own separate before, between-days and after segments", () => {
    const value = graph(true)
    value.teamBranches.push({ id: "between", teamId: "ops", fromId: "__event__", toId: "__event2__", stepIds: ["C"] })
    const layout = buildMilestoneLayout([task("A"), task("B"), task("C"), task("check")], value)
    expect(layout.segments.map(segment => segment.branch.id)).toEqual(["prepare", "after", "between"])
    expect(new Set(layout.segments.map(segment => segment.branch.teamId))).toEqual(new Set(["ops"]))
    const middle = layout.segments.find(segment => segment.branch.id === "between")!, firstDay = layout.stations.find(station => station.id === "__event__")!, secondDay = layout.stations.find(station => station.id === "__event2__")!
    expect(middle.x).toBeGreaterThan(firstDay.x)
    expect(middle.x + middle.width).toBeLessThan(secondDay.x)
    expect(middle.path.startsWith(`M${firstDay.x} ${layout.mainY}`)).toBe(true)
    expect(middle.path.endsWith(`${secondDay.x} ${layout.mainY}`)).toBe(true)
  })

  it("packs a dense branch locally while preserving every original task, field and independent station ID", () => {
    const tasks = [...Array.from({ length: 25 }, (_, i) => task(`task-${i}`)), task("B"), task("check")], value = graph()
    value.teamBranches[0].stepIds = tasks.slice(0, 25).map(step => step.key)
    const before = structuredClone(tasks), layout = buildMilestoneLayout(tasks, value), segment = layout.segments[0]
    expect(tasks).toEqual(before)
    expect(layout.width).toBeLessThan(1200)
    expect(segment.points).toHaveLength(25)
    expect(new Set(segment.points.map(point => `${point.x}:${point.y}`)).size).toBe(25)
    expect(new Set(segment.points.map(point => point.track)).size).toBe(Math.ceil(25 / MILESTONE_TASKS_PER_TRACK))
    expect(segment.points[0].step).toBe(tasks[0])
    for (const point of segment.points) {
      expect(point.x - 38).toBeGreaterThanOrEqual(segment.x)
      expect(point.x + 38).toBeLessThanOrEqual(segment.x + segment.width)
      expect(point.y + 48).toBeLessThan(segment.y + segment.height)
    }
  })

  it("keeps overlapping branch cards separate but reuses tracks for disjoint intervals", () => {
    const value = graph(true)
    value.teamBranches.push({ id: "second-prep", teamId: "finance", fromId: "__start__", toId: "check", stepIds: ["C"] }, { id: "cross-stage", teamId: "marketing", fromId: "check", toId: "__end__", stepIds: ["D"] })
    const layout = buildMilestoneLayout(["A", "B", "C", "D", "check"].map(task), value)
    for (const a of layout.segments) for (const b of layout.segments.filter(other => other.branch.id !== a.branch.id)) {
      const overlapsX = a.x < b.x + b.width && b.x < a.x + a.width
      const overlapsY = a.y < b.y + b.height && b.y < a.y + a.height
      expect(overlapsX && overlapsY).toBe(false)
    }
  })

  it("retains missing graph references as visible unresolved tasks instead of dropping them", () => {
    const value = graph(); value.teamBranches[0].stepIds = []
    const layout = buildMilestoneLayout([task("A"), task("B"), task("check")], value)
    expect(layout.unplaced.map(step => step.key)).toEqual(["A"])
    expect(layout.segments[0].points).toEqual([])
  })

  it("drops into an empty branch and rejects spine, margins and empty space between branch cards", () => {
    const value = graph(); value.teamBranches.push({ id: "empty", teamId: "finance", fromId: "__start__", toId: "check", stepIds: [] })
    const layout = buildMilestoneLayout([task("A"), task("B"), task("check")], value), empty = layout.segments.find(segment => segment.branch.id === "empty")!
    expect(milestoneDropTarget(layout, "A", empty.x + empty.width / 2, empty.y + empty.height / 2)).toEqual({ branchId: "empty" })
    expect(milestoneDropTarget(layout, "A", empty.x + empty.width / 2, layout.mainY)).toBeNull()
    expect(milestoneDropTarget(layout, "A", 0, empty.y + 20)).toBeNull()
    expect(milestoneDropTarget(layout, "A", layout.width + 1, empty.y + 20)).toBeNull()
  })
})
