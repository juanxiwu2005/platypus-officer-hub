import { useState } from "react"
import { useStore } from "../../data/store"

/** Explicit organization sidecar; never rewrites legacy roles, people or reporting lines. */
export function WorkflowTeams({ onClose }: { onClose: () => void }) {
  const { state, tryDispatch } = useStore()
  const [teams, setTeams] = useState(state.org.workflowTeams ?? [])
  const [roleTeams, setRoleTeams] = useState(state.org.workflowRoleTeams ?? {})
  const [names, setNames] = useState("")
  const [error, setError] = useState("")
  const add = () => {
    const fresh = names.split(/\r?\n/).map(name => name.trim()).filter(Boolean)
    if (!fresh.length) return
    if (teams.length + fresh.length > 30 || new Set([...teams.map(t => t.name.toLowerCase()), ...fresh.map(n => n.toLowerCase())]).size !== teams.length + fresh.length) { setError("Use distinct team names (up to 30 teams)."); return }
    setTeams([...teams, ...fresh.map(name => ({ id: crypto.randomUUID(), name }))]); setNames(""); setError("")
  }
  return <section className="card form-stack" aria-label="Workflow teams">
    <header className="action-row"><h3>Teams</h3><button type="button" className="btn small" onClick={onClose}>Close teams</button></header>
    <p className="small muted">Use your organization’s teams. Team grouping and the task’s responsible role are separate.</p>
    {!teams.length && <button type="button" className="btn" onClick={() => {
      const available = state.roles.filter(role => role.fn !== "advisor")
      const created = available.map(role => ({ id: crypto.randomUUID(), name: role.displayName }))
      setTeams(created); setRoleTeams(Object.fromEntries(available.map((role, i) => [role.id, created[i].id])))
    }}>Create teams from roles</button>}
    <label>Team names<textarea rows={2} value={names} maxLength={1800} placeholder="One team per line" onChange={e => setNames(e.target.value)} /></label>
    <button type="button" className="btn small" onClick={add}>Add teams</button>
    <div className="form-grid">{teams.map(team => <label key={team.id}>Team name<input aria-label={`Team name: ${team.name}`} value={team.name} maxLength={80} onChange={e => setTeams(teams.map(t => t.id === team.id ? { ...t, name: e.target.value } : t))} /></label>)}</div>
    {teams.length > 0 && <div className="form-grid">{state.roles.filter(role => role.fn !== "advisor").map(role => <label key={role.id}>{role.displayName}<select aria-label={`Workflow team for ${role.displayName}`} value={roleTeams[role.id] ?? ""} onChange={e => setRoleTeams({ ...roleTeams, [role.id]: e.target.value })}><option value="">Not grouped</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>)}</div>}
    {error && <p role="alert">{error}</p>}
    <button type="button" className="btn btn-primary" onClick={() => {
      if (!teams.length || teams.some(team => !team.name.trim()) || new Set(teams.map(t => t.name.trim().toLowerCase())).size !== teams.length) { setError("Give each team a distinct name."); return }
      if (!tryDispatch({ type: "saveWorkflowTeams", teams, roleTeams })) { setError("Could not save. Your changes are kept here."); return }
      onClose()
    }}>Save teams</button>
  </section>
}
