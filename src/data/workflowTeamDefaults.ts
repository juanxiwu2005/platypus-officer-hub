import type { DemoState, RoleFunction, StepTemplate, WorkflowPresetTeam, WorkflowTeam } from "./types"

/** Production defaults restored from the approved 46-task v3 work-group layout.
 * Names are editable labels. These semantic slots and stable team IDs carry the links.
 * Do not import the fictional people/directory fixture to construct organization data.
 */
export const WORKFLOW_PRESET_TEAMS: readonly { key: WorkflowPresetTeam; id: string; name: string; functions: RoleFunction[] }[] = [
  { key: "leadership", id: "workflow-leadership", name: "Club leadership", functions: ["president", "vice_president"] },
  { key: "operations", id: "workflow-operations", name: "Operations", functions: ["programs", "secretary"] },
  { key: "marketing", id: "workflow-marketing", name: "Marketing", functions: ["marketing"] },
  { key: "finance", id: "workflow-finance", name: "Finance", functions: ["finance"] },
]
const PRESET_STEPS: Record<WorkflowPresetTeam, readonly string[]> = {
  leadership: ["finalcheck"],
  operations: ["plan", "backup", "venuechoice", "registry", "venue", "moderator", "materials", "checkin", "headcount", "thankyou", "feedback", "documentation", "partner", "speakerPacket", "travel", "partnerReview", "parking", "advisor", "access", "security", "eams", "permit", "alcohol", "drone", "schoolApproval"],
  marketing: ["marketingNeeds", "contentCreation", "promotionItems", "rsvp", "content", "reminder", "postmarketing", "photoBackup"],
  finance: ["budget", "foodCompliance", "quotes", "budgetRequest", "budgetApproval", "purchaseRequest", "purchaseApproval", "orderPlaced", "invoice", "attendance", "spending", "financeRecord"],
}

/** Additive and idempotent. Preserve custom team names, IDs, explicit mappings and
 * every original role/person/task/version/run; initialize only missing defaults.
 * Existing explicit role→team IDs win. Legacy canonical labels can be adopted
 * once; the stored semantic-slot→ID binding survives every subsequent rename.
 */
export function ensureWorkflowPresetTeams(state: DemoState): DemoState {
  const teams: WorkflowTeam[] = [...(state.org.workflowTeams ?? [])]
  const roleTeams = { ...state.org.workflowRoleTeams }
  const presetIds = { ...state.org.workflowPresetTeamIds }
  const existing = new Set(teams.map(team => team.id))
  for (const preset of WORKFLOW_PRESET_TEAMS) {
    if (!existing.has(presetIds[preset.key] ?? "")) {
      const mapped = preset.functions.flatMap(fn => state.roles.filter(role => role.fn === fn)).map(role => roleTeams[role.id]).find(id => existing.has(id))
      const legacy = teams.filter(team => team.name.toLowerCase() === preset.name.toLowerCase())
      if (mapped) presetIds[preset.key] = mapped
      else if (existing.has(preset.id)) presetIds[preset.key] = preset.id
      else if (legacy.length === 1) presetIds[preset.key] = legacy[0].id
      else {
        const usedNames = new Set(teams.map(team => team.name.toLowerCase()))
        let name = preset.name
        for (let n = 2; usedNames.has(name.toLowerCase()); n++) name = `${preset.name} (${n})`
        teams.push({ id: preset.id, name }); existing.add(preset.id); presetIds[preset.key] = preset.id
      }
    }
    for (const role of state.roles.filter(role => preset.functions.includes(role.fn))) {
      // Explicitly ungrouped or custom assignments remain the organizer's choice.
      if (!Object.hasOwn(roleTeams, role.id)) roleTeams[role.id] = presetIds[preset.key]!
    }
  }
  if (JSON.stringify(teams) === JSON.stringify(state.org.workflowTeams) && JSON.stringify(roleTeams) === JSON.stringify(state.org.workflowRoleTeams) && JSON.stringify(presetIds) === JSON.stringify(state.org.workflowPresetTeamIds)) return state
  return { ...state, org: { ...state.org, workflowTeams: teams, workflowRoleTeams: roleTeams, workflowPresetTeamIds: presetIds } }
}

/** Fill missing standard-template grouping from explicit original step identities.
 * Before/after-event work stays in one team. Custom task names never infer a group.
 */
export function presetWorkflowStepTeams(state: DemoState, steps: readonly StepTemplate[], current: Record<string, string> = {}): Record<string, string> {
  const map = { ...current }
  const valid = new Set(state.org.workflowTeams?.map(team => team.id) ?? [])
  for (const preset of WORKFLOW_PRESET_TEAMS) {
    const id = state.org.workflowPresetTeamIds?.[preset.key]
    if (!id || !valid.has(id)) continue
    const keys = new Set(PRESET_STEPS[preset.key])
    for (const step of steps) if (!Object.hasOwn(map, step.key) && keys.has(step.key)) map[step.key] = id
  }
  for (const step of steps) {
    const team = step.ownerRoleId ? state.org.workflowRoleTeams?.[step.ownerRoleId] : undefined
    if (!Object.hasOwn(map, step.key) && team && valid.has(team)) map[step.key] = team
  }
  return map
}
