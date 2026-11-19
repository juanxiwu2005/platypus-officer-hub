import type { StepTemplate, WorkflowBranch } from "../../data/types"
import { checkWorkflow, MAX_STEPS } from "../../engine/workflow"
import { deletionReason, isAsuStep } from "../../engine/workflowPolicy"
import { placementOf } from "../../engine/workflowBranches"
import { workflowStepKind } from "../../engine/workflowStepKind"
import type { Role } from "../../data/types"

export interface BuilderSnapshot { steps: StepTemplate[]; branches?: WorkflowBranch[]; stepTeams: Record<string, string> }
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
  const old = new Set(checkWorkflow(previous.steps, roles, undefined, previous.branches).filter(issue => issue.level === "blocked").map(issue => `${issue.key}:${issue.text}`))
  return checkWorkflow(next.steps, roles, undefined, next.branches).find(issue => issue.level === "blocked" && !old.has(`${issue.key}:${issue.text}`))?.text ?? null
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

/** Insertion preserves the clicked task's business branch, scope, category, role and team. */
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

export function builderDeletionReason(step: StepTemplate, policy: BuilderPolicy): string | null {
  return policy === "standard" || isAsuStep(step) ? deletionReason(step) : null
}

export function deleteBuilderStep(snapshot: BuilderSnapshot, key: string): BuilderSnapshot {
  const gone = snapshot.steps.find(step => step.key === key)
  if (!gone) return snapshot
  const { [key]: _removed, ...stepTeams } = snapshot.stepTeams
  return { ...snapshot, stepTeams, steps: snapshot.steps.filter(step => step.key !== key).map(step => step.dependsOn?.includes(key) ? { ...step, dependsOn: [...new Set([...step.dependsOn.filter(id => id !== key), ...(gone.dependsOn ?? [])])] } : step) }
}

export const tLabel = (offset: number) => offset === 0 ? "T0" : `T${offset > 0 ? "+" : ""}${offset}`
