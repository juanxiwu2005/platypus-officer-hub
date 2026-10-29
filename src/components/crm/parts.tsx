import { useEffect, useState } from "react"
import { useStore } from "../../data/store"
import { Empty } from "../ui"
import { KINDS, parseTags } from "../../data/crm"
import { canLead } from "../../data/permissions"
import type { Contact, Interaction, InteractionKind } from "../../data/types"
import { fmtShort } from "../../lib/dates"

/** A text field that saves when you leave it (Settings uses the same habit). */
export function Field({ label, value, onSave, disabled, type = "text", placeholder, max = 120, multiline }: {
  label: string; value: string; onSave: (v: string) => void; disabled?: boolean; type?: string; placeholder?: string; max?: number; multiline?: boolean
}) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  const commit = () => { if (v !== value) onSave(v) }
  return <label>{label}
    {multiline
      ? <textarea rows={3} value={v} maxLength={max} disabled={disabled} placeholder={placeholder} onChange={e => setV(e.target.value)} onBlur={commit} />
      : <input type={type} value={v} maxLength={max} disabled={disabled} placeholder={placeholder} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />}
  </label>
}

/** Comma-separated tags, saved on blur. */
export function TagsField({ tags, onSave, disabled }: { tags: string[]; onSave: (t: string[]) => void; disabled?: boolean }) {
  return <Field label="Tags (comma separated)" value={tags.join(", ")} disabled={disabled} max={200} placeholder="catering, tempe" onSave={v => onSave(parseTags(v))} />
}

export const kindLabel = (k: InteractionKind) => KINDS.find(x => x.id === k)?.label ?? "Other"

/** Add an entry to the shared timeline. Open to every member who can see the contact. */
export function LogForm({ contactId, organizationId, onDone }: { contactId: string | null; organizationId?: string; onDone: () => void }) {
  const { state, dispatch } = useStore()
  const blank = { kind: "email" as InteractionKind, date: state.today, summary: "", outcome: "", nextStep: "", nextDue: "", eventId: "" }
  const [f, setF] = useState(blank)
  const set = (patch: Partial<typeof blank>) => setF({ ...f, ...patch })
  return <form className="form-stack crm-log" aria-label="Log interaction" onSubmit={e => {
    e.preventDefault()
    dispatch({ type: "logInteraction", input: { contactId, organizationId, date: f.date, kind: f.kind, summary: f.summary, outcome: f.outcome, nextStep: f.nextStep, nextDue: f.nextDue || null, eventId: f.eventId || null } })
    setF(blank); onDone()
  }}>
    <div className="crm-two">
      <label>Kind<select value={f.kind} onChange={e => set({ kind: e.target.value as InteractionKind })}>{KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}</select></label>
      <label>Date<input type="date" required max={state.today} value={f.date} onChange={e => set({ date: e.target.value })} /></label>
    </div>
    <label>What happened<textarea required rows={2} maxLength={500} value={f.summary} onChange={e => set({ summary: e.target.value })} /></label>
    <label>Outcome<input maxLength={200} value={f.outcome} placeholder="e.g. agreed to sponsor $300" onChange={e => set({ outcome: e.target.value })} /></label>
    <div className="crm-two">
      <label>Next step<input maxLength={200} value={f.nextStep} onChange={e => set({ nextStep: e.target.value })} /></label>
      <label>Due<input type="date" min={state.today} value={f.nextDue} disabled={!f.nextStep} onChange={e => set({ nextDue: e.target.value })} /></label>
    </div>
    <label>Event<select value={f.eventId} onChange={e => set({ eventId: e.target.value })}><option value="">None</option>{state.events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select></label>
    <div className="action-row"><button className="btn btn-primary" type="submit">Save entry</button><button className="btn btn-quiet" type="button" onClick={onDone}>Cancel</button></div>
  </form>
}

/** Newest first. Shows who, what, the outcome and the open next step. */
export function Timeline({ items, contacts }: { items: Interaction[]; contacts?: Contact[] }) {
  const { state, dispatch } = useStore()
  if (!items.length) return <Empty>Nothing logged yet.</Empty>
  return <ol className="crm-timeline" aria-label="Timeline">{items.map(i => {
    const by = state.people.find(p => p.id === i.byId)?.name ?? "Someone"
    const who = contacts?.find(c => c.id === i.contactId)?.name
    const ev = state.events.find(e => e.id === i.eventId)
    const mine = i.byId === state.viewerId
    return <li key={i.id}>
      <div className="crm-t-head"><strong>{kindLabel(i.kind)}</strong><span className="small muted">{fmtShort(i.date)} · {by}{who ? ` · ${who}` : ""}</span></div>
      <p>{i.summary}</p>
      {i.outcome && <p className="small"><span className="muted">Outcome:</span> {i.outcome}</p>}
      {ev && <p className="small muted">Event: {ev.name}</p>}
      {i.nextStep && <label className="check-label small crm-next">
        <input type="checkbox" checked={i.nextDone} onChange={e => dispatch({ type: "updateInteraction", id: i.id, nextDone: e.target.checked })} />
        <span className={i.nextDone ? "muted" : ""}>Next: {i.nextStep}{i.nextDue ? ` · by ${fmtShort(i.nextDue)}` : ""}</span>
      </label>}
      {(mine || canLead(state)) && <button type="button" className="btn btn-quiet small" aria-label="Delete entry" onClick={() => dispatch({ type: "updateInteraction", id: i.id, delete: true })}>Delete</button>}
    </li>
  })}</ol>
}
