import type { DemoState, Node, RoleFunction, WorkflowBranch } from "../../data/types"
import type { Schedule } from "../../engine/schedule"
import { placementOf, resolveBranches } from "../../engine/workflowBranches"
import { orderedBranchNodes } from "../../lib/flowOrder"

export const EVENT_KEY = "__event__"
export const START_KEY = "__start__"
export const END_KEY = "__end__"

export interface Station { key: string; node: Node | null; col: number }
export interface Branch { id: string; fn: RoleFunction; from: number; to: number; row: number; nodes: { node: Node; col: number }[] }
export interface MetroLayout { stations: Station[]; branches: Branch[]; cols: number; minRow: number; maxRow: number }

function progressColumns(nodes: Node[], start: number, end: number) {
  return nodes.length === 1 ? [start + (end - start) / 2] : nodes.map((_, i) => start + (end - start) * i / (nodes.length - 1))
}
type Group = { branch: WorkflowBranch; nodes: Node[] }
function packedRows(groups: Group[], definitions: WorkflowBranch[], firstRow: number) {
  const out = new Map<string, number>()
  if (!groups.length) return out
  const bottom = firstRow + 2 * definitions.findIndex(b => b.id === groups.at(-1)!.branch.id)
  groups.forEach((group, i) => out.set(group.branch.id, bottom - 2 * (groups.length - i - 1)))
  return out
}

/** Saved membership and dependency order draw the flow; dates never determine its geometry. */
export function metroLayout(state: DemoState, _sched: Schedule, eventId: string, bothSides = true): MetroLayout {
  const nodes = state.nodes.filter(n => n.eventId === eventId)
  const byKey = new Map(nodes.filter(n => n.stepKey).map(n => [n.stepKey!, n]))
  const final = byKey.get("finalcheck") ?? byKey.get("review")
  const checkin = byKey.get("checkin") ?? byKey.get("runshow")
  const headcount = byKey.get("headcount")
  const definitions = resolveBranches(nodes, state.events.find(e => e.id === eventId)?.workflowBranches)
  const groups = definitions.map(branch => ({ branch, nodes: orderedBranchNodes(nodes, branch.id) })).filter(g => g.nodes.length)
  // Retain even malformed historical 'main' extras as a visible compatibility route.
  const knownMain = new Set([final?.id, checkin?.id, headcount?.id])
  const extras = nodes.filter(n => placementOf(n).branchId === "main" && !knownMain.has(n.id))
  for (const side of ["before_event", "after_event"] as const) {
    const extra = extras.filter(n => (n.phase === "close") === (side === "after_event"))
    if (!extra.length) continue
    const branch: WorkflowBranch = { id: `legacy-main-${side}`, title: "Legacy custom steps", side, order: definitions.length }
    definitions.push(branch); groups.push({ branch, nodes: extra })
  }
  const preDefinitions = definitions.filter(b => b.side === "before_event")
  const postDefinitions = definitions.filter(b => b.side === "after_event")
  const pre = groups.filter(g => g.branch.side === "before_event")
  const post = groups.filter(g => g.branch.side === "after_event")
  const preRows = packedRows(pre, preDefinitions, -5)
  const postRows = packedRows(post, postDefinitions, -3)
  const preStart = 1, preEnd = preStart + Math.max(1, ...pre.map(g => Math.max(0, g.nodes.length - 1)))
  const finalCol = preEnd + .9
  const postStart = finalCol + 4
  const postEnd = postStart + Math.max(1, ...post.map(g => Math.max(0, g.nodes.length - 1)))
  const stations: Station[] = [
    { key: START_KEY, node: null, col: 0 },
    ...(final ? [{ key: final.id, node: final, col: finalCol }] : []),
    ...(checkin ? [{ key: checkin.id, node: checkin, col: finalCol + 1 }] : []),
    { key: EVENT_KEY, node: null, col: finalCol + 2 },
    ...(headcount ? [{ key: headcount.id, node: headcount, col: finalCol + 3 }] : []),
    { key: END_KEY, node: null, col: postEnd + .9 },
  ]
  const eventIndex = stations.findIndex(s => s.key === EVENT_KEY)
  const preJoin = final ? stations.findIndex(s => s.node?.id === final.id) : checkin ? stations.findIndex(s => s.node?.id === checkin.id) : eventIndex
  const postFrom = headcount ? stations.findIndex(s => s.node?.id === headcount.id) : eventIndex
  const branches: Branch[] = []
  for (const [routeGroups, rows, from, to, start, end] of [
    [pre, preRows, 0, preJoin, preStart, preEnd],
    [post, postRows, postFrom, stations.length - 1, postStart, postEnd],
  ] as const) {
    for (const group of routeGroups) {
      const columns = progressColumns(group.nodes, start, end)
      branches.push({ id: group.branch.id, fn: group.nodes[0].fn, from, to, row: bothSides ? rows.get(group.branch.id)! : branches.length + 1, nodes: group.nodes.map((node, i) => ({ node, col: columns[i] })) })
    }
  }
  const rows = branches.map(b => b.row)
  return { stations, branches, cols: stations.at(-1)!.col, minRow: Math.min(0, ...rows), maxRow: Math.max(0, ...rows) }
}
