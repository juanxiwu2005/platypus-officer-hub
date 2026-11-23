import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { useStore, useViewer } from "../../data/store"
import type { Event, EventCheck, EventChecks } from "../../data/types"
import { newEventForm, respond, reviewEvent, STOPPED_FORM_SOURCE, SUGGESTIONS, ruleById, type ChatCard, type ChatMsg, type Focus, type Reply } from "../../lib/assistant"
import { PAGES } from "../../routes"
import { fmtLong, fmtShort } from "../../lib/dates"
import { FINALS, findPeriod } from "../../engine/calendar"
import { sanitizeOps } from "../../lib/commands"
import { NodePill } from "../ui"
import { Feedback } from "../Feedback"
import { useRail } from "./RailContext"
import { AppliedCard, ChangeCard } from "./ChangeCard"
import { Bts, BtsRow } from "../Bts"
import { OwnerPicker, ownersToPeople, TaskDueFields } from "./TaskFields"
import { canChangeEvent, canLead, eventBlocked } from "../../data/changeReview"
import { policySourceById } from "../../data/policyCatalog"
import { answerSummary, emitUi } from "../../lib/uiLog"
import { readAiBudget } from "../../lib/api"
import { AiWait } from "../AiWait"
import { EVENT_CHECKLIST } from "../../data/eventChecklist"
import { findWorkflowTemplateVersion } from "../../data/workflowTemplates"
import { initialWorkflowChoice, WorkflowTemplatePicker, type WorkflowChoice } from "./WorkflowTemplatePicker"

const CHAT_KEY = "platypus.v1.chat"
const load = (): ChatMsg[] => {
  try { const v = JSON.parse(window.localStorage.getItem(CHAT_KEY) ?? "[]"); return Array.isArray(v) ? v.slice(-60) : [] } catch { return [] }
}
const save = (m: ChatMsg[]) => { try { window.localStorage.setItem(CHAT_KEY, JSON.stringify(m.slice(-60))) } catch { /* storage unavailable */ } }
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** The Ask tab: the one AI conversation, available from every page (v1.1 decision 1). */
export function AskPanel() {
  const { state, dispatch } = useStore()
  const { person } = useViewer()
  const rail = useRail()
  const location = useLocation()
  const [messages, setMessages] = useState<ChatMsg[]>(load)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  // Messages that were already there when the panel opened do not animate; only ones added afterwards do (DX-17).
  const alreadyThere = useRef<ReadonlySet<string>>(new Set(messages.map(m => m.id)))
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [focusOff, setFocusOff] = useState<string | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  // FB-1: every AI request still on its way (a message, the form's second look, a plan check) has a controller here, so
  // Stop can end them all at once. `waiting` drives the AiWait card; `owner` is the request that currently holds `busy`.
  const controllers = useRef(new Set<AbortController>())
  const [waiting, setWaiting] = useState(0)
  const [waitKey, setWaitKey] = useState(0)
  const owner = useRef<AbortController | null>(null)
  const track = () => {
    const c = new AbortController()
    setWaitKey(k => k + 1) // the count starts again for the newest request
    controllers.current.add(c); setWaiting(controllers.current.size)
    return c
  }
  const untrack = (c: AbortController) => { if (controllers.current.delete(c)) setWaiting(controllers.current.size) }
  /** Stop: end every request now and free the input. Each request then answers from this browser (assistant.ts). */
  function stopAll() {
    const all = [...controllers.current]
    controllers.current.clear(); setWaiting(0)
    owner.current = null; setBusy(false)
    all.forEach(c => c.abort())
    input.current?.focus()
  }

  useEffect(() => save(messages), [messages])
  // FB-1: learn the server's AI time budget once, so the wait (and "can take up to N s") follows it.
  useEffect(() => { void readAiBudget() }, [])
  useEffect(() => {
    const clear = () => setMessages([])
    window.addEventListener("platypus:reset", clear)
    return () => window.removeEventListener("platypus:reset", clear)
  }, [])
  useEffect(() => { list.current?.scrollTo?.({ top: list.current.scrollHeight, behavior: "smooth" }) }, [messages.length, busy, waiting > 0])

  // M2b: once a new event is approved, review its plan with the organizer's own details. The request stays in the
  // rail until the result is in this panel, so a panel that closes mid-review (on a phone) runs it again on reopen.
  const toReview = rail.reviewEventId
  const reviewing = useRef<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])
  useEffect(() => {
    if (!toReview || reviewing.current === toReview || !state.events.some(e => e.id === toReview)) return
    reviewing.current = toReview
    setBusy(true)
    const ctrl = track()
    owner.current = ctrl
    const started = Date.now()
    reviewEvent(state, toReview, ctrl.signal).then(reply => {
      // After Stop the reply is the rule engine's own check (FB-1): logged as "stopped".
      emitUi("ui.answer", { ...answerSummary(reply, Date.now() - started), trigger: "plan-check", ...(ctrl.signal.aborted ? { answer: "stopped", fallback: true } : {}) })
      if (!mounted.current) return
      if (reply.changeSet) dispatch({ type: "draftChanges", changeSet: reply.changeSet })
      setMessages(m => [...m, { id: uid(), role: "assistant", cards: reply.cards, source: reply.source }])
      rail.takeReview()
    }).catch(() => { emitUi("ui.answer", { answer: "error", trigger: "plan-check", ms: Date.now() - started }, false); if (mounted.current) rail.takeReview() }).finally(() => {
      untrack(ctrl)
      if (!mounted.current) return
      reviewing.current = null
      if (owner.current === ctrl) { owner.current = null; setBusy(false) }
    })
  }, [toReview, state])

  const focus: Focus | null = useMemo(() => {
    const d = rail.detail
    if (d && (d.kind === "node" || d.kind === "task" || d.kind === "nudge")) { const n = state.nodes.find(x => x.id === d.id); if (n) return { kind: "node", id: n.id, title: n.title } }
    if (d?.kind === "funding") { const e = state.events.find(x => x.id === d.eventId); if (e) return { kind: "event", id: e.id, title: `${e.name} funding` } }
    if (location.pathname === "/events") {
      const e = state.events.find(x => x.id === new URLSearchParams(location.search).get("event")) ?? state.events[0]
      if (e) return { kind: "event", id: e.id, title: e.name }
    }
    const page = PAGES.find(p => p.path === location.pathname)
    return page ? { kind: "page", id: page.path, title: page.label } : null
  }, [rail.detail, location.pathname, location.search, state.nodes, state.events])
  const activeFocus = focus && focusOff !== `${focus.kind}:${focus.id}` ? focus : null

  /** `via`: typed in the box, a suggestion chip, or a question sent from elsewhere ("Ask about this rule"). */
  async function send(raw: string, via: "typed" | "suggestion" | "handoff" = "typed") {
    const t = raw.trim()
    if (!t || busy) return
    const user: ChatMsg = { id: uid(), role: "user", text: t }
    setMessages(m => [...m, user]); setText(""); setBusy(true)
    // Research log: the question (cut to 200 characters by the log) and, below, the KIND of answer — never the answer text.
    emitUi("ui.ask", { question: t, via, route: location.pathname, focus: activeFocus ? activeFocus.kind : null })
    const started = Date.now()
    const ctrl = track()
    owner.current = ctrl
    let refining = false
    try {
      const reply = await respond(t, state, person.id, activeFocus, location.pathname, messages, ctrl.signal)
      // After Stop the reply is the local answer (FB-1). Same kind of record, with answer "stopped".
      emitUi("ui.answer", ctrl.signal.aborted ? { ...answerSummary(reply, Date.now() - started), answer: "stopped", fallback: true } : answerSummary(reply, Date.now() - started))
      if (reply.autoSet) dispatch({ type: "aiAutoApply", changeSet: reply.autoSet })
      if (reply.changeSet) dispatch({ type: "draftChanges", changeSet: reply.changeSet })
      const msgId = uid()
      setMessages(m => [...m, { id: msgId, role: "assistant", cards: reply.cards, source: reply.source }])
      if (reply.refine) {
        // The form is showing; the AI's second look is still on its way and Stop can end it (the form stays as it is).
        refining = true
        // Why the AI had nothing: ran out of time, unavailable, stopped, or answered without a usable card ("empty").
        const miss = () => ctrl.signal.aborted ? "stopped" : reply.refineMiss?.why ?? "empty"
        void reply.refine.then(r => {
          if (ctrl.signal.aborted) r = null // never fill the form after Stop
          emitUi("ui.answer", r ? { ...answerSummary(r, Date.now() - started), refine: true } : { answer: miss(), refine: true, fallback: true, ms: Date.now() - started }); applyRefine(msgId, r, miss())
        }, () => { emitUi("ui.answer", { answer: ctrl.signal.aborted ? "stopped" : "unavailable", refine: true, fallback: true, ms: Date.now() - started }); applyRefine(msgId, null, ctrl.signal.aborted ? "stopped" : "unavailable") }).finally(() => untrack(ctrl))
      }
    } catch {
      emitUi("ui.answer", { answer: "error", ms: Date.now() - started }, false)
      setMessages(m => [...m, { id: uid(), role: "assistant", cards: [{ kind: "text", text: "Something went wrong. Please try again." }], source: "Platypus" }])
    } finally {
      if (!refining) untrack(ctrl)
      if (owner.current === ctrl) { owner.current = null; setBusy(false) }
    }
  }

  // Questions sent from elsewhere ("Ask about this rule", "Ask AI about this step").
  useEffect(() => {
    const p = rail.pending
    if (!p) return
    rail.takePending()
    if (p.send) void send(p.text, "handoff")
    else { setText(p.text); setTimeout(() => input.current?.focus(), 30) }
  }, [rail.pending?.n])

  // "+ New event" (FB-5): the empty event form, shown at once without AI, with focus on its first field. A second
  // click while that form is still the last message and untouched only moves focus back to it.
  const blankForm = useRef<string | null>(null)
  const focusFirst = (formId: string) => setTimeout(() => list.current?.querySelector<HTMLElement>(`[data-form-id="${formId}"] input`)?.focus(), 30)
  useEffect(() => {
    const r = rail.formRequest
    if (!r) return
    rail.takeFormRequest()
    const last = messagesRef.current.at(-1)
    const open = last?.cards?.find(c => c.kind === "form" && c.id === blankForm.current && !c.done)
    if (open && open.kind === "form") { focusFirst(open.id); return }
    const card = newEventForm()
    blankForm.current = card.id
    setMessages(m => [...m, { id: uid(), role: "assistant", cards: [{ kind: "text", text: "Choose a saved workflow and tell me about the event." }, card], source: "Platypus" }])
    focusFirst(card.id)
  }, [rail.formRequest?.n])

  /**
   * The assistant's answer to a message whose form is already showing (M2b): it fills the form's untouched fields.
   * If it read the message as something else (a task, not an event, or a question), its reply follows as a new
   * message, unless the person already used the form.
   */
  function applyRefine(msgId: string, refined: Reply | null, miss: "timeout" | "unavailable" | "stopped" | "empty" = "empty") {
    const isForm = (c: ChatCard) => c.kind === "form" || c.kind === "taskform"
    const msg = messagesRef.current.find(x => x.id === msgId)
    const local = msg?.cards?.find(isForm) as { kind: string; done?: boolean } | undefined
    const aiCard = refined?.cards.find(isForm)
    const aiText = refined?.cards.find(c => c.kind === "text")
    const same = !!local && !!aiCard && local.kind === aiCard.kind
    const update = (fn: (x: ChatMsg) => ChatMsg) => setMessages(m => m.map(x => x.id === msgId ? fn(x) : x))
    const settle = (x: ChatMsg, source = x.source) => ({ ...x, source, cards: x.cards?.map(c => isForm(c) ? { ...c, thinking: false } as ChatCard : c) })
    if (!refined) return update(x => settle(x, miss === "timeout" ? "Platypus · AI didn't answer in time, filled from your words" : miss === "unavailable" ? "Platypus · AI unavailable, filled from your words" : miss === "stopped" ? STOPPED_FORM_SOURCE : "Platypus · AI had nothing to add, filled from your words"))
    if (same) return update(x => ({
      ...x, source: refined.source,
      cards: x.cards?.map(c => {
        if (c.kind === "text" && aiText?.kind === "text") return aiText
        if (c.kind === "form" && aiCard!.kind === "form") return { ...c, thinking: false, ...(c.done ? {} : { ai: aiCard!.prefill }) }
        if (c.kind === "taskform" && aiCard!.kind === "taskform") return { ...c, thinking: false, ...(c.done ? {} : { ai: { title: aiCard!.title, owners: aiCard!.owners, eventId: aiCard!.eventId } }) }
        return c
      }),
    }))
    update(x => settle(x))
    if (!local || local.done) return
    if (refined.autoSet) dispatch({ type: "aiAutoApply", changeSet: refined.autoSet })
    if (refined.changeSet) dispatch({ type: "draftChanges", changeSet: refined.changeSet })
    setMessages(m => [...m, { id: uid(), role: "assistant", cards: refined.cards, source: `${refined.source} · second look` }])
  }
  const patchCard = (msgId: string, cardIndex: number, card: ChatCard) => setMessages(m => m.map(x => x.id === msgId ? { ...x, cards: x.cards?.map((c, i) => i === cardIndex ? card : c) } : x))
  /** The filled form becomes a change set straight away; the date is the one the person picked. */
  function submitPlan(msgId: string, index: number, c: Extract<ChatCard, { kind: "form" }>, workflowChoice?: WorkflowChoice) {
    patchCard(msgId, index, c)
    const op = sanitizeOps([{ ...c.prefill, op: "create_event" }], state)[0]
    if (!op) return
    const id = `change-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    dispatch({ type: "draftChanges", changeSet: { id, sentence: `Plan ${c.prefill.name} on ${c.date}`, ops: [op], status: "pending", source: "Your details + the saved workflow", ...(workflowChoice ? { workflowChoices: { 0: workflowChoice } } : {}) } })
    setMessages(m => [...m,
      { id: uid(), role: "user", text: [c.prefill.name, c.date, `${c.prefill.headcount} people`, `food: ${c.prefill.food && c.prefill.food !== "none" ? FOOD[c.prefill.food] : "no"}`, c.prefill.speaker ? "guest speaker or performer" : null].filter(Boolean).join(" · ") },
      { id: uid(), role: "assistant", cards: [{ kind: "text", text: "Review the details, then apply them to open the plan." }, { kind: "changes", changeSetId: id }], source: "Saved workflow" },
    ])
  }
  /** The task form creates at once, as the viewer, with Undo: one task per owner. Its one date is Due (FB-5): no buffer. */
  function submitTask(msgId: string, index: number, c: Extract<ChatCard, { kind: "taskform" }>) {
    const id = `tasks-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const people = ownersToPeople(c.owners, state.people, state.roles)
    const tasks = (people.length ? people : [null]).map(ownerId => ({ title: c.title, ownerId, eventId: c.eventId }))
    dispatch({ type: "createTasks", id, sentence: c.title, tasks, date: c.due, buffered: false, source: "Your task form" })
    patchCard(msgId, index, { ...c, done: true, changeSetId: id })
  }
  const suggestions = SUGGESTIONS[location.pathname] ?? SUGGESTIONS["/"]
  // The same row sits with the greeting before the first message, and at the foot of the panel afterwards (never both).
  const suggestionRow = <div className="chips" aria-label="Suggestions">{suggestions.map(s => <button key={s} type="button" className="chip" onClick={() => send(s, "suggestion")} disabled={busy}>{s}</button>)}</div>

  return <section className="ask" aria-label="Ask Platypus" data-testid="ask-panel">
    <header className="ask-head">
      <b>Ask Platypus</b>
      {messages.length > 0 && <button type="button" className="btn btn-quiet small" onClick={() => setMessages([])}>New chat</button>}
    </header>
    {activeFocus && <div className="focus-chip" data-testid="focus-chip"><span>Looking at: {activeFocus.title}</span><button type="button" aria-label="Stop using this context" onClick={() => setFocusOff(`${activeFocus.kind}:${activeFocus.id}`)}>×</button></div>}
    {!messages.length && <div className="ask-welcome" data-testid="ask-welcome">
      <p className="ask-hello">Hi {person.name.split(" ")[0]}. What do you need?</p>
      {suggestionRow}
    </div>}
    <div className={`ask-list${messages.length ? "" : " is-empty"}`} ref={list} aria-live="polite">
      {messages.map(m => m.role === "user"
        ? <div key={m.id} className={`bubble user${alreadyThere.current.has(m.id) ? "" : " is-new"}`}>{m.text}</div>
        : <div key={m.id} className={`bubble bot${alreadyThere.current.has(m.id) ? "" : " is-new"}`} data-testid="bot-reply">
          {m.cards?.map((c, i) => <CardView key={i} card={c} onPlan={(card, workflowChoice) => submitPlan(m.id, i, card, workflowChoice)} onTask={card => submitTask(m.id, i, card)} onMoved={card => patchCard(m.id, i, card)} />)}
          {m.source && <span className="ask-source">{m.source}</span>}
        </div>)}
      {waiting > 0 && <AiWait key={waitKey} onStop={stopAll} stopTestId="ask-stop" />}
    </div>
    {messages.length > 0 && suggestionRow}
    <form className="ask-form" onSubmit={e => { e.preventDefault(); void send(text) }}>
      <textarea id="ask-input" ref={input} rows={2} maxLength={1000} value={text} placeholder="Ask or tell Platypus…" aria-label="Message Platypus"
        onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(text) } }} />
      <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()} aria-label="Send">Send</button>
    </form>
  </section>
}

function CardView({ card, onPlan, onTask, onMoved }: { card: ChatCard; onPlan: (c: Extract<ChatCard, { kind: "form" }>, workflowChoice?: WorkflowChoice) => void; onTask: (c: Extract<ChatCard, { kind: "taskform" }>) => void; onMoved: (c: Extract<ChatCard, { kind: "eventdate" }>) => void }) {
  const { state } = useStore()
  const rail = useRail()
  switch (card.kind) {
    case "text": return <p className="card-text">{card.text}</p>
    case "tasks": {
      const nodes = card.nodeIds.map(id => state.nodes.find(n => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n)
      return <div className="mini-card" data-testid="tasks-card">
        <b>{card.title}</b>
        {nodes.length ? <ol className="mini-list">{nodes.map(n => <li key={n.id}>
          <button type="button" className="row-btn" onClick={() => rail.show({ kind: "task", id: n.id })}>
            <span className="mini-title">{n.title}</span>
            <span className="mini-meta"><NodePill node={n} small />{n.clubDeadline && <span className="small muted">{fmtShort(n.clubDeadline)}</span>}</span>
          </button>
          {card.remind && n.ownerId && n.status !== "done" && <button type="button" className="btn small" onClick={() => rail.show({ kind: "nudge", id: n.id })}>Remind</button>}
        </li>)}</ol> : <p className="small muted">Nothing here right now.</p>}
      </div>
    }
    case "nudge": {
      const n = state.nodes.find(x => x.id === card.nodeId)
      const owner = state.people.find(p => p.id === n?.ownerId)
      if (!n || !owner) return <p className="small muted">That task is no longer open.</p>
      return <div className="mini-card"><b>Reminder for {owner.name.split(" ")[0]}</b><span className="small">{n.title}</span><button type="button" className="btn btn-primary small" onClick={() => rail.show({ kind: "nudge", id: n.id })}>Open the draft</button></div>
    }
    case "rule": return <div className="mini-card" data-testid="rule-answer">
      <p className="pre-line">{card.answer}</p>
      {card.citations.length > 0 && <div className="action-row">{card.citations.map(id => {
        const policy = policySourceById(id), rule = ruleById(id), url = policy?.sourceUrl ?? rule?.sources[0].url
        return url ? <a key={id} className="btn small" href={url} target="_blank" rel="noreferrer">{id} source ↗</a> : <span key={id} className="small muted">{id} source saved</span>
      })}</div>}
      <span className="ask-source">{card.label}{card.citations.length ? ` · checked ${policySourceById(card.citations[0])?.extractedAt ?? ruleById(card.citations[0])?.checkedOn}` : ""}</span>
      <Feedback id={`ask:${card.question}:${card.answer}`} text={card.answer} />
    </div>
    case "changes": return <ChangeCard id={card.changeSetId} />
    case "applied": return <AppliedCard id={card.changeSetId} />
    case "form": return <PlanForm card={card} onDone={onPlan} />
    case "review": {
      const ev = state.events.find(e => e.id === card.eventId)
      return <div className="mini-card" data-testid="event-review">
        <b>Plan check{ev ? `: ${ev.name}` : ""}</b>
        {card.risks.length ? <ul className="review-risks">{card.risks.map((r, i) => <li key={i}>{r.text}{r.rules.map(id => { const rule = ruleById(id); return rule && <a key={id} className="small" href={rule.sources[0].url} target="_blank" rel="noreferrer"> {id} ↗</a> })}</li>)}</ul> : <p className="small">Nothing stands out beyond the playbook's steps.</p>}
        <BtsRow>
          {card.label.startsWith("AI") ? <Bts kind="ai" label={card.label}>The AI suggested these risks from the playbook plus what you wrote. The browser keeps only rule IDs the rule book has and dates the app already knows. POST /api/event/review</Bts> : <Bts label={card.label}>No AI wrote this list. These are the schedule engine's own warnings for the event, each tied to its rule where there is one.</Bts>}
          <Bts label="Rule engine">Every step date is computed by the schedule engine; the AI never sets a date.</Bts>
        </BtsRow>
      </div>
    }
    case "eventdate": return <EventDateCard card={card} onDone={onMoved} />
    case "taskform": return card.done && card.changeSetId ? <AppliedCard id={card.changeSetId} /> : <TaskForm card={card} onDone={onTask} />
  }
}

const FOOD: Record<Event["food"], string> = { none: "none", dining: "Sun Devil Dining", offsite: "outside caterer", onsite: "made on site", tbd: "yes" }

/**
 * The event form: choose a saved workflow, then provide the event facts — name, date, people, food and a
 * guest speaker or performer — plus Details in the person's own words. Place, catering and funding are decided
 * later in the event and finance steps; anything the person already said is kept as it was understood.
 */
export function PlanForm({ card, onDone }: { card: Extract<ChatCard, { kind: "form" }>; onDone: (c: Extract<ChatCard, { kind: "form" }>, workflowChoice?: WorkflowChoice) => void }) {
  const { state } = useStore()
  const blocked = eventBlocked(state, "create"), allowed = !blocked
  const [f, setF] = useState({ name: card.prefill.name ?? "", type: card.prefill.type ?? (card.prefill.speaker ? "speaker" : "social"), headcount: card.prefill.headcount ?? 30, venue: card.prefill.venue ?? "campus", food: card.prefill.food ?? "none", funding: card.prefill.funding ?? "none", speaker: card.prefill.speaker ?? false, checks: card.prefill.checks ?? {} as EventChecks, details: card.prefill.details ?? "" })
  const [date, setDate] = useState(card.date)
  const [workflowChoice, setWorkflowChoice] = useState(() => initialWorkflowChoice(state))
  const [error, setError] = useState("")
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
  if (card.done) return <div className="mini-card done"><b>{card.prefill.name}</b><span className="small muted">Details sent · {card.date}</span></div>
  const hasFood = f.food !== "none"
  const toggleCheck = (key: EventCheck, checked: boolean) => edit({ checks: { ...f.checks, [key]: checked } })
  const finals = /^\d{4}-\d{2}-\d{2}$/.test(date) ? findPeriod(date, FINALS) : null
  return <form className="mini-card plan-form" data-testid="plan-form" data-form-id={card.id} autoComplete="off" onSubmit={e => {
    e.preventDefault()
    if (blocked) return setError(blocked)
    if (!f.name.trim()) return setError("Give the event a name.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < state.today) return setError("Pick a date from today on.")
    if (!workflowChoice || !findWorkflowTemplateVersion(state, workflowChoice.templateId, workflowChoice.templateVersion)) return setError("Choose a saved workflow version.")
    const details = f.details.trim()
    onDone({ ...card, done: true, date, prefill: { ...f, name: f.name.trim(), details: details || undefined } }, workflowChoice)
  }}>
    <b>New event</b>
    {card.thinking && <p className="small muted" data-testid="ai-reading">Reading…</p>}
    {filled && <p className="small muted" data-testid="ai-filled">Filled from your message.</p>}
    <label>Event name<input name="platypus-event-title" autoComplete="off" value={f.name} maxLength={80} onChange={e => edit({ name: e.target.value })} placeholder="e.g. Founder Dinner" /></label>
    <WorkflowTemplatePicker state={state} value={workflowChoice} onChange={setWorkflowChoice} />
    <div className="form-2">
      <label>Date<input type="date" aria-label="Date" value={date} min={state.today} onChange={e => setDate(e.target.value)} /></label>
      <label>People<input type="number" min={1} max={5000} value={f.headcount} onChange={e => edit({ headcount: Number(e.target.value) })} /></label>
      <label>Food<select aria-label="Food" value={hasFood ? "yes" : "no"} onChange={e => { const yes = e.target.value === "yes"; edit({ food: yes ? (card.prefill.food && card.prefill.food !== "none" ? card.prefill.food : "tbd") : "none", checks: { ...f.checks, food: yes } }) }}><option value="no">No</option><option value="yes">Yes</option></select></label>
    </div>
    {finals && <p className="small late-text" role="alert" data-testid="finals-warning">{fmtLong(date)} is during {finals.label}. ASU does not allow events then (R13).</p>}
    <label className="check-label"><input type="checkbox" checked={f.speaker} onChange={e => edit({ speaker: e.target.checked, checks: { ...f.checks, speaker: e.target.checked } })} />Guest speaker or performer</label>
    <fieldset className="checklist"><legend>Situation-based checklist</legend>{EVENT_CHECKLIST.filter(x => x.key !== "food" && x.key !== "speaker").map(item => <label key={item.key} className="check-label"><input type="checkbox" checked={f.checks[item.key] === true} onChange={e => toggleCheck(item.key, e.target.checked)} />{item.label}</label>)}</fieldset>
    <label>Details<textarea rows={3} maxLength={500} autoComplete="off" value={f.details} onChange={e => edit({ details: e.target.value })} placeholder="Anything unusual: a stage build, a company visit, flying out of state, a competition…" /></label>
    {blocked && <p className="small muted">{blocked}</p>}
    {error && <p className="small late-text" role="alert">{error}</p>}
    <button className="btn btn-primary" type="submit" disabled={!allowed}>Continue</button>
  </form>
}

/** The task form (M2b): name, owners as tags, and one date, Due (FB-5). */
function TaskForm({ card, onDone }: { card: Extract<ChatCard, { kind: "taskform" }>; onDone: (c: Extract<ChatCard, { kind: "taskform" }>) => void }) {
  const { state } = useStore()
  const [c, setC] = useState(card)
  const [error, setError] = useState("")
  const touched = useRef(new Set<string>())
  const edit = (patch: Partial<typeof c>) => { Object.keys(patch).forEach(k => touched.current.add(k)); setC(prev => ({ ...prev, ...patch })) }
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const ai = card.ai
    if (!ai) return
    setC(prev => ({
      ...prev,
      ...(ai.title && !touched.current.has("title") ? { title: ai.title } : {}),
      ...(ai.owners.length && !touched.current.has("owners") ? { owners: ai.owners } : {}),
    }))
    setFilled(true)
  }, [card.ai])
  const people = ownersToPeople(c.owners, state.people, state.roles).filter(Boolean).length
  return <form className="mini-card plan-form" data-testid="task-form" autoComplete="off" onSubmit={e => {
    e.preventDefault()
    if (!c.title.trim()) return setError("Give the task a name.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.due) || c.due < state.today) return setError("Pick a due date from today on.")
    onDone({ ...c, title: c.title.trim(), thinking: false })
  }}>
    <b>New task</b>
    {card.thinking && <p className="small muted" data-testid="ai-reading">Reading…</p>}
    {filled && <p className="small muted" data-testid="ai-filled">Filled from your message.</p>}
    <label>Task name<input aria-label="Task name" name="platypus-task-title" autoComplete="off" value={c.title} maxLength={100} onChange={e => edit({ title: e.target.value })} placeholder="e.g. Order name tags" /></label>
    <OwnerPicker value={c.owners} onChange={owners => edit({ owners })} />
    {people > 1 && <p className="small muted">Makes {people} tasks, one for each person, so everyone has their own deadline.</p>}
    {!c.owners.length && <p className="small muted">{canLead(state) ? "No owner yet: anyone can claim it." : "No owner: it will be yours."}</p>}
    <TaskDueFields due={c.due} onDue={due => edit({ due })} />
    {error && <p className="small late-text" role="alert">{error}</p>}
    <button className="btn btn-primary" type="submit">{people > 1 ? `Create ${people} tasks` : "Create task"}</button>
  </form>
}

/**
 * Move an event to the date the person typed (M2b). The assistant never supplies this date; the rule engine
 * recomputes every step, and the plan is checked again.
 */
function EventDateCard({ card, onDone }: { card: Extract<ChatCard, { kind: "eventdate" }>; onDone: (c: Extract<ChatCard, { kind: "eventdate" }>) => void }) {
  const { state, dispatch } = useStore()
  const rail = useRail()
  const [eventId, setEventId] = useState(card.eventId)
  const [date, setDate] = useState(card.date)
  const [error, setError] = useState("")
  const ev = state.events.find(e => e.id === eventId)
  const allowed = canChangeEvent(state)
  if (card.done) return <div className="mini-card done"><b>{ev?.name ?? "Event"}</b><span className="small muted">Moved to {fmtLong(card.date)} · steps rescheduled</span></div>
  const finals = /^\d{4}-\d{2}-\d{2}$/.test(date) ? findPeriod(date, FINALS) : null
  return <form className="mini-card plan-form" data-testid="event-date" onSubmit={e => {
    e.preventDefault()
    if (!ev) return setError("Choose an event.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < state.today) return setError("Pick a date from today on.")
    dispatch({ type: "updateEvent", id: ev.id, patch: { date } })
    onDone({ ...card, eventId: ev.id, date, done: true })
    if (ev.workflowRun?.snapshot.kind !== "custom") rail.requestReview(ev.id)
  }}>
    <b>Move an event</b>
    <label>Event<select aria-label="Event" value={eventId} onChange={e => setEventId(e.target.value)}>{state.events.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    {ev && <p className="small muted">Now {fmtLong(ev.date)}.</p>}
    <label>New date<input type="date" aria-label="New date" value={date} min={state.today} onChange={e => setDate(e.target.value)} /></label>
    {finals && <p className="small late-text" role="alert">{fmtLong(date)} is during {finals.label}. ASU does not allow events then (R13).</p>}
    {!allowed && <p className="small muted">{eventBlocked(state, "change")}</p>}
    {error && <p className="small late-text" role="alert">{error}</p>}
    <button className="btn btn-primary" type="submit" disabled={!allowed}>Move event</button>
  </form>
}

