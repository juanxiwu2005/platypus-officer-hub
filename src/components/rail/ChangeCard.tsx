import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useStore } from "../../data/store"
import type { ChangeSet, Tier } from "../../data/types"
import { commandContext, humanEventDate, opLabel, TIERS, type CommandOp } from "../../lib/commands"
import { canApplyOp, notAllowedText, validateReview } from "../../data/changeReview"
import { defaultTaskDue } from "../../engine/taskDates"
import { TaskDueFields } from "./TaskFields"
import { Feedback } from "../Feedback"
import { RULES } from "../../data/rules"
import { officers } from "../../data/permissions"
import { useRail } from "./RailContext"
import { findWorkflowTemplateVersion } from "../../data/workflowTemplates"
import { initialWorkflowChoice, WorkflowTemplatePicker } from "./WorkflowTemplatePicker"


/** A change set inside the Ask panel. Each item is checked, edited and approved one by one (plan §8). */
export function ChangeCard({ id }: { id: string }) {
  const { state } = useStore()
  const rail = useRail()
  const change = state.changeSets.find(c => c.id === id)
  if (!change) return <p className="small muted">This draft was cleared by Reset demo.</p>
  return <ChangeReview change={change} onNudge={nodeId => rail.show({ kind: "nudge", id: nodeId })} />
}

/** Small edits the assistant already made, with one Undo for the whole set. */
export function AppliedCard({ id }: { id: string }) {
  const { state, dispatch } = useStore()
  const change = state.changeSets.find(c => c.id === id)
  if (!change) return <p className="small muted">This change was cleared by Reset demo.</p>
  const ctx = commandContext(state)
  const done = change.reviews?.some(r => r === "applied")
  return <section className="change-set applied" aria-label="Changes made" data-testid="applied-set">
    <header><b>{change.undone ? "Undone" : done ? "Done" : "Not changed"}</b>{done && !change.undone && <button type="button" className="btn small" onClick={() => dispatch({ type: "undoAuto", id })} data-testid="undo-auto">Undo</button>}</header>
    <ul className="applied-list">{change.ops.map((op, i) => <li key={i} className={change.reviews?.[i] === "applied" ? "" : "muted"}>
      <span aria-hidden="true">{change.reviews?.[i] === "applied" ? (change.undone ? "↺" : "✓") : "–"}</span> {opLabel(op as CommandOp, ctx)}{change.notes?.[i] && <span className="small muted"> · {change.notes[i]}</span>}
    </li>)}</ul>
  </section>
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
  const navigate = useNavigate()
  const rail = useRail()
  const [op, setOp] = useState(initial)
  const [workflowChoice, setWorkflowChoice] = useState(() => initial.op === "create_event" ? initialWorkflowChoice(state, change.workflowChoices?.[index]) : undefined)
  const canNudge = canApplyOp(state, initial)
  // Dates come only from the original human sentence, the club's task length setting, or this form — never the AI.
  const [date, setDate] = useState(humanEventDate(change.sentence, state.today) || (initial.op === "add_node" && !initial.eventId ? defaultTaskDue(state) : ""))
  const [error, setError] = useState("")
  const review = change.reviews?.[index] ?? "pending"
  const pending = review === "pending"
  const ownerSelect = (ownerId: string | null, update: (value: string | null) => void) => <label>Owner<select aria-label="Owner" value={ownerId ?? ""} onChange={e => update(e.target.value || null)}><option value="">No owner</option>{officers(state).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  const nodeSelect = (value: string, update: (value: string) => void, label = "Task") => <label>{label}<select aria-label={label} value={value} onChange={e => update(e.target.value)}>{state.nodes.map(n => <option key={n.id} value={n.id}>{n.title} · {state.events.find(ev => ev.id === n.eventId)?.name ?? "Standalone"}</option>)}</select></label>
  const tierSelect = (tier: Tier, update: (value: Tier) => void) => <label>Difficulty<select aria-label="Difficulty" value={tier} onChange={e => update(e.target.value as Tier)}>{TIERS.map(t => <option key={t}>{t}</option>)}</select></label>
  function apply() {
    // FB-5: a standalone task has one date, Due, so no club buffer is taken off it.
    if (op.op === "create_event" && !workflowChoice) { setError("Choose a saved workflow version."); return }
    const human = { date, buffered: false, ...(op.op === "create_event" && workflowChoice ? { workflowTemplateId: workflowChoice.templateId, workflowTemplateVersion: workflowChoice.templateVersion } : {}) }
    const problem = validateReview(state, op, human)
    if (problem) { setError(problem); return }
    dispatch({ type: "reviewChange", id: change.id, index, decision: "applied", op, human })
    setError("")
    if (op.op === "propose_nudge") onNudge(op.nodeId)
    if (op.op === "create_event") setTimeout(() => {
      navigate(`/events?event=${encodeURIComponent(`${change.id}:${index}`)}`)
      // Manual workflows are ready to execute directly. AI review remains an optional extension.
      const version = workflowChoice && findWorkflowTemplateVersion(state, workflowChoice.templateId, workflowChoice.templateVersion)
      if (version?.kind !== "custom") rail.requestReview(`${change.id}:${index}`)
    }, 0)
  }
  return <article className="change-item" data-testid="change-item">
    <b>{opLabel(pending ? op : initial, commandContext(state))}</b>
    {op.op === "answer_question" ? <>
      <p>{op.answer}</p>
      <details><summary>Sources checked</summary>{op.citations.map(id=>{const r=RULES.find(r=>r.id===id)!;return <div key={id}><b>{id} · checked {r.checkedOn}</b>{r.sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></p>)}</div>})}</details>
      <div className="action-row">{op.citations.map(id => { const rule = RULES.find(r => r.id === id)!; return <a key={id} href={rule.sources[0].url} target="_blank" rel="noreferrer">{id} · checked {rule.checkedOn}</a> })}</div>
    </> : pending && <fieldset disabled={!canNudge} className="review-fields">
      <legend className="small muted">Check or edit before applying</legend>
      {op.op === "create_event" && <>
        <label>Event name<input value={op.name} maxLength={80} onChange={e => setOp({ ...op, name: e.target.value })} /></label>
        <WorkflowTemplatePicker state={state} value={workflowChoice} onChange={setWorkflowChoice} />
        <label>Event date<input aria-label="Event date" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>Expected people<input type="number" min={1} max={5000} value={op.headcount} onChange={e => setOp({ ...op, headcount: Number(e.target.value) })} /></label>
        <label>Food<select aria-label="Food" value={op.food === "none" ? "no" : "yes"} onChange={e => setOp({ ...op, food: e.target.value === "yes" ? (initial.op === "create_event" && initial.food !== "none" ? initial.food : "tbd") : "none" })}><option value="no">No</option><option value="yes">Yes</option></select></label>
        <label className="check-label"><input type="checkbox" checked={op.speaker} onChange={e => setOp({ ...op, speaker: e.target.checked })} /> Guest speaker or performer</label>
        <label>Details<textarea rows={2} maxLength={500} value={op.details ?? ""} onChange={e => setOp({ ...op, details: e.target.value })} /></label>
        <p className="small muted">Steps come from the workflow; dates from the event date.</p>
      </>}
      {op.op === "add_node" && <>
        <label>Task title<input value={op.title} maxLength={100} onChange={e => setOp({ ...op, title: e.target.value })} /></label>
        <label>Event<select value={op.eventId ?? ""} onChange={e => setOp({ ...op, eventId: e.target.value || null })}><option value="">Standalone task</option>{state.events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select></label>
        {!op.eventId && <TaskDueFields due={date} onDue={setDate} />}
        {ownerSelect(op.ownerId, ownerId => setOp({ ...op, ownerId }))}{tierSelect(op.tier, tier => setOp({ ...op, tier }))}
      </>}
      {op.op === "assign_owner" && <>{nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId }))}{ownerSelect(op.ownerId, ownerId => setOp({ ...op, ownerId }))}</>}
      {op.op === "set_tier" && <>{nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId }))}{tierSelect(op.tier, tier => setOp({ ...op, tier }))}</>}
      {op.op === "link_dependency" && <>{nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId }))}{nodeSelect(op.dependsOnId, dependsOnId => setOp({ ...op, dependsOnId }), "Must wait for")}</>}
      {op.op === "propose_nudge" && nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId }))}
      {op.op === "set_funding_amount" && <label>Budget ($)<input type="number" min={0} max={1000000} value={op.amount} onChange={e => setOp({ ...op, amount: Number(e.target.value) })} /></label>}
      {op.op === "update_event" && <>
        <label>Event name<input value={op.name ?? state.events.find(e => e.id === op.eventId)?.name ?? ""} maxLength={80} onChange={e => setOp({ ...op, name: e.target.value })} /></label>
        <label>Expected people<input type="number" min={1} max={5000} value={op.headcount ?? state.events.find(e => e.id === op.eventId)?.headcount ?? 30} onChange={e => setOp({ ...op, headcount: Number(e.target.value) })} /></label>
      </>}
      {op.op === "add_contact" && <>
        <label>Partner name<input value={op.name} maxLength={80} onChange={e => setOp({ ...op, name: e.target.value })} /></label>
        <label>Organization<input value={op.organization} maxLength={80} onChange={e => setOp({ ...op, organization: e.target.value })} /></label>
        <label>Owner role<select value={op.ownerRoleId} onChange={e => setOp({ ...op, ownerRoleId: e.target.value })}>{state.roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select></label>
      </>}
    </fieldset>}
    {error && <p className="small late-text" role="alert">{error}</p>}
    {!pending && /AI/.test(change.source ?? "") && <Feedback id={change.id + ":" + index} text={change.sentence + " · " + JSON.stringify(op)} />}
    <div className="action-row">{pending ? <>
      <button className="btn btn-primary" disabled={!canNudge} onClick={apply}>{op.op === "answer_question" ? "Acknowledge" : op.op === "propose_nudge" ? "Approve draft" : "Apply this change"}</button>
      <button className="btn" disabled={!canNudge} onClick={() => dispatch({ type: "reviewChange", id: change.id, index, decision: "rejected" })}>Reject</button>
      {!canNudge && <span className="small muted">{notAllowedText(initial)}</span>}
    </> : <span className={`tag ${review === "applied" ? "good" : ""}`}>{review === "applied" ? "Approved" : "Rejected"}</span>}</div>
  </article>
}
