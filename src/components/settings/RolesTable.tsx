import { Fragment, useState } from "react"
import type { Person, Role } from "../../data/types"
import { addRole, allEmails, asuDigits, bossTitle, canAddRole, canRemoveRole, holderOf, patchPerson, patchRole, removeRole, reportsToChoices, type PersonPatch } from "../../data/roleEdits"

export interface RoleTeamTag { name: string; tone: number }

/**
 * Settings → Roles & teams → Contact list: every role with its officer's contact details, Edit roles, Duties, and a read-only
 * Team tag in the same colour as the chart and the Workflow canvas. Names, emails, phones and ASU IDs stay on this page.
 */
export function RolesTable({ roles, people, teamOf, onChange }: { roles: Role[]; people: Person[]; teamOf: (roleId: string) => RoleTeamTag | null; onChange: (roles: Role[], people?: Person[]) => void }) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const change = (id: string, patch: Partial<Role>, reFn = false) => onChange(patchRole(roles, id, patch, reFn))
  const changePerson = (id: string, patch: PersonPatch) => onChange(roles, patchPerson(people, id, patch))
  const copyEmails = async () => { try { await navigator.clipboard.writeText(allEmails(roles, people)); setCopied(true) } catch { setCopied(false) } }
  const add = () => { const next = addRole(roles); onChange(next.roles); setExpanded(next.role.id) }
  const columnWidth = (values: string[], min: number, max: number) => `${Math.min(max, Math.max(min, ...values.map(value => value.length + 1)))}ch`
  const widths = {
    title: columnWidth(roles.map(r => r.displayName), 14, 28), reports: columnWidth(roles.map(r => bossTitle(roles, r)), 13, 22),
    officer: columnWidth(roles.map(r => holderOf(people, r)?.name ?? "Open position"), 14, 24), email: columnWidth(people.map(p => p.email), 18, 30), phone: columnWidth(people.map(p => p.phone), 14, 18), asu: "12ch",
  }
  return <div className="roles-manager">
    <div className="roles-actions"><p className="small muted">Select a role to view its full duties.</p><div className="action-row"><button type="button" className="btn small" onClick={copyEmails}>{copied ? "Emails copied" : "Copy all emails"}</button><button type="button" className={`btn small${editing ? " btn-primary" : ""}`} aria-pressed={editing} onClick={() => setEditing(value => !value)}>{editing ? "Done editing" : "Edit roles"}</button>{editing && canAddRole(roles) && <button type="button" className="btn small" onClick={add}>Add role</button>}</div></div>
    <div className="roles-table-wrap"><table className="tbl roles-table"><thead><tr><th>Title</th><th>Reports to</th><th>Team</th><th>Officer</th><th>Email</th><th>Phone</th><th>ASU ID</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
      {roles.map(r => {
        const person = holderOf(people, r), open = expanded === r.id, team = teamOf(r.id)
        return <Fragment key={r.id}><tr className={open ? "is-open" : ""}>
          <td>{editing ? <input style={{ width: widths.title }} type="text" aria-label="Role title" value={r.displayName} maxLength={60} onChange={e => change(r.id, { displayName: e.target.value }, true)} /> : <span className="role-name" title={r.displayName}>{r.displayName}</span>}</td>
          <td>{editing ? <select style={{ width: widths.reports }} aria-label="Reports to" value={r.reportsToId ?? ""} onChange={e => change(r.id, { reportsToId: e.target.value || null })}><option value="">Nobody (top)</option>{reportsToChoices(roles, r.id).map(x => <option key={x.id} value={x.id}>{x.displayName}</option>)}</select> : <span className="role-value" title={bossTitle(roles, r)}>{bossTitle(roles, r)}</span>}</td>
          <td>{team ? <span className={`rt-tag wfx-tone-${team.tone}`} title={team.name}>{team.name}</span> : <span className="rt-tag is-none">Not in a team</span>}</td>
          <td>{editing && person ? <input style={{ width: widths.officer }} type="text" aria-label="Officer name" value={person.name} maxLength={80} onChange={e => changePerson(person.id, { name: e.target.value })} /> : <span className="role-value" title={person?.name || "Open position"}>{person?.name || "Open position"}</span>}</td>
          <td>{editing && person ? <input style={{ width: widths.email }} type="email" aria-label="Officer email" value={person.email} maxLength={120} onChange={e => changePerson(person.id, { email: e.target.value })} /> : <span className="role-value" title={person?.email || "—"}>{person?.email || "—"}</span>}</td>
          <td>{editing && person ? <input style={{ width: widths.phone }} type="tel" aria-label="Officer phone" value={person.phone} maxLength={18} onChange={e => changePerson(person.id, { phone: e.target.value })} /> : <span className="role-value" title={person?.phone || "—"}>{person?.phone || "—"}</span>}</td>
          <td>{editing && person ? <input style={{ width: widths.asu }} type="text" inputMode="numeric" aria-label="Officer ASU ID" maxLength={10} value={person.asuId ?? ""} onChange={e => changePerson(person.id, { asuId: asuDigits(e.target.value) })} /> : <span className="role-value" title={person?.asuId || "—"}>{person?.asuId || "—"}</span>}</td>
          <td className="role-actions-cell"><button type="button" className="btn small" aria-label={`Show duties for ${r.displayName}`} aria-expanded={open} onClick={() => setExpanded(open ? null : r.id)}>Duties</button>{editing && canRemoveRole(r, people) && <button type="button" className="btn small btn-quiet" aria-label={`Remove ${r.displayName}`} onClick={() => onChange(removeRole(roles, r.id))}>Remove</button>}</td>
        </tr>{open && <tr className="role-detail"><td colSpan={8}><div><span className="cap">Duties</span>{editing ? <textarea aria-label="Role duties" rows={4} maxLength={400} value={r.duties ?? ""} onChange={e => change(r.id, { duties: e.target.value })} /> : <p>{r.duties?.trim() || "No duties written yet."}</p>}</div></td></tr>}</Fragment>
      })}
    </tbody></table></div>
  </div>
}
