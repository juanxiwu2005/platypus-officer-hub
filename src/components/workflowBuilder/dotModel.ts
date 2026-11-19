import type { StepTemplate } from "../../data/types"
import { orderedWorkflowSteps } from "../../engine/workflowSequence"
import { assignStepsToTeam } from "../../teamWorkflow/lanes"
import { createBuilderStep, insertTeamBuilderStep, newBuilderStepId, reorderTeamBuilderStep, type BuilderSnapshot } from "./model"

export type DotPreset = "full-check" | "event-day"

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
  const reference = selected ?? (teamId ? orderedWorkflowSteps(snapshot.steps).filter(step => snapshot.stepTeams[step.key] === teamId).at(-1) : undefined)
  let next: BuilderSnapshot
  if (reference) next = insertTeamBuilderStep(snapshot, reference.key, "after", key)
  else next = { ...snapshot, steps: [...snapshot.steps, createBuilderStep("New task", undefined, snapshot.branches, key)], stepTeams: { ...snapshot.stepTeams, ...(teamId ? { [key]: teamId } : {}) } }
  return options.preset ? { ...next, steps: next.steps.map(step => step.key === key ? applyPreset(step, options.preset!) : step) } : next
}

/** Team reassignment only changes the explicit map. Reordering within one team is a separate graph edit. */
export function moveDotTask(snapshot: BuilderSnapshot, key: string, teamId: string, teams: { id: string; name: string }[], targetId?: string, before = false): BuilderSnapshot {
  if (!snapshot.steps.some(step => step.key === key) || !teams.some(team => team.id === teamId)) return snapshot
  if (snapshot.stepTeams[key] === teamId) return targetId ? reorderTeamBuilderStep(snapshot, key, targetId, before) : snapshot
  const workflowId = "workflow-builder"
  const result = assignStepsToTeam(workflowId, snapshot.steps, { teams: teams.map(team => ({ ...team, leadRoleId: null })), roles: [], people: [] }, { version: 1, workflowId, stepTeams: snapshot.stepTeams }, [key], teamId)
  return result.ok ? { ...snapshot, stepTeams: result.value.stepTeams } : snapshot
}
