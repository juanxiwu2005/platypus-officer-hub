/** Standalone draft contracts. Nothing here is a DemoState/storage migration. */
export interface Team {
  id: string
  name: string
  leadRoleId: string | null
  tone?: "teal" | "amber" | "blue" | "neutral"
}
export interface TeamRole {
  id: string
  title: string
  teamId: string | null
  reportsToRoleId: string | null
  personId: string | null
}
export interface TeamPerson { id: string; name: string; email: string }
export interface TeamDirectory { teams: Team[]; roles: TeamRole[]; people: TeamPerson[] }
/** The template library supplies workflowId. Keep this map inside the template version snapshot; this ID alone is not version history. */
export interface WorkflowTeamMap {
  version: 1
  workflowId: string
  stepTeams: Record<string, string>
}
export interface WorkflowStepRef { key: string; dependsOn?: readonly string[] }
export interface TeamWorkflowIssue { code: string; message: string; entityId?: string }
export type Change<T> = { ok: true; value: T } | { ok: false; issues: TeamWorkflowIssue[] }
export interface TeamLane<T> { team: Team; row: number; steps: T[] }
export interface TeamLaneLink { fromStep: string; toStep: string; fromTeam: string | null; toTeam: string | null }
export interface TeamLaneCompilation<T> {
  lanes: TeamLane<T>[]
  links: TeamLaneLink[]
  unassignedStepIds: string[]
  issues: TeamWorkflowIssue[]
  ready: boolean
}
