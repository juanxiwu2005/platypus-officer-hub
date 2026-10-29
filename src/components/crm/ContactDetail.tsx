import { useState } from "react"
import { Link } from "react-router-dom"
import { useStore } from "../../data/store"
import { useRail } from "../rail/RailContext"
import { canEditContact, canSeeContact, CHANNELS, CONTACT_TYPES, contactTone, daysSince, nextEvent, SOURCES, STAGES, timeline } from "../../data/crm"
import { canLead } from "../../data/permissions"
import type { ContactPatch } from "../../data/crm"
import type { PreferredChannel, RelationStage } from "../../data/types"
import { fmtShort } from "../../lib/dates"
import { Field, LogForm, TagsField, Timeline } from "./parts"

/** One contact in the right rail: profile, relationship, shared timeline. */
export function PartnerDetail({ id }: { id: string }) {
  const { state, dispatch } = useStore()
  const rail = useRail()
  const [logging, setLogging] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const c = state.contacts.find(x => x.id === id)
  if (!c || !canSeeContact(state, c)) return <p className="empty">This contact was removed.</p>
  const role = state.roles.find(r => r.id === c.ownerRoleId), person = state.people.find(p => p.id === role?.holderId)
  const edit = canEditContact(state, c), lead = canLead(state)
  const d = daysSince(state, c), ev = nextEvent(state, c), org = state.organizations.find(o => o.id === c.organizationId)
  const patch = (p: ContactPatch) => dispatch({ type: "updateContact", id: c.id, patch: p })
  const types = [...new Set([...CONTACT_TYPES, c.relation])]
  return <section className="form-stack crm-detail" aria-label={`Contact ${c.name}`}>
    <div>
      <h2>{c.name}</h2>
      <p className="small muted">{[c.title, org?.name].filter(Boolean).join(" · ") || c.relation}</p>
      {org && <button type="button" className="btn btn-quiet small" onClick={() => rail.show({ kind: "org", id: org.id })}>Open {org.name}</button>}
    </div>
    <div className="action-row">
      <button className="btn btn-primary" onClick={() => setLogging(true)} disabled={logging}>Log interaction</button>
      <button className="btn" disabled={!edit} onClick={() => dispatch({ type: "contacted", id: c.id })} title="Marks today as the last contact; use Log interaction to say what happened">Contacted today</button>
    </div>
    {logging && <LogForm contactId={c.id} onDone={() => setLogging(false)} />}
    <div className="kv">
      <span>Stage</span><select aria-label="Stage" disabled={!edit} value={c.stage} onChange={e => patch({ stage: e.target.value as RelationStage })}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
      <span>Owner</span><span>{role?.displayName ?? "—"} · {person?.name ?? "Vacant"}</span>
      <span>Last contact</span><span className={`days ${contactTone(state, c)}`}>{d === null ? "Never" : `${d} days ago`}</span>
      <label htmlFor="cad">Contact every (days)</label><input id="cad" type="number" min="1" max="365" disabled={!edit} value={c.cadenceDays} onChange={e => patch({ cadenceDays: Number(e.target.value) })} />
      <span>Next event</span><span>{ev ? <Link to={`/events?event=${encodeURIComponent(ev.id)}`}>{ev.name} · {fmtShort(ev.date)}</Link> : "None linked"}</span>
    </div>
    <details>
      <summary>Profile</summary>
      <div className="form-stack">
        <Field label="Name" value={c.name} disabled={!edit} max={80} onSave={v => v.trim() && patch({ name: v })} />
        <Field label="Title" value={c.title} disabled={!edit} max={80} onSave={v => patch({ title: v })} />
        <Field label="Organization" value={org?.name ?? ""} disabled={!edit} max={80} placeholder="None" onSave={v => patch({ organization: v })} />
        <label>Type<select disabled={!edit} value={c.relation} onChange={e => patch({ relation: e.target.value })}>{types.map(t => <option key={t}>{t}</option>)}</select></label>
        <Field label="Email" type="email" value={c.email} disabled={!edit} onSave={v => patch({ email: v })} placeholder="name@example.org" />
        <Field label="Phone" type="tel" value={c.phone} disabled={!edit} max={40} onSave={v => patch({ phone: v })} />
        <Field label="LinkedIn or Instagram" value={c.social} disabled={!edit} onSave={v => patch({ social: v })} />
        <label>Best way to reach<select disabled={!edit} value={c.preferredChannel} onChange={e => patch({ preferredChannel: e.target.value as PreferredChannel })}>{CHANNELS.map(ch => <option key={ch.id} value={ch.id}>{ch.label}</option>)}</select></label>
        <TagsField tags={c.tags} disabled={!edit} onSave={tags => patch({ tags })} />
        <label>How we met<select disabled={!edit} value={SOURCES.includes(c.source) ? c.source : c.source ? "Other" : ""} onChange={e => patch({ source: e.target.value })}><option value="">Not set</option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Introduced by<select disabled={!edit} value={c.introducedById ?? ""} onChange={e => patch({ introducedById: e.target.value || null })}><option value="">Nobody</option>{state.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Owner role<select disabled={!lead} value={c.ownerRoleId} onChange={e => patch({ ownerRoleId: e.target.value })}>{state.roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select></label>
        <label>Who can see this<select disabled={!edit} value={c.visibility} onChange={e => patch({ visibility: e.target.value === "leads" ? "leads" : "all" })}><option value="all">Everyone in the club</option><option value="leads">President, VP and owner only</option></select></label>
      </div>
    </details>
    <h3>Timeline</h3>
    <Timeline items={timeline(state, { contactId: c.id })} />
    {lead && (confirmDelete
      ? <div className="action-row"><button className="btn btn-primary" onClick={() => { dispatch({ type: "deleteContact", id: c.id }); rail.closeDetail() }}>Yes, delete {c.name}</button><button className="btn btn-quiet" onClick={() => setConfirmDelete(false)}>Cancel</button></div>
      : <button className="btn btn-quiet" onClick={() => setConfirmDelete(true)}>Delete contact</button>)}
    <p className="small muted">Shared with the club. Nothing here sends a message. Contacts stay with the role at handoff.{!edit && " Only the owner or a lead can edit the profile."}</p>
  </section>
}
