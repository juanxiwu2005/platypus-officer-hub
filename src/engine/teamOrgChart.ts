import type { Role, WorkflowTeam } from "../data/types"
import { reportingStructure } from "./orgChart"

/**
 * Settings → Roles & teams (concept C): the organization chart with the organization's workflow teams drawn as coloured areas
 * around their roles. Pure layout, in CSS pixels. Reporting lines are the same as `orgChart.ts` (levels from "reports to", a boss
 * centred over the roles that report to them, advisors who report to nobody beside the president, loops shown at the top).
 *
 * - Siblings are ordered so roles of the same team stand next to each other: team order is the order of `workflowTeams`, roles
 *   without a team last; otherwise the roles keep their order.
 * - A zone wraps each run of neighbouring roles on one level that share a team. A team on two levels gets two zones (same tone).
 *   Roles without a team (and advisors, who never join workflow teams) sit in a dashed "Not in a team" zone.
 * - Zones are opaque and drawn above the lines, so a line shows only in the gaps between levels and zones.
 * No dates, no duties, no people: the caller adds officer names.
 */
export const TEAM_CHART = {
  cardW: 120, cardH: 52,
  /** Space inside a zone: above the label pill, the pill itself and the gap under it, then around the cards. */
  head: 42, pad: 8,
  /** Between two cards of one zone, between two zones, and between two levels (where the lines run). */
  gapIn: 8, gapZone: 10, gapY: 34,
  /** Width of a pill: per character at --fs-sm semibold (measured ≈ 6.0–6.4px), plus its padding and colour dot. Long names truncate. */
  pillChar: 6.4, pillExtra: 28, pillInset: 8,
} as const
export const TEAM_TONES = 6
export const NOT_IN_TEAM = "Not in a team"

export interface TeamChartNode { id: string; title: string; holderId: string | null; level: number; x: number; y: number; teamId: string | null; tone: number | null; advisor: boolean }
export interface TeamChartZone { key: string; teamId: string | null; name: string; steps: number | null; tone: number | null; level: number; x: number; y: number; width: number; height: number; roleIds: string[] }
/** `d` is an orthogonal SVG path. "advisory": the dashed line from the president to an advisor beside them. */
export interface TeamChartEdge { from: string; to: string; kind?: "advisory"; d: string }
export interface TeamChart { nodes: TeamChartNode[]; zones: TeamChartZone[]; edges: TeamChartEdge[]; width: number; height: number; levels: number }

/** "Operations · 25 steps", "Club leadership · 1 step"; the unassigned zone has no count. */
export const zoneLabel = (zone: Pick<TeamChartZone, "teamId" | "name" | "steps">) => zone.teamId ? `${zone.name} · ${zone.steps ?? 0} ${zone.steps === 1 ? "step" : "steps"}` : NOT_IN_TEAM

export function teamOrgChart(roles: Role[], teams: readonly WorkflowTeam[], roleTeams: Readonly<Record<string, string>>, stepCounts: Readonly<Record<string, number>> = {}): TeamChart {
  const C = TEAM_CHART
  const teamIndex = new Map(teams.map((team, i) => [team.id, i]))
  const teamOf = (r: Role): string | null => { if (r.fn === "advisor") return null; const id = roleTeams[r.id]; return id && teamIndex.has(id) ? id : null }
  const rank = (r: Role) => { const id = teamOf(r); return id ? teamIndex.get(id)! : teams.length }
  const byTeam = (list: Role[]) => list.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map(x => x.r)
  const { president, beside, kids, roots } = reportingStructure(roles)

  // 1. Levels and, per level, the left-to-right order (depth first, siblings grouped by team).
  const level = new Map<string, number>(), below = new Map<string, Role[]>(), rows: Role[][] = [], tops: Role[] = []
  const visit = (r: Role, l: number, path: Set<string>) => {
    level.set(r.id, l); (rows[l] ??= []).push(r)
    const mine = byTeam((kids.get(r.id) ?? []).filter(k => !path.has(k.id) && !level.has(k.id)))
    below.set(r.id, mine)
    for (const k of mine) if (!level.has(k.id)) visit(k, l + 1, new Set([...path, r.id]))
  }
  const top = (r: Role) => { if (!level.has(r.id)) { tops.push(r); visit(r, 0, new Set()) } }
  const officerRoots = byTeam(roots.filter(r => r.fn !== "advisor"))
  for (const r of officerRoots) { top(r); if (r.id === president?.id) beside.forEach(top) }
  roots.filter(r => r.fn === "advisor").forEach(top)
  beside.forEach(top)
  // Anything left is part of a loop in the links; show it at the top so nothing disappears.
  roles.forEach(top)

  // 2. Runs: neighbours on a level with the same team. A run's zone is at least as wide as its label, so the label can be read.
  interface Run { teamId: string | null; level: number; members: Role[]; side: number }
  const runs: Run[] = [], runOf = new Map<string, Run>()
  rows.forEach((row, l) => {
    for (const r of row) {
      const last = runs[runs.length - 1], teamId = teamOf(r)
      const run = last && last.level === l && last.teamId === teamId ? last : (runs.push({ teamId, level: l, members: [], side: 0 }), runs[runs.length - 1])
      run.members.push(r); runOf.set(r.id, run)
    }
  })
  const nameOf = (id: string | null) => id ? teams[teamIndex.get(id)!].name : NOT_IN_TEAM
  const stepsOf = (id: string | null) => id ? stepCounts[id] ?? 0 : null
  const maxZone = 2 * C.cardW + C.gapIn + 2 * C.pad
  const minZone = (run: Run) => Math.min(maxZone, zoneLabel({ teamId: run.teamId, name: nameOf(run.teamId), steps: stepsOf(run.teamId) }).length * C.pillChar + C.pillExtra + 2 * C.pillInset)
  for (const run of runs) {
    const cards = run.members.length * C.cardW + (run.members.length - 1) * C.gapIn
    // Reserved on each side of the run's outer cards. If the run spreads out later, the zone only needs less.
    run.side = C.pad + Math.max(0, (minZone(run) - cards - 2 * C.pad) / 2)
  }
  const first = (r: Role) => runOf.get(r.id)!.members[0] === r
  const lastIn = (r: Role) => { const m = runOf.get(r.id)!.members; return m[m.length - 1] === r }
  const gap = (a: Role, b: Role) => runOf.get(a.id) === runOf.get(b.id) ? C.gapIn : (lastIn(a) ? runOf.get(a.id)!.side : C.pad) + C.gapZone + (first(b) ? runOf.get(b.id)!.side : C.pad)

  // 3. Positions: depth first, each role as far left as its level allows, a boss centred over its reports (moving them right if needed).
  const x = new Map<string, number>(), lastAt: (Role | undefined)[] = []
  const subtree = (r: Role): Role[] => [r, ...(below.get(r.id) ?? []).flatMap(subtree)]
  const place = (r: Role) => {
    const l = level.get(r.id)!, mine = below.get(r.id) ?? []
    mine.forEach(place)
    const prev = lastAt[l]
    const min = prev ? x.get(prev.id)! + C.cardW + gap(prev, r) : runOf.get(r.id)!.side
    let at = min
    if (mine.length) {
      const want = (x.get(mine[0].id)! + x.get(mine[mine.length - 1].id)!) / 2
      if (want >= min) at = want
      else for (const k of mine.flatMap(subtree)) x.set(k.id, x.get(k.id)! + (min - want))
    }
    x.set(r.id, at); lastAt[l] = r
  }
  tops.forEach(place)

  // 4. Zones, nodes and lines.
  const rowH = C.head + C.cardH + C.pad, pitch = rowH + C.gapY
  const zones: TeamChartZone[] = runs.map((run, i) => {
    const x0 = x.get(run.members[0].id)!, x1 = x.get(run.members[run.members.length - 1].id)! + C.cardW
    const width = Math.max(x1 - x0 + 2 * C.pad, minZone(run))
    return { key: `${run.level}-${i}`, teamId: run.teamId, name: nameOf(run.teamId), steps: stepsOf(run.teamId), tone: run.teamId ? teamIndex.get(run.teamId)! % TEAM_TONES : null, level: run.level, x: (x0 + x1) / 2 - width / 2, y: run.level * pitch, width, height: rowH, roleIds: run.members.map(r => r.id) }
  })
  const shift = -Math.min(0, ...zones.map(z => z.x))
  for (const z of zones) z.x += shift
  const nodes: TeamChartNode[] = roles.filter(r => level.has(r.id)).map(r => {
    const teamId = teamOf(r)
    return { id: r.id, title: r.displayName, holderId: r.holderId, level: level.get(r.id)!, x: x.get(r.id)! + shift, y: level.get(r.id)! * pitch + C.head, teamId, tone: teamId ? teamIndex.get(teamId)! % TEAM_TONES : null, advisor: r.fn === "advisor" }
  })
  const at = new Map(nodes.map(n => [n.id, n]))
  const edges: TeamChartEdge[] = []
  for (const [boss, list] of below) for (const k of list) {
    const a = at.get(boss)!, b = at.get(k.id)!
    const x1 = a.x + C.cardW / 2, y1 = a.y + C.cardH, mid = a.level * pitch + rowH + C.gapY / 2, x2 = b.x + C.cardW / 2
    edges.push({ from: boss, to: k.id, d: `M${x1} ${y1} V${mid} H${x2} V${b.y}` })
  }
  const pres = president ? at.get(president.id) : undefined
  if (pres) for (const adv of beside) {
    const b = at.get(adv.id)
    if (!b || b.level !== pres.level) continue
    const [l, r] = pres.x <= b.x ? [pres, b] : [b, pres], y = pres.y + C.cardH / 2
    edges.push({ from: pres.id, to: adv.id, kind: "advisory", d: `M${l.x + C.cardW} ${y} H${r.x}` })
  }
  const levels = rows.length
  return { nodes, zones, edges, width: Math.max(0, ...zones.map(z => z.x + z.width)), height: levels ? levels * pitch - C.gapY : 0, levels }
}
