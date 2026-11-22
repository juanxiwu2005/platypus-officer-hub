import { describe, expect, it } from "vitest"
import { routeTaskDependencies, segmentCrossesBox, type RouteBox } from "./routing"

const box = (id: string, col: number, row: number): RouteBox => ({ id, x: 184 + col * 156, y: 62 + row * 96, width: 132, height: 52 })
describe("compact workflow dependency routing", () => {
  it("uses a single straight line between adjacent tasks in one team", () => {
    const routes = routeTaskDependencies([box("A", 0, 0), box("B", 1, 0)], [{ from: "A", to: "B" }], 164)
    expect(routes).toHaveLength(1)
    expect(routes[0].points).toEqual([{ x: 316, y: 88 }, { x: 340, y: 88 }])
  })

  it("uses nearby vertical ports between neighboring team rows", () => {
    const routes = routeTaskDependencies([box("A", 0, 0), box("B", 0, 1)], [{ from: "A", to: "B" }], 164)
    expect(routes[0].points).toEqual([{ x: 250, y: 114 }, { x: 250, y: 158 }])
  })

  it("routes every real dependency around intermediate cards and outside team labels", () => {
    const boxes = [box("A", 0, 0), box("obstacle-1", 1, 0), box("B", 2, 0), box("C", 1, 1), box("obstacle-2", 2, 1), box("D", 3, 2)]
    const edges = [{ from: "A", to: "B" }, { from: "A", to: "D" }, { from: "C", to: "D" }]
    const routes = routeTaskDependencies(boxes, edges, 164)
    expect(routes).toHaveLength(edges.length)
    for (const route of routes) {
      expect(route.points.every(point => point.x > 164)).toBe(true)
      for (let index = 1; index < route.points.length; index++) for (const item of boxes) expect(segmentCrossesBox(route.points[index - 1], route.points[index], item)).toBe(false)
    }
  })
})
