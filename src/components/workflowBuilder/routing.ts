export interface RoutePoint { x: number; y: number }
export interface RouteBox { id: string; x: number; y: number; width: number; height: number }
export interface DependencyRoute { from: string; to: string; path: string; points: RoutePoint[] }
interface Port { point: RoutePoint; exit: RoutePoint }
const CLEARANCE = 6
const PORT_TAIL = 8

/** Strict interior intersection allows a connector to meet its own card at the edge. */
export function segmentCrossesBox(a: RoutePoint, b: RoutePoint, box: RouteBox, padding = 0): boolean {
  const left = box.x - padding, right = box.x + box.width + padding
  const top = box.y - padding, bottom = box.y + box.height + padding
  if (a.y === b.y) return a.y > top && a.y < bottom && Math.max(a.x, b.x) > left && Math.min(a.x, b.x) < right
  if (a.x === b.x) return a.x > left && a.x < right && Math.max(a.y, b.y) > top && Math.min(a.y, b.y) < bottom
  return true
}

const same = (a: RoutePoint, b: RoutePoint) => a.x === b.x && a.y === b.y
function simplify(points: RoutePoint[]): RoutePoint[] {
  const out: RoutePoint[] = []
  for (const point of points) {
    if (out.length && same(out[out.length - 1], point)) continue
    while (out.length >= 2) {
      const a = out[out.length - 2], b = out[out.length - 1]
      if ((a.x === b.x && b.x === point.x) || (a.y === b.y && b.y === point.y)) out.pop()
      else break
    }
    out.push(point)
  }
  return out
}
const ports = (box: RouteBox): Record<"left" | "right" | "top" | "bottom", Port> => ({
  left: { point: { x: box.x, y: box.y + box.height / 2 }, exit: { x: box.x - PORT_TAIL, y: box.y + box.height / 2 } },
  right: { point: { x: box.x + box.width, y: box.y + box.height / 2 }, exit: { x: box.x + box.width + PORT_TAIL, y: box.y + box.height / 2 } },
  top: { point: { x: box.x + box.width / 2, y: box.y }, exit: { x: box.x + box.width / 2, y: box.y - PORT_TAIL } },
  bottom: { point: { x: box.x + box.width / 2, y: box.y + box.height }, exit: { x: box.x + box.width / 2, y: box.y + box.height + PORT_TAIL } },
})
const pathOf = (points: RoutePoint[]) => points.map((point, index) => !index ? `M${point.x},${point.y}` : point.y === points[index - 1].y ? `H${point.x}` : `V${point.y}`).join(" ")
const lengthOf = (points: RoutePoint[]) => points.slice(1).reduce((sum, point, index) => sum + Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y), 0)

/** Prefer nearby clear ports and few bends, checking every segment against cards and team labels. */
export function routeTaskDependencies(boxes: RouteBox[], edges: { from: string; to: string }[], labelWidth: number): DependencyRoute[] {
  const byId = new Map(boxes.map(box => [box.id, box]))
  const verticalGutters = [...new Set(boxes.flatMap(box => [box.x - PORT_TAIL, box.x + box.width + PORT_TAIL]))]
  const horizontalGutters = [...new Set(boxes.flatMap(box => [box.y - 12, box.y + box.height + 12]))]
  const routes: DependencyRoute[] = []
  for (const edge of edges) {
    const source = byId.get(edge.from), target = byId.get(edge.to)
    if (!source || !target || source.id === target.id) continue
    const a = ports(source), b = ports(target)
    const toward = source.y < target.y ? "bottom" : "top"
    const facing = source.y < target.y ? "top" : "bottom"
    const portPairs: [Port, Port][] = [[a.right, b.left], [a[toward], b[facing]], [a.right, b[facing]], [a[toward], b.left], [a.top, b.top], [a.bottom, b.bottom]]
    let best: RoutePoint[] | null = null, bestCost = Infinity
    const consider = (points: RoutePoint[]) => {
      const clean = simplify(points)
      if (clean.some(point => point.x < labelWidth + 4)) return
      const cost = lengthOf(clean) + Math.max(0, clean.length - 2) * 12
      if (cost >= bestCost) return
      for (let index = 1; index < clean.length; index++) if (boxes.some(box => segmentCrossesBox(clean[index - 1], clean[index], box, box.id === source.id || box.id === target.id ? 0 : CLEARANCE))) return
      best = clean; bestCost = cost
    }
    for (const [from, to] of portPairs) {
      consider([from.point, from.exit, { x: to.exit.x, y: from.exit.y }, to.exit, to.point])
      consider([from.point, from.exit, { x: from.exit.x, y: to.exit.y }, to.exit, to.point])
      for (const x of verticalGutters) consider([from.point, from.exit, { x, y: from.exit.y }, { x, y: to.exit.y }, to.exit, to.point])
      for (const y of horizontalGutters) consider([from.point, from.exit, { x: from.exit.x, y }, { x: to.exit.x, y }, to.exit, to.point])
    }
    if (best) routes.push({ ...edge, points: best, path: pathOf(best) })
  }
  return routes
}
