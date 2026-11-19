import type { DemoState, WorkflowTeam } from "./types"
import { canLead } from "./permissions"

/** The organization owns these IDs; maps are explicit, separate from roles and people. */
export function saveWorkflowTeams(state: DemoState, teams: WorkflowTeam[], roleTeams: Record<string, string>): DemoState {
  if (!canLead(state) || !Array.isArray(teams) || !teams.length || teams.length > 30 || !roleTeams || typeof roleTeams !== "object" || Array.isArray(roleTeams)) return state
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
