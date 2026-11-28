import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useStore } from "../../data/store"
import type { ChangeSet, DemoState, Event, EventCheck, EventChecks } from "../../data/types"
import type { ChatCard } from "../../lib/assistant"
import { fmtLong } from "../../lib/dates"
import { FINALS, findPeriod } from "../../engine/calendar"
import { sanitizeOps, type CommandOp } from "../../lib/commands"
import { canLead, draftEventNodes, eventBlocked, validateReview, type HumanInputs } from "../../data/changeReview"
import { teamLeadChoices } from "../../data/teamLeads"
import { sourceName } from "../../lib/sourceNames"
import { COMMON_EVENT_CHECKS, EVENT_CHECKLIST, OTHER_EVENT_CHECKLIST } from "../../data/eventChecklist"
import { findWorkflowTemplateVersion } from "../../data/workflowTemplates"
import { initialWorkflowChoice, WorkflowTemplatePicker, type WorkflowChoice } from "./WorkflowTemplatePicker"

/*
 * The New event form and its "created" card. Loaded on demand from AskPanel, so the startup bundle does not carry the form.
 * Review option B (Juanxi 2026-11-28): Review event drafts the event and the chat shows it in the change list, with what it
 * would make (tasks, people, first due date). Nothing is saved and nobody gets a task until Create event is pressed there.
 * Creating goes through the same store path as every reviewed change (draftChanges, then reviewChange "applied"), so
 * validation, permissions, the pinned workflow version and the research log are unchanged.
 */

type FormCard = Extract<ChatCard, { kind: "form" }>
/** What the form returns to its owner: an error to show in the form, or nothing when it went through. */
export type PlanDone = (c: FormCard, workflowChoice?: WorkflowChoice, teamLeads?: Record<string, string>) => string | null | void

const FOOD: Record<Event["food"], string> = { none: "none", dining: "Sun Devil Dining", offsite: "outside caterer", onsite: "made on site", tbd: "yes" }
const CHIP_LABEL: Partial<Record<EventCheck, string>> = { speaker: "Guest speaker or performer" }
const COMMON = COMMON_EVENT_CHECKS.map(key => ({ key, label: CHIP_LABEL[key] ?? EVENT_CHECKLIST.find(item => item.key === key)!.label }))

/** The chat line that records what the person sent, as before Option A. */
export const planSummary = (c: FormCard) => [c.prefill.name, c.date, `${c.prefill.headcount} people`, `food: ${c.prefill.food && c.prefill.food !== "none" ? FOOD[c.prefill.food] : "no"}`, c.prefill.speaker ? "guest speaker or performer" : null].filter(Boolean).join(" · ")

/**
 * The change set the form drafts, and the approval inputs that Create event will send: exactly what the change list sends
 * for a reviewed create_event. Checked against the current state first, so a problem shows in the form and nothing is drafted.
 */
export function eventFromForm(state: DemoState, c: FormCard, workflowChoice: WorkflowChoice | undefined, id: string, teamLeads?: Record<string, string>): { error: string } | { changeSet: ChangeSet; op: CommandOp; human: HumanInputs } {
  if (!workflowChoice) return { error: "Choose a saved workflow version." }
  const op = sanitizeOps([{ ...c.prefill, op: "create_event" }], state)[0]
  if (!op || op.op !== "create_event") return { error: "These details no longer match the current demo. Check them and try again." }
  const human: HumanInputs = { date: c.date, buffered: false, workflowTemplateId: workflowChoice.templateId, workflowTemplateVersion: workflowChoice.templateVersion, ...(teamLeads ? { teamLeads } : {}) }
  const problem = validateReview(state, op, human)
  if (problem) return { error: problem }
  return { op, human, changeSet: { id, sentence: `Plan ${op.name} on ${c.date}`, ops: [op], status: "pending", source: "Your details + the saved workflow", by: state.viewerId, workflowChoices: { 0: workflowChoice }, formInputs: { 0: { date: c.date, ...(teamLeads ? { teamLeads } : {}) } } } }
}

/** What the form drafted: the change set that the chat now shows in the change list. */
export interface PlanResult { changeSetId: string; name: string; summary: string }

/** The form as it sits in the chat: Review event drafts the event, and the change list below it creates it. */
export default function PlanFormCard({ card, onCreated }: { card: FormCard; onCreated: (c: FormCard, result: PlanResult) => void }) {
  const { dispatch, getState } = useStore()
  return <PlanForm card={card} onDone={(c, workflowChoice, teamLeads) => {
    const id = `change-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const plan = eventFromForm(getState(), c, workflowChoice, id, teamLeads)
    if ("error" in plan) return plan.error
    dispatch({ type: "draftChanges", changeSet: plan.changeSet })
    if (!getState().changeSets.some(x => x.id === id)) return "This event could not be saved in this browser. Try again."
    onCreated(c, { changeSetId: id, name: c.prefill.name ?? "", summary: planSummary(c) })
    return null
  }} />
}

/**
 * The event form: Event name, the saved workflow, Date / People / Food in one row, the six common "This event has…" chips,
 * the other checklist items folded under "Other checklists", and Details in the person's own words.
 */
export function PlanForm({ card, onDone }: { card: FormCard; onDone: PlanDone }) {
  const { state } = useStore()
  const blocked = eventBlocked(state, "create"), allowed = !blocked
  const [f, setF] = useState({ name: card.prefill.name ?? "", type: card.prefill.type ?? (card.prefill.speaker ? "speaker" : "social"), headcount: card.prefill.headcount ?? 30, venue: card.prefill.venue ?? "campus", food: card.prefill.food ?? "none", funding: card.prefill.funding ?? "none", speaker: card.prefill.speaker ?? false, checks: card.prefill.checks ?? {} as EventChecks, details: card.prefill.details ?? "" })
  const [date, setDate] = useState(card.date)
  const [workflowChoice, setWorkflowChoice] = useState(() => initialWorkflowChoice(state))
  const [error, setError] = useState("")
  // Who leads each team this time (option A, Juanxi 2026-11-28): the lead gets the team's tasks and hands them out to teammates.
  const [leads, setLeads] = useState<Record<string, string>>({})
  // Fields the person changed are theirs; the assistant's later reading only fills the others.
  const touched = useRef(new Set<string>())
  const edit = (patch: Partial<typeof f>) => { Object.keys(patch).forEach(k => touched.current.add(k)); setF(prev => ({ ...prev, ...patch })) }
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const ai = card.ai
    if (!ai) return
    setF(prev => {
      const next = { ...prev }
      for (const k of ["name", "headcount", "food", "speaker", "venue", "funding", "type", "checks"] as const) {
        const v = ai[k]
        if (v !== undefined && v !== "" && !touched.current.has(k)) (next as Record<string, unknown>)[k] = v
      }
      if (ai.details && !touched.current.has("details")) next.details = prev.details && !ai.details.includes(prev.details) ? `${ai.details} ${prev.details}` : ai.details
      return next
    })
    setFilled(true)
  }, [card.ai])
  // "Other checklists" opens by itself whenever one of its items is ticked (for example by the AI reading), so nothing ticked is hidden.
  const otherTicked = OTHER_EVENT_CHECKLIST.filter(item => f.checks[item.key] === true).length
  const anyOther = otherTicked > 0
  const [moreOpen, setMoreOpen] = useState(anyOther)
  useEffect(() => { if (anyOther) setMoreOpen(true) }, [anyOther])
  // The teams this event's tasks fall into, from the chosen workflow and the ticked checklists, with their members.
  const teams = useMemo(() => {
    if (!workflowChoice) return []
    const op = sanitizeOps([{ ...f, name: f.name.trim() || "New event", details: undefined, op: "create_event" }], state)[0]
    if (!op) return []
    const human: HumanInputs = { date: /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= state.today ? date : state.today, workflowTemplateId: workflowChoice.templateId, workflowTemplateVersion: workflowChoice.templateVersion }
    return teamLeadChoices(state, draftEventNodes(state, op, human))
  }, [state, f, date, workflowChoice])
  if (card.done) return <div className="mini-card done"><b>{card.prefill.name}</b><span className="small muted">Sent for review · {fmtLong(card.date)}</span></div>
  const hasFood = f.food !== "none"
  const checked = (key: EventCheck) => key === "speaker" ? f.speaker : f.checks[key] === true
  const toggle = (key: EventCheck, on: boolean) => edit(key === "speaker" ? { speaker: on, checks: { ...f.checks, speaker: on } } : { checks: { ...f.checks, [key]: on } })
  const finals = /^\d{4}-\d{2}-\d{2}$/.test(date) ? findPeriod(date, FINALS) : null
  const teamChoices = teams
  const leadOf = (teamId: string, fallback: string | null) => leads[teamId] && teamChoices.find(t => t.teamId === teamId)?.members.includes(leads[teamId]) ? leads[teamId] : fallback
  const chosenLeads = Object.fromEntries(teamChoices.flatMap(t => { const lead = leadOf(t.teamId, t.defaultLeadId); return lead ? [[t.teamId, lead]] : [] }))
  const nameOf = (id: string) => state.people.find(p => p.id === id)?.name ?? "Unknown"
  return <form className="mini-card plan-form" data-testid="plan-form" data-form-id={card.id} autoComplete="off" onSubmit={e => {
    e.preventDefault()
    if (blocked) return setError(blocked)
    if (!f.name.trim()) return setError("Give the event a name.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < state.today) return setError("Pick a date from today on.")
    if (!workflowChoice || !findWorkflowTemplateVersion(state, workflowChoice.templateId, workflowChoice.templateVersion)) return setError("Choose a saved workflow version.")
    const details = f.details.trim()
    const problem = onDone({ ...card, done: true, date, prefill: { ...f, name: f.name.trim(), details: details || undefined } }, workflowChoice, Object.keys(chosenLeads).length ? chosenLeads : undefined)
    setError(problem || "")
  }}>
    <b>New event</b>
    {card.thinking && <p className="small muted" data-testid="ai-reading">Reading…</p>}
    {filled && <p className="small muted" data-testid="ai-filled">Filled from your message.</p>}
    <label>Event name<input name="platypus-event-title" autoComplete="off" value={f.name} maxLength={80} onChange={e => edit({ name: e.target.value })} placeholder="e.g. Founder Dinner" /></label>
    <WorkflowTemplatePicker state={state} value={workflowChoice} onChange={setWorkflowChoice} />
    <div className="form-3">
      <label>Date<input type="date" aria-label="Date" value={date} min={state.today} onChange={e => setDate(e.target.value)} /></label>
      <label>People<input type="number" min={1} max={5000} value={f.headcount} onChange={e => edit({ headcount: Number(e.target.value) })} /></label>
      <label>Food<select aria-label="Food" value={hasFood ? "yes" : "no"} onChange={e => { const yes = e.target.value === "yes"; edit({ food: yes ? (card.prefill.food && card.prefill.food !== "none" ? card.prefill.food : "tbd") : "none", checks: { ...f.checks, food: yes } }) }}><option value="no">No</option><option value="yes">Yes</option></select></label>
    </div>
    {finals && <p className="small late-text" role="alert" data-testid="finals-warning">{fmtLong(date)} is during {finals.label}. ASU does not allow events then ({sourceName("R13")}).</p>}
    <fieldset className="event-has">
      <legend>This event has…</legend>
      <div className="check-chips">{COMMON.map(item => <label key={item.key} className="check-chip"><input type="checkbox" checked={checked(item.key)} onChange={e => toggle(item.key, e.target.checked)} />{item.label}</label>)}</div>
    </fieldset>
    <details className="more-checks" data-testid="other-checklists" open={moreOpen} onToggle={e => setMoreOpen(e.currentTarget.open)}>
      <summary>Other checklists <span className="muted">· {OTHER_EVENT_CHECKLIST.length} more{otherTicked ? `, ${otherTicked} ticked` : ""}</span></summary>
      <fieldset className="checklist">
        <legend className="sr-only">Other checklists</legend>
        {OTHER_EVENT_CHECKLIST.map(item => <label key={item.key} className="check-label"><input type="checkbox" checked={checked(item.key)} onChange={e => toggle(item.key, e.target.checked)} />{item.label}</label>)}
      </fieldset>
    </details>
    {teamChoices.length > 0 && <fieldset className="team-leads" data-testid="team-leads">
      <legend>Who leads each team this time?</legend>
      <p className="small muted">The lead gets the team's tasks and hands them out to teammates.</p>
      {teamChoices.map(t => <div key={t.teamId} className="team-lead-row">
        <span className="team-lead-name">{t.name}<span className="small muted"> · {t.steps} {t.steps === 1 ? "step" : "steps"}</span></span>
        {t.members.length > 1
          ? <label><span className="sr-only">{t.name} lead</span><select aria-label={`${t.name} lead`} value={leadOf(t.teamId, t.defaultLeadId) ?? ""} onChange={e => setLeads(prev => ({ ...prev, [t.teamId]: e.target.value }))}>{t.members.map(id => <option key={id} value={id}>{nameOf(id)}</option>)}</select></label>
          : t.members.length === 1 ? <span className="small">{nameOf(t.members[0])}</span> : <span className="small muted">No one on this team yet</span>}
      </div>)}
    </fieldset>}
    <label>Details<textarea rows={3} maxLength={500} autoComplete="off" value={f.details} onChange={e => edit({ details: e.target.value })} placeholder="Anything unusual: a stage build, a company visit, flying out of state, a competition…" /></label>
    {blocked && <p className="small muted">{blocked}</p>}
    {error && <p className="small late-text" role="alert">{error}</p>}
    <button className="btn btn-primary" type="submit" disabled={!allowed}>Review event</button>
  </form>
}

/** The confirmation after Create event: the event's name, Open event, and Undo for its creator or a lead. */
export function CreatedCard({ card }: { card: Extract<ChatCard, { kind: "created" }> }) {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const change = state.changeSets.find(c => c.id === card.changeSetId)
  if (!change) return <p className="small muted">This event was cleared by Reset demo.</p>
  const ev = state.events.find(e => e.id === card.eventId)
  const steps = state.nodes.filter(n => n.eventId === card.eventId && !n.clubTask).length
  const mayUndo = !change.undone && !!ev && (change.by === state.viewerId || canLead(state))
  const open = `/events?event=${encodeURIComponent(card.eventId)}`
  return <section className="mini-card created-card" aria-label="Event created" data-testid="event-created">
    <b>{change.undone ? `${card.name} removed` : `${ev?.name ?? card.name} created`}</b>
    <span className="small muted">{change.undone ? "Undone, with its tasks." : ev ? `${fmtLong(ev.date)} · ${steps} ${steps === 1 ? "step" : "steps"}` : "This event is no longer in the plan."}</span>
    {ev && !change.undone && <div className="action-row">
      <button type="button" className="btn small" onClick={() => navigate(open)}>Open event</button>
      {mayUndo && <button type="button" className="btn btn-quiet small" data-testid="undo-event" onClick={() => {
        dispatch({ type: "undoCreatedEvent", id: change.id })
        if (location.pathname === "/events" && new URLSearchParams(location.search).get("event") === card.eventId) navigate("/events")
      }}>Undo</button>}
    </div>}
  </section>
}
