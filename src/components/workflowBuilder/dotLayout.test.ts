import { describe, expect, it } from "vitest"
import type { StepTemplate } from "../../data/types"
import { buildDotLayout, DOTS_PER_TRACK, dotDropTarget } from "./dotLayout"

const teams = [{ id: "operations", name: "Operations" }, { id: "marketing", name: "Marketing" }]
const task = (key: string, dependsOn: string[] = []): StepTemplate => ({ key, title: `Task ${key}`, fn: "programs", phase: "prepare", estDays: 2, tier: "medium", dependsOn, why: "Saved requirement", source: "Fictional test", cond: "speaker", anchor: { kind: "target", days: 8, unit: "business", label: "Saved target" } })

describe("compact dot workflow geometry", () => {
  it("keeps Start and Done separate from an empty definition and includes empty teams", () => {
    const graph = buildDotLayout([], {}, teams)
    expect(graph.points).toEqual([])
    expect(graph.lanes.map(lane => lane.team.id)).toEqual(["operations", "marketing"])
    expect(graph.lanes.every(lane => lane.path.startsWith(`M${graph.start.x} ${graph.start.y}`) && lane.path.endsWith(`${graph.done.x} ${graph.done.y}`))).toBe(true)
    expect(buildDotLayout([], {}, []).lanes).toEqual([])
  })

  it("fits 25 same-team tasks in one bounded container with distinct dots and readable tracks", () => {
    const tasks = Array.from({ length: 25 }, (_, i) => task(`step-${i}`, i ? [`step-${i - 1}`] : []))
    const graph = buildDotLayout(tasks, Object.fromEntries(tasks.map(step => [step.key, "operations"])), teams)
    const lane = graph.lanes[0]
    expect(graph.width).toBeLessThanOrEqual(1100)
    expect(graph.lanes).toHaveLength(2)
    expect(lane.points).toHaveLength(25)
    expect(new Set(lane.points.map(point => `${point.x}:${point.y}`)).size).toBe(25)
    expect(new Set(lane.points.map(point => point.track)).size).toBe(Math.ceil(25 / DOTS_PER_TRACK))
    for (const point of lane.points) {
      expect(point.x).toBeGreaterThan(72)
      expect(point.x).toBeLessThan(graph.width - 72)
      expect(point.y - 20).toBeGreaterThan(lane.top)
      expect(point.y + 54).toBeLessThan(lane.top + lane.height)
      for (const other of lane.points.filter(other => other.step.key !== point.step.key)) expect(Math.hypot(point.x - other.x, point.y - other.y)).toBeGreaterThanOrEqual(92)
    }
  })

  it("uses exactly one container for each explicit team even when names match or no task belongs to it", () => {
    const directory = Array.from({ length: 7 }, (_, i) => ({ id: `team-${i}`, name: "Team" }))
    const graph = buildDotLayout([task("A")], { A: "team-2" }, directory)
    expect(graph.lanes.map(lane => lane.team.id)).toEqual(directory.map(team => team.id))
    expect(graph.lanes[2].points).toHaveLength(1)
    expect(graph.lanes.filter(lane => !lane.points.length)).toHaveLength(6)
  })

  it("retains the original task records and cross-team dependencies without expanding a global date axis", () => {
    const tasks = [task("A"), task("B", ["A"]), task("C", ["B"])]
    const before = structuredClone(tasks)
    const graph = buildDotLayout(tasks, { A: "operations", B: "marketing", C: "operations" }, teams)
    expect(tasks).toEqual(before)
    expect(graph.points.find(point => point.step.key === "A")?.step).toBe(tasks[0])
    expect(graph.links.map(link => [link.from, link.to])).toEqual([["A", "B"], ["B", "C"]])
    expect(graph.points.find(point => point.step.key === "B")?.x).toBe(graph.points.find(point => point.step.key === "A")?.x)
  })

  it("reports unmapped tasks without inventing another team or losing their records", () => {
    const tasks = [task("A"), task("B"), task("C")]
    const graph = buildDotLayout(tasks, { A: "operations", B: "deleted-team" }, teams)
    expect(graph.lanes).toHaveLength(2)
    expect(graph.unassigned.map(step => step.key)).toEqual(["B", "C"])
    expect(graph.points.map(point => point.step.key)).toEqual(["A"])
  })

  it("accepts the entire empty team card as a drop target and rejects gutters and outside positions", () => {
    const graph = buildDotLayout([task("A")], { A: "operations" }, teams), empty = graph.lanes[1]
    expect(dotDropTarget(graph, "A", graph.width / 2, empty.top + 5)).toEqual({ teamId: "marketing" })
    expect(dotDropTarget(graph, "A", 12, empty.top + 30)).toBeNull()
    expect(dotDropTarget(graph, "A", graph.width + 20, empty.top + 30)).toBeNull()
    expect(dotDropTarget(graph, "A", graph.width / 2, graph.lanes[0].top - 5)).toBeNull()
    expect(dotDropTarget(graph, "A", graph.width / 2, graph.lanes[0].top + graph.lanes[0].height + 5)).toBeNull()
  })

  it("finds nearby reorder targets on continued tracks and reverses before/after for a return track", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => task(`step-${i}`, i ? [`step-${i - 1}`] : []))
    const graph = buildDotLayout(tasks, Object.fromEntries(tasks.map(step => [step.key, "operations"])), teams)
    const point = graph.points.find(point => point.step.key === "step-8")!
    expect(dotDropTarget(graph, "step-0", point.x + 10, point.y)).toEqual({ teamId: "operations", targetId: "step-8", before: true })
    expect(dotDropTarget(graph, "step-0", point.x - 10, point.y)).toEqual({ teamId: "operations", targetId: "step-8", before: false })
  })
})
