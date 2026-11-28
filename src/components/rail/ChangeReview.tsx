import { lazy, Suspense, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useStore } from "../../data/store"
import type { ChangeSet, DemoState, Tier } from "../../data/types"
import { commandContext, humanEventDate, opLabel, TIERS, type CommandOp } from "../../lib/commands"
import { canApplyOp, notAllowedText, previewNewEvent, validateReview, type HumanInputs } from "../../data/changeReview"
import { defaultTaskDue } from "../../engine/taskDates"
import { fmtLong, fmtShort } from "../../lib/dates"
import { TaskDueFields } from "./TaskFields"
import { Feedback } from "../Feedback"
import { RULES } from "../../data/rules"
import { distinctSources, withSourceNames } from "../../lib/sourceNames"
import { officers } from "../../data/permissions"
import { useRail } from "./RailContext"
import { findWorkflowTemplateVersion } from "../../data/workflowTemplates"
import { initialWorkflowChoice, WorkflowTemplatePicker, type WorkflowChoice } from "./WorkflowTemplatePicker"

const CreatedCard = lazy(() => import("./PlanForm").then(module => ({ default: module.CreatedCard })))

/*
 * Review option B (Juanxi 2026-11-28): a change list like tracked changes. Each change is one row with + (new) or ~ (changed)
 * and one line on what it does; unticking a row leaves it out, and one button applies the ticked rows. The same list
 * reviews a new event from the New event form, so nothing is saved and nobody gets a task until Create event is pressed.
 * Answers and reminder drafts are not changes to the plan, so they keep their own card below the list.
 */

/** Operations that are not plan changes keep their own Acknowledge / Approve draft card. */
const ownCard = (op: CommandOp) => op.op === "answer_question" || op.op === "propose_nudge"
const isNew = (op: CommandOp) => op.op === "create_event" || op.op === "add_node" || op.op === "add_contact"

interface Row { op: CommandOp; date: string; workflow?: WorkflowChoice; ticked: boolean; editing: boolean; error: string }

function startRow(state: DemoState, change: ChangeSet, op: CommandOp, index: number): Row {
  const form = change.formInputs?.[index]
  // Dates come only from the person: the New event form, their own sentence, or the club's task length setting — never the AI.
  const date = form?.date ?? (humanEventDate(change.sentence, state.today) || (op.op === "add_node" && !op.eventId ? defaultTaskDue(state) : ""))
  return { op, date, workflow: op.op === "create_event" ? initialWorkflowChoice(state, change.workflowChoices?.[index]) : undefined, ticked: canApplyOp(state, op), editing: false, error: "" }
}

function humanFor(change: ChangeSet, index: number, row: Row): HumanInputs {
  const leads = change.formInputs?.[index]?.teamLeads
  return { date: row.date, buffered: false, ...(row.workflow ? { workflowTemplateId: row.workflow.templateId, workflowTemplateVersion: row.workflow.templateVersion } : {}), ...(row.op.op === "create_event" && leads ? { teamLeads: leads } : {}) }
}

/** One line on what the change does: before → after for an edit, the key facts for something new. */
function consequence(state: DemoState, op: CommandOp, row: Row): string {
  const node = (id: string) => state.nodes.find(n => n.id === id)
  const person = (id: string | null | undefined) => state.people.find(p => p.id === id)?.name ?? "No owner"
  switch (op.op) {
    case "create_event": {
      const version = row.workflow && findWorkflowTemplateVersion(state, row.workflow.templateId, row.workflow.templateVersion)
      return [row.date ? fmtLong(row.date) : "No date yet", `${op.headcount} people`, version ? `${version.name} · v${version.version}` : null].filter(Boolean).join(" · ")
    }
    case "add_node": return [op.eventId ? `In ${state.events.find(e => e.id === op.eventId)?.name ?? "the event"}` : row.date ? `Due ${fmtShort(row.date)}` : "No due date yet", op.ownerId ? `${person(op.ownerId)} gets it` : "Anyone can claim it"].join(" · ")
    case "assign_owner": return `${person(node(op.nodeId)?.ownerId)} → ${person(op.ownerId)}`
    case "set_tier": return `${node(op.nodeId)?.tier ?? "—"} → ${op.tier}`
    case "link_dependency": return `${node(op.nodeId)?.title ?? "This task"} waits until ${node(op.dependsOnId)?.title ?? "the other task"} is done`
    case "update_event": {
      const ev = state.events.find(e => e.id === op.eventId)
      return [op.name && `${ev?.name ?? "Event"} → ${op.name}`, op.headcount && `${ev?.headcount ?? "—"} → ${op.headcount} people`].filter(Boolean).join(" · ")
    }
    case "set_funding_amount": return `$${(state.funding.find(f => f.eventId === op.eventId)?.amount ?? 0).toLocaleString("en-US")} → $${op.amount.toLocaleString("en-US")}`
    case "add_contact": return `Kept by ${state.roles.find(r => r.id === op.ownerRoleId)?.displayName ?? "a role"}`
    default: return ""
  }
}

export default function ChangeReview({ change, onNudge }: { change: ChangeSet; onNudge: (id: string) => void }) {
  const { state, dispatch, getState } = useStore()
  const navigate = useNavigate()
  const rail = useRail()
  const ops = change.ops as CommandOp[]
  const listed = ops.flatMap((op, index) => ownCard(op) ? [] : [index])
  const [rows, setRows] = useState<Record<number, Row>>(() => Object.fromEntries(listed.map(i => [i, startRow(state, change, ops[i], i)])))
  const patch = (i: number, p: Partial<Row>) => setRows(prev => ({ ...prev, [i]: { ...prev[i], ...p } }))
  const pendingRows = listed.filter(i => (change.reviews?.[i] ?? "pending") === "pending")
  const ticked = pendingRows.filter(i => rows[i]?.ticked)
  const fromForm = !!change.formInputs
  const onlyEvent = ticked.length === 1 && ops[ticked[0]].op === "create_event"
  const ctx = commandContext(state)

  function apply() {
    const now = getState()
    for (const i of ticked) {
      const problem = validateReview(now, rows[i].op, humanFor(change, i, rows[i]))
      if (problem) { patch(i, { error: problem, editing: true }); return }
    }
    for (const i of pendingRows) {
      if (rows[i].ticked) dispatch({ type: "reviewChange", id: change.id, index: i, decision: "applied", op: rows[i].op, human: humanFor(change, i, rows[i]) })
      else dispatch({ type: "reviewChange", id: change.id, index: i, decision: "rejected" })
    }
    const made = ticked.find(i => ops[i].op === "create_event" && getState().events.some(e => e.id === `${change.id}:${i}`))
    if (made === undefined) return
    const eventId = `${change.id}:${made}`, workflow = rows[made].workflow
    setTimeout(() => {
      navigate(`/events?event=${encodeURIComponent(eventId)}`)
      // Manual workflows are ready to execute directly; the plan check runs for the saved standard workflows.
      const version = workflow && findWorkflowTemplateVersion(now, workflow.templateId, workflow.templateVersion)
      if (version?.kind !== "custom") rail.requestReview(eventId)
    }, 0)
  }
  const discard = () => pendingRows.forEach(i => dispatch({ type: "reviewChange", id: change.id, index: i, decision: "rejected" }))

  const count = listed.length
  const heading = fromForm ? "Check before you create" : `${count} ${count === 1 ? "change" : "changes"} from your message`
  return <section className="change-set change-list" aria-label="Change set" data-testid="change-set">
    {listed.length > 0 && <>
      <header><b>{heading}</b></header>
      {!fromForm && <p className="small muted change-quote">“{change.sentence}”{change.source ? ` · ${change.source}` : ""}</p>}
      <ul className="review-list">{listed.map(i => {
        const row = rows[i], review = change.reviews?.[i] ?? "pending", pending = review === "pending"
        const op = pending ? row.op : ops[i], allowed = canApplyOp(state, ops[i]), label = opLabel(op, ctx)
        const human = humanFor(change, i, row)
        const preview = op.op === "create_event" && (pending ? row.ticked : review === "applied") && !validateReview(state, op, human) ? previewNewEvent(state, op, human) : null
        const off = pending ? !row.ticked : review !== "applied"
        return <li key={i} className={`review-row${off ? " is-off" : ""}`} data-testid="review-row">
          <div className="review-line">
            {pending
              ? <input type="checkbox" aria-label={`Apply: ${label}`} checked={row.ticked} disabled={!allowed} onChange={e => patch(i, { ticked: e.target.checked, error: "" })} />
              : <span className="review-done" aria-hidden="true">{review === "applied" ? "✓" : "–"}</span>}
            <span className={`review-mark ${isNew(op) ? "is-new" : "is-edit"}`} aria-hidden="true">{isNew(op) ? "+" : "~"}</span>
            <span className="review-text"><b>{label}</b>
              <span className="small muted">{pending && !row.ticked ? "Not applied: unticked" : !pending ? (review === "applied" ? "Applied" : "Not applied") : consequence(state, op, row)}</span>
            </span>
            {pending && allowed && <button type="button" className="btn btn-quiet small" aria-expanded={row.editing} onClick={() => patch(i, { editing: !row.editing })}>{row.editing ? "Done" : "Edit"}</button>}
          </div>
          {preview && <div className="review-line review-sub" data-testid="review-tasks">
            <span className={`review-mark is-new`} aria-hidden="true">+</span>
            <span className="review-text"><b>{preview.tasks} {preview.tasks === 1 ? "task" : "tasks"} for {preview.people} {preview.people === 1 ? "person" : "people"}</b>{preview.firstDue && <span className="small muted">First due {fmtShort(preview.firstDue)}</span>}</span>
          </div>}
          {pending && !allowed && <p className="small muted">{notAllowedText(ops[i])}</p>}
          {pending && row.editing && <ReviewFields state={state} op={row.op} date={row.date} workflow={row.workflow} onOp={next => patch(i, { op: next, error: "" })} onDate={date => patch(i, { date, error: "" })} onWorkflow={workflow => patch(i, { workflow, error: "" })} />}
          {pending && row.error && <p className="small late-text" role="alert">{row.error}</p>}
          {!pending && review === "applied" && op.op === "create_event" && <Suspense fallback={null}><CreatedCard card={{ kind: "created", changeSetId: change.id, eventId: `${change.id}:${i}`, name: op.name }} /></Suspense>}
        </li>
      })}</ul>
      {pendingRows.length > 0 && <div className="action-row review-actions">
        <button type="button" className="btn" onClick={discard}>Discard</button>
        <button type="button" className="btn btn-primary" disabled={!ticked.length} onClick={apply}>{onlyEvent ? "Create event" : `Apply ${ticked.length} ${ticked.length === 1 ? "change" : "changes"}`}</button>
      </div>}
      {pendingRows.length === 0 && /AI/.test(change.source ?? "") && <Feedback id={change.id} text={change.sentence + " · " + JSON.stringify(change.ops)} />}
    </>}
    {ops.map((op, index) => ownCard(op) ? <ChangeItem key={index} change={change} initial={op} index={index} onNudge={onNudge} /> : null)}
  </section>
}

/** The editable fields of one change, behind its Edit button. */
function ReviewFields({ state, op, date, workflow, onOp, onDate, onWorkflow }: { state: DemoState; op: CommandOp; date: string; workflow?: WorkflowChoice; onOp: (op: CommandOp) => void; onDate: (date: string) => void; onWorkflow: (choice: WorkflowChoice | undefined) => void }) {
  const ownerSelect = (ownerId: string | null, update: (value: string | null) => void) => <label>Owner<select aria-label="Owner" value={ownerId ?? ""} onChange={e => update(e.target.value || null)}><option value="">No owner</option>{officers(state).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  const nodeSelect = (value: string, update: (value: string) => void, label = "Task") => <label>{label}<select aria-label={label} value={value} onChange={e => update(e.target.value)}>{state.nodes.map(n => <option key={n.id} value={n.id}>{n.title} · {state.events.find(ev => ev.id === n.eventId)?.name ?? "Standalone"}</option>)}</select></label>
  const tierSelect = (tier: Tier, update: (value: Tier) => void) => <label>Difficulty<select aria-label="Difficulty" value={tier} onChange={e => update(e.target.value as Tier)}>{TIERS.map(t => <option key={t}>{t}</option>)}</select></label>
  return <fieldset className="review-fields">
    <legend className="sr-only">Edit this change</legend>
    {op.op === "create_event" && <>
      <label>Event name<input value={op.name} maxLength={80} onChange={e => onOp({ ...op, name: e.target.value })} /></label>
      <WorkflowTemplatePicker state={state} value={workflow} onChange={onWorkflow} />
      <label>Event date<input aria-label="Event date" type="date" value={date} onChange={e => onDate(e.target.value)} /></label>
      <label>Expected people<input type="number" min={1} max={5000} value={op.headcount} onChange={e => onOp({ ...op, headcount: Number(e.target.value) })} /></label>
      <label>Food<select aria-label="Food" value={op.food === "none" ? "no" : "yes"} onChange={e => onOp({ ...op, food: e.target.value === "yes" ? (op.food !== "none" ? op.food : "tbd") : "none" })}><option value="no">No</option><option value="yes">Yes</option></select></label>
      <label className="check-label"><input type="checkbox" checked={op.speaker} onChange={e => onOp({ ...op, speaker: e.target.checked })} /> Guest speaker or performer</label>
      <label>Details<textarea rows={2} maxLength={500} value={op.details ?? ""} onChange={e => onOp({ ...op, details: e.target.value })} /></label>
    </>}
    {op.op === "add_node" && <>
      <label>Task title<input value={op.title} maxLength={100} onChange={e => onOp({ ...op, title: e.target.value })} /></label>
      <label>Event<select value={op.eventId ?? ""} onChange={e => onOp({ ...op, eventId: e.target.value || null })}><option value="">Standalone task</option>{state.events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select></label>
      {!op.eventId && <TaskDueFields due={date} onDue={onDate} />}
      {ownerSelect(op.ownerId, ownerId => onOp({ ...op, ownerId }))}{tierSelect(op.tier, tier => onOp({ ...op, tier }))}
    </>}
    {op.op === "assign_owner" && <>{nodeSelect(op.nodeId, nodeId => onOp({ ...op, nodeId }))}{ownerSelect(op.ownerId, ownerId => onOp({ ...op, ownerId }))}</>}
    {op.op === "set_tier" && <>{nodeSelect(op.nodeId, nodeId => onOp({ ...op, nodeId }))}{tierSelect(op.tier, tier => onOp({ ...op, tier }))}</>}
    {op.op === "link_dependency" && <>{nodeSelect(op.nodeId, nodeId => onOp({ ...op, nodeId }))}{nodeSelect(op.dependsOnId, dependsOnId => onOp({ ...op, dependsOnId }), "Must wait for")}</>}
    {op.op === "set_funding_amount" && <label>Budget ($)<input type="number" min={0} max={1000000} value={op.amount} onChange={e => onOp({ ...op, amount: Number(e.target.value) })} /></label>}
    {op.op === "update_event" && <>
      <label>Event name<input value={op.name ?? state.events.find(e => e.id === op.eventId)?.name ?? ""} maxLength={80} onChange={e => onOp({ ...op, name: e.target.value })} /></label>
      <label>Expected people<input type="number" min={1} max={5000} value={op.headcount ?? state.events.find(e => e.id === op.eventId)?.headcount ?? 30} onChange={e => onOp({ ...op, headcount: Number(e.target.value) })} /></label>
    </>}
    {op.op === "add_contact" && <>
      <label>Partner name<input value={op.name} maxLength={80} onChange={e => onOp({ ...op, name: e.target.value })} /></label>
      <label>Organization<input value={op.organization} maxLength={80} onChange={e => onOp({ ...op, organization: e.target.value })} /></label>
      <label>Owner role<select value={op.ownerRoleId} onChange={e => onOp({ ...op, ownerRoleId: e.target.value })}>{state.roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select></label>
    </>}
  </fieldset>
}

/** A rule-book answer or a reminder draft: not a plan change, so it keeps its own Acknowledge / Approve draft button. */
function ChangeItem({ change, initial, index, onNudge }: { change: ChangeSet; initial: CommandOp; index: number; onNudge: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const [op, setOp] = useState(initial)
  const [error, setError] = useState("")
  const allowed = canApplyOp(state, initial)
  const review = change.reviews?.[index] ?? "pending"
  const pending = review === "pending"
  function apply() {
    const human = { buffered: false }
    const problem = validateReview(state, op, human)
    if (problem) { setError(problem); return }
    dispatch({ type: "reviewChange", id: change.id, index, decision: "applied", op, human })
    setError("")
    if (op.op === "propose_nudge") onNudge(op.nodeId)
  }
  return <article className="change-item" data-testid="change-item">
    <b>{opLabel(pending ? op : initial, commandContext(state))}</b>
    {op.op === "answer_question" ? <>
      <p>{withSourceNames(op.answer)}</p>
      <details><summary>Sources checked</summary>{distinctSources(op.citations).map(({ id, name }) => { const r = RULES.find(r => r.id === id)!; return <div key={id} data-source-id={id}><b>{name} · checked {r.checkedOn}</b>{r.sources.map(s => <p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></p>)}</div> })}</details>
      <div className="action-row">{distinctSources(op.citations).map(({ id, name }) => { const rule = RULES.find(r => r.id === id)!; return <a key={id} data-source-id={id} href={rule.sources[0].url} target="_blank" rel="noreferrer">{name} · checked {rule.checkedOn}</a> })}</div>
    </> : pending && op.op === "propose_nudge" && <fieldset disabled={!allowed} className="review-fields">
      <legend className="small muted">Check before approving</legend>
      <label>Task<select aria-label="Task" value={op.nodeId} onChange={e => setOp({ ...op, nodeId: e.target.value })}>{state.nodes.map(n => <option key={n.id} value={n.id}>{n.title} · {state.events.find(ev => ev.id === n.eventId)?.name ?? "Standalone"}</option>)}</select></label>
    </fieldset>}
    {error && <p className="small late-text" role="alert">{error}</p>}
    {!pending && /AI/.test(change.source ?? "") && <Feedback id={change.id + ":" + index} text={change.sentence + " · " + JSON.stringify(op)} />}
    <div className="action-row">{pending ? <>
      <button className="btn btn-primary" disabled={!allowed} onClick={apply}>{op.op === "answer_question" ? "Acknowledge" : "Approve draft"}</button>
      <button className="btn" disabled={!allowed} onClick={() => dispatch({ type: "reviewChange", id: change.id, index, decision: "rejected" })}>Reject</button>
      {!allowed && <span className="small muted">{notAllowedText(initial)}</span>}
    </> : <span className={`tag ${review === "applied" ? "good" : ""}`}>{review === "applied" ? "Approved" : "Rejected"}</span>}</div>
  </article>
}
