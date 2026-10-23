import { useRef, useState } from "react"
import { useStore, useViewer } from "../data/store"
import type { ChangeSet, Event, Tier } from "../data/types"
import { callApi } from "../lib/api"
import { commandContext, humanEventDate, opLabel, parseCommand, sanitizeOps, TIERS, type CommandOp } from "../lib/commands"
import { validateReview } from "../data/changeReview"
import { RuleQuestion } from "./RuleQuestion"
import { Feedback } from "./Feedback"
import { RULES } from "../data/rules"

export function CommandBar({ onNudge }: { onNudge: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const [sentence, setSentence] = useState("")
  const [ruleQuestion, setRuleQuestion] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const sequence = useRef(0)
  async function draft() {
    if (!sentence.trim() || busy) return
    const entered = sentence.trim()
    if (/\?|^(can|what|which|when|how|do|does|is|are|may|should)\b/i.test(entered)) { setRuleQuestion(entered); return }
    setBusy(true); setNotice("")
    try {
      let ops: CommandOp[] = [], source = "Local demo grammar"
      if (state.aiEnabled) {
        try {
          const result = await callApi<{ ops: unknown; source: string; model?: string }>("/command", { sentence: entered, context: commandContext(state) })
          ops = sanitizeOps(result.ops, state)
          source = result.source === "ai" ? `AI draft${result.model ? ` · ${result.model}` : ""}` : "Checked command grammar"
        } catch { ops = parseCommand(entered, state); source = "Local demo fallback · server unavailable" }
      } else { ops = parseCommand(entered, state); source = "Local demo grammar · AI off" }
      if (!ops.length) { setNotice("I couldn't safely match this request. Try an exact task name, or describe one event. You can enter its date during review."); return }
      dispatch({ type: "draftChanges", changeSet: { id: `change-${Date.now()}-${sequence.current++}`, sentence: entered, ops, status: "pending", source } })
      setSentence("")
    } finally { setBusy(false) }
  }
  const recent = [...state.changeSets].reverse().slice(0, 3)
  return <section className="card command" aria-label="Tell Platypus">
    <label htmlFor="command" className="small muted">Tell Platypus in one sentence, or ask about a rule</label>
    <textarea id="command" maxLength={1000} value={sentence} onChange={e => setSentence(e.target.value)} placeholder="e.g. Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding" />
    <div className="action-row"><button className="btn btn-primary" disabled={busy || !sentence.trim()} onClick={draft}>{busy ? "Preparing…" : "Review changes"}</button><span className="small muted">Nothing changes until you approve each item.</span></div>
    {notice && <p role="status" className="small warn-text">{notice}</p>}
    {ruleQuestion && <RuleQuestion key={ruleQuestion} initial={ruleQuestion}/>}
    {recent.map(change => <ChangeReview key={change.id} change={change} onNudge={onNudge} />)}
  </section>
}

function ChangeReview({ change, onNudge }: { change: ChangeSet; onNudge: (id: string) => void }) {
  return <section className="change-set" aria-label="Change set" data-testid="change-set">
    <header><h2>Review changes</h2><span className="tag">{change.status === "pending" ? "Awaiting your review" : "Review complete"}</span></header>
    <p className="small muted">“{change.sentence}” · {change.source}</p>
    <Feedback id={change.id} text={change.sentence + " · " + JSON.stringify(change.ops)}/>
    {change.ops.map((op, index) => <ChangeItem key={index} change={change} initial={op as CommandOp} index={index} onNudge={onNudge} />)}
  </section>
}

function ChangeItem({ change, initial, index, onNudge }: { change: ChangeSet; initial: CommandOp; index: number; onNudge: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const { canNudge } = useViewer()
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
  }
  return <article className="change-item" data-testid="change-item">
    <b>{opLabel(pending ? op : initial, state)}</b>
    {op.op === "answer_question" ? <>
      <p>{op.answer}</p>
      <div className="action-row">{op.citations.map(id => { const rule = RULES.find(r => r.id === id)!; return <a key={id} href={rule.sources[0].url} target="_blank" rel="noreferrer">{id} · checked {rule.checkedOn}</a> })}</div>
    </> : pending && <fieldset disabled={!canNudge} className="review-fields">
      <legend className="small muted">Check or edit before applying</legend>
      {op.op === "create_event" && <>
        <label>Event name<input value={op.name} maxLength={80} onChange={e => setOp({ ...op, name: e.target.value })} /></label>
        <label>Event date · confirm your choice<input aria-label="Event date" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>Expected people<input type="number" min={1} max={5000} value={op.headcount} onChange={e => setOp({ ...op, headcount: Number(e.target.value) })} /></label>
        <label>Event type<select value={op.type} onChange={e => setOp({ ...op, type: e.target.value as Event["type"] })}>{["social", "speaker", "workshop", "meeting", "fundraiser", "offcampus"].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>Venue<select value={op.venue} onChange={e => setOp({ ...op, venue: e.target.value as Event["venue"] })}>{["campus", "offcampus"].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>Food<select value={op.food} onChange={e => setOp({ ...op, food: e.target.value as Event["food"] })}>{["none", "offsite", "dining", "onsite"].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>Funding<select value={op.funding} onChange={e => setOp({ ...op, funding: e.target.value as Event["funding"] })}>{["none", "usg", "college", "dues", "sponsor"].map(v => <option key={v}>{v}</option>)}</select></label>
        <label><input type="checkbox" checked={op.speaker} onChange={e => setOp({ ...op, speaker: e.target.checked })} /> Guest speaker or performer</label>
        <p className="small muted">We will add the standard club workflow and calculate deadlines after approval.</p>
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
    <div className="action-row">{pending ? <>
      <button className="btn btn-primary" disabled={!canNudge} onClick={apply}>{op.op === "answer_question" ? "Acknowledge" : op.op === "propose_nudge" ? "Approve draft" : "Apply this change"}</button>
      <button className="btn" disabled={!canNudge} onClick={() => dispatch({ type: "reviewChange", id: change.id, index, decision: "rejected" })}>Reject</button>
      {!canNudge && <span className="small muted">A president or vice president reviews changes.</span>}
    </> : <span className={`tag ${review === "applied" ? "good" : ""}`}>{review === "applied" ? "Approved" : "Rejected"}</span>}</div>
  </article>
}
