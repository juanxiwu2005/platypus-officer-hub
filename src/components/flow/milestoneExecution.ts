import type { Event, Node, StepTemplate, WorkflowMilestoneGraph, WorkflowRun, WorkflowTeam } from "../../data/types"
import { createWorkflowMilestoneGraph, workflowMilestoneDates, workflowMilestoneGraphError } from "../../engine/workflowMilestones"
import { hasTeamExecutionTracks } from "./teamMetro"

export interface MilestoneExecutionProjection {
  graph: WorkflowMilestoneGraph | null
  steps: StepTemplate[]
  teams: WorkflowTeam[]
  nodeByStep: Map<string, Node>
  dates: Record<string, string>
  unplaced: Node[]
  issues: string[]
}

/**
 * The graph Settings draws for this run's template version: the authored graph when the version has one,
 * otherwise the graph Settings derives from the same steps and team map (the standard preset before it is
 * edited). Display only: it never adds dependencies to the run's tasks or changes their dates.
 */
export function runMilestoneGraph(snapshot: WorkflowRun["snapshot"]): WorkflowMilestoneGraph {
  return snapshot.milestoneGraph ?? createWorkflowMilestoneGraph(snapshot.steps, snapshot.teamMap?.stepTeams ?? {})
}

export type FlowChartKind = "template-graph" | "branch-metro"

/**
 * Plan draws a saved-template run with its template's Settings graph (main line, team branches and joins).
 * Seeded and older events, and runs whose tasks lack teams, keep the branch metro. A derived graph that does
 * not validate also keeps the branch metro, so such a run still shows its complete chart.
 */
export function flowChartKind(event: Event | undefined, nodes: Node[]): FlowChartKind {
  const snapshot = event?.workflowRun?.snapshot
  if (!snapshot || !hasTeamExecutionTracks(event, nodes)) return "branch-metro"
  if (snapshot.milestoneGraph) return "template-graph"
  const teams = new Set((snapshot.teams ?? []).map(team => team.id))
  return workflowMilestoneGraphError(runMilestoneGraph(snapshot), snapshot.steps, teams) ? "branch-metro" : "template-graph"
}

/** The saved graph supplies structure. Only real Nodes supply task identity, current names and work. */
export function projectMilestoneExecution(event: Event, nodes: Node[]): MilestoneExecutionProjection {
  const actual = nodes.filter(node => node.eventId === event.id)
  const snapshot = event.workflowRun?.snapshot
  const graph = snapshot ? runMilestoneGraph(snapshot) : undefined
  const empty = (issue: string): MilestoneExecutionProjection => ({ graph: null, steps: [], teams: snapshot?.teams ?? [], nodeByStep: new Map(), dates: {}, unplaced: actual, issues: [issue] })
  if (!snapshot || !graph) return empty("The saved activity has no milestone workflow.")
  const problem = workflowMilestoneGraphError(graph, snapshot.steps, new Set(snapshot.teams.map(team => team.id)))
  if (problem) return empty(`The saved workflow needs review. ${problem}`)
  const keys = new Set(snapshot.steps.map(step => step.key)), nodeByStep = new Map<string, Node>(), unplaced: Node[] = []
  for (const node of actual) {
    const key = node.workflowSource?.templateStepId ?? node.stepKey
    if (!key || !keys.has(key) || nodeByStep.has(key)) unplaced.push(node)
    else nodeByStep.set(key, node)
  }
  const visible = new Set(nodeByStep.keys())
  const stationIds = new Set([graph.spine[0], graph.spine.at(-1)!, ...graph.eventDays.map(day => day.id)])
  const spine = graph.spine.filter(key => stationIds.has(key) || visible.has(key))
  // A condition may remove a shared task used as a branch junction. Preserve its
  // interval by attaching to the nearest surviving main-line station on that side.
  const surviving = new Set(spine)
  const boundary = (id: string, direction: -1 | 1) => {
    let index = graph.spine.indexOf(id)
    while (index >= 0 && index < graph.spine.length) {
      if (surviving.has(graph.spine[index])) return graph.spine[index]
      index += direction
    }
    return direction === -1 ? spine[0] : spine.at(-1)!
  }
  const projected: WorkflowMilestoneGraph = {
    ...graph,
    spine,
    teamBranches: graph.teamBranches.map(branch => ({ ...branch, fromId: boundary(branch.fromId, -1), toId: boundary(branch.toId, 1), stepIds: branch.stepIds.filter(key => visible.has(key)) })),
    taskAnchors: Object.fromEntries(Object.entries(graph.taskAnchors).filter(([key]) => visible.has(key))),
  }
  return {
    graph: projected,
    steps: snapshot.steps.filter(step => visible.has(step.key)).map(step => ({ ...step, title: nodeByStep.get(step.key)!.title })),
    teams: snapshot.teams,
    nodeByStep,
    dates: workflowMilestoneDates(graph, event.date),
    unplaced,
    issues: unplaced.length ? ["Some activity tasks are outside the saved diagram. They remain available below."] : [],
  }
}
