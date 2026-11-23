import { useState } from "react"
import { useStore, useViewer } from "../data/store"
import { fmtShort } from "../lib/dates"
import { roleTasks, ROLE_START_PROMPTS } from "../lib/roleDossier"
import type { RoleChange } from "../data/roleChanges"

/** Handoff stage 6 screens: change a role (move work, close it), the starter questions of a new role, and the list of closed roles. Presidents and vice presidents only, except the list. */
const useChange = () => { const { dispatch } = useStore(); return (change: RoleChange) => dispatch({ type: "roleChange", change }) }

/** Move some of a role's open work to another role, or close the role. Closing keeps its history (D-6a): it only leaves the role lists. */
export function RoleChanges({ roleId }: { roleId: string }) {
  const { state } = useStore(); const { canNudge } = useViewer(); const change = useChange()
  const role = state.roles.find(r => r.id === roleId)
  const others = state.roles.filter(r => r.id !== roleId)
  const [to, setTo] = useState(others[0]?.id ?? ""), [into, setInto] = useState(others.find(r => r.fn === "president")?.id ?? others[0]?.id ?? "")
  const [tasks, setTasks] = useState<string[]>([]), [contacts, setContacts] = useState<string[]>([])
  if (!canNudge || !role || !others.length) return null
  const openTasks = roleTasks(state, role, role.holderId).filter(n => n.status !== "done")
  const myContacts = state.contacts.filter(c => c.ownerRoleId === roleId)
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  return <details className="step-card" data-testid="role-changes">
    <summary><b>Change this role</b></summary>
    <p className="small"><b>Move work to another role</b></p>
    <label className="field"><span className="small">Move to</span><select value={to} onChange={e => setTo(e.target.value)}>{others.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select></label>
    {openTasks.length + myContacts.length === 0 ? <p className="small muted">This role has no open tasks or contacts.</p> : <>
      {openTasks.slice(0, 12).map(n => <label key={n.id} className="check-label"><input type="checkbox" checked={tasks.includes(n.id)} onChange={() => toggle(tasks, setTasks, n.id)} /><span className="small">{n.title}</span></label>)}
      {myContacts.map(c => <label key={c.id} className="check-label"><input type="checkbox" checked={contacts.includes(c.id)} onChange={() => toggle(contacts, setContacts, c.id)} /><span className="small">Contact: {c.name}</span></label>)}
      <p className="small muted">Tasks wait to be claimed.</p>
      <button type="button" className="btn small" disabled={!to || (!tasks.length && !contacts.length)} onClick={() => { change({ kind: "moveWork", fromRoleId: roleId, toRoleId: to, taskIds: tasks, contactIds: contacts }); setTasks([]); setContacts([]) }}>Move selected</button>
    </>}
    <p className="small"><b>Close this role</b></p>
    <p className="small muted">History stays; everything else moves to the role you choose.</p>
    {role.holderId && <p className="small warn-text">Someone still holds this role. Hand it over to “Nobody yet” first.</p>}
    {role.fn === "president" && <p className="small warn-text">The president role cannot be closed.</p>}
    <label className="field"><span className="small">Move everything else to</span><select value={into} onChange={e => setInto(e.target.value)}>{others.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select></label>
    <button type="button" className="btn small" disabled={!!role.holderId || role.fn === "president" || !into} onClick={() => change({ kind: "closeRole", roleId, intoRoleId: into })}>Close role, keep its history</button>
  </details>
}

/** For a role with no history yet: the president's three answers, so there is something to hand over. */
export function StarterQuestions({ roleId }: { roleId: string }) {
  const { state } = useStore(); const { canNudge } = useViewer(); const change = useChange()
  const role = state.roles.find(r => r.id === roleId)
  const [draft, setDraft] = useState<string[]>(() => ROLE_START_PROMPTS.map((_, i) => role?.startNotes?.[i] ?? ""))
  if (!canNudge || !role) return null
  return <div data-testid="starter-questions">
    <p className="small"><b>A new role: three questions</b></p>
    {ROLE_START_PROMPTS.map((q, i) => <label key={q} className="field"><span className="small">{q}</span>
      <textarea rows={2} maxLength={300} value={draft[i]} onChange={e => setDraft(draft.map((x, j) => j === i ? e.target.value : x))} onBlur={() => { if (draft[i].trim() !== (role.startNotes?.[i] ?? "")) change({ kind: "startNote", roleId, index: i, answer: draft[i] }) }} />
    </label>)}
  </div>
}

/** Closed roles, with when and where their work went. They stay in the club's history. */
export function ClosedRoles() {
  const { state } = useStore()
  if (!state.archivedRoles.length) return null
  const name = (id: string | null) => state.roles.find(r => r.id === id)?.displayName ?? state.archivedRoles.find(r => r.id === id)?.displayName ?? "another role"
  return <section data-testid="closed-roles" aria-label="Closed roles">
    <h3 className="small">Closed roles</h3>
    <ul className="small">{state.archivedRoles.map(r => <li key={r.id}>{r.displayName} · closed {fmtShort(r.archivedOn)} · work moved to {name(r.closedInto)}{r.formerNames?.length ? ` · formerly ${r.formerNames.map(f => f.name).join(", ")}` : ""}</li>)}</ul>
  </section>
}
