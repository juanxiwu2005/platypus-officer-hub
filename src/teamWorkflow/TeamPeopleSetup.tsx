import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import type { Change, TeamDirectory, TeamRole } from "./contracts"
import { addDirectReport, addRole, addTeam, managerChoices, renameRole, renameTeam, setRoleContact, setRoleManager, setRoleTeam, setTeamLead, teamRoleRows } from "./directory"
import "./teamWorkflow.css"

function DraftText({ label, value, onCommit, className }: { label: string; value: string; onCommit: (value: string) => void; className?: string }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return <input className={className} aria-label={label} value={text} onChange={e => setText(e.target.value)} onBlur={() => { if (text !== value) onCommit(text) }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur() } }} />
}
/** P1 controlled component. The host owns draft saving, permissions, invitations and Undo. No store/API imports. */
export function TeamPeopleSetup({ directory, onChange, createId = () => crypto.randomUUID() }: { directory: TeamDirectory; onChange: (directory: TeamDirectory) => void; createId?: () => string }) {
  const prefix = useId(), dragged = useRef<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState<"team" | "role" | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [status, setStatus] = useState({ text: "", error: false })
  const commit = (change: Change<TeamDirectory>, message = "Draft updated.") => {
    if (!change.ok) { setStatus({ text: change.issues.map(i => i.message).join(" "), error: true }); return false }
    onChange(change.value); setStatus({ text: message, error: false }); return true
  }
  const teamOptions = <><option value="">Assign later</option>{directory.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</>
  const drawRole = (role: TeamRole, depth: number) => {
    const person = directory.people.find(p => p.id === role.personId), selected = selectedId === role.id
    const parent = directory.roles.find(r => r.id === role.reportsToRoleId)
    return <li key={role.id} className="tw-role-row" style={{ "--tw-depth": Math.min(depth, 3) } as CSSProperties}>
      <article className={`tw-role-card${selected ? " tw-selected" : ""}`} aria-label={`${role.title} role`}>
        <button type="button" className="tw-drag" draggable aria-label={`Drag ${role.title} to a team`} onDragStart={e => { dragged.current = role.id; e.dataTransfer.setData("text/x-platypus-role", role.id); e.dataTransfer.effectAllowed = "move" }} onDragEnd={() => { dragged.current = null; setOver(null) }}>⠿</button>
        {selected ? <div className="tw-role-editor">
          <div className="tw-inline-fields">
            <DraftText className="tw-title-input" label="Role title" value={role.title} onCommit={title => commit(renameRole(directory, role.id, title))} />
            <input aria-label="Name" value={person?.name ?? ""} placeholder="Open position" onChange={e => commit(setRoleContact(directory, role.id, { name: e.target.value }, createId()))} />
            <input aria-label="Email" className="tw-contact-email" type="email" value={person?.email ?? ""} placeholder="name@example.org" onChange={e => commit(setRoleContact(directory, role.id, { email: e.target.value }, createId()))} />
          </div>
          <label className="tw-routing-field">Team<select aria-label="Team" value={role.teamId ?? ""} onChange={e => commit(setRoleTeam(directory, role.id, e.target.value || null), "Team changed. Reporting line kept.")}>{teamOptions}</select></label>
          <label className="tw-routing-field">Reports to<select aria-label="Reports to" value={role.reportsToRoleId ?? ""} onChange={e => commit(setRoleManager(directory, role.id, e.target.value || null), "Manager changed. Team kept.")}><option value="">Nobody (top)</option>{managerChoices(directory, role.id).map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
          <button type="button" className="btn small" onClick={() => { const id = createId(); if (commit(addDirectReport(directory, role.id, { id, title: "New role" }), "Direct report added. Edit the role and invitation details.")) setSelectedId(id) }}>+ Add direct report</button>
          <button type="button" className="btn btn-quiet small" onClick={() => setSelectedId(null)}>Close editing</button>
        </div> : <button type="button" className="tw-role-open" onClick={() => setSelectedId(role.id)}>
          <span className="sr-only">Edit </span><strong>{role.title}</strong><span>{person?.name || "Open position"}</span><span className="tw-email">{person?.email || "+ Email for invitation"}</span>
          {parent && parent.teamId !== role.teamId && <span className="tw-parent">Reports to {parent.title}</span>}
          {depth > 3 && <span className="tw-parent">Level {depth + 1}</span>}
        </button>}
      </article>
    </li>
  }
  const drawTeam = (teamId: string | null) => {
    const team = directory.teams.find(t => t.id === teamId), rows = teamRoleRows(directory, teamId)
    return <section key={teamId ?? "unassigned"} className={`tw-team${over === (teamId ?? "") ? " tw-drop-active" : ""}`} aria-label={team ? `${team.name} team` : "Roles not in a team"} onDragOver={e => { e.preventDefault(); setOver(teamId ?? "") }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null) }} onDrop={e => { e.preventDefault(); const id = dragged.current || e.dataTransfer.getData("text/x-platypus-role"); if (id) commit(setRoleTeam(directory, id, teamId), "Role moved. Reporting line kept."); dragged.current = null; setOver(null) }}>
      {team ? <header className="tw-team-header"><DraftText label={`${team.name} team name`} value={team.name} onCommit={name => commit(renameTeam(directory, team.id, name))} />
        <label>Team lead<select aria-label="Team lead" value={team.leadRoleId ?? ""} onChange={e => commit(setTeamLead(directory, team.id, e.target.value || null))}><option value="">Choose team lead</option>{rows.map(({ role }) => <option key={role.id} value={role.id}>{directory.people.find(p => p.id === role.personId)?.name || role.title}</option>)}</select></label>
      </header> : <h3>Not in a team</h3>}
      <ul className="tw-role-list">{rows.map(({ role, depth }) => drawRole(role, depth))}</ul>
      {!rows.length && <p className="tw-empty">Drop a role here or choose this team when adding a role.</p>}
    </section>
  }
  return <section className="tw-people" aria-labelledby={`${prefix}-title`}>
    <header className="tw-heading"><div><h2 id={`${prefix}-title`}>Teams & roles</h2><p>Choose a role to edit its team and manager.</p></div><div className="action-row"><button type="button" className="btn" onClick={() => setAdding("team")}>+ Add team</button><button type="button" className="btn primary" onClick={() => setAdding("role")}>+ Add role</button></div></header>
    {adding && <form className="tw-add-form" aria-label={adding === "team" ? "New team" : "New role"} onSubmit={e => {
      e.preventDefault(); const f = new FormData(e.currentTarget)
      if (adding === "team") { if (commit(addTeam(directory, { id: createId(), name: String(f.get("name")).trim(), leadRoleId: null }))) setAdding(null); return }
      const id = createId(), name = String(f.get("name") ?? "").trim(), email = String(f.get("email") ?? "").trim(), personId = name || email ? createId() : null
      const next = { ...directory, people: personId ? [...directory.people, { id: personId, name, email }] : directory.people }
      if (commit(addRole(next, { id, title: String(f.get("title")).trim(), teamId: String(f.get("team") || "") || null, reportsToRoleId: String(f.get("manager") || "") || null, personId }))) { setAdding(null); setSelectedId(id) }
    }}>
      {adding === "team" ? <label>Team name<input name="name" required maxLength={80} /></label> : <>
        <label>Role title<input name="title" required maxLength={120} /></label><label>Name<input name="name" maxLength={80} /></label><label>Email<input name="email" type="email" maxLength={254} /></label>
        <label>Team<select aria-label="Team" name="team">{teamOptions}</select></label><label>Reports to<select aria-label="Reports to" name="manager"><option value="">Nobody (top)</option>{directory.roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      </>}
      <div className="action-row"><button type="submit" className="btn primary">{adding === "team" ? "Create team" : "Create role"}</button><button type="button" className="btn" onClick={() => setAdding(null)}>Cancel</button></div>
    </form>}
    <div className="tw-team-grid">{directory.teams.map(t => drawTeam(t.id))}</div>
    {directory.roles.some(r => r.teamId === null) && drawTeam(null)}
    <p className={status.error ? "tw-error" : "tw-note"} role={status.error ? "alert" : "status"} aria-live="polite">{status.text}</p>
  </section>
}
