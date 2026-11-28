import type { DemoState, Node, StepTemplate, WorkflowMilestoneGraph } from "./types"
import { buildEventNodes } from "../engine/playbooks"
import { applySchedule, topoOrder } from "../engine/schedule"
import { workflowMilestoneGraphError, workflowMilestoneSteps } from "../engine/workflowMilestones"
import { cannotDelete } from "../lib/flowEdit"
import { MAX_STEPS } from "../engine/workflow"
import { lazyActions } from "./lazyActions"

/**
 * Edit flow for an event made from a saved workflow template (Juanxi 2026-11-28: template events need Edit flow too).
 * Plan opens the same editor Settings uses, on this event's own copy of the workflow (`workflowRun.snapshot`), so the
 * event's chart keeps the Settings look and shows every edit. The template itself is never changed.
 *
 * Saving rebuilds the event's task structure from the edited copy and keeps every task's work: a task that stays keeps
 * its id, owner, status, notes, links and dates set by people; only its title, team, branch, dependencies and timing follow
 * the edit. A new step becomes a new task. A step taken out removes its task, unless the task has work on it or an
 * ASU rule needs it.
 */
export interface RunFlowDefinition { steps: StepTemplate[]; stepTeams: Record<string, string>; graph: WorkflowMilestoneGraph }

/** The fields Edit flow may change on a task that stays. Everything else on the task is work and is kept. */
const STRUCTURE = ["title", "stepKind", "placement", "startPolicy", "cond", "phase", "fn", "dependsOn", "tier", "estDays", "anchor", "ruleIds", "why", "source", "teamId"] as const

const hasWork = (node: Node) => node.status === "done" || node.status === "in_progress" || node.status === "waiting" || node.status === "blocked" || !!node.taskWork?.files.length || !!node.taskWork?.drafts.length || !!node.taskWork?.submissions.length || !!node.externalLinks?.length || !!node.draftLink

/** Why this edit cannot be saved, in words for the person; null when it can. */
export function runFlowEditError(state: DemoState, eventId: string, def: RunFlowDefinition): string | null {
  return planRunFlowEdit(state, eventId, def).error
}

export function editRunFlow(state: DemoState, eventId: string, def: RunFlowDefinition): DemoState {
  const plan = planRunFlowEdit(state, eventId, def)
  if (plan.error || !plan.next) return state
  return plan.next
}

function planRunFlowEdit(state: DemoState, eventId: string, def: RunFlowDefinition): { error: string | null; next?: DemoState } {
  const fail = (error: string) => ({ error })
  const event = state.events.find(candidate => candidate.id === eventId)
  const run = event?.workflowRun
  if (!event || !run) return fail("This event was not made from a saved workflow.")
  if (!def || !Array.isArray(def.steps) || !def.graph || typeof def.stepTeams !== "object" || def.stepTeams === null) return fail("The edited workflow is incomplete.")
  if (def.steps.length > MAX_STEPS) return fail(`A workflow can have up to ${MAX_STEPS} tasks.`)
  const teamIds = new Set(run.snapshot.teams.map(team => team.id))
  const graphProblem = workflowMilestoneGraphError(def.graph, def.steps, teamIds)
  if (graphProblem) return fail(graphProblem)
  if (def.steps.some(step => !teamIds.has(def.stepTeams[step.key]))) return fail("Choose a team for every task.")

  const snapshot = { ...structuredClone(run.snapshot), steps: structuredClone(def.steps), milestoneGraph: structuredClone(def.graph), teamMap: { version: 1 as const, workflowId: run.templateId, ...run.snapshot.teamMap, stepTeams: { ...def.stepTeams } } }
  const edited = { ...event, workflowRun: { ...run, snapshot } }
  const generated = buildEventNodes(edited, state.roles, { steps: workflowMilestoneSteps(snapshot.steps, snapshot.milestoneGraph), branches: snapshot.branches, mode: snapshot.kind, explicitOwnersOnly: true, restoreMissingCore: false })

  const mine = state.nodes.filter(node => node.eventId === eventId)
  const ofRun = (node: Node) => node.workflowSource?.runId === run.id
  const byStep = new Map(mine.filter(ofRun).map(node => [node.workflowSource!.templateStepId, node]))
  const idOf = new Map(generated.map(node => [node.id, byStep.get(node.stepKey!)?.id ?? `${run.id}:${node.stepKey}`]))
  const keep = new Set(generated.map(node => node.stepKey!))

  const removed = mine.filter(node => ofRun(node) && !keep.has(node.workflowSource!.templateStepId))
  for (const node of removed) {
    const reason = cannotDelete(node)
    if (reason) return fail(`“${node.title}” stays: ${reason}`)
    if (hasWork(node)) return fail(`“${node.title}” has work on it, so it stays.`)
  }

  const rebuilt = generated.map(fresh => {
    const id = idOf.get(fresh.id)!
    const dependsOn = fresh.dependsOn.map(dep => idOf.get(dep)).filter((dep): dep is string => !!dep)
    const teamId = snapshot.teamMap.stepTeams[fresh.stepKey!]
    const live = byStep.get(fresh.stepKey!)
    if (live) {
      const structure = Object.fromEntries(STRUCTURE.map(key => [key, key === "dependsOn" ? dependsOn : key === "teamId" ? teamId : (fresh as unknown as Record<string, unknown>)[key]]))
      return { ...live, ...structure } as Node
    }
    return { ...fresh, id, dependsOn, teamId, workflowSource: { runId: run.id, templateId: run.templateId, templateVersion: run.templateVersion, templateStepId: fresh.stepKey! }, assignedOn: state.today, ownerVersion: 0, acceptedOn: fresh.ownerId ? state.today : null } as Node
  })
  if (rebuilt.some(node => state.nodes.some(other => other.id === node.id && other.eventId !== eventId))) return fail("A task with this ID already exists.")
  // Tasks of this event that are not part of the saved workflow (a linked club task, a step added another way) stay as they are.
  const gone = new Set(removed.map(node => node.id))
  const others = mine.filter(node => !ofRun(node)).map(node => node.dependsOn.some(dep => gone.has(dep)) ? { ...node, dependsOn: node.dependsOn.filter(dep => !gone.has(dep)) } : node)
  const eventNodes = [...rebuilt, ...others]
  if (topoOrder(eventNodes).looped.length) return fail("A task cannot wait for itself through other tasks.")

  const drop = <T extends { nodeId: string }>(items: T[]) => items.filter(item => !gone.has(item.nodeId))
  const next: DemoState = {
    ...state,
    events: state.events.map(candidate => (candidate.id === eventId ? edited : candidate)),
    nodes: [...state.nodes.filter(node => node.eventId !== eventId), ...eventNodes],
    nudges: drop(state.nudges), extensionRequests: drop(state.extensionRequests), notifications: drop(state.notifications),
    silenceCases: drop(state.silenceCases), protocolLog: drop(state.protocolLog), officerGrants: drop(state.officerGrants),
  }
  return { error: null, next: applySchedule(next) }
}

lazyActions.editRunFlow = editRunFlow
