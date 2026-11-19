import type { DemoState, WorkflowTeam } from "./types"
import { canLead } from "./permissions"
import { getWorkflowTemplates, STANDARD_WORKFLOW_TEMPLATE_ID } from "./workflowTemplates"
import { presetWorkflowStepTeams } from "./workflowTeamDefaults"

export const MAX_WORKFLOW_TEAMS = 30
export interface TeamSnapshot { teams: WorkflowTeam[]; roleTeams: Record<string, string> }

/** The organization's teams and role → team map as stored now (both editors start from this). */
export const teamSnapshot = (state: DemoState): TeamSnapshot => ({ teams: state.org.workflowTeams ?? [], roleTeams: state.org.workflowRoleTeams ?? {} })

/** Only entries saveWorkflowTeams accepts: saved, non-advisor roles mapped to "" (explicitly not in a team) or an existing team. */
export function savableRoleTeams(state: DemoState, teams: readonly WorkflowTeam[], roleTeams: Readonly<Record<string, string>>): Record<string, string> {
  const ids = new Set(teams.map(team => team.id))
  const roles = new Set(state.roles.filter(role => role.fn !== "advisor").map(role => role.id))
  return Object.fromEntries(Object.entries(roleTeams).filter(([role, team]) => roles.has(role) && (team === "" || ids.has(team))))
}

/** Move one saved role to a team ("" = not in a team). The teams themselves stay as they are. Null when the role cannot join a team. */
export function withRoleTeam(state: DemoState, roleId: string, teamId: string): TeamSnapshot | null {
  const role = state.roles.find(r => r.id === roleId)
  const teams = state.org.workflowTeams ?? []
  if (!role || role.fn === "advisor" || (teamId !== "" && !teams.some(team => team.id === teamId))) return null
  return { teams, roleTeams: savableRoleTeams(state, teams, { ...state.org.workflowRoleTeams, [roleId]: teamId }) }
}

/** "New team", then "New team 2", "New team 3"… whichever is free. */
export function nextTeamName(teams: readonly WorkflowTeam[]): string {
  const used = new Set(teams.map(team => team.name.trim().toLowerCase()))
  if (!used.has("new team")) return "New team"
  let n = 2
  while (used.has(`new team ${n}`)) n++
  return `New team ${n}`
}

/** Why a team name cannot be saved, or null. Names are distinct (ignoring case), not empty, up to 80 characters. */
export function teamNameError(teams: readonly WorkflowTeam[], teamId: string, name: string): string | null {
  if (!name.trim()) return "Give the team a name."
  if (name.length > 80) return "Keep the team name under 80 characters."
  if (teams.some(team => team.id !== teamId && team.name.trim().toLowerCase() === name.trim().toLowerCase())) return "Another team has this name."
  return null
}

/**
 * The workflow the club starts events from (the default template): its name, and how many of its steps each team owns.
 * Counted from the latest saved version, else the draft, else the preset grouping of its steps.
 */
export function teamStepCounts(state: DemoState): { templateName: string; counts: Record<string, number> } {
  const templates = getWorkflowTemplates(state)
  const template = templates.find(t => t.id === (state.org.defaultWorkflowTemplateId ?? STANDARD_WORKFLOW_TEMPLATE_ID)) ?? templates[0]
  const source = template?.versions[template.versions.length - 1] ?? template?.draft
  if (!source) return { templateName: "the workflow", counts: {} }
  const stepTeams = source.teamMap?.stepTeams ?? presetWorkflowStepTeams(state, source.steps)
  const counts: Record<string, number> = {}
  for (const step of source.steps) { const team = stepTeams[step.key]; if (team) counts[team] = (counts[team] ?? 0) + 1 }
  return { templateName: source.name || "Untitled workflow", counts }
}

/** Why a team cannot be deleted, or null. Deleting never moves roles or workflow steps: they must have left the team first. */
export function teamDeleteBlock(state: DemoState, teamId: string): string | null {
  const teams = state.org.workflowTeams ?? []
  if (state.roles.some(role => state.org.workflowRoleTeams?.[role.id] === teamId)) return "Roles are in this team. Move them to another team first."
  const uses = getWorkflowTemplates(state).flatMap(template => [...template.versions, ...(template.draft ? [template.draft] : [])])
    .some(version => Object.values(version.teamMap?.stepTeams ?? {}).includes(teamId) || !!version.milestoneGraph?.teamBranches.some(branch => branch.teamId === teamId))
  if (uses) return "Workflow steps use this team. Move them in Workflow first."
  if (Object.values(state.org.workflowPresetTeamIds ?? {}).includes(teamId)) return "Preset teams can be renamed but not deleted."
  if (teams.length <= 1) return "Keep at least one team."
  return null
}

/** The organization owns these IDs; maps are explicit, separate from roles and people. */
export function saveWorkflowTeams(state: DemoState, teams: WorkflowTeam[], roleTeams: Record<string, string>): DemoState {
  if (!canLead(state) || !Array.isArray(teams) || !teams.length || teams.length > MAX_WORKFLOW_TEAMS || !roleTeams || typeof roleTeams !== "object" || Array.isArray(roleTeams)) return state
  if (teams.some(team => !team || typeof team.id !== "string" || !team.id || team.id.length > 100 || typeof team.name !== "string" || !team.name.trim() || team.name.length > 80)) return state
  const ids = new Set(teams.map(team => team.id))
  if (ids.size !== teams.length || new Set(teams.map(team => team.name.trim().toLowerCase())).size !== teams.length) return state
  const roles = new Set(state.roles.filter(role => role.fn !== "advisor").map(role => role.id))
  if (Object.entries(roleTeams).some(([role, team]) => !roles.has(role) || typeof team !== "string" || (team !== "" && !ids.has(team)))) return state
  // A renamed team keeps its identity. Removing referenced teams requires a later
  // explicit reassignment flow; historical execution snapshots remain untouched.
  if (Object.values(state.org.workflowPresetTeamIds ?? {}).some(id => !ids.has(id))) return state
  const previous = new Set(state.org.workflowTeams?.map(team => team.id) ?? [])
  const referenced = (state.org.workflowTemplates ?? []).flatMap(template => [...template.versions, ...(template.draft ? [template.draft] : [])]).flatMap(version => Object.values(version.teamMap?.stepTeams ?? {}))
  if (referenced.some(id => previous.has(id) && !ids.has(id))) return state
  return { ...state, org: { ...state.org, workflowTeams: teams.map(team => ({ id: team.id, name: team.name.trim() })), workflowRoleTeams: { ...roleTeams } } }
}
