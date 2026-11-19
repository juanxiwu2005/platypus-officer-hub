import type { Event, Node } from "../../data/types"
import { topoOrder } from "../../engine/schedule"

export interface ExecutionTeam { id: string; name: string }
export interface ExecutionTeamSnapshot { kind?: "standard" | "custom"; teams: ExecutionTeam[]; teamMap?: { stepTeams: Record<string, string> } }
export interface ExecutionLane { team: ExecutionTeam; row: number; tasks: { node: Node; col: number }[] }
export interface ExecutionTrackGraph {
  lanes: ExecutionLane[]
  links: { from: string; to: string }[]
  positions: Map<string, { col: number; row: number }>
  unassigned: Node[]
  issues: string[]
  columns: number
}

/** This small projection also accepts old saved events without new optional fields. */
export function executionTeamSnapshot(event: Event | undefined): ExecutionTeamSnapshot | null {
  const run = (event as (Event & { workflowRun?: { snapshot: ExecutionTeamSnapshot } }) | undefined)?.workflowRun
  return run?.snapshot && Array.isArray(run.snapshot.teams) ? run.snapshot : null
}

/** A legacy standard run without confirmed teams retains its existing complete metro map. */
export function hasTeamExecutionTracks(event: Event | undefined, nodes: Node[]): boolean {
  const snapshot = executionTeamSnapshot(event)
  if (!snapshot) return false
  if (snapshot.kind === "custom") return true
  const teams = new Set(snapshot.teams.map(team => team.id))
  return teams.size > 0 && nodes.every(node => {
    const explicit = (node as Node & { teamId?: string }).teamId
    const mapped = node.stepKey && snapshot.teamMap && Object.hasOwn(snapshot.teamMap.stepTeams, node.stepKey) ? snapshot.teamMap.stepTeams[node.stepKey] : undefined
    return teams.has(explicit ?? mapped ?? "")
  })
}

/**
 * Execution tracks use real task IDs and real dependency edges. Team membership is
 * a separate overlay: before/after-event steps and business branches never split a
 * team into extra lanes. Display columns do not change dates or dependencies.
 */
export function teamMetroLayout(nodes: Node[], snapshot: ExecutionTeamSnapshot): ExecutionTrackGraph {
  const issues: string[] = []
  const seenTeams = new Set<string>()
  const teams = snapshot.teams.filter(team => {
    if (!team.id || seenTeams.has(team.id)) { issues.push("The saved workflow contains an invalid or repeated team."); return false }
    seenTeams.add(team.id)
    return true
  })
  const teamOf = (node: Node): string | null => {
    const explicit = (node as Node & { teamId?: string }).teamId
    const mapped = node.stepKey && snapshot.teamMap && Object.hasOwn(snapshot.teamMap.stepTeams, node.stepKey) ? snapshot.teamMap.stepTeams[node.stepKey] : undefined
    const id = explicit ?? mapped
    return id && seenTeams.has(id) ? id : null
  }
  const unassigned = nodes.filter(node => !teamOf(node))
  if (unassigned.length) issues.push(`${unassigned.length} task${unassigned.length === 1 ? " needs" : "s need"} a team assignment.`)
  const ordered = topoOrder(nodes)
  if (ordered.looped.length) issues.push("The saved workflow has a dependency loop. All tasks remain available below.")
  const rowOf = new Map(teams.map((team, row) => [team.id, row]))
  const positions = new Map<string, { col: number; row: number }>()
  const lastInTeam = new Map<string, number>()
  for (const node of ordered.order) {
    const team = teamOf(node)
    if (!team) continue
    const previous = Math.max(-1, ...(node.dependsOn ?? []).map(id => positions.get(id)?.col ?? -1))
    const col = Math.max(previous + 1, (lastInTeam.get(team) ?? -1) + 1)
    positions.set(node.id, { col, row: rowOf.get(team)! })
    lastInTeam.set(team, col)
  }
  const ids = new Set(nodes.map(node => node.id))
  const links = nodes.flatMap(node => node.dependsOn.filter(id => {
    if (!ids.has(id)) issues.push(`A dependency of “${node.title}” is outside this workflow.`)
    return positions.has(id) && positions.has(node.id)
  }).map(from => ({ from, to: node.id })))
  return {
    lanes: teams.map((team, row) => ({ team, row, tasks: ordered.order.filter(node => teamOf(node) === team.id).map(node => ({ node, col: positions.get(node.id)!.col })) })),
    links, positions, unassigned, issues: [...new Set(issues)],
    columns: Math.max(1, ...[...positions.values()].map(position => position.col + 1)),
  }
}
