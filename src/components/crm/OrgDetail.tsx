import { useState } from "react"
import { useStore } from "../../data/store"
import { useRail } from "../rail/RailContext"
import { canEditOrg, canSeeContact, CONTACT_TYPES, timeline, visibleContacts } from "../../data/crm"
import { canLead } from "../../data/permissions"
import type { OrgPatch } from "../../data/crm"
import { Field, LogForm, TagsField, Timeline } from "./parts"

/** One organization in the right rail: details, its people, and everything logged against it. */
export function OrgDetail({ id }: { id: string }) {
  const { state, dispatch } = useStore()
  const rail = useRail()
  const [logging, setLogging] = useState(false)
  const o = state.organizations.find(x => x.id === id)
  if (!o) return <p className="empty">This organization was removed.</p>
  const edit = canEditOrg(state, o), people = visibleContacts(state).filter(c => c.organizationId === o.id)
  const patch = (p: OrgPatch) => dispatch({ type: "updateOrganization", id: o.id, patch: p })
  const hidden = state.contacts.filter(c => c.organizationId === o.id && !canSeeContact(state, c)).length
  const types = [...new Set([...CONTACT_TYPES, o.type])]
  const items = timeline(state, { organizationId: o.id }).filter(i => !i.contactId || state.contacts.some(c => c.id === i.contactId && canSeeContact(state, c)))
  return <section className="form-stack crm-detail" aria-label={`Organization ${o.name}`}>
    <div><h2>{o.name}</h2><p className="small muted">{o.type}{o.website ? ` · ${o.website}` : ""}</p></div>
    <div className="action-row"><button className="btn btn-primary" onClick={() => setLogging(true)} disabled={logging}>Log interaction</button></div>
    {logging && <LogForm contactId={null} organizationId={o.id} onDone={() => setLogging(false)} />}
    <h3>People</h3>
    {people.length
      ? <ul className="mini-list">{people.map(c => <li key={c.id}><button type="button" className="row-btn" onClick={() => rail.show({ kind: "partner", id: c.id })}><span>{c.name}</span><span className="small muted">{c.title || c.relation}</span></button></li>)}</ul>
      : <p className="empty">No contacts yet.</p>}
    {hidden > 0 && <p className="small muted">{hidden} more visible to leads only.</p>}
    <details>
      <summary>Details</summary>
      <div className="form-stack">
        <Field label="Name" value={o.name} disabled={!edit} max={80} onSave={v => v.trim() && patch({ name: v })} />
        <label>Type<select disabled={!edit} value={o.type} onChange={e => patch({ type: e.target.value })}>{types.map(t => <option key={t}>{t}</option>)}</select></label>
        <Field label="Website" value={o.website} disabled={!edit} max={160} onSave={v => patch({ website: v })} />
        <Field label="Email" type="email" value={o.email} disabled={!edit} onSave={v => patch({ email: v })} placeholder="info@example.org" />
        <Field label="Phone" type="tel" value={o.phone} disabled={!edit} max={40} onSave={v => patch({ phone: v })} />
        <Field label="Address" value={o.address} disabled={!edit} max={160} onSave={v => patch({ address: v })} />
        <TagsField tags={o.tags} disabled={!edit} onSave={tags => patch({ tags })} />
        <Field label="Notes" value={o.notes} disabled={!edit} max={1000} multiline placeholder="Lead time, prices, who to ask" onSave={v => patch({ notes: v })} />
      </div>
    </details>
    <h3>Timeline</h3>
    <Timeline items={items} contacts={state.contacts} />
    {canLead(state) && <button className="btn btn-quiet" disabled={people.length + hidden > 0} title={people.length + hidden > 0 ? "Move or delete its contacts first" : undefined} onClick={() => { dispatch({ type: "deleteOrganization", id: o.id }); rail.closeDetail() }}>Delete organization</button>}
    <p className="small muted">Shared with the club. Only the owner of one of its contacts or a lead can edit it.</p>
  </section>
}
