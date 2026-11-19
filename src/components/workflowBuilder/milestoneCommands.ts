import type { StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { createWorkflowMilestoneGraph, WORKFLOW_DAY_ONE, WORKFLOW_DAY_TWO, WORKFLOW_DONE, WORKFLOW_START } from "../../engine/workflowMilestones"
import { isAsuStep } from "../../engine/workflowPolicy"
import { createBuilderStep, newBuilderStepId, type BuilderSnapshot } from "./model"

type TeamBranch = WorkflowMilestoneGraph["teamBranches"][number]
type TaskAnchor = WorkflowMilestoneGraph["taskAnchors"][string]
const copy = <T,>(value: T): T => structuredClone(value)
const uniqueKey = (snapshot: BuilderSnapshot, key: string) => !!key && ![WORKFLOW_START, WORKFLOW_DONE, WORKFLOW_DAY_ONE, WORKFLOW_DAY_TWO].includes(key) && !snapshot.steps.some(step => step.key === key)

/** Existing metadata, including a broken draft awaiting review, is never replaced by a fresh graph. */
export function ensureMilestoneSnapshot(snapshot: BuilderSnapshot): BuilderSnapshot {
  return snapshot.milestoneGraph !== undefined ? snapshot : { ...snapshot, milestoneGraph: createWorkflowMilestoneGraph(snapshot.steps, snapshot.stepTeams) }
}

/** Infer a date reference from the branch interval without calculating an actual date. */
function branchAnchor(graph: WorkflowMilestoneGraph, branch: TeamBranch): TaskAnchor {
  const atTo = graph.eventDays.find(day => day.id === branch.toId)
  if (atTo) return { eventDayId: atTo.id, offsetDays: -1, unit: "calendar" }
  const startIndex = graph.spine.indexOf(branch.fromId)
  const preceding = graph.eventDays.filter(day => graph.spine.indexOf(day.id) <= startIndex).at(-1)
  if (preceding) return { eventDayId: preceding.id, offsetDays: 1, unit: "calendar" }
  return { eventDayId: graph.eventDays[0]?.id ?? WORKFLOW_DAY_ONE, offsetDays: -1, unit: "calendar" }
}

function defaultInterval(graph: WorkflowMilestoneGraph, close: boolean) {
  const lastDay = graph.eventDays.at(-1)?.id ?? WORKFLOW_DAY_ONE
  return close
    ? { fromId: lastDay, toId: WORKFLOW_DONE }
    : { fromId: WORKFLOW_START, toId: graph.spine[1] ?? WORKFLOW_DAY_ONE }
}

function freshBranch(graph: WorkflowMilestoneGraph, teamId: string, close = false): TeamBranch {
  let id = `route-${newBuilderStepId()}`
  while (graph.teamBranches.some(branch => branch.id === id)) id = `route-${newBuilderStepId()}`
  return { id, teamId, ...defaultInterval(graph, close), stepIds: [] }
}

function anchorForStep(graph: WorkflowMilestoneGraph, step: StepTemplate, branch: TeamBranch, referenceId?: string): TaskAnchor {
  const reference = referenceId && graph.taskAnchors[referenceId]
  const anchor = reference ? { ...reference } : branchAnchor(graph, branch)
  return isAsuStep(step) ? { ...anchor, eventDayId: WORKFLOW_DAY_ONE } : anchor
}

/** Reconcile real task additions/deletions only; unrelated invalid references remain visible for validation. */
export function syncMilestoneSnapshot(before: BuilderSnapshot, next: BuilderSnapshot): BuilderSnapshot {
  const original = next.milestoneGraph ?? before.milestoneGraph
  if (!original) return ensureMilestoneSnapshot(next)
  const previousKeys = new Set(before.steps.map(step => step.key)), keys = new Set(next.steps.map(step => step.key))
  const removed = new Set([...previousKeys].filter(key => !keys.has(key)))
  const added = next.steps.filter(step => !previousKeys.has(step.key))
  if (!removed.size && !added.length) return next.milestoneGraph === original ? next : { ...next, milestoneGraph: original }
  const graph = copy(original), oldSpine = [...graph.spine]
  graph.spine = graph.spine.filter(id => !removed.has(id))
  const survivingEndpoint = (id: string, direction: -1 | 1) => {
    const index = oldSpine.indexOf(id)
    if (index < 0) return id
    for (let at = index + direction; at >= 0 && at < oldSpine.length; at += direction) if (!removed.has(oldSpine[at])) return oldSpine[at]
    return id
  }
  graph.teamBranches = graph.teamBranches.map(branch => ({ ...branch,
    fromId: removed.has(branch.fromId) ? survivingEndpoint(branch.fromId, -1) : branch.fromId,
    toId: removed.has(branch.toId) ? survivingEndpoint(branch.toId, 1) : branch.toId,
    stepIds: branch.stepIds.filter(id => !removed.has(id)),
  }))
  for (const key of removed) delete graph.taskAnchors[key]
  for (const step of added) {
    // A graph-aware command may already have placed this new task. Do not duplicate it.
    if (graph.spine.includes(step.key) || graph.teamBranches.some(branch => branch.stepIds.includes(step.key))) continue
    const teamId = next.stepTeams[step.key] ?? ""
    const sharedParents = graph.spine.filter(id => step.dependsOn?.includes(id))
    const sharedChildren = graph.spine.filter(id => next.steps.find(item => item.key === id)?.dependsOn?.includes(step.key))
    const parent = sharedParents.at(-1), child = sharedChildren[0]
    const sharedInterval = parent || child ? {
      fromId: parent ?? graph.spine[graph.spine.indexOf(child!) - 1] ?? WORKFLOW_START,
      toId: child ?? graph.spine[graph.spine.indexOf(parent!) + 1] ?? WORKFLOW_DONE,
    } : null
    const matchesInterval = (branch: TeamBranch) => !sharedInterval || (branch.fromId === sharedInterval.fromId && branch.toId === sharedInterval.toId)
    const neighbor = graph.teamBranches.find(branch => branch.teamId === teamId && matchesInterval(branch) && branch.stepIds.some(id => step.dependsOn?.includes(id)))
      ?? graph.teamBranches.find(branch => branch.teamId === teamId && matchesInterval(branch) && branch.stepIds.some(id => next.steps.find(item => item.key === id)?.dependsOn?.includes(step.key)))
    const interval = sharedInterval ?? defaultInterval(graph, step.phase === "close")
    let branch = neighbor ?? graph.teamBranches.find(item => item.teamId === teamId && item.fromId === interval.fromId && item.toId === interval.toId)
    if (!branch) { branch = { ...freshBranch(graph, teamId, step.phase === "close"), ...interval }; graph.teamBranches.push(branch) }
    const predecessor = [...branch.stepIds].reverse().find(id => step.dependsOn?.includes(id))
    const successor = branch.stepIds.find(id => next.steps.find(item => item.key === id)?.dependsOn?.includes(step.key))
    const index = predecessor ? branch.stepIds.indexOf(predecessor) + 1 : successor ? branch.stepIds.indexOf(successor) : branch.stepIds.length
    branch.stepIds.splice(index, 0, step.key)
    if (!graph.taskAnchors[step.key]) {
      const referenceId = predecessor ?? successor ?? parent ?? child
      const anchor = anchorForStep(graph, step, branch, referenceId)
      const originalTarget = step.timing?.dueDays ?? (step.anchor?.kind === "target" || step.anchor?.kind === "rule" ? step.anchor.days : undefined)
      graph.taskAnchors[step.key] = !referenceId && originalTarget !== undefined
        ? { ...anchor, offsetDays: -originalTarget, unit: step.timing?.unit ?? ((step.anchor?.kind === "target" || step.anchor?.kind === "rule") ? step.anchor.unit : undefined) ?? "calendar" }
        : anchor
    }
  }
  return { ...next, milestoneGraph: graph }
}

export function setMilestoneDayCount(snapshot: BuilderSnapshot, count: 1 | 2): BuilderSnapshot {
  const current = ensureMilestoneSnapshot(snapshot), old = current.milestoneGraph!
  if ((count !== 1 && count !== 2) || old.eventDays.length === count || ![1, 2].includes(old.eventDays.length)) return current
  const graph = copy(old)
  if (count === 2) {
    const dayIndex = graph.spine.indexOf(WORKFLOW_DAY_ONE)
    if (dayIndex < 0 || graph.spine.includes(WORKFLOW_DAY_TWO)) return current
    graph.eventDays.push({ id: WORKFLOW_DAY_TWO, title: "Day 2", offsetDays: 1, details: "" })
    graph.spine.splice(dayIndex + 1, 0, WORKFLOW_DAY_TWO)
    const postKeys = new Set(old.teamBranches.filter(branch => old.spine.indexOf(branch.fromId) >= dayIndex).flatMap(branch => branch.stepIds))
    graph.teamBranches = graph.teamBranches.map(branch => branch.fromId === WORKFLOW_DAY_ONE ? { ...branch, fromId: WORKFLOW_DAY_TWO } : branch)
    for (const step of current.steps) if (!isAsuStep(step) && (step.phase === "close" || postKeys.has(step.key))) {
      const anchor = graph.taskAnchors[step.key]
      if (anchor?.eventDayId === WORKFLOW_DAY_ONE) graph.taskAnchors[step.key] = { ...anchor, eventDayId: WORKFLOW_DAY_TWO }
    }
  } else {
    graph.eventDays = graph.eventDays.filter(day => day.id !== WORKFLOW_DAY_TWO)
    graph.spine = graph.spine.filter(id => id !== WORKFLOW_DAY_TWO)
    graph.teamBranches = graph.teamBranches.map(branch => {
      const fromId = branch.fromId === WORKFLOW_DAY_TWO ? WORKFLOW_DAY_ONE : branch.fromId
      let toId = branch.toId === WORKFLOW_DAY_TWO ? WORKFLOW_DAY_ONE : branch.toId
      if (graph.spine.includes(fromId) && graph.spine.includes(toId) && graph.spine.indexOf(fromId) >= graph.spine.indexOf(toId)) toId = WORKFLOW_DONE
      return { ...branch, fromId, toId }
    })
    for (const [key, anchor] of Object.entries(graph.taskAnchors)) if (anchor.eventDayId === WORKFLOW_DAY_TWO) graph.taskAnchors[key] = { ...anchor, eventDayId: WORKFLOW_DAY_ONE }
  }
  return { ...current, milestoneGraph: graph }
}

export function addMilestoneBranch(snapshot: BuilderSnapshot, options: { teamId: string; fromId: string; toId: string }, id = newBuilderStepId()): BuilderSnapshot {
  const current = ensureMilestoneSnapshot(snapshot), graph = current.milestoneGraph!
  if (!id || graph.teamBranches.some(branch => branch.id === id)) return current
  return { ...current, milestoneGraph: { ...graph, teamBranches: [...graph.teamBranches, { id, ...options, stepIds: [] }] } }
}

export function addMilestoneTask(snapshot: BuilderSnapshot, branchId?: string, key = newBuilderStepId()): BuilderSnapshot {
  const current = ensureMilestoneSnapshot(snapshot)
  if (!uniqueKey(current, key)) return current
  const graph = copy(current.milestoneGraph!)
  let branch = branchId ? graph.teamBranches.find(item => item.id === branchId) : graph.teamBranches[0]
  if (!branch && branchId) return current
  if (!branch) {
    const teamId = Object.values(current.stepTeams).find(Boolean)
    if (!teamId) return current
    branch = freshBranch(graph, teamId); graph.teamBranches.push(branch)
  }
  const reference = current.steps.find(step => step.key === branch!.stepIds.at(-1))
  const step = createBuilderStep("New task", reference, current.branches, key)
  // The graph is the author of this branch's adjacency; no duplicate hidden chain is stored here.
  step.dependsOn = []
  if (!reference && graph.spine.indexOf(branch.fromId) >= graph.spine.indexOf(graph.eventDays.at(-1)?.id ?? WORKFLOW_DAY_ONE)) step.phase = "close"
  graph.taskAnchors[key] = anchorForStep(graph, step, branch, reference?.key)
  branch.stepIds.push(key)
  return { ...current, steps: [...current.steps, step], stepTeams: branch.teamId ? { ...current.stepTeams, [key]: branch.teamId } : current.stepTeams, milestoneGraph: graph }
}

export function addMilestoneCheck(snapshot: BuilderSnapshot, key = newBuilderStepId()): BuilderSnapshot {
  const current = ensureMilestoneSnapshot(snapshot)
  if (!uniqueKey(current, key)) return current
  const graph = copy(current.milestoneGraph!), firstDay = graph.eventDays[0]?.id ?? WORKFLOW_DAY_ONE
  const firstDayIndex = graph.spine.indexOf(firstDay)
  if (firstDayIndex < 0) return current
  const existingCheck = graph.spine.some(id => current.steps.some(step => step.key === id && (id === "finalcheck" || step.title.trim().toLowerCase() === "full check")))
  const reference = current.steps.find(step => step.key === graph.spine[firstDayIndex - 1])
  const step: StepTemplate = { ...createBuilderStep("Full check", reference, current.branches, key), phase: "prepare", placement: { branchId: "main", order: firstDayIndex }, stepKind: "core", estDays: 1,
    dependsOn: [], anchor: { kind: "target", days: 14, unit: "calendar", label: "Full check target" }, source: "Settings → Workflow preset: Full check" }
  delete step.cond
  graph.spine.splice(firstDayIndex, 0, key)
  if (!existingCheck) graph.teamBranches = graph.teamBranches.map(branch => {
    // A check cannot become the join for work already targeted after it. Empty branches keep their explicit interval.
    const beforeCheck = branch.stepIds.length > 0 && branch.stepIds.every(id => {
      const anchor = graph.taskAnchors[id], day = graph.eventDays.find(day => day.id === anchor?.eventDayId)
      return !!anchor && !!day && !(anchor.unit === "business" && anchor.offsetDays > 0) && day.offsetDays + anchor.offsetDays <= -14
    })
    return branch.toId === firstDay && beforeCheck ? { ...branch, toId: key } : branch
  })
  graph.taskAnchors[key] = { eventDayId: firstDay, offsetDays: -14, unit: "calendar" }
  const team = Object.values(current.stepTeams).find(Boolean) ?? graph.teamBranches.find(branch => branch.teamId)?.teamId
  return { ...current, steps: [...current.steps, step], stepTeams: { ...current.stepTeams, ...(team ? { [key]: team } : {}) }, milestoneGraph: graph }
}

/** Remove only old immediate in-path edges of the moved station. Cross-path explicit dependencies are retained. */
function detachOldPath(steps: StepTemplate[], path: string[], key: string): StepTemplate[] {
  const index = path.indexOf(key), predecessor = path[index - 1], successor = path[index + 1]
  if (index < 0) return steps
  return steps.map(step => {
    if (step.key === key && predecessor && step.dependsOn?.includes(predecessor)) return { ...step, dependsOn: step.dependsOn.filter(id => id !== predecessor) }
    if (step.key === successor && step.dependsOn?.includes(key)) return { ...step, dependsOn: [...new Set([...step.dependsOn.filter(id => id !== key), ...(predecessor ? [predecessor] : [])])] }
    return step
  })
}

export function moveMilestoneTask(snapshot: BuilderSnapshot, key: string, branchId: string, targetId?: string, before = false): BuilderSnapshot {
  const current = ensureMilestoneSnapshot(snapshot), original = current.milestoneGraph!
  const step = current.steps.find(item => item.key === key)
  if (!step) return current
  const source = original.teamBranches.find(branch => branch.stepIds.includes(key)), inSpine = original.spine.includes(key)
  const target = branchId === "__main__" ? null : original.teamBranches.find(branch => branch.id === branchId)
  if ((!source && !inSpine) || (branchId !== "__main__" && !target)) return current
  if (inSpine && original.teamBranches.some(branch => branch.fromId === key || branch.toId === key)) return current
  const oldPath = source?.stepIds ?? original.spine.filter(id => current.steps.some(item => item.key === id))
  const targetPath = target?.stepIds ?? original.spine
  if (targetId === key && source?.id === branchId) return current
  const reordered = targetPath.filter(id => id !== key)
  const at = !target ? reordered.indexOf(original.eventDays[0]?.id ?? WORKFLOW_DAY_ONE)
    : targetId && reordered.includes(targetId) ? reordered.indexOf(targetId) + (before ? 0 : 1) : reordered.length
  if (at < 0) return current
  reordered.splice(at, 0, key)
  if (((source && source.id === branchId) || (inSpine && branchId === "__main__")) && JSON.stringify(targetPath) === JSON.stringify(reordered)) return current
  const graph = copy(original)
  graph.spine = branchId === "__main__" ? reordered : graph.spine.filter(id => id !== key)
  graph.teamBranches = graph.teamBranches.map(branch => ({ ...branch, stepIds: branch.id === branchId ? reordered : branch.stepIds.filter(id => id !== key) }))
  const steps = detachOldPath(current.steps, oldPath, key)
  const changedInterval = target && (!source || source.fromId !== target.fromId || source.toId !== target.toId)
  const anchor = graph.taskAnchors[key]
  if (anchor && (changedInterval || branchId === "__main__")) graph.taskAnchors[key] = { ...anchor, eventDayId: isAsuStep(step) || !target ? WORKFLOW_DAY_ONE : branchAnchor(graph, target).eventDayId }
  const stepTeams = target ? { ...current.stepTeams } : current.stepTeams
  if (target) {
    if (target.teamId) stepTeams[key] = target.teamId
    else delete stepTeams[key]
  }
  return { ...current, steps, stepTeams, milestoneGraph: graph }
}

export function assignMilestoneBranchTeam(snapshot: BuilderSnapshot, branchId: string, teamId: string): BuilderSnapshot {
  const current = ensureMilestoneSnapshot(snapshot), graph = current.milestoneGraph!
  const branch = graph.teamBranches.find(item => item.id === branchId)
  if (!branch || branch.teamId === teamId) return current
  const stepTeams = { ...current.stepTeams }
  for (const key of branch.stepIds) {
    if (teamId) stepTeams[key] = teamId
    else delete stepTeams[key]
  }
  return { ...current, stepTeams, milestoneGraph: { ...graph,
    teamBranches: graph.teamBranches.map(item => item.id === branchId ? { ...item, teamId } : item),
  } }
}
