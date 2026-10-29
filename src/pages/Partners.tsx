import { useState } from "react"
import { Link } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { Empty } from "../components/ui"
import { useRail } from "../components/rail/RailContext"
import { daysBetween, fmtShort } from "../lib/dates"
import type { Contact, DemoState } from "../data/types"

const since = (s: DemoState, c: Contact) => c.lastContact ? daysBetween(c.lastContact, s.today) : null
const tone = (s: DemoState, c: Contact) => { const d = since(s, c); return d === null || d >= c.cadenceDays ? "late" : d >= c.cadenceDays * .75 ? "warn" : "good" }
const nextEvent = (s: DemoState, c: Contact) => s.events.filter(e => c.eventIds.includes(e.id) && e.date >= s.today).sort((a, b) => a.date.localeCompare(b.date))[0]

/** Partners as a searchable table (v1.1): built for 100+ contacts. */
export default function Partners() {
  const { state, dispatch } = useStore()
  const { canNudge } = useViewer()
  const rail = useRail()
  const [q, setQ] = useState("")
  const [type, setType] = useState("all")
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: "", organization: "", relation: "Vendor", ownerRoleId: state.roles[0]?.id ?? "", cadenceDays: 60 })
  const types = [...new Set(state.contacts.map(c => c.relation))].sort()
  const rows = state.contacts
    .filter(c => (type === "all" || c.relation === type) && `${c.name} ${c.organization} ${c.relation}`.toLowerCase().includes(q.toLowerCase().trim()))
    .sort((a, b) => ({ late: 0, warn: 1, good: 2 }[tone(state, a)] - { late: 0, warn: 1, good: 2 }[tone(state, b)]) || a.name.localeCompare(b.name))
  return <>
    <PageHead path="/partners" actions={<>
      <input className="select" type="search" placeholder="Search" aria-label="Search partners" value={q} onChange={e => setQ(e.target.value)} />
      <select className="select" aria-label="Partner type" value={type} onChange={e => setType(e.target.value)}><option value="all">All types</option>{types.map(t => <option key={t}>{t}</option>)}</select>
    </>} />
    <section className="card tbl-wrap">
      <table className="tbl" data-testid="contacts">
        <thead><tr><th>Name</th><th>Type</th><th>Owner</th><th>Last contact</th><th>Next event</th><th /></tr></thead>
        <tbody>{rows.map(c => {
          const role = state.roles.find(r => r.id === c.ownerRoleId), d = since(state, c), ev = nextEvent(state, c)
          const person = state.people.find(p => p.id === role?.holderId)
          const editable = canNudge || person?.id === state.viewerId
          return <tr key={c.id}>
            <td><button type="button" className="row-btn" onClick={() => rail.show({ kind: "partner", id: c.id })}>{c.name}</button></td>
            <td className="small">{c.relation}</td>
            <td className="small">{role?.displayName ?? "—"}</td>
            <td><span className={`days ${tone(state, c)}`} title={`Every ${c.cadenceDays} days`}>{d === null ? "Never" : `${d}d ago`}</span></td>
            <td className="small">{ev ? <Link to={`/events?event=${encodeURIComponent(ev.id)}`}>{ev.name}</Link> : "—"}</td>
            <td className="num"><button type="button" className="btn small" disabled={!editable} onClick={() => dispatch({ type: "contacted", id: c.id })}>Contacted today</button></td>
          </tr>
        })}
        {canNudge && (adding
          ? <tr><td colSpan={6}><form className="add-row" onSubmit={e => { e.preventDefault(); dispatch({ type: "addContact", ...draft }); setDraft({ ...draft, name: "", organization: "" }); setAdding(false) }}>
            <input required placeholder="Name" aria-label="Partner name" value={draft.name} maxLength={80} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            <input placeholder="Organization" aria-label="Organization" value={draft.organization} maxLength={80} onChange={e => setDraft({ ...draft, organization: e.target.value })} />
            <select aria-label="Type" value={draft.relation} onChange={e => setDraft({ ...draft, relation: e.target.value })}>{["Vendor", "Guest speaker", "Sponsor", "Partner club", "Campus office"].map(t => <option key={t}>{t}</option>)}</select>
            <select aria-label="Owner role" value={draft.ownerRoleId} onChange={e => setDraft({ ...draft, ownerRoleId: e.target.value })}>{state.roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select>
            <button className="btn btn-primary small" type="submit">Add</button><button type="button" className="btn btn-quiet small" onClick={() => setAdding(false)}>Cancel</button>
          </form></td></tr>
          : <tr><td colSpan={6}><button type="button" className="board-add-btn" onClick={() => setAdding(true)}>+ Add partner</button></td></tr>)}
        </tbody>
      </table>
      {!rows.length && <Empty>No partners match.</Empty>}
    </section>
  </>
}

/** One partner in the right rail: cadence, linked events, and recording a contact. */
export function PartnerDetail({ id }: { id: string }) {
  const { state, dispatch } = useStore()
  const { canNudge } = useViewer()
  const c = state.contacts.find(x => x.id === id)
  if (!c) return <Empty>This partner was removed.</Empty>
  const role = state.roles.find(r => r.id === c.ownerRoleId), person = state.people.find(p => p.id === role?.holderId), d = since(state, c), ev = nextEvent(state, c)
  const editable = canNudge || person?.id === state.viewerId
  return <section className="form-stack" aria-label={`Partner ${c.name}`}>
    <h2>{c.name}</h2>
    <p className="small muted">{c.relation} · {c.organization}</p>
    <div className="kv">
      <span>Owner</span><span>{role?.displayName ?? "—"} · {person?.name ?? "Vacant"}</span>
      <span>Last contact</span><span className={`days ${tone(state, c)}`}>{d === null ? "No contact recorded" : `${d} days since last contact`}</span>
      <label htmlFor="cad">Contact every (days)</label><input id="cad" type="number" min="1" max="365" disabled={!editable} value={c.cadenceDays} onChange={e => dispatch({ type: "contactCadence", id: c.id, days: Number(e.target.value) })} />
      <span>Next event</span><span>{ev ? `${ev.name} · ${fmtShort(ev.date)}` : "None linked"}</span>
    </div>
    <button className="btn btn-primary" disabled={!editable} onClick={() => dispatch({ type: "contacted", id: c.id })}>Record contact today</button>
    <p className="small muted">Records your confirmation only; sends nothing. Contacts stay with the role at handoff.</p>
  </section>
}
