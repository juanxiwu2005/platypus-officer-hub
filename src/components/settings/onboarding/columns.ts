import type { Role, WorkflowTeam } from "../../../data/types"
import { NOT_IN_TEAM, TEAM_TONES } from "../../../engine/teamOrgChart"

/**
 * The onboarding matrix's team header row (template v2, contract Section 8 item 5): role columns grouped under the teams of
 * Settings → Roles & teams, read live from the organization. Pure; the checklist itself stores role ids only, never team ids.
 */
export interface RoleColumnGroup {
  /** Null for "Not in a team". */
  teamId: string | null
  name: string
  /** The team's tone (`wfx-tone-N`, its index in `workflowTeams` % TEAM_TONES), the same as Roles & teams and Workflow. Null: no team. */
  tone: number | null
  roleIds: string[]
}

/**
 * Teams in `workflowTeams` order, each with its roles in role order; a team without roles has no columns and is left out.
 * Roles whose team is missing or unknown, and advisors (who never join workflow teams, as in teamOrgChart), come last under
 * "Not in a team".
 */
export function roleColumnGroups(roles: readonly Role[], teams: readonly WorkflowTeam[] = [], roleTeams: Readonly<Record<string, string>> = {}): RoleColumnGroup[] {
  const index = new Map(teams.map((t, i) => [t.id, i]))
  const teamOf = (r: Role) => r.fn === "advisor" ? null : index.has(roleTeams[r.id]) ? roleTeams[r.id] : null
  const groups: RoleColumnGroup[] = teams.map((t, i) => ({ teamId: t.id, name: t.name, tone: i % TEAM_TONES, roleIds: [] }))
  const none: RoleColumnGroup = { teamId: null, name: NOT_IN_TEAM, tone: null, roleIds: [] }
  for (const r of roles) {
    const id = teamOf(r)
    ;(id === null ? none : groups[index.get(id)!]).roleIds.push(r.id)
  }
  return [...groups, none].filter(g => g.roleIds.length > 0)
}

/** The roles in column order: team by team, "Not in a team" last. */
export const columnRoles = (roles: readonly Role[], groups: readonly RoleColumnGroup[]): Role[] => {
  const byId = new Map(roles.map(r => [r.id, r]))
  return groups.flatMap(g => g.roleIds.map(id => byId.get(id)!))
}
