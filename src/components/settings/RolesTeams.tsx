import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { useStore } from "../../data/store"
import { useRail } from "../rail/RailContext"
import type { Person, Role, WorkflowTeam } from "../../data/types"
import { MAX_DUTIES } from "../../data/structure"
import { addRole, asuDigits, canAddRole, canRemoveRole, holderOf, patchPerson, patchRole, removeRole, reportsToChoices, type PersonPatch } from "../../data/roleEdits"
import { MAX_WORKFLOW_TEAMS, nextTeamName, savableRoleTeams, teamDeleteBlock, teamNameError, teamSnapshot, teamStepCounts, withRoleTeam, type TeamSnapshot } from "../../data/workflowTeamSettings"
import { TEAM_TONES } from "../../engine/teamOrgChart"
import { RolesTable } from "./RolesTable"
import { TeamOrgChart, type RolesSelection } from "./TeamOrgChart"
import { useSettingsNav } from "./settingsNav"

const steps = (n: number) => `${n} ${n === 1 ? "step" : "steps"}`
type TeamStatus = { text: string; undo?: TeamSnapshot; failed?: boolean } | null

/**
 * Settings → Roles & teams (concept C, docs/feedback-fix/ROLES_TEAMS_CONCEPTS_2026-11-19.md): the organization chart with workflow
 * teams as coloured areas, and an inspector for the selected role or team. Roles and people are the ClubSettings draft (`onChange`,
 * saved by its autosave with Undo; `status` is that save line). Teams are the organization's workflow teams, the same ones the
 * Settings → Workflow canvas uses; they save at once with saveWorkflowTeams, with their own Undo.
 */
export function RolesTeams({ roles, people, onChange, status }: { roles: Role[]; people: Person[]; onChange: (roles: Role[], people?: Person[]) => void; status: ReactNode }) {
  const { state, tryDispatch } = useStore()
  const go = useSettingsNav()
  // Like the Workflow canvas: this page has its own inspector, so the Ask panel steps aside to give the chart room (Ask stays one click away).
  const rail = useRail()
  useEffect(() => { if (rail.tab === "ask") rail.setOpen(false) }, [])
  const [view, setView] = useState<"chart" | "list">("chart")
  const presidentId = roles.find(r => r.fn === "president")?.id ?? roles[0]?.id ?? ""
  const [picked, setPicked] = useState<RolesSelection>({ kind: "role", id: presidentId })
  const [teamStatus, setTeamStatus] = useState<TeamStatus>(null)
  const [rev, setRev] = useState(0)
  const { teams, roleTeams } = teamSnapshot(state)
  const { templateName, counts } = teamStepCounts(state)
  const valid = picked.kind === "role" ? roles.some(r => r.id === picked.id) : teams.some(t => t.id === picked.id)
  const selected: RolesSelection = valid ? picked : { kind: "role", id: presidentId }
  const select = (next: RolesSelection) => { setPicked(next); setView("chart") }
  const reset = () => setPicked({ kind: "role", id: presidentId })
  const teamTag = (roleId: string) => { const i = teams.findIndex(t => t.id === roleTeams[roleId]); return i < 0 || state.roles.find(r => r.id === roleId)?.fn === "advisor" ? null : { name: teams[i].name, tone: i % TEAM_TONES } }

  /** Every team change saves at once; Undo puts back the teams and role map from before it. */
  const saveTeams = (next: TeamSnapshot, text: string, before: TeamSnapshot = teamSnapshot(state)): boolean => {
    if (!tryDispatch({ type: "saveWorkflowTeams", teams: next.teams, roleTeams: savableRoleTeams(state, next.teams, next.roleTeams) })) { setTeamStatus({ text: "Could not save the team change.", failed: true }); return false }
    setTeamStatus({ text, undo: before }); return true
  }
  const undoTeams = (before: TeamSnapshot) => {
    if (!tryDispatch({ type: "saveWorkflowTeams", teams: before.teams, roleTeams: savableRoleTeams(state, before.teams, before.roleTeams) })) { setTeamStatus({ text: "Could not undo: the teams changed in Workflow since.", failed: true }); return }
    setTeamStatus(null); setRev(n => n + 1)
  }
  const plusRole = () => { const next = addRole(roles); onChange(next.roles); select({ kind: "role", id: next.role.id }) }
  const plusTeam = () => {
    const team: WorkflowTeam = { id: crypto.randomUUID(), name: nextTeamName(teams) }
    if (saveTeams({ teams: [...teams, team], roleTeams }, `Added ${team.name}.`)) select({ kind: "team", id: team.id })
  }
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !(selected.kind === "role" && selected.id === presidentId)) { e.stopPropagation(); reset() } }
  const teamLine = teamStatus && <p role="status" data-testid="team-save-status" className={`save-status ${teamStatus.failed ? "err" : "ok"}`}>{teamStatus.text}{teamStatus.undo && <button type="button" className="link" onClick={() => undoTeams(teamStatus.undo!)}>Undo</button>}</p>

  return <div className={`rt-layout${view === "list" ? " is-list" : ""}`} onKeyDown={onKey}>
    <section className="card form-stack rt-main" aria-labelledby="rt-title">
      <header className="rt-head">
        <div><h2 id="rt-title">Roles & teams</h2><p className="small muted">Select a role to edit it.</p></div>
        <div className="action-row">
          <div className="seg" role="group" aria-label="Roles view"><button type="button" aria-pressed={view === "chart"} onClick={() => setView("chart")}>Chart</button><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>Contact list</button></div>
          <button type="button" className="btn small" disabled={!canAddRole(roles)} onClick={plusRole}>+ Role</button>
          <button type="button" className="btn small" disabled={teams.length >= MAX_WORKFLOW_TEAMS} title={teams.length >= MAX_WORKFLOW_TEAMS ? `Up to ${MAX_WORKFLOW_TEAMS} teams.` : undefined} onClick={plusTeam}>+ Team</button>
        </div>
      </header>
      {view === "chart"
        ? <TeamOrgChart roles={roles} people={people} teams={teams} roleTeams={roleTeams} stepCounts={counts} selected={selected} onSelect={select} />
        : <><RolesTable roles={roles} people={people} teamOf={teamTag} onChange={onChange} />{status}{teamLine}</>}
    </section>
    {view === "chart" && <aside className="card form-stack rt-inspector" aria-labelledby="rt-inspector-title" data-testid="roles-inspector">
      {selected.kind === "role"
        ? <RoleInspector key={selected.id} role={roles.find(r => r.id === selected.id)!} roles={roles} people={people} onChange={onChange} teams={teams} counts={counts} templateName={templateName} onClose={reset} onTeam={(roleId, teamId) => { const next = withRoleTeam(state, roleId, teamId); if (next) saveTeams(next, `Team saved for ${roles.find(r => r.id === roleId)?.displayName ?? "the role"}.`) }} onRemoved={reset} onWorkflow={() => go("workflow")} />
        : <TeamInspector key={`${selected.id}-${rev}`} team={teams.find(t => t.id === selected.id)!} roles={roles} people={people} counts={counts} templateName={templateName} onClose={reset} onSelectRole={id => select({ kind: "role", id })} onWorkflow={() => go("workflow")} onSave={saveTeams} onDeleted={reset} />}
      {status}{teamLine}
    </aside>}
  </div>
}

function Close({ onClose }: { onClose: () => void }) {
  return <button type="button" className="icon-btn rt-close" aria-label="Close details" title="Back to the president" onClick={onClose}>×</button>
}

function RoleInspector({ role, roles, people, teams, counts, templateName, onChange, onClose, onTeam, onRemoved, onWorkflow }: {
  role: Role; roles: Role[]; people: Person[]; teams: readonly WorkflowTeam[]; counts: Record<string, number>; templateName: string
  onChange: (roles: Role[], people?: Person[]) => void; onClose: () => void; onTeam: (roleId: string, teamId: string) => void; onRemoved: () => void; onWorkflow: () => void
}) {
  const { state } = useStore()
  const person = holderOf(people, role)
  const changePerson = (patch: PersonPatch) => { if (person) onChange(roles, patchPerson(people, person.id, patch)) }
  const saved = state.roles.find(r => r.id === role.id)
  const teamId = saved ? state.org.workflowRoleTeams?.[role.id] ?? "" : ""
  const team = teams.find(t => t.id === teamId)
  const teamNote = role.fn === "advisor" ? "Advisors are not part of workflow teams." : !saved ? "Choose a team once the new role is saved." : !teams.length ? "Add a team first." : null
  return <>
    <header className="rt-inspector-head"><h2 id="rt-inspector-title">{role.displayName.trim() || "Untitled role"}</h2><Close onClose={onClose} /></header>
    <label>Title<input type="text" value={role.displayName} maxLength={60} onChange={e => onChange(patchRole(roles, role.id, { displayName: e.target.value }, true))} /></label>
    {person
      ? <label>Officer name<input type="text" value={person.name} maxLength={80} onChange={e => changePerson({ name: e.target.value })} /></label>
      : <div className="form-stack tight"><span className="cap">Officer</span><p className="small muted">Open position</p></div>}
    <label>Reports to<select aria-label="Reports to" value={role.reportsToId ?? ""} onChange={e => onChange(patchRole(roles, role.id, { reportsToId: e.target.value || null }))}><option value="">Nobody (top)</option>{reportsToChoices(roles, role.id).map(x => <option key={x.id} value={x.id}>{x.displayName}</option>)}</select></label>
    <div className="form-stack tight">
      <label>Team<select aria-label="Team" value={team ? team.id : ""} disabled={!!teamNote} aria-describedby="rt-team-note" onChange={e => onTeam(role.id, e.target.value)}>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}<option value="">Not in a team</option></select></label>
      <p className="small muted" id="rt-team-note">{teamNote ?? (team ? <>Owns {steps(counts[team.id] ?? 0)} in {templateName}. <button type="button" className="link" onClick={onWorkflow}>Open in Workflow →</button></> : "Not in a team, so no workflow steps.")}</p>
    </div>
    {person && <>
      <label>Email<input type="email" value={person.email} maxLength={120} onChange={e => changePerson({ email: e.target.value })} /></label>
      <div className="rt-pair">
        <label>Phone<input type="tel" value={person.phone} maxLength={18} onChange={e => changePerson({ phone: e.target.value })} /></label>
        <label>ASU ID<input type="text" inputMode="numeric" maxLength={10} value={person.asuId ?? ""} onChange={e => changePerson({ asuId: asuDigits(e.target.value) })} /></label>
      </div>
    </>}
    <label>Duties<textarea aria-label="Duties" rows={4} maxLength={MAX_DUTIES} value={role.duties ?? ""} onChange={e => onChange(patchRole(roles, role.id, { duties: e.target.value }))} /></label>
    {canRemoveRole(role, people) && <div className="action-row"><button type="button" className="btn small btn-quiet" aria-label={`Remove ${role.displayName}`} onClick={() => { onChange(removeRole(roles, role.id)); onRemoved() }}>Remove role</button></div>}
  </>
}

function TeamInspector({ team, roles, people, counts, templateName, onClose, onSelectRole, onWorkflow, onSave, onDeleted }: {
  team: WorkflowTeam; roles: Role[]; people: Person[]; counts: Record<string, number>; templateName: string
  onClose: () => void; onSelectRole: (id: string) => void; onWorkflow: () => void; onSave: (next: TeamSnapshot, text: string, before?: TeamSnapshot) => boolean; onDeleted: () => void
}) {
  const { state } = useStore()
  const { teams, roleTeams } = teamSnapshot(state)
  const [name, setName] = useState(team.name)
  const before = useRef<TeamSnapshot | null>(null)
  const error = teamNameError(teams, team.id, name)
  const members = roles.filter(r => r.fn !== "advisor" && state.roles.some(s => s.id === r.id) && roleTeams[r.id] === team.id)
  const block = teamDeleteBlock(state, team.id)
  const rename = (value: string) => {
    setName(value)
    if (teamNameError(teams, team.id, value) || value.trim() === team.name) return
    onSave({ teams: teams.map(t => t.id === team.id ? { ...t, name: value } : t), roleTeams }, "Team renamed.", before.current ?? undefined)
  }
  return <>
    <header className="rt-inspector-head"><h2 id="rt-inspector-title">{team.name}</h2><Close onClose={onClose} /></header>
    <label>Team name<input type="text" value={name} maxLength={80} aria-invalid={!!error} aria-describedby={error ? "rt-team-name-error" : undefined} onFocus={() => { before.current = teamSnapshot(state) }} onChange={e => rename(e.target.value)} /></label>
    {error && <p className="small" role="alert" id="rt-team-name-error">{error}</p>}
    <div className="form-stack tight">
      <span className="cap" id="rt-team-roles">Roles</span>
      {members.length
        ? <ul className="rt-team-roles" aria-labelledby="rt-team-roles">{members.map(r => <li key={r.id}><button type="button" className="link" onClick={() => onSelectRole(r.id)}>{r.displayName} · {holderOf(people, r)?.name || "Open position"}</button></li>)}</ul>
        : <p className="small muted">No roles yet. Choose this team on a role.</p>}
    </div>
    <p className="small muted">{steps(counts[team.id] ?? 0)} in {templateName}. <button type="button" className="link" onClick={onWorkflow}>Open in Workflow →</button></p>
    <div className="form-stack tight">
      <div className="action-row"><button type="button" className="btn small" disabled={!!block} aria-describedby={block ? "rt-team-delete-reason" : undefined} onClick={() => { if (onSave({ teams: teams.filter(t => t.id !== team.id), roleTeams }, `Deleted ${team.name}.`)) onDeleted() }}>Delete team</button></div>
      {block && <p className="small muted" id="rt-team-delete-reason">{block}</p>}
    </div>
  </>
}
