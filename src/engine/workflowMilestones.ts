import type { StepTemplate, WorkflowMilestoneGraph } from "../data/types"
import { addDays } from "../lib/dates"
import { shiftWork } from "./calendar"
import { orderedWorkflowSteps } from "./workflowSequence"
import { isAsuStep } from "./workflowPolicy"
import { placementOf } from "./workflowBranches"

export const WORKFLOW_START = "__start__"
export const WORKFLOW_DONE = "__end__"
export const WORKFLOW_DAY_ONE = "__event__"
export const WORKFLOW_DAY_TWO = "__event2__"
const reserved = new Set([WORKFLOW_START, WORKFLOW_DONE, WORKFLOW_DAY_ONE, WORKFLOW_DAY_TWO])

/** Creates version metadata only. Original tasks, business conditions and dependency objects stay untouched. */
export function createWorkflowMilestoneGraph(steps: readonly StepTemplate[], stepTeams: Readonly<Record<string, string>>, dayCount: 1 | 2 = 1): WorkflowMilestoneGraph {
  const ordered = orderedWorkflowSteps(steps)
  const byKey = new Set(steps.map(step => step.key))
  const before = ["finalcheck", "checkin"].filter(key => byKey.has(key))
  const after = ["headcount"].filter(key => byKey.has(key))
  const days = dayCount === 2 ? [WORKFLOW_DAY_ONE, WORKFLOW_DAY_TWO] : [WORKFLOW_DAY_ONE]
  const spine = [WORKFLOW_START, ...before, ...days, ...after, WORKFLOW_DONE]
  const shared = new Set(spine), groups = new Map<string, { teamId: string; close: boolean; stepIds: string[] }>()
  for (const step of ordered) {
    if (shared.has(step.key)) continue
    const teamId = stepTeams[step.key] ?? ""
    const close = step.phase === "close", id = JSON.stringify([teamId, close, placementOf(step).branchId])
    const group = groups.get(id) ?? { teamId, close, stepIds: [] }
    group.stepIds.push(step.key); groups.set(id, group)
  }
  return {
    version: 1, start: { title: "Start", details: "" }, done: { title: "Done", details: "" }, spine,
    eventDays: days.map((id, index) => ({ id, title: dayCount === 1 ? "Event day" : `Day ${index + 1}`, offsetDays: index, details: "" })),
    teamBranches: [...groups.values()].map((group, index) => ({ id: `team-route-${index + 1}`, teamId: group.teamId, fromId: group.close ? after.at(-1) ?? days.at(-1)! : WORKFLOW_START, toId: group.close ? WORKFLOW_DONE : before[0] ?? days[0], stepIds: group.stepIds })),
    taskAnchors: Object.fromEntries(steps.map(step => {
      const timing = step.timing, anchor = step.anchor?.kind === "rule" || step.anchor?.kind === "target" ? step.anchor : undefined
      return [step.key, { eventDayId: step.phase === "close" ? days.at(-1)! : days[0], offsetDays: -(timing?.dueDays ?? anchor?.days ?? (step.phase === "close" ? -1 : 7)), unit: timing?.unit ?? anchor?.unit ?? "calendar" }]
    })),
  }
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
const text = (value: unknown, max: number, empty = false): value is string => typeof value === "string" && (empty || !!value.trim()) && value.length <= max
const endpoint = (value: unknown): boolean => object(value) && text(value.title, 120) && text(value.details, 2000, true)

/** One strict validator for drafts, publication, execution and editor errors. Unknown structures never execute. */
export function workflowMilestoneGraphError(value: unknown, steps: readonly StepTemplate[], teamIds?: ReadonlySet<string>): string | null {
  if (!object(value) || value.version !== 1 || !endpoint(value.start) || !endpoint(value.done) || !Array.isArray(value.eventDays) || value.eventDays.length < 1 || value.eventDays.length > 2) return "Use a supported one-day or two-day workflow."
  const graph = value as unknown as WorkflowMilestoneGraph
  for (const [index, day] of graph.eventDays.entries()) {
    if (!object(day) || !text(day.title, 120) || !text(day.details, 2000, true) || day.id !== (index === 0 ? WORKFLOW_DAY_ONE : WORKFLOW_DAY_TWO) || !Number.isInteger(day.offsetDays) || (index === 0 ? day.offsetDays !== 0 : day.offsetDays < 1 || day.offsetDays > 365)) return "Day 1 stays on the activity date; Day 2 must be 1 to 365 calendar days later."
  }
  const keys = new Set(steps.map(step => step.key)), days = new Set(graph.eventDays.map(day => day.id))
  if (keys.size !== steps.length || steps.some(step => reserved.has(step.key))) return "Give real tasks stable IDs separate from workflow stations."
  if (!Array.isArray(graph.spine) || graph.spine.length < graph.eventDays.length + 2 || graph.spine.length > steps.length + 4 || graph.spine[0] !== WORKFLOW_START || graph.spine.at(-1) !== WORKFLOW_DONE || new Set(graph.spine).size !== graph.spine.length || graph.spine.some(id => typeof id !== "string" || (!keys.has(id) && !days.has(id) && id !== WORKFLOW_START && id !== WORKFLOW_DONE)) || graph.eventDays.some(day => !graph.spine.includes(day.id)) || (days.size === 2 && graph.spine.indexOf(WORKFLOW_DAY_ONE) > graph.spine.indexOf(WORKFLOW_DAY_TWO))) return "Keep Start, each event day and Done in order on the main line."
  if (!Array.isArray(graph.teamBranches) || graph.teamBranches.length > 60 || !object(graph.taskAnchors)) return "Use valid team branches and task dates."
  const occupied = new Set(graph.spine.filter(id => keys.has(id))), branchIds = new Set<string>()
  for (const branch of graph.teamBranches) {
    if (!object(branch) || !text(branch.id, 100) || branchIds.has(branch.id) || !text(branch.teamId, 100, true) || (teamIds && (!branch.teamId.trim() || !teamIds.has(branch.teamId))) || !Array.isArray(branch.stepIds) || !graph.spine.includes(branch.fromId) || !graph.spine.includes(branch.toId) || graph.spine.indexOf(branch.fromId) >= graph.spine.indexOf(branch.toId)) return "Choose an existing team and main-line departure and arrival for every branch."
    if (branch.details !== undefined && !text(branch.details, 400, true)) return "Keep each team branch description to 400 characters."
    branchIds.add(branch.id)
    for (const key of branch.stepIds) {
      if (!keys.has(key) || occupied.has(key)) return "Place each real task exactly once on the main line or a team branch."
      occupied.add(key)
    }
  }
  if (occupied.size !== keys.size) return "Place each real task exactly once on the main line or a team branch."
  if (Object.keys(graph.taskAnchors).length !== keys.size || Object.keys(graph.taskAnchors).some(key => !keys.has(key))) return "Choose an event day for every task date."
  for (const step of steps) {
    const anchor = graph.taskAnchors[step.key]
    if (!object(anchor) || !days.has(anchor.eventDayId) || !Number.isInteger(anchor.offsetDays) || Math.abs(anchor.offsetDays) > 365 || (anchor.unit !== undefined && anchor.unit !== "calendar" && anchor.unit !== "business")) return "Set each task within 365 whole days of an existing event day."
    if (isAsuStep(step) && anchor.eventDayId !== WORKFLOW_DAY_ONE) return "School-required dates stay anchored to Day 1."
  }
  const projected = new Map(workflowMilestoneSteps(steps, graph).map(step => [step.key, step]))
  const visited = new Set<string>(), active = new Set<string>()
  const acyclic = (id: string): boolean => {
    if (active.has(id)) return false
    if (visited.has(id)) return true
    active.add(id)
    if ((projected.get(id)?.dependsOn ?? []).some(parent => !projected.has(parent) || !acyclic(parent))) return false
    active.delete(id); visited.add(id)
    return true
  }
  if (steps.some(step => !acyclic(step.key))) return "The main line, branch joins and existing prerequisites must not form a loop."
  return null
}

/** Event days are pinned calendar dates; no task status or unfinished prerequisite can move them. */
export function workflowMilestoneDates(graph: WorkflowMilestoneGraph, eventDate: string): Record<string, string> {
  return Object.fromEntries(graph.eventDays.map(day => [day.id, addDays(eventDate, day.offsetDays)]))
}

export function workflowMilestoneTaskDate(graph: WorkflowMilestoneGraph, stepKey: string, eventDate: string): string | null {
  const anchor = graph.taskAnchors[stepKey], day = graph.eventDays.find(item => item.id === anchor?.eventDayId)
  if (!anchor || !day) return null
  const date = addDays(eventDate, day.offsetDays)
  return anchor.unit === "business" ? shiftWork(date, anchor.offsetDays) : addDays(date, anchor.offsetDays)
}

/** Add the explicitly authored paths to real task prerequisites, passing transparently through non-task stations. */
export function workflowMilestoneSteps(steps: readonly StepTemplate[], graph: WorkflowMilestoneGraph): StepTemplate[] {
  const keys = new Set(steps.map(step => step.key)), incoming = new Map<string, Set<string>>()
  const path = (ids: string[]) => {
    for (let index = 1; index < ids.length; index++) {
      const sources = incoming.get(ids[index]) ?? new Set<string>()
      sources.add(ids[index - 1]); incoming.set(ids[index], sources)
    }
  }
  path(graph.spine)
  for (const branch of graph.teamBranches) path([branch.fromId, ...branch.stepIds, branch.toId])
  const realParents = (id: string, seen = new Set<string>()): string[] => {
    if (keys.has(id)) return [id]
    if (seen.has(id)) return []
    const next = new Set(seen); next.add(id)
    return [...incoming.get(id) ?? []].flatMap(parent => realParents(parent, next))
  }
  return steps.map(step => ({ ...step, dependsOn: [...new Set([...(step.dependsOn ?? []), ...[...incoming.get(step.key) ?? []].flatMap(parent => realParents(parent))])] }))
}
