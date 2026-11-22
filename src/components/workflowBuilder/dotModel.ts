import type { StepTemplate } from "../../data/types"
import { orderedWorkflowSteps } from "../../engine/workflowSequence"
import { placementOf } from "../../engine/workflowBranches"
import { assignStepsToTeam } from "../../teamWorkflow/lanes"
import { createBuilderStep, insertTeamBuilderStep, newBuilderStepId, type BuilderSnapshot } from "./model"

export type DotPreset = "full-check" | "event-day"

/** Explicit canvas order can position independent tasks without changing their dates or dependencies. */
export function orderedDotSteps(steps: readonly StepTemplate[]): StepTemplate[] {
  const baseline = orderedWorkflowSteps(steps)
  const index = new Map(baseline.map((step, position) => [step.key, position]))
  const keys = new Set(steps.map(step => step.key)), done = new Set<string>(), result: StepTemplate[] = []
  const priority = (step: StepTemplate) => step.placement?.order ?? index.get(step.key)!
  while (result.length < steps.length) {
    const ready = steps.filter(step => !done.has(step.key) && (step.dependsOn ?? []).every(id => !keys.has(id) || done.has(id)))
    ready.sort((a, b) => priority(a) - priority(b) || index.get(a.key)! - index.get(b.key)!)
    // Broken drafts remain available for the editor's normal graph validation.
    if (!ready.length) return baseline
    result.push(ready[0]); done.add(ready[0].key)
  }
  return result
}

/** Reordering a real chain changes that chain only. Parallel work never acquires a new dependency. */
function reorderDotTask(snapshot: BuilderSnapshot, key: string, teamId: string, targetId: string, before: boolean): BuilderSnapshot {
  if (key === targetId || snapshot.stepTeams[targetId] !== teamId || !snapshot.steps.some(step => step.key === targetId)) return snapshot
  const original = orderedDotSteps(snapshot.steps).filter(step => snapshot.stepTeams[step.key] === teamId).map(step => step.key)
  const order = original.filter(id => id !== key)
  order.splice(order.indexOf(targetId) + (before ? 0 : 1), 0, key)
  if (order.every((id, index) => id === original[index])) return snapshot

  const teamKeys = new Set(original), byKey = new Map(snapshot.steps.map(step => [step.key, step]))
  const parents = (id: string) => [...new Set((byKey.get(id)?.dependsOn ?? []).filter(parent => teamKeys.has(parent)))]
  const children = (id: string) => original.filter(child => parents(child).includes(id))
  const component = new Set<string>()
  const visit = (id: string) => {
    if (component.has(id)) return
    component.add(id)
    for (const neighbor of [...parents(id), ...children(id)]) visit(neighbor)
  }
  visit(key)
  // Branching dependency graphs retain their exact precedence; moving one station must not serialize their siblings.
  const chain = component.size > 1 && [...component].every(id => parents(id).length <= 1 && children(id).length <= 1)
  const chainOrder = order.filter(id => component.has(id))
  const preceding = new Map(chainOrder.map((id, index) => [id, chainOrder[index - 1]]))
  const position = new Map(order.map((id, index) => [id, index]))
  const steps = snapshot.steps.map(step => {
    if (!teamKeys.has(step.key)) return step
    const dependencies = chain && component.has(step.key)
      ? [...(step.dependsOn ?? []).filter(id => !component.has(id)), ...(preceding.get(step.key) ? [preceding.get(step.key)!] : [])]
      : step.dependsOn
    return { ...step, placement: { ...placementOf(step), order: position.get(step.key)! }, ...(dependencies ? { dependsOn: dependencies } : {}) }
  })
  return { ...snapshot, steps }
}

/** Presets are independent authored tasks, never the reserved event station or a second activity date. */
function applyPreset(step: StepTemplate, preset: DotPreset): StepTemplate {
  const { cond: _condition, timing: _timing, ...rest } = step
  void _condition; void _timing
  const eventDay = preset === "event-day"
  return {
    ...rest, title: eventDay ? "Event day" : "Full check", estDays: eventDay ? 0 : 1,
    phase: "prepare", placement: { branchId: "main", order: step.placement?.order ?? 0 }, stepKind: "core",
    anchor: { kind: "target", days: eventDay ? 0 : 14, unit: "calendar", label: eventDay ? "Event day milestone" : "Full check target" },
    source: `Settings → Workflow preset: ${eventDay ? "Event day" : "Full check"}`, custom: true,
  }
}

/** The one-button action appends to the chosen team or inserts after its selected task. */
export function addDotTask(snapshot: BuilderSnapshot, options: { teamId?: string; afterKey?: string; preset?: DotPreset }, key = newBuilderStepId()): BuilderSnapshot {
  if (snapshot.steps.some(step => step.key === key)) return snapshot
  const teamId = options.teamId ?? (options.afterKey ? snapshot.stepTeams[options.afterKey] : undefined)
  const selected = teamId && options.afterKey ? snapshot.steps.find(step => step.key === options.afterKey && snapshot.stepTeams[step.key] === teamId) : undefined
  const reference = selected ?? (teamId ? orderedDotSteps(snapshot.steps).filter(step => snapshot.stepTeams[step.key] === teamId).at(-1) : undefined)
  let next: BuilderSnapshot
  if (reference) next = insertTeamBuilderStep(snapshot, reference.key, "after", key)
  else next = { ...snapshot, steps: [...snapshot.steps, createBuilderStep("New task", undefined, snapshot.branches, key)], stepTeams: { ...snapshot.stepTeams, ...(teamId ? { [key]: teamId } : {}) } }
  return options.preset ? { ...next, steps: next.steps.map(step => step.key === key ? applyPreset(step, options.preset!) : step) } : next
}

/** Team reassignment only changes the explicit map. Reordering within one team is a separate graph edit. */
export function moveDotTask(snapshot: BuilderSnapshot, key: string, teamId: string, teams: { id: string; name: string }[], targetId?: string, before = false): BuilderSnapshot {
  if (!snapshot.steps.some(step => step.key === key) || !teams.some(team => team.id === teamId)) return snapshot
  if (snapshot.stepTeams[key] === teamId) return targetId ? reorderDotTask(snapshot, key, teamId, targetId, before) : snapshot
  const workflowId = "workflow-builder"
  const result = assignStepsToTeam(workflowId, snapshot.steps, { teams: teams.map(team => ({ ...team, leadRoleId: null })), roles: [], people: [] }, { version: 1, workflowId, stepTeams: snapshot.stepTeams }, [key], teamId)
  return result.ok ? { ...snapshot, stepTeams: result.value.stepTeams } : snapshot
}
