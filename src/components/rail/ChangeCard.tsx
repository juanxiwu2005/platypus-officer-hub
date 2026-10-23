import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useStore, useViewer } from "../../data/store"
import type { ChangeSet, Event, Tier } from "../../data/types"
import { humanEventDate, opLabel, TIERS, type CommandOp } from "../../lib/commands"
import { validateReview } from "../../data/changeReview"
import { Feedback } from "../Feedback"
import { RULES } from "../../data/rules"
import { useRail } from "./RailContext"

const TYPE: Record<Event["type"], string> = { social: "Social", speaker: "Speaker", workshop: "Workshop", meeting: "Meeting", fundraiser: "Fundraiser", offcampus: "Off-campus trip" }
const FOODS: Record<Event["food"], string> = { none: "No food", offsite: "Outside caterer", dining: "Sun Devil Dining", onsite: "Made on site" }
const FUNDS: Record<Event["funding"], string> = { none: "None", usg: "USG", college: "College", dues: "Dues", sponsor: "Sponsor" }

/** A change set inside the Ask panel. Each item is checked, edited and approved one by one (plan §8). */
export function ChangeCard({ id }: { id: string }) {
  const { state } = useStore()
  const rail = useRail()
  const change = state.changeSets.find(c => c.id === id)
  if (!change) return <p className="small muted">This draft was cleared by Reset demo.</p>
  return <ChangeReview change={change} onNudge={nodeId => rail.show({ kind: "nudge", id: nodeId })} />
}

function ChangeReview({ change, onNudge }: { change: ChangeSet; onNudge: (id: string) => void }) {
  return <section className="change-set" aria-label="Change set" data-testid="change-set">
    <header><b>Review changes</b><span className="tag">{change.status === "pending" ? "Awaiting review" : "Done"}</span></header>
    <p className="small muted">{change.source}</p>
    {change.ops.map((op, index) => <ChangeItem key={index} change={change} initial={op as CommandOp} index={index} onNudge={onNudge} />)}
  </section>
}

function ChangeItem({ change, initial, index, onNudge }: { change: ChangeSet; initial: CommandOp; index: number; onNudge: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const { canNudge } = useViewer()
  const navigate = useNavigate()
  const [op, setOp] = useState(initial)
  // Dates come only from the original human sentence or this form, never the AI response.
  const [date, setDate] = useState(humanEventDate(change.sentence, state.today))
  const [error, setError] = useState("")
  const review = change.reviews?.[index] ?? "pending"
  const pending = review === "pending"
  const ownerSelect = (ownerId: string | null, update: (value: string | null) => void) => <label>Owner<select aria-label="Owner" value={ownerId ?? ""} onChange={e => update(e.target.value || null)}><option value="">No owner</option>{state.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  const nodeSelect = (value: string, update: (value: string) => void, label = "Task") => <label>{label}<select aria-label={label} value={value} onChange={e => update(e.target.value)}>{state.nodes.map(n => <option key={n.id} value={n.id}>{n.title} · {state.events.find(ev => ev.id === n.eventId)?.name ?? "Standalone"}</option>)}</select></label>
  const tierSelect = (tier: Tier, update: (value: Tier) => void) => <label>Difficulty<select aria-label="Difficulty" value={tier} onChange={e => update(e.target.value as Tier)}>{TIERS.map(t => <option key={t}>{t}</option>)}</select></label>
  function apply() {
    const problem = validateReview(state, op, { date })
    if (problem) { setError(problem); return }
    dispatch({ type: "reviewChange", id: change.id, index, decision: "applied", op, human: { date } })
    setError("")
    if (op.op === "propose_nudge") onNudge(op.nodeId)
    if (op.op === "create_event") setTimeout(() => navigate(`/events?event=${encodeURIComponent(`${change.id}:${index}`)}`), 0)
  }
  return <article className="change-item" data-testid="change-item">
    <b>{opLabel(pending ? op : initial, state)}</b>
    {op.op === "answer_question" ? <>
      <p>{op.answer}</p>
      <details><summary>Sources checked</summary><p className="small muted">The cited records from the checked rule book; source pages were not re-fetched during this answer.</p>{op.citations.map(id=>{const r=RULES.find(r=>r.id===id)!;return <div key={id}><b>{id} · checked {r.checkedOn}</b>{r.sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></p>)}</div>})}</details>
      <div className="action-row">{op.citations.map(id => { const rule = RULES.find(r => r.id === id)!; return <a key={id} href={rule.sources[0].url} target="_blank" rel="noreferrer">{id} · checked {rule.checkedOn}</a> })}</div>
    </> : pending && <fieldset disabled={!canNudge} className="review-fields">
      <legend className="small muted">Check or edit before applying</legend>
      {op.op === "create_event" && <>
        <label>Event name<input value={op.name} maxLength={80} onChange={e => setOp({ ...op, name: e.target.value })} /></label>
        <label>Event date · confirm your choice<input aria-label="Event date" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>Expected people<input type="number" min={1} max={5000} value={op.headcount} onChange={e => setOp({ ...op, headcount: Number(e.target.value) })} /></label>
        <label>Event type<select value={op.type} onChange={e => setOp({ ...op, type: e.target.value as Event["type"] })}>{Object.entries(TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Venue<select value={op.venue} onChange={e => setOp({ ...op, venue: e.target.value as Event["venue"] })}><option value="campus">On campus</option><option value="offcampus">Off campus</option></select></label>
        <label>Food<select value={op.food} onChange={e => setOp({ ...op, food: e.target.value as Event["food"] })}>{Object.entries(FOODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Funding<select value={op.funding} onChange={e => setOp({ ...op, funding: e.target.value as Event["funding"] })}>{Object.entries(FUNDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="check-label"><input type="checkbox" checked={op.speaker} onChange={e => setOp({ ...op, speaker: e.target.checked })} /> Guest speaker</label>
        <p className="small muted">Steps and deadlines come from the club playbook after approval.</p>
      </>}
      {op.op === "add_node" && <>
        <label>Task title<input value={op.title} maxLength={100} onChange={e => setOp({ ...op, title: e.target.value })} /></label>
        <label>Event<select value={op.eventId ?? ""} onChange={e => setOp({ ...op, eventId: e.target.value || null })}><option value="">Standalone task</option>{state.events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select></label>
        {!op.eventId && <label>Club deadline · your choice<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>}
        {ownerSelect(op.ownerId, ownerId => setOp({ ...op, ownerId }))}{tierSelect(op.tier, tier => setOp({ ...op, tier }))}
      </>}
      {op.op === "assign_owner" && <>{nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId }))}{ownerSelect(op.ownerId, ownerId => setOp({ ...op, ownerId }))}</>}
      {op.op === "set_tier" && <>{nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId }))}{tierSelect(op.tier, tier => setOp({ ...op, tier }))}</>}
      {op.op === "link_dependency" && <>{nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId }))}{nodeSelect(op.dependsOnId, dependsOnId => setOp({ ...op, dependsOnId }), "Must wait for")}</>}
      {op.op === "propose_nudge" && nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId }))}
    </fieldset>}
    {error && <p className="small late-text" role="alert">{error}</p>}
    {!pending && /AI/.test(change.source ?? "") && <Feedback id={change.id + ":" + index} text={change.sentence + " · " + JSON.stringify(op)} />}
    <div className="action-row">{pending ? <>
      <button className="btn btn-primary" disabled={!canNudge} onClick={apply}>{op.op === "answer_question" ? "Acknowledge" : op.op === "propose_nudge" ? "Approve draft" : "Apply this change"}</button>
      <button className="btn" disabled={!canNudge} onClick={() => dispatch({ type: "reviewChange", id: change.id, index, decision: "rejected" })}>Reject</button>
      {!canNudge && <span className="small muted">The president or VP approves changes.</span>}
    </> : <span className={`tag ${review === "applied" ? "good" : ""}`}>{review === "applied" ? "Approved" : "Rejected"}</span>}</div>
  </article>
}
