import type { DemoState, Node, Role } from "../../data/types"
import type { Schedule } from "../../engine/schedule"
import { roleFor } from "../../engine/playbooks"
import { addDays, daysBetween, fromISO } from "../../lib/dates"
import { maxDate, minDate } from "../../engine/calendar"

/**
 * Pure layout for the swimlane views (flow chart and Gantt): one lane per role, time runs left to right.
 * Lanes come from the owner's role, or from the step's function when nobody owns it yet.
 */
export interface Lane {
  role: Role
  nodes: Node[]
  /** For the flow chart: row index inside the lane for each node, so boxes never overlap. */
  rows: Record<string, number>
  rowCount: number
}

export interface Timeline {
  from: string
  to: string
  days: number
  x: (d: string) => number
}

export const laneRoleId = (state: DemoState, n: Node): string => {
  const owner = n.ownerId ? state.people.find(p => p.id === n.ownerId) : undefined
  return owner?.roleId ?? roleFor(state.roles, n.fn)?.id ?? state.roles[0].id
}

export function timeline(state: DemoState, sched: Schedule, eventId: string, dayWidth: number, padDays = 3): Timeline {
  const ev = state.events.find(e => e.id === eventId)!
  const nodes = state.nodes.filter(n => n.eventId === eventId)
  const starts = nodes.map(n => sched.nodes[n.id]?.latestStart)
  const ends = nodes.map(n => sched.nodes[n.id]?.club)
  const from = addDays(minDate(...starts, ev.date, state.today) ?? ev.date, -padDays)
  const to = addDays(maxDate(...ends, ev.date) ?? ev.date, padDays + 1)
  return { from, to, days: daysBetween(from, to), x: d => daysBetween(from, d) * dayWidth }
}

export function lanes(state: DemoState, sched: Schedule, eventId: string, boxWidthDays: number): Lane[] {
  const nodes = state.nodes
    .filter(n => n.eventId === eventId)
    .sort((a, b) => (sched.nodes[a.id]?.latestStart ?? "").localeCompare(sched.nodes[b.id]?.latestStart ?? "") || a.id.localeCompare(b.id))
  const out: Lane[] = []
  for (const role of state.roles) {
    const mine = nodes.filter(n => laneRoleId(state, n) === role.id)
    if (mine.length === 0) continue
    // Greedy row packing: a box takes `boxWidthDays` of width starting at its latest start.
    const rowEnds: string[] = []
    const rows: Record<string, number> = {}
    for (const n of mine) {
      const start = sched.nodes[n.id]?.latestStart ?? state.today
      let r = rowEnds.findIndex(end => end <= start)
      if (r === -1) r = rowEnds.length
      rowEnds[r] = addDays(start, boxWidthDays)
      rows[n.id] = r
    }
    out.push({ role, nodes: mine, rows, rowCount: Math.max(1, rowEnds.length) })
  }
  return out
}

/** Mondays between from and to, for axis labels. */
export function mondays(from: string, to: string): string[] {
  const out: string[] = []
  let d = from
  for (let i = 0; i < 7 && fromISO(d).getDay() !== 1; i++) d = addDays(d, 1)
  for (; d <= to; d = addDays(d, 7)) out.push(d)
  return out
}
