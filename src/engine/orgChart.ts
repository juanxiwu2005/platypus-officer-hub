import type { Role } from "../data/types"

/**
 * The organization chart, worked out from the roles' "reports to" links. Pure layout: each role gets a level (how many steps
 * below the top) and a column; a boss sits centered over the roles that report to them. No dates, no duties: just titles and who reports to whom.
 * The advisor is not part of the officers' chain (FB-2, PLAN 4.3): an advisor who reports to nobody stands on the president's level, right
 * beside the president (several advisors in turn to the right; on the left when a box on that level is in the way), joined by a dashed line.
 * Without a president an advisor is simply shown at the top, after the other roles.
 */
export interface ChartNode { id: string; title: string; level: number; col: number; advisor: boolean; vacant: boolean }
/** "reports": a role reports to its boss (solid line). "advisory": the advisor stands beside the president (dashed line). */
export interface ChartEdge { from: string; to: string; kind?: "advisory" }
/** `columns` is how many card widths the chart needs, counted from column 0 (it can end on a half column when a boss is centred). */
export interface OrgChart { nodes: ChartNode[]; edges: ChartEdge[]; levels: number; columns: number }

export function orgChart(roles: Role[]): OrgChart {
  const ids = new Set(roles.map(r => r.id))
  const bossOf = (r: Role) => r.reportsToId && r.reportsToId !== r.id && ids.has(r.reportsToId) ? r.reportsToId : null
  const president = roles.find(r => r.fn === "president")
  // Advisors who report to nobody are placed beside the president once the rest of the chart is laid out.
  const beside = president ? roles.filter(r => r.fn === "advisor" && !bossOf(r) && r.id !== president.id) : []
  const besideIds = new Set(beside.map(r => r.id))
  const kids = new Map<string, Role[]>()
  for (const r of roles) { const b = bossOf(r); if (b) kids.set(b, [...(kids.get(b) ?? []), r]) }
  const placed = new Map<string, ChartNode>()
  const edges: ChartEdge[] = []
  let next = 0
  const node = (r: Role, level: number, col: number): ChartNode => ({ id: r.id, title: r.displayName, level, col, advisor: r.fn === "advisor", vacant: !r.holderId })
  const place = (r: Role, level: number, path: Set<string>): ChartNode => {
    const mine = (kids.get(r.id) ?? []).filter(k => !path.has(k.id) && !placed.has(k.id))
    const below = mine.map(k => { edges.push({ from: r.id, to: k.id }); return place(k, level + 1, new Set([...path, r.id])) })
    const col = below.length ? (below[0].col + below[below.length - 1].col) / 2 : next++
    const n = node(r, level, col)
    placed.set(r.id, n)
    return n
  }
  const roots = [...roles.filter(r => !bossOf(r) && r.fn !== "advisor"), ...roles.filter(r => !bossOf(r) && r.fn === "advisor" && !besideIds.has(r.id))]
  for (const r of roots) if (!placed.has(r.id)) place(r, 0, new Set())
  // Anything left is part of a loop in the links; show it at the top so nothing disappears.
  for (const r of roles) if (!placed.has(r.id) && !besideIds.has(r.id)) place(r, 0, new Set())

  // The advisors beside the president: the next free column to the right, else the next free one to the left, on the president's level.
  const pres = president ? placed.get(president.id) : undefined
  if (pres) {
    const taken = (level: number, col: number) => [...placed.values()].some(n => n.level === level && Math.abs(n.col - col) < 1)
    let right = pres.col, left = pres.col
    for (const a of beside) {
      let col: number
      if (!taken(pres.level, right + 1)) col = right = right + 1
      else if (!taken(pres.level, left - 1)) col = left = left - 1
      else { do right++; while (taken(pres.level, right)); col = right }
      placed.set(a.id, node(a, pres.level, col))
      edges.push({ from: president!.id, to: a.id, kind: "advisory" })
    }
  }
  // A column on the left of column 0 moves the whole chart right, so every column is 0 or more.
  const shift = Math.max(0, -Math.min(0, ...[...placed.values()].map(n => n.col)))
  const nodes = roles.map(r => placed.get(r.id)).filter((n): n is ChartNode => !!n).map(n => shift ? { ...n, col: n.col + shift } : n)
  const columns = nodes.length ? Math.max(...nodes.map(n => n.col)) + 1 : 1
  return { nodes, edges, levels: Math.max(0, ...nodes.map(n => n.level)) + 1, columns: Math.max(1, columns) }
}
