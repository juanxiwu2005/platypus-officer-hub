import type { DemoState, Event, StepTemplate, WorkflowBranch } from "../data/types"
import { computeSchedule } from "./schedule"
import { stepsAsNodes } from "./workflow"
import { addDays } from "../lib/dates"

/** Stable authored order. Dependencies always outrank the optional relative-date hint. */
function topologicalSteps(steps: readonly StepTemplate[], dates: Readonly<Record<string, string>> = {}): StepTemplate[] | null {
  const byKey = new Map(steps.map(step => [step.key, step]))
  if (byKey.size !== steps.length) return null
  const index = new Map(steps.map((step, position) => [step.key, position]))
  const done = new Set<string>()
  const result: StepTemplate[] = []
  const target = (step: StepTemplate) => step.timing?.dueDays ?? ((step.anchor?.kind === "target" || step.anchor?.kind === "rule") ? step.anchor.days : 0)
  while (result.length < steps.length) {
    const ready = steps.filter(step => !done.has(step.key) && (step.dependsOn ?? []).every(id => !byKey.has(id) || done.has(id)))
    ready.sort((a, b) => (dates[a.key] && dates[b.key] ? dates[a.key].localeCompare(dates[b.key]) : 0) || Number(a.phase === "close") - Number(b.phase === "close") || target(b) - target(a) || index.get(a.key)! - index.get(b.key)!)
    if (!ready.length) return null
    result.push(ready[0]); done.add(ready[0].key)
  }
  return result
}

/** Invalid drafts remain visible and are rejected by normal graph validation, never silently repaired. */
export function orderedWorkflowSteps(steps: readonly StepTemplate[]): StepTemplate[] {
  return topologicalSteps(steps) ?? [...steps]
}

/**
 * Settings authoring contract: one sequential chain per organization team; teams may work independently.
 * Projecting one global topological order into each team preserves every existing precedence without cycles.
 * Keep all cross-team handoffs, task IDs, conditions, dates and durations intact. Apply to drafts/new versions
 * only: never normalize historical versions or the task snapshots of existing Plan activities.
 */
export function sequenceTeamSteps(steps: readonly StepTemplate[], stepTeams: Readonly<Record<string, string>>, dates?: Readonly<Record<string, string>>): StepTemplate[] {
  const ordered = topologicalSteps(steps, dates)
  if (!ordered) return [...steps]
  const previous = new Map<string, string>()
  const deps = new Map<string, string[]>()
  for (const step of ordered) {
    const team = stepTeams[step.key]
    if (!team) continue
    const external = (step.dependsOn ?? []).filter(id => !stepTeams[id] || stepTeams[id] !== team)
    const before = previous.get(team)
    deps.set(step.key, [...new Set([...external, ...(before ? [before] : [])])])
    previous.set(team, step.key)
  }
  return steps.map(step => {
    const next = deps.get(step.key)
    return next && JSON.stringify(step.dependsOn ?? []) !== JSON.stringify(next) ? { ...step, dependsOn: next } : step
  })
}

/** Initial legacy conversion orders ready tasks by the existing engine's deadlines, including unanchored
 * safety tasks. Code-array order or missing anchors must not move early requirements after event day.
 * Existing chains and cross-team handoffs still take precedence. No task timing is rewritten here.
 */
export function sequenceTeamStepsForDraft(state: DemoState, steps: StepTemplate[], stepTeams: Readonly<Record<string, string>>, branches?: WorkflowBranch[], policy: "standard" | "custom" = "custom"): StepTemplate[] {
  const event: Event = { id: "workflow-sequence-preview", name: "Workflow sequence", date: addDays(state.today, 42), type: "social", headcount: 30, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: `workflow-editor-${policy}`, workflowBranches: branches }
  const nodes = stepsAsNodes(steps, event.id).map((node, index) => ({ ...node, ...(steps[index].timing ? { timing: steps[index].timing } : {}) }))
  const schedule = computeSchedule({ ...state, people: [], events: [event], nodes })
  const dates = Object.fromEntries(steps.map(step => [step.key, schedule.nodes[step.key]?.club ?? event.date]))
  return sequenceTeamSteps(steps, stepTeams, dates)
}
