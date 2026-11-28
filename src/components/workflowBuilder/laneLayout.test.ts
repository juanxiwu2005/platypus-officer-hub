import { describe, expect, it } from "vitest"
import type { Phase, StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { buildLaneLayout, laneDropSlots, laneDropTarget, nearestDropSlot, LANE_DOT_Y, LANE_HEIGHT, LANE_MAX, MAIN_LINE } from "./laneLayout"

const task = (key: string, phase: Phase = "prepare"): StepTemplate => ({ key, title: `Task ${key}`, fn: "programs", phase, estDays: 1, tier: "light", dependsOn: [], why: "Saved details", source: "Fictional test" })

/** Mirrors the standard preset's shape: shared checks before the day, a headcount after it, close branches to Done. */
function standardLike(pre = [7, 5, 6, 6, 8, 8], post = [3, 2, 4]) {
  const steps: StepTemplate[] = [task("finalcheck"), task("checkin"), task("headcount", "close")]
  const teamBranches: WorkflowMilestoneGraph["teamBranches"] = []
  pre.forEach((count, branch) => {
    const ids = Array.from({ length: count }, (_, index) => `p${branch}-${index}`)
    // The first branch opens with three planning steps, the second with one.
    ids.forEach((key, index) => steps.push(task(key, (branch === 0 && index < 3) || (branch === 1 && index === 0) ? "plan" : "prepare")))
    teamBranches.push({ id: `pre-${branch}`, teamId: `team-${branch}`, fromId: "__start__", toId: "finalcheck", stepIds: ids })
  })
  post.forEach((count, branch) => {
    const ids = Array.from({ length: count }, (_, index) => `c${branch}-${index}`)
    ids.forEach(key => steps.push(task(key, "close")))
    teamBranches.push({ id: `post-${branch}`, teamId: `team-${branch}`, fromId: "headcount", toId: "__end__", stepIds: ids })
  })
  const graph: WorkflowMilestoneGraph = { version: 1, start: { title: "Start", details: "" }, done: { title: "Done", details: "" }, eventDays: [{ id: "__event__", title: "Event day", offsetDays: 0, details: "" }], spine: ["__start__", "finalcheck", "checkin", "__event__", "headcount", "__end__"], teamBranches, taskAnchors: {} }
  return { steps, graph }
}

describe("one-row lane layout", () => {
  it("keeps every standard branch on one row, balanced above and below a centred main line", () => {
    const { steps, graph } = standardLike(), layout = buildLaneLayout(steps, graph)
    expect(layout.lanes).toHaveLength(9)
    for (const lane of layout.lanes) {
      expect(new Set(lane.points.map(point => point.y)).size).toBe(1)
      expect(lane.rows).toBe(1)
      expect(lane.points.map(point => point.step.key)).toEqual(lane.branch.stepIds)
      expect(lane.points.every((point, index, all) => !index || point.x > all[index - 1].x)).toBe(true)
      for (const point of lane.points) expect(point.x - 44).toBeGreaterThanOrEqual(lane.x)
      for (const point of lane.points) expect(point.x + 44).toBeLessThanOrEqual(lane.x + lane.width)
    }
    const extent = (side: "above" | "below") => {
      const lanes = layout.lanes.filter(lane => lane.side === side)
      return side === "above" ? layout.mainY - Math.min(...lanes.map(lane => lane.y)) : Math.max(...lanes.map(lane => lane.y + lane.height)) - layout.mainY
    }
    expect(layout.lanes.some(lane => lane.side === "above") && layout.lanes.some(lane => lane.side === "below")).toBe(true)
    expect(Math.abs(extent("above") - extent("below"))).toBeLessThanOrEqual(LANE_HEIGHT + 16 + 16)
    expect(layout.stations.map(station => station.id)).toEqual(graph.spine)
    expect(layout.stations.every(station => station.y === layout.mainY)).toBe(true)
    expect(layout.stations.every((station, index, all) => !index || station.x > all[index - 1].x)).toBe(true)
    expect(layout.unplaced).toEqual([])
  })

  it("never lets lane cards overlap and starts and ends each branch path on the main line", () => {
    const { steps, graph } = standardLike(), layout = buildLaneLayout(steps, graph)
    for (const a of layout.lanes) {
      const from = layout.stations.find(station => station.id === a.branch.fromId)!, to = layout.stations.find(station => station.id === a.branch.toId)!
      expect(a.path.startsWith(`M${from.x} ${layout.mainY} C`)).toBe(true)
      expect(a.path.endsWith(`${to.x} ${layout.mainY}`)).toBe(true)
      if (a.side === "above") expect(a.y + a.height).toBeLessThan(layout.mainY)
      else expect(a.y).toBeGreaterThan(layout.mainY)
      for (const b of layout.lanes.filter(other => other !== a)) {
        const overlapsX = a.x < b.x + b.width && b.x < a.x + a.width, overlapsY = a.y < b.y + b.height && b.y < a.y + a.height
        expect(overlapsX && overlapsY).toBe(false)
      }
    }
  })

  it("stretches the main line to fill a wider canvas and keeps its natural width otherwise", () => {
    const { steps, graph } = standardLike(), natural = buildLaneLayout(steps, graph)
    const wide = buildLaneLayout(steps, graph, { availableWidth: natural.width + 600 })
    expect(wide.width).toBe(natural.width + 600)
    expect(wide.stations.at(-1)!.x).toBeLessThan(wide.width)
    expect(wide.stations[1].x - wide.stations[0].x).toBeGreaterThan(natural.stations[1].x - natural.stations[0].x)
    expect(buildLaneLayout(steps, graph, { availableWidth: 300 }).width).toBe(natural.width)
  })

  it("has no phase strip: the main line starts just under the top padding (Juanxi 2026-11-28 removed Plan · Prepare · Event day · Close)", () => {
    const { steps, graph } = standardLike(), layout = buildLaneLayout(steps, graph)
    expect("phases" in layout).toBe(false)
    expect(Math.min(...layout.lanes.map(lane => lane.y))).toBeLessThan(40)
  })

  it("wraps only a branch longer than the row limit, onto a second row under the first", () => {
    const { steps, graph } = standardLike([11, 5], [2])
    const layout = buildLaneLayout(steps, graph), long = layout.lanes[0]
    expect(long.points).toHaveLength(11)
    expect(long.rows).toBe(2)
    expect(new Set(long.points.map(point => point.y)).size).toBe(2)
    expect(long.points.filter(point => point.row === 0)).toHaveLength(LANE_MAX)
    expect(long.points[LANE_MAX].y).toBeGreaterThan(long.points[0].y)
    expect(long.height).toBeGreaterThan(LANE_HEIGHT)
    expect(layout.lanes.slice(1).every(lane => lane.rows === 1)).toBe(true)
  })

  it("drops into empty and populated lanes and rejects the main line and outside space", () => {
    const { steps, graph } = standardLike([3], [2])
    graph.teamBranches.push({ id: "empty", teamId: "x", fromId: "__start__", toId: "finalcheck", stepIds: [] })
    const layout = buildLaneLayout(steps, graph), empty = layout.lanes.find(lane => lane.branch.id === "empty")!, full = layout.lanes[0]
    expect(laneDropTarget(layout, "c0-0", empty.x + empty.width / 2, empty.y + empty.height / 2)).toEqual({ branchId: "empty" })
    const [first, second] = full.points
    expect(laneDropTarget(layout, "c0-0", first.x - 10, first.y)).toEqual({ branchId: full.branch.id, targetId: first.step.key, before: true })
    expect(laneDropTarget(layout, "c0-0", second.x + 10, second.y)).toEqual({ branchId: full.branch.id, targetId: second.step.key, before: false })
    expect(laneDropTarget(layout, first.step.key, first.x, first.y)?.targetId).toBe(second.step.key)
    expect(laneDropTarget(layout, "c0-0", empty.x + 10, layout.mainY)).toBeNull()
    expect(laneDropTarget(layout, "c0-0", -5, full.y + 10)).toBeNull()
  })

  it("keeps missing references visible as unplaced and never mutates its input", () => {
    const { steps, graph } = standardLike([2], [1])
    steps.push(task("orphan"))
    const before = structuredClone(steps), beforeGraph = structuredClone(graph)
    const layout = buildLaneLayout(steps, graph, { availableWidth: 2400 })
    expect(steps).toEqual(before)
    expect(graph).toEqual(beforeGraph)
    expect(layout.unplaced.map(step => step.key)).toEqual(["orphan"])
    expect(layout.points[0].step).toBe(steps.find(step => step.key === "p0-0"))
  })
})

describe("diamond drop slots", () => {
  it("offers a slot before, between and after every lane dot, and one centred slot in an empty lane", () => {
    const { steps, graph } = standardLike([3], [2])
    graph.teamBranches.push({ id: "empty", teamId: "x", fromId: "__start__", toId: "finalcheck", stepIds: [] })
    const layout = buildLaneLayout(steps, graph), slots = laneDropSlots(layout, "outside")
    const full = layout.lanes.find(lane => lane.branch.id === "pre-0")!, empty = layout.lanes.find(lane => lane.branch.id === "empty")!
    const own = slots.filter(slot => slot.branchId === "pre-0")
    expect(own.map(slot => [slot.targetId, slot.before])).toEqual([["p0-0", true], ["p0-1", true], ["p0-2", true], ["p0-2", false]])
    const [a, b, c] = full.points
    expect(own[0].x).toBeLessThan(a.x)
    expect(own[0].x).toBeGreaterThan(full.x)
    expect(own[1]).toMatchObject({ x: (a.x + b.x) / 2, y: a.y })
    expect(own[2]).toMatchObject({ x: (b.x + c.x) / 2, y: a.y })
    expect(own[3].x).toBeGreaterThan(c.x)
    expect(own[3].x).toBeLessThan(full.x + full.width)
    expect(slots.filter(slot => slot.branchId === "empty")).toEqual([{ id: "empty:0", branchId: "empty", x: empty.x + empty.width / 2, y: empty.y + LANE_DOT_Y }])
  })

  it("puts main-line slots between consecutive stations, never before Start or after Done", () => {
    const { steps, graph } = standardLike([3], [2])
    const layout = buildLaneLayout(steps, graph), main = laneDropSlots(layout, "p0-1").filter(slot => slot.branchId === MAIN_LINE)
    expect(main.map(slot => slot.targetId)).toEqual(["finalcheck", "checkin", "__event__", "headcount", "__end__"])
    expect(main.every(slot => slot.before === true && slot.y === layout.mainY)).toBe(true)
    const x = (id: string) => layout.stations.find(station => station.id === id)!.x
    expect(main[0].x).toBe((x("__start__") + x("finalcheck")) / 2)
    expect(main.every(slot => slot.x > x("__start__") && slot.x < x("__end__"))).toBe(true)
  })

  it("leaves out the no-op slots next to the dragged step, in a lane and on the main line", () => {
    const { steps, graph } = standardLike([3], [2])
    const layout = buildLaneLayout(steps, graph)
    const lane = laneDropSlots(layout, "p0-1").filter(slot => slot.branchId === "pre-0")
    expect(lane.map(slot => [slot.targetId, slot.before])).toEqual([["p0-0", true], ["p0-2", false]])
    expect(laneDropSlots(layout, "p0-0").filter(slot => slot.branchId === "pre-0").map(slot => [slot.targetId, slot.before])).toEqual([["p0-2", true], ["p0-2", false]])
    const main = laneDropSlots(layout, "checkin").filter(slot => slot.branchId === MAIN_LINE)
    expect(main.map(slot => slot.targetId)).toEqual(["finalcheck", "headcount", "__end__"])
    expect(laneDropSlots(layout, "checkin").every(slot => slot.targetId !== "checkin")).toBe(true)
    // A lane holding only the dragged step has no useful slot.
    const single = standardLike([1], [1]), solo = buildLaneLayout(single.steps, single.graph)
    expect(laneDropSlots(solo, "p0-0").filter(slot => slot.branchId === "pre-0")).toEqual([])
  })

  it("follows the row direction in a wrapped lane", () => {
    const { steps, graph } = standardLike([11], [1])
    const layout = buildLaneLayout(steps, graph), lane = layout.lanes[0], slots = laneDropSlots(layout, "outside").filter(slot => slot.branchId === lane.branch.id)
    expect(slots).toHaveLength(12)
    const last = lane.points[10], end = slots.at(-1)!
    expect(last.row).toBe(1)
    expect(end).toMatchObject({ targetId: last.step.key, before: false, y: last.y })
    expect(end.x).toBeLessThan(last.x)
    const wrap = slots[10]
    expect(wrap.y).toBe((lane.points[9].y + lane.points[10].y) / 2)
  })

  it("chooses the nearest slot within the radius only", () => {
    const slots = [{ id: "a", branchId: "x", x: 0, y: 0 }, { id: "b", branchId: "y", x: 30, y: 0 }]
    expect(nearestDropSlot(slots, 20, 0, 48)?.id).toBe("b")
    expect(nearestDropSlot(slots, 4, 3, 48)?.id).toBe("a")
    expect(nearestDropSlot(slots, 200, 0, 48)).toBeNull()
  })
})
