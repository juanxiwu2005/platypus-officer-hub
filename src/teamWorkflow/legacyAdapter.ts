import type { Person, Role, StepTemplate } from "../data/types"
import type { Change, Team, TeamDirectory, WorkflowTeamMap } from "./contracts"
import { validateDirectory } from "./directory"
import { emptyTeamMap } from "./lanes"

/** Read-only projection, never a replacement for legacy Role/Person records or their extra fields. Caller supplies confirmed team membership. No guessing from role titles, RoleFunction or reporting lines. */
export function directoryFromLegacy(teams: Team[], roles: Pick<Role, "id" | "displayName" | "holderId" | "reportsToId">[], people: Pick<Person, "id" | "name" | "email">[], roleTeams: Readonly<Record<string, string>>): Change<TeamDirectory> {
  const value: TeamDirectory = {
    teams: teams.map(t => ({ ...t })), people: people.map(p => ({ id: p.id, name: p.name, email: p.email })),
    roles: roles.map(r => ({ id: r.id, title: r.displayName, personId: r.holderId, reportsToRoleId: r.reportsToId ?? null, teamId: Object.hasOwn(roleTeams, r.id) ? roleTeams[r.id] : null })),
  }
  const issues = validateDirectory(value)
  return issues.length ? { ok: false, issues } : { ok: true, value }
}
/** Only explicit ownerRoleId is eligible; the old first-matching-function fallback is intentionally not called. */
export function teamMapFromExplicitOwners(workflowId: string, steps: readonly Pick<StepTemplate, "key" | "ownerRoleId">[], directory: TeamDirectory): { mapping: WorkflowTeamMap; unresolvedStepIds: string[] } {
  const mapping = emptyTeamMap(workflowId), unresolvedStepIds: string[] = []
  const known = new Set(directory.teams.map(t => t.id))
  const entries: [string, string][] = []
  for (const step of steps) {
    const teamId = directory.roles.find(r => r.id === step.ownerRoleId)?.teamId
    if (teamId && known.has(teamId)) entries.push([step.key, teamId])
    else unresolvedStepIds.push(step.key)
  }
  mapping.stepTeams = Object.fromEntries(entries)
  return { mapping, unresolvedStepIds }
}
