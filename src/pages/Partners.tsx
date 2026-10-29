import { useState } from "react"
import { Link } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { useRail } from "../components/rail/RailContext"
import { canEditContact, contactTone, CONTACT_TYPES, daysSince, nextEvent, nextStep, orgName, STAGES, visibleContacts } from "../data/crm"
import { fmtShort } from "../lib/dates"
import { Hover } from "../components/ui"
import type { Contact, RelationStage } from "../data/types"

export { PartnerDetail } from "../components/crm/ContactDetail"

type View = "people" | "board" | "orgs"
type Preset = "all" | "mine" | "overdue"
const ORDER = { late: 0, warn: 1, good: 2 }
const VIEWS: { id: View; label: string }[] = [{ id: "people", label: "People" }, { id: "board", label: "Board" }, { id: "orgs", label: "Organizations" }]
const PRESETS: { id: Preset; label: string }[] = [{ id: "all", label: "All" }, { id: "mine", label: "Mine" }, { id: "overdue", label: "Overdue" }]

/** Club CRM: everyone can look people up and log what happened; the owner or a lead edits the profile. */
export default function Partners() {
  const { state, dispatch } = useStore()
  const { person } = useViewer()
  const rail = useRail()
  const [view, setView] = useState<View>("people")
  const [preset, setPreset] = useState<Preset>("all")
  const [q, setQ] = useState("")
  const [type, setType] = useState("all")
  const [owner, setOwner] = useState("all")
  const [tag, setTag] = useState("all")
  const [adding, setAdding] = useState<"person" | "org" | null>(null)
  const [draft, setDraft] = useState({ name: "", organization: "", relation: "Vendor", ownerRoleId: person.roleId, orgType: "Vendor" })

  const all = visibleContacts(state)
  const types = [...new Set([...CONTACT_TYPES, ...all.map(c => c.relation)])].sort()
  const tags = [...new Set([...all.flatMap(c => c.tags), ...state.organizations.flatMap(o => o.tags)])].sort()
  const mine = (c: Contact) => state.roles.find(r => r.id === c.ownerRoleId)?.holderId === state.viewerId
  const needle = q.toLowerCase().trim()
  const rows = all
    .filter(c => (type === "all" || c.relation === type) && (owner === "all" || c.ownerRoleId === owner) && (tag === "all" || c.tags.includes(tag))
      && (preset === "all" || (preset === "mine" ? mine(c) : contactTone(state, c) === "late"))
      && `${c.name} ${c.title} ${orgName(state, c.organizationId)} ${c.relation} ${c.email} ${c.tags.join(" ")}`.toLowerCase().includes(needle))
    .sort((a, b) => ORDER[contactTone(state, a)] - ORDER[contactTone(state, b)] || a.name.localeCompare(b.name))
  const orgs = state.organizations
    .filter(o => (type === "all" || o.type === type) && (tag === "all" || o.tags.includes(tag)) && `${o.name} ${o.type} ${o.tags.join(" ")}`.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (adding === "org") dispatch({ type: "addOrganization", name: draft.name, orgType: draft.orgType })
    else dispatch({ type: "addContact", name: draft.name, organization: draft.organization, relation: draft.relation, ownerRoleId: draft.ownerRoleId, cadenceDays: 60 })
    setDraft({ ...draft, name: "", organization: "" }); setAdding(null)
  }
  const addLabel = view === "orgs" ? "+ Add organization" : "+ Add contact"

  return <>
    <PageHead path="/partners" actions={<>
      <input className="select" type="search" placeholder="Search" aria-label="Search partners" value={q} onChange={e => setQ(e.target.value)} />
      <select className="select" aria-label="Partner type" value={type} onChange={e => setType(e.target.value)}><option value="all">All types</option>{types.map(t => <option key={t}>{t}</option>)}</select>
    </>} />
    <div className="crm-bar">
      <div className="crm-seg" role="group" aria-label="View">{VIEWS.map(v => <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>{v.label}</button>)}</div>
      {view !== "orgs" && <div className="crm-seg" role="group" aria-label="Show">{PRESETS.map(p => <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>{p.label}</button>)}</div>}
      {view !== "orgs" && <select className="select" aria-label="Owner" value={owner} onChange={e => setOwner(e.target.value)}><option value="all">Any owner</option>{state.roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select>}
      <select className="select" aria-label="Tag" value={tag} onChange={e => setTag(e.target.value)}><option value="all">Any tag</option>{tags.map(t => <option key={t}>{t}</option>)}</select>
    </div>

    {view === "people" && <section className="card tbl-wrap">
      <table className="tbl" data-testid="contacts">
        <thead><tr><th>Name</th><th>Stage</th><th>Owner</th><th>Last contact</th><th>Next</th><th /></tr></thead>
        <tbody>{rows.map(c => {
          const role = state.roles.find(r => r.id === c.ownerRoleId), d = daysSince(state, c), ev = nextEvent(state, c), step = nextStep(state, c.id)
          return <tr key={c.id}>
            <td><button type="button" className="row-btn" onClick={() => rail.show({ kind: "partner", id: c.id })}><span>{c.name}</span><span className="small muted">{[c.relation, orgName(state, c.organizationId)].filter(Boolean).join(" · ")}</span></button></td>
            <td className="small">{STAGES.find(s => s.id === c.stage)?.label}</td>
            <td className="small">{role?.displayName ?? "—"}</td>
            <td><Hover card={`Every ${c.cadenceDays} days`}><span className={`days ${contactTone(state, c)}`}>{d === null ? "Never" : `${d}d ago`}</span></Hover></td>
            <td className="small">{step ? <Hover card={step.nextStep}><span>{step.nextDue ? `Due ${fmtShort(step.nextDue)}` : "Next step"}</span></Hover> : ev ? <Link to={`/events?event=${encodeURIComponent(ev.id)}`}>{ev.name}</Link> : "—"}</td>
            <td className="num"><button type="button" className="btn small" disabled={!canEditContact(state, c)} onClick={() => dispatch({ type: "contacted", id: c.id })}>Contacted today</button></td>
          </tr>
        })}</tbody>
      </table>
      {!rows.length && <p className="empty">No contacts match.</p>}
    </section>}

    {view === "board" && <div className="crm-board" data-testid="crm-board">{STAGES.map(col => {
      const items = rows.filter(c => c.stage === col.id)
      const move = (id: string | undefined, stage: RelationStage) => id && dispatch({ type: "updateContact", id, patch: { stage } })
      return <section key={col.id} className="crm-col" aria-label={`${col.label} (${items.length})`} onDragOver={e => e.preventDefault()} onDrop={e => move(e.dataTransfer.getData("text/plain"), col.id)}>
        <h3><Hover card={col.hint}>{col.label}</Hover> <span className="muted small">{items.length}</span></h3>
        {items.map(c => <article key={c.id} className="crm-card" draggable={canEditContact(state, c)} onDragStart={e => e.dataTransfer.setData("text/plain", c.id)}>
          <button type="button" className="row-btn" onClick={() => rail.show({ kind: "partner", id: c.id })}><span>{c.name}</span><span className="small muted">{orgName(state, c.organizationId) || c.relation}</span></button>
          <div className="crm-card-foot"><span className={`days ${contactTone(state, c)}`}>{daysSince(state, c) === null ? "Never" : `${daysSince(state, c)}d ago`}</span>
            <select aria-label={`Move ${c.name} to stage`} disabled={!canEditContact(state, c)} value={c.stage} onChange={e => move(c.id, e.target.value as RelationStage)}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
        </article>)}
      </section>
    })}</div>}

    {view === "orgs" && <section className="card tbl-wrap">
      <table className="tbl" data-testid="orgs">
        <thead><tr><th>Name</th><th>People</th><th>Last contact</th><th>Tags</th></tr></thead>
        <tbody>{orgs.map(o => {
          const people = all.filter(c => c.organizationId === o.id), last = people.map(c => c.lastContact).filter(Boolean).sort().pop()
          return <tr key={o.id}>
            <td><button type="button" className="row-btn" onClick={() => rail.show({ kind: "org", id: o.id })}><span>{o.name}</span><span className="small muted">{o.type}</span></button></td>
            <td className="small">{people.length}</td>
            <td className="small">{last ? fmtShort(last) : "—"}</td>
            <td>{o.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}</td>
          </tr>
        })}</tbody>
      </table>
      {!orgs.length && <p className="empty">No organizations match.</p>}
    </section>}

    {adding
      ? <form className="add-row crm-add" onSubmit={submit}>
        <input required autoFocus placeholder={adding === "org" ? "Organization name" : "Name"} aria-label={adding === "org" ? "Organization name" : "Partner name"} value={draft.name} maxLength={80} onChange={e => setDraft({ ...draft, name: e.target.value })} />
        {adding === "person" && <input placeholder="Organization" aria-label="Organization" value={draft.organization} maxLength={80} onChange={e => setDraft({ ...draft, organization: e.target.value })} />}
        <select aria-label="Type" value={adding === "org" ? draft.orgType : draft.relation} onChange={e => setDraft(adding === "org" ? { ...draft, orgType: e.target.value } : { ...draft, relation: e.target.value })}>{CONTACT_TYPES.map(t => <option key={t}>{t}</option>)}</select>
        {adding === "person" && <select aria-label="Owner role" value={draft.ownerRoleId} onChange={e => setDraft({ ...draft, ownerRoleId: e.target.value })}>{state.roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select>}
        <button className="btn btn-primary small" type="submit">Add</button><button type="button" className="btn btn-quiet small" onClick={() => setAdding(null)}>Cancel</button>
      </form>
      : <button type="button" className="board-add-btn crm-add-btn" onClick={() => setAdding(view === "orgs" ? "org" : "person")}>{addLabel}</button>}
  </>
}
