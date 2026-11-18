import type { Change, Team, TeamDirectory, TeamRole, TeamWorkflowIssue } from "./contracts"

const issue = (code: string, message: string, entityId?: string): TeamWorkflowIssue => ({ code, message, entityId })
export function validateDirectory(directory: TeamDirectory): TeamWorkflowIssue[] {
  const issues: TeamWorkflowIssue[] = []
  for (const [kind, items] of [["team", directory.teams], ["role", directory.roles], ["person", directory.people]] as const) {
    const ids = new Set<string>()
    for (const item of items) {
      if (!item.id.trim() || ids.has(item.id)) issues.push(issue("invalid-id", `Choose a unique ${kind} ID.`, item.id))
      ids.add(item.id)
    }
  }
  const teams = new Map(directory.teams.map(t => [t.id, t])), roles = new Map(directory.roles.map(r => [r.id, r]))
  const people = new Set(directory.people.map(p => p.id))
  for (const team of directory.teams) {
    if (!team.name.trim()) issues.push(issue("empty-team-name", "Give the team a name.", team.id))
    if (team.leadRoleId && roles.get(team.leadRoleId)?.teamId !== team.id) issues.push(issue("invalid-lead", "Choose a lead from this team.", team.id))
  }
  for (const role of directory.roles) {
    if (!role.title.trim()) issues.push(issue("empty-role-title", "Give the role a title.", role.id))
    if (role.teamId !== null && !teams.has(role.teamId)) issues.push(issue("unknown-team", "Choose an existing team.", role.id))
    if (role.personId !== null && !people.has(role.personId)) issues.push(issue("unknown-person", "Choose an existing person.", role.id))
    if (role.reportsToRoleId !== null && !roles.has(role.reportsToRoleId)) issues.push(issue("unknown-manager", "Choose an existing manager.", role.id))
    const seen = new Set<string>([role.id])
    let parent = role.reportsToRoleId
    while (parent && roles.has(parent)) {
      if (seen.has(parent)) { issues.push(issue("reporting-cycle", "A role cannot report to itself or its own descendant.", role.id)); break }
      seen.add(parent); parent = roles.get(parent)!.reportsToRoleId
    }
  }
  return issues
}
const checked = (value: TeamDirectory): Change<TeamDirectory> => {
  const issues = validateDirectory(value)
  return issues.length ? { ok: false, issues } : { ok: true, value }
}
const missing = (kind: string, id: string): Change<TeamDirectory> => ({ ok: false, issues: [issue(`unknown-${kind}`, `Choose an existing ${kind}.`, id)] })

export function setRoleTeam(directory: TeamDirectory, roleId: string, teamId: string | null): Change<TeamDirectory> {
  if (!directory.roles.some(r => r.id === roleId)) return missing("role", roleId)
  if (teamId !== null && !directory.teams.some(t => t.id === teamId)) return missing("team", teamId)
  return checked({ ...directory,
    roles: directory.roles.map(r => r.id === roleId ? { ...r, teamId } : r),
    // Moving a lead creates a visible vacancy; never silently nominate another member.
    teams: directory.teams.map(t => t.leadRoleId === roleId && t.id !== teamId ? { ...t, leadRoleId: null } : t),
  })
}
export function setRoleManager(directory: TeamDirectory, roleId: string, managerId: string | null): Change<TeamDirectory> {
  if (!directory.roles.some(r => r.id === roleId)) return missing("role", roleId)
  return checked({ ...directory, roles: directory.roles.map(r => r.id === roleId ? { ...r, reportsToRoleId: managerId } : r) })
}
export function managerChoices(directory: TeamDirectory, roleId: string): TeamRole[] {
  return directory.roles.filter(r => setRoleManager(directory, roleId, r.id).ok)
}
export function addTeam(directory: TeamDirectory, team: Team): Change<TeamDirectory> {
  return checked({ ...directory, teams: [...directory.teams, team] })
}
export function addRole(directory: TeamDirectory, role: TeamRole): Change<TeamDirectory> {
  return checked({ ...directory, roles: [...directory.roles, role] })
}
export function addDirectReport(directory: TeamDirectory, parentId: string, role: Pick<TeamRole, "id" | "title">): Change<TeamDirectory> {
  const parent = directory.roles.find(r => r.id === parentId)
  if (!parent) return missing("role", parentId)
  return addRole(directory, { ...role, teamId: parent.teamId, reportsToRoleId: parent.id, personId: null })
}
export function renameTeam(directory: TeamDirectory, teamId: string, name: string): Change<TeamDirectory> {
  if (!directory.teams.some(t => t.id === teamId)) return missing("team", teamId)
  return checked({ ...directory, teams: directory.teams.map(t => t.id === teamId ? { ...t, name } : t) })
}
export function setTeamLead(directory: TeamDirectory, teamId: string, roleId: string | null): Change<TeamDirectory> {
  if (!directory.teams.some(t => t.id === teamId)) return missing("team", teamId)
  return checked({ ...directory, teams: directory.teams.map(t => t.id === teamId ? { ...t, leadRoleId: roleId } : t) })
}
export function renameRole(directory: TeamDirectory, roleId: string, title: string): Change<TeamDirectory> {
  if (!directory.roles.some(r => r.id === roleId)) return missing("role", roleId)
  return checked({ ...directory, roles: directory.roles.map(r => r.id === roleId ? { ...r, title } : r) })
}
/** Contact edits are draft data only; this function neither invents an email nor sends an invite. */
export function setRoleContact(directory: TeamDirectory, roleId: string, patch: Partial<Pick<TeamDirectory["people"][number], "name" | "email">>, newPersonId: string): Change<TeamDirectory> {
  const role = directory.roles.find(r => r.id === roleId)
  if (!role) return missing("role", roleId)
  if (role.personId) return checked({ ...directory, people: directory.people.map(p => p.id === role.personId ? { ...p, ...patch } : p) })
  return checked({ ...directory, roles: directory.roles.map(r => r.id === roleId ? { ...r, personId: newPersonId } : r), people: [...directory.people, { id: newPersonId, name: "", email: "", ...patch }] })
}
/** Tree order/indentation within one team; a manager in another team is still shown in Reports to. */
export function teamRoleRows(directory: TeamDirectory, teamId: string | null): { role: TeamRole; depth: number }[] {
  const roles = directory.roles.filter(r => r.teamId === teamId), ids = new Set(roles.map(r => r.id))
  const rows: { role: TeamRole; depth: number }[] = [], seen = new Set<string>()
  const visit = (role: TeamRole, depth: number) => {
    if (seen.has(role.id)) return
    seen.add(role.id); rows.push({ role, depth })
    roles.filter(r => r.reportsToRoleId === role.id).forEach(r => visit(r, depth + 1))
  }
  roles.filter(r => !r.reportsToRoleId || !ids.has(r.reportsToRoleId)).forEach(r => visit(r, 0))
  roles.forEach(r => visit(r, 0))
  return rows
}
