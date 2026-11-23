import type { StepTemplate, WorkflowBranch, WorkflowMilestoneGraph } from "../../data/types"
import { checkWorkflow, MAX_STEPS } from "../../engine/workflow"
import { deletionReason, isAsuStep, isCoreStep } from "../../engine/workflowPolicy"
import { placementOf } from "../../engine/workflowBranches"
import { orderedWorkflowSteps } from "../../engine/workflowSequence"
import { workflowStepKind } from "../../engine/workflowStepKind"
import type { Role } from "../../data/types"

export interface BuilderSnapshot { steps: StepTemplate[]; branches?: WorkflowBranch[]; stepTeams: Record<string, string>; milestoneGraph?: WorkflowMilestoneGraph }
export type BuilderPolicy = "standard" | "custom"
export type InsertPosition = "before" | "after" | "parallel"

/** UUIDs are authored identities: a title, row position or team change never regenerates them. */
export const newBuilderStepId = (): string => crypto.randomUUID()

export function graphError(steps: StepTemplate[]): string | null {
  if (steps.length > MAX_STEPS) return `A workflow can have up to ${MAX_STEPS} tasks.`
  const keys = new Set(steps.map(step => step.key))
  if (keys.size !== steps.length) return "Task identifiers must be unique."
  const visited = new Set<string>(), visiting = new Set<string>()
  const by = new Map(steps.map(step => [step.key, step]))
  const cycle = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    if ((by.get(id)?.dependsOn ?? []).some(cycle)) return true
    visiting.delete(id); visited.add(id)
    return false
  }
  for (const step of steps) {
    if ((step.dependsOn ?? []).some(id => !keys.has(id))) return "A prerequisite no longer exists in this workflow."
    if (cycle(step.key)) return "This dependency would create a loop."
  }
  return null
}

export function editError(previous: BuilderSnapshot, next: BuilderSnapshot, policy: BuilderPolicy, roles: Role[]): string | null {
  const generic = graphError(next.steps)
  if (generic) return generic
  if (policy === "custom") return null
  // An unfinished draft can be repaired one edit at a time, but may not acquire a new policy violation.
  // Template authoring: the organization's own core steps may be removed or moved; ASU steps stay protected.
  const options = { requireCoreSteps: false }
  const old = new Set(checkWorkflow(previous.steps, roles, undefined, previous.branches, options).filter(issue => issue.level === "blocked").map(issue => `${issue.key}:${issue.text}`))
  return checkWorkflow(next.steps, roles, undefined, next.branches, options).find(issue => issue.level === "blocked" && !old.has(`${issue.key}:${issue.text}`))?.text ?? null
}

export function createBuilderStep(title: string, reference?: StepTemplate, branches?: WorkflowBranch[], key = newBuilderStepId()): StepTemplate {
  return {
    key, title, fn: reference?.fn ?? "programs", ownerRoleId: reference?.ownerRoleId ?? null,
    phase: reference?.phase ?? "prepare", placement: reference ? { ...placementOf(reference), order: placementOf(reference).order + 0.5 } : { branchId: "main", order: 0 },
    stepKind: reference ? workflowStepKind(reference, branches) : "core", ...(reference?.cond ? { cond: reference.cond } : {}),
    estDays: 1, startPolicy: "effort", tier: "light", dependsOn: [],
    anchor: reference?.anchor?.kind === "target" ? { ...reference.anchor } : { kind: "target", days: 7, unit: "calendar", label: "Workflow target" },
    why: "", source: "Created in Settings → Workflow", custom: true,
  }
}

/** Legacy branch-aware insertion. Current Settings uses insertTeamBuilderStep for one chain per team. */
export function insertBuilderStep(snapshot: BuilderSnapshot, referenceId: string, position: InsertPosition, key = newBuilderStepId(), insertionBranch?: string): BuilderSnapshot {
  const reference = snapshot.steps.find(step => step.key === referenceId)
  if (!reference) return snapshot
  if (position === "before" && insertionBranch) {
    const incoming = snapshot.steps.filter(step => (reference.dependsOn ?? []).includes(step.key) && placementOf(step).branchId === insertionBranch)
    if (!incoming.length) return snapshot
    const context = incoming[incoming.length - 1]
    const fresh = createBuilderStep("New task", context, snapshot.branches, key)
    fresh.dependsOn = incoming.map(step => step.key)
    const incomingIds = new Set(fresh.dependsOn)
    const steps = snapshot.steps.map(step => step.key === referenceId ? { ...step, dependsOn: [...(step.dependsOn ?? []).filter(id => !incomingIds.has(id)), fresh.key] } : step)
    return { ...snapshot, steps: [...steps, fresh], stepTeams: { ...snapshot.stepTeams, ...(snapshot.stepTeams[context.key] ? { [fresh.key]: snapshot.stepTeams[context.key] } : {}) } }
  }
  const fresh = createBuilderStep("New task", reference, snapshot.branches, key)
  fresh.dependsOn = position === "after" ? [reference.key] : [...(reference.dependsOn ?? [])]
  const branch = placementOf(reference).branchId
  const steps = snapshot.steps.map(step => {
    if (position === "before" && step.key === reference.key) return { ...step, dependsOn: [fresh.key] }
    if (position === "after" && placementOf(step).branchId === branch && step.dependsOn?.includes(reference.key)) return { ...step, dependsOn: step.dependsOn.map(id => id === reference.key ? fresh.key : id) }
    return step
  })
  return { ...snapshot, steps: [...steps, fresh], stepTeams: { ...snapshot.stepTeams, ...(snapshot.stepTeams[reference.key] ? { [fresh.key]: snapshot.stepTeams[reference.key] } : {}) } }
}

/**
 * ASU-rule steps, and steps an ASU step waits for, always stay. In the preset the organization's own core
 * steps may be removed (Restore Platypus preset brings them back); custom templates protect only ASU steps.
 */
export function builderDeletionReason(step: StepTemplate, policy: BuilderPolicy, steps: readonly StepTemplate[] = []): string | null {
  if (isAsuStep(step)) return deletionReason(step)
  if (steps.some(other => other.key !== step.key && isAsuStep(other) && other.dependsOn?.includes(step.key))) return "A school-required step waits for this step."
  if (policy !== "standard" || isCoreStep(step)) return null
  return deletionReason(step)
}

export function deleteBuilderStep(snapshot: BuilderSnapshot, key: string): BuilderSnapshot {
  const gone = snapshot.steps.find(step => step.key === key)
  if (!gone) return snapshot
  const { [key]: _removed, ...stepTeams } = snapshot.stepTeams
  return { ...snapshot, stepTeams, steps: snapshot.steps.filter(step => step.key !== key).map(step => step.dependsOn?.includes(key) ? { ...step, dependsOn: [...new Set([...step.dependsOn.filter(id => id !== key), ...(gone.dependsOn ?? [])])] } : step) }
}

export const tLabel = (offset: number) => offset === 0 ? "T0" : `T${offset > 0 ? "+" : ""}${offset}`

/** Legacy date-axis helpers; current Settings drags call reorderTeamBuilderStep and never shift a target. */
export function taskDragBlockReason(step: StepTemplate): string | null {
  if (isAsuStep(step)) return "School deadlines are locked. Change workdays or days early instead."
  if ((step.anchor?.kind === "target" && step.anchor.unit === "business") || step.timing?.unit === "business") return "This task uses working-day targets. Use Finish by (T±) to set a calendar-day target first."
  if (step.anchor && step.anchor.kind !== "target") return "This task uses a linked date. Use Finish by (T±) to choose a calendar-day target first."
  return null
}

/** Moving right is later: subtract calendar days from the stored T-minus offset. */
export function shiftBuilderTaskTarget(step: StepTemplate, calendarDays: number, previewFinish: number): { step: StepTemplate; error: string | null } {
  const error = taskDragBlockReason(step)
  if (error) return { step, error }
  if (!Number.isInteger(calendarDays) || !Number.isFinite(previewFinish)) return { step, error: "Choose a whole calendar-day shift." }
  if (!calendarDays) return { step, error: null }
  const oldDays = step.anchor?.kind === "target" ? step.anchor.days : step.timing?.dueDays ?? -previewFinish
  const days = oldDays - calendarDays
  if (days < -180 || days > 180) return { step, error: "Keep the target between T−180 and T+180." }
  const shift = oldDays - days
  return {
    step: {
      ...step,
      anchor: { kind: "target", days, unit: "calendar", label: step.anchor?.kind === "target" ? step.anchor.label : "Dragged workflow target" },
      // A calibrated window moves as a whole. Workdays, personal buffers and dependencies
      // are still interpreted only by the schedule engine after this authoring edit.
      ...(step.timing ? { timing: { ...step.timing, startDays: step.timing.startDays - shift, dueDays: step.timing.dueDays - shift } } : {}),
    },
    error: null,
  }
}

/** Settings insertion always follows the clicked task's team, regardless of incoming business branches. */
export function insertTeamBuilderStep(snapshot: BuilderSnapshot, referenceId: string, position: "before" | "after", key = newBuilderStepId()): BuilderSnapshot {
  const reference = snapshot.steps.find(step => step.key === referenceId)
  if (!reference) return snapshot
  const team = snapshot.stepTeams[referenceId]
  const fresh = createBuilderStep("New task", reference, snapshot.branches, key)
  fresh.dependsOn = position === "after" ? [referenceId] : [...(reference.dependsOn ?? [])]
  const steps = snapshot.steps.map(step => {
    if (position === "before" && step.key === referenceId) return { ...step, dependsOn: [...(step.dependsOn ?? []).filter(id => !team || snapshot.stepTeams[id] !== team), fresh.key] }
    if (position === "after" && team && snapshot.stepTeams[step.key] === team && step.dependsOn?.includes(referenceId)) return { ...step, dependsOn: step.dependsOn.map(id => id === referenceId ? fresh.key : id) }
    return step
  })
  return { ...snapshot, steps: [...steps, fresh], stepTeams: { ...snapshot.stepTeams, ...(team ? { [fresh.key]: team } : {}) } }
}

/** Explicit drag rewrites only this team's order. Call editError before accepting the whole transaction. */
export function reorderTeamBuilderStep(snapshot: BuilderSnapshot, key: string, targetId: string, before: boolean): BuilderSnapshot {
  const team = snapshot.stepTeams[key]
  if (!team || snapshot.stepTeams[targetId] !== team || key === targetId) return snapshot
  const ordered = orderedWorkflowSteps(snapshot.steps).filter(step => snapshot.stepTeams[step.key] === team).map(step => step.key)
  ordered.splice(ordered.indexOf(key), 1)
  ordered.splice(ordered.indexOf(targetId) + (before ? 0 : 1), 0, key)
  const previous = new Map(ordered.map((id, index) => [id, ordered[index - 1]]))
  const steps = snapshot.steps.map(step => {
    if (snapshot.stepTeams[step.key] !== team) return step
    const external = (step.dependsOn ?? []).filter(id => snapshot.stepTeams[id] !== team)
    const preceding = previous.get(step.key)
    return { ...step, dependsOn: [...external, ...(preceding ? [preceding] : [])] }
  })
  return { ...snapshot, steps }
}
