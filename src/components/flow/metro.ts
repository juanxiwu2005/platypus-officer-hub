import type { DemoState, Node, RoleFunction } from "../../data/types"
import type { Schedule } from "../../engine/schedule"
import { topoOrder } from "../../engine/schedule"
import { daysBetween } from "../../lib/dates"

/**
 * Single-main-line ("metro") layout for an event (v1.1, plan "流程图：一条主线").
 * Main line = the longest dependency chain before the event, then the event day, then the longest chain after it.
 * Every other step hangs on a branch that leaves the main line at its last main ancestor and rejoins at its first
 * main descendant. Branches are grouped by the function that owns the work (room, food and money, marketing…).
 * Pure function: no React, no dates written. Positions are in "columns" and "rows"; the chart turns them into pixels.
 */
export const EVENT_KEY = "__event__"
export const START_KEY = "__start__"
export const END_KEY = "__end__"

export interface Station { key: string; node: Node | null; col: number }
export interface Branch { id: string; fn: RoleFunction; from: number; to: number; row: number; nodes: { node: Node; col: number }[] }
export interface MetroLayout { stations: Station[]; branches: Branch[]; cols: number; minRow: number; maxRow: number }

function longestChain(nodes: Node[], sched: Schedule): Node[] {
  if (!nodes.length) return []
  const ids = new Set(nodes.map(n => n.id))
  const { order } = topoOrder(nodes)
  const best = new Map<string, number>(), prev = new Map<string, string | null>()
  const club = (n: Node | undefined) => (n ? sched.nodes[n.id]?.club ?? n.clubDeadline ?? "" : "")
  const byId = new Map(nodes.map(n => [n.id, n]))
  for (const n of order) {
    let b = 1, p: string | null = null
    for (const d of n.dependsOn.filter(x => ids.has(x))) {
      const v = (best.get(d) ?? 1) + 1
      if (v > b || (v === b && p && club(byId.get(d)) > club(byId.get(p)))) { b = v; p = d }
    }
    best.set(n.id, b); prev.set(n.id, p)
  }
  let end = order[0]
  for (const n of order) {
    const v = best.get(n.id)!, e = best.get(end.id)!
    if (v > e || (v === e && club(n) > club(end))) end = n
  }
  const chain: Node[] = []
  for (let cur: string | null = end.id; cur; cur = prev.get(cur) ?? null) chain.unshift(byId.get(cur)!)
  return chain
}

export function metroLayout(state: DemoState, sched: Schedule, eventId: string, bothSides = true): MetroLayout {
  const ev = state.events.find(e => e.id === eventId)!
  const nodes = state.nodes.filter(n => n.eventId === eventId)
  const ids = new Set(nodes.map(n => n.id))
  const local = nodes.map(n => ({ ...n, dependsOn: n.dependsOn.filter(d => ids.has(d)) }))
  const isPost = (n: Node) => n.phase === "close" || (sched.nodes[n.id]?.club ?? "") > ev.date
  const pre = local.filter(n => !isPost(n)), post = local.filter(isPost)
  const preMain = longestChain(pre, sched), postMain = longestChain(post, sched)
  const mainKeys = [...preMain.map(n => n.id), EVENT_KEY, ...postMain.map(n => n.id)]
  const byId = new Map(local.map(n => [n.id, n]))

  const children = new Map<string, string[]>()
  for (const n of local) for (const d of n.dependsOn) children.set(d, [...(children.get(d) ?? []), n.id])
  const walk = (start: string, next: (id: string) => string[]) => {
    const seen = new Set<string>(), stack = [...next(start)]
    while (stack.length) { const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id); stack.push(...next(id)) }
    return seen
  }
  const idx = new Map(mainKeys.map((k, i) => [k, i]))
  const eventIdx = idx.get(EVENT_KEY)!
  let needStart = false, needEnd = false
  const placed: { node: Node; from: number; to: number }[] = []
  for (const n of local) {
    if (idx.has(n.id)) continue
    const anc = [...walk(n.id, id => byId.get(id)?.dependsOn ?? [])].map(id => idx.get(id)).filter((i): i is number => i !== undefined)
    const desc = [...walk(n.id, id => children.get(id) ?? [])].map(id => idx.get(id)).filter((i): i is number => i !== undefined)
    let from = anc.length ? Math.max(...anc) : isPost(n) ? eventIdx : -1
    let to = desc.length ? Math.min(...desc) : isPost(n) ? mainKeys.length : eventIdx
    if (!isPost(n) && from >= eventIdx) from = eventIdx - 1
    if (to <= from) to = from + 1
    if (from === -1) needStart = true
    if (to === mainKeys.length) needEnd = true
    placed.push({ node: n, from, to })
  }
  // Optional start/end stations keep branches that begin before or end after the main line attached to it.
  const keys = [...(needStart ? [START_KEY] : []), ...mainKeys, ...(needEnd ? [END_KEY] : [])]
  const shift = needStart ? 1 : 0
  const groups = new Map<string, { fn: RoleFunction; from: number; to: number; nodes: Node[] }>()
  for (const p of placed) {
    const from = p.from + shift, to = p.to + shift
    const key = `${from}:${to}:${p.node.fn}`
    const g = groups.get(key) ?? { fn: p.node.fn, from, to, nodes: [] }
    g.nodes.push(p.node); groups.set(key, g)
  }
  const order = topoOrder(local).order.map(n => n.id)
  const rank = (n: Node) => order.indexOf(n.id) * 1000 + (sched.nodes[n.id]?.latestStart ? daysBetween("2000-01-01", sched.nodes[n.id].latestStart) / 100000 : 0)
  const raw = [...groups.values()].map(g => ({ ...g, nodes: g.nodes.sort((a, b) => rank(a) - rank(b)) }))

  // Columns: each main gap is wide enough for the longest branch that spans it.
  const col: number[] = []
  keys.forEach((_, k) => {
    let c = k === 0 ? 0 : col[k - 1] + 1
    for (const b of raw) if (b.to === k && b.from >= 0) c = Math.max(c, col[b.from] + b.nodes.length + 1)
    col.push(c)
  })
  // Rows: nearest free row, alternating above and below (or only one side on a phone).
  const taken: { row: number; a: number; b: number }[] = []
  const candidates = bothSides ? [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  // Short spans take the rows nearest the main line, so lines do not cross.
  const branches: Branch[] = raw.sort((x, y) => (col[x.to] - col[x.from]) - (col[y.to] - col[y.from]) || col[x.from] - col[y.from] || y.nodes.length - x.nodes.length).map((b, i) => {
    const a = col[b.from], z = col[b.to]
    const row = candidates.find(r => !taken.some(t => t.row === r && t.a < z && a < t.b)) ?? candidates.at(-1)!
    taken.push({ row, a, b: z })
    const L = b.nodes.length
    return { id: `b${i}`, fn: b.fn, from: b.from, to: b.to, row, nodes: b.nodes.map((node, m) => ({ node, col: a + ((m + 1) * (z - a)) / (L + 1) })) }
  })
  const stations: Station[] = keys.map((key, k) => ({ key, node: key.startsWith("__") ? null : byId.get(key)!, col: col[k] }))
  const rows = branches.map(b => b.row)
  return { stations, branches, cols: col.at(-1) ?? 0, minRow: Math.min(0, ...rows), maxRow: Math.max(0, ...rows) }
}
