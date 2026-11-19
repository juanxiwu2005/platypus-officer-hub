import type { Change, TeamDirectory, TeamLaneCompilation, TeamWorkflowIssue, WorkflowStepRef, WorkflowTeamMap } from "./contracts"
import { validateDirectory } from "./directory"

export function emptyTeamMap(workflowId: string): WorkflowTeamMap {
  return { version: 1, workflowId, stepTeams: {} }
}
/** Team ownership is an overlay. It never rewrites tasks, branches, conditions, effort or dates. */
export function compileTeamLanes<T extends WorkflowStepRef>(workflowId: string, steps: readonly T[], directory: TeamDirectory, mapping: WorkflowTeamMap): TeamLaneCompilation<T> {
  const issues: TeamWorkflowIssue[] = validateDirectory(directory)
  const report = (code: string, message: string, entityId?: string) => issues.push({ code, message, entityId })
  const sameWorkflow = !!workflowId.trim() && mapping.version === 1 && mapping.workflowId === workflowId
  if (!sameWorkflow) report("wrong-workflow", "Use a version 1 team map for this workflow.")
  const byKey = new Map<string, T>(), teamIds = new Set(directory.teams.map(t => t.id))
  const owner = (key: string): string | null => {
    const value = sameWorkflow && Object.hasOwn(mapping.stepTeams, key) ? mapping.stepTeams[key] : undefined
    return typeof value === "string" && teamIds.has(value) ? value : null
  }
  const unassignedStepIds: string[] = []
  for (const step of steps) {
    if (!step.key.trim() || byKey.has(step.key)) report("duplicate-step", "Each workflow task needs a unique key.", step.key)
    byKey.set(step.key, step)
    if (!owner(step.key)) { unassignedStepIds.push(step.key); report("unassigned-step", "Assign this task to an existing team.", step.key) }
  }
  for (const key of Object.keys(mapping.stepTeams)) if (!byKey.has(key)) report("stale-assignment", "Remove or explicitly remap the assignment for this removed task.", key)
  const links = steps.flatMap(step => (step.dependsOn ?? []).map(fromStep => {
    if (!byKey.has(fromStep)) report("unknown-dependency", "A dependency references a task outside this workflow.", step.key)
    return { fromStep, toStep: step.key, fromTeam: owner(fromStep), toTeam: owner(step.key) }
  }))
  const visited = new Set<string>(), active = new Set<string>()
  const visit = (key: string) => {
    if (active.has(key)) { report("dependency-cycle", "Resolve the workflow dependency loop before using this template.", key); return }
    if (visited.has(key)) return
    visited.add(key); active.add(key)
    for (const parent of byKey.get(key)?.dependsOn ?? []) if (byKey.has(parent)) visit(parent)
    active.delete(key)
  }
  steps.forEach(step => visit(step.key))
  // Exactly one row per explicit team, including empty teams. No synthetic "unassigned" or per-phase rows.
  const lanes = directory.teams.map((team, row) => ({ team, row, steps: steps.filter(s => owner(s.key) === team.id) }))
  return { lanes, links, unassignedStepIds, issues, ready: issues.length === 0 }
}
export function assignStepsToTeam<T extends WorkflowStepRef>(workflowId: string, steps: readonly T[], directory: TeamDirectory, mapping: WorkflowTeamMap, stepKeys: readonly string[], teamId: string): Change<WorkflowTeamMap> {
  if (!workflowId.trim() || mapping.version !== 1 || mapping.workflowId !== workflowId) return { ok: false, issues: [{ code: "wrong-workflow", message: "Choose the team map for this workflow." }] }
  if (!directory.teams.some(t => t.id === teamId)) return { ok: false, issues: [{ code: "unknown-team", message: "Choose an existing team.", entityId: teamId }] }
  const keys = new Set(steps.map(s => s.key)), selected = [...new Set(stepKeys)]
  if (!selected.length || selected.some(k => !keys.has(k))) return { ok: false, issues: [{ code: "invalid-selection", message: "Select existing tasks in this workflow." }] }
  return { ok: true, value: { ...mapping, stepTeams: { ...mapping.stepTeams, ...Object.fromEntries(selected.map(k => [k, teamId])) } } }
}
