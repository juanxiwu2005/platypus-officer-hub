import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { useStore, useViewer } from "../../data/store"
import { newEventForm, respond, reviewEvent, STOPPED_FORM_SOURCE, suggestionsFor, ruleById, type ChatCard, type ChatMsg, type Focus, type Reply } from "../../lib/assistant"
import { PAGES } from "../../routes"
import { fmtLong, fmtShort } from "../../lib/dates"
import { FINALS, findPeriod } from "../../engine/calendar"
import { NodePill } from "../ui"
import { Feedback } from "../Feedback"
import { useRail } from "./RailContext"
import { AppliedCard, ChangeCard } from "./ChangeCard"
import { Bts, BtsRow } from "../Bts"
import { OwnerPicker, ownersToPeople, TaskDueFields } from "./TaskFields"
import { canChangeEvent, canLead, eventBlocked } from "../../data/changeReview"
import { policySourceById } from "../../data/policyCatalog"
import { distinctSources, sourceName, withSourceNames } from "../../lib/sourceNames"
import { answerSummary, emitUi } from "../../lib/uiLog"
import { readAiBudget } from "../../lib/api"
import { AiWait } from "../AiWait"
import { playbookAskContext } from "../../lib/playbookAsk"
import type { PlanResult } from "./PlanForm"

// The New event form and its "created" card load on demand (Option A): the startup bundle has no room for them.
const PlanFormCard = lazy(() => import("./PlanForm"))
const CreatedCard = lazy(() => import("./PlanForm").then(module => ({ default: module.CreatedCard })))
const loadingForm = <p className="small muted" data-testid="form-loading">Opening the form…</p>

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

  // A Playbook question's context lasts while its page is shown (Ask stays open across pages on a computer).
  const askContext = rail.askContext
  useEffect(() => { if (askContext && location.pathname !== "/playbook") rail.clearAskContext() }, [location.pathname, askContext])
  const focus: Focus | null = useMemo(() => {
    // Ask AI on a Playbook question: recomputed from the current state, so votes and edits since the click count; a question
    // deleted since then has no context.
    if (askContext && location.pathname === "/playbook") {
      const now = playbookAskContext(state, askContext.questionId)
      if (now) return { kind: "playbook-question", id: now.questionId, title: now.question, playbookQuestion: now }
    }
    const d = rail.detail
    if (d && (d.kind === "node" || d.kind === "task" || d.kind === "nudge")) { const n = state.nodes.find(x => x.id === d.id); if (n) return { kind: "node", id: n.id, title: n.title } }
    if (d?.kind === "funding") { const e = state.events.find(x => x.id === d.eventId); if (e) return { kind: "event", id: e.id, title: `${e.name} funding` } }
    if (location.pathname === "/events") {
      const e = state.events.find(x => x.id === new URLSearchParams(location.search).get("event")) ?? state.events[0]
      if (e) return { kind: "event", id: e.id, title: e.name }
    }
    const page = PAGES.find(p => p.path === location.pathname)
    return page ? { kind: "page", id: page.path, title: page.label } : null
  }, [askContext, rail.detail, location.pathname, location.search, state.nodes, state.events, state.playbook, state.people])
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
      setMessages(m => [...m, { id: uid(), role: "assistant", cards: [{ kind: "text", text: "Something went wrong. Try again." }], source: "Platypus" }])
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
  // The form loads on demand the first time, so this waits for it (up to about 3 s) before moving focus.
  const focusFirst = (formId: string, tries = 60): void => void setTimeout(() => {
    const field = list.current?.querySelector<HTMLElement>(`[data-form-id="${formId}"] input`)
    if (field) field.focus()
    else if (tries > 0) focusFirst(formId, tries - 1)
  }, tries === 60 ? 30 : 50)
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
  /**
   * Create event (Option A, Juanxi 2026-11-28): the person's press is the approval, so the event is created at once
   * (PlanForm.tsx) and the chat shows a small "created" card with Open event and Undo. Only if it could not be applied does
   * the change set wait on a Review changes card instead.
   */
  function planCreated(msgId: string, index: number, c: Extract<ChatCard, { kind: "form" }>, r: PlanResult) {
    patchCard(msgId, index, c)
    setMessages(m => [...m,
      { id: uid(), role: "user", text: r.summary },
      { id: uid(), role: "assistant", cards: r.eventId ? [{ kind: "created", changeSetId: r.changeSetId, eventId: r.eventId, name: r.name }] : [{ kind: "text", text: "It could not be created at once. Check it here." }, { kind: "changes", changeSetId: r.changeSetId }], source: "Saved workflow" },
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
  const suggestions = suggestionsFor(location.pathname, state)
  // The same row sits with the greeting before the first message, and at the foot of the panel afterwards (never both).
  const suggestionRow = <div className="chips" aria-label="Suggestions">{suggestions.map(s => <button key={s} type="button" className="chip" onClick={() => send(s, "suggestion")} disabled={busy}>{s}</button>)}</div>

  return <section className="ask" aria-label="Ask Platypus" data-testid="ask-panel">
    <header className="ask-head">
      <b>Ask Platypus</b>
      {messages.length > 0 && <button type="button" className="btn btn-quiet small" onClick={() => setMessages([])}>New chat</button>}
    </header>
    {activeFocus && <div className="focus-chip" data-testid="focus-chip"><span>Looking at: {activeFocus.title}</span><button type="button" aria-label="Stop using this context" onClick={() => { if (activeFocus.kind === "playbook-question") rail.clearAskContext(); else setFocusOff(`${activeFocus.kind}:${activeFocus.id}`) }}>×</button></div>}
    {!messages.length && <div className="ask-welcome" data-testid="ask-welcome">
      <p className="ask-hello">Hi {person.name.split(" ")[0]}. Ask about this page or your tasks.</p>
      {suggestionRow}
    </div>}
    <div className={`ask-list${messages.length ? "" : " is-empty"}`} ref={list} aria-live="polite">
      {messages.map(m => m.role === "user"
        ? <div key={m.id} className={`bubble user${alreadyThere.current.has(m.id) ? "" : " is-new"}`}>{m.text}</div>
        : <div key={m.id} className={`bubble bot${alreadyThere.current.has(m.id) ? "" : " is-new"}`} data-testid="bot-reply">
          {m.cards?.map((c, i) => <CardView key={i} card={c} onPlan={(card, result) => planCreated(m.id, i, card, result)} onTask={card => submitTask(m.id, i, card)} onMoved={card => patchCard(m.id, i, card)} />)}
          {m.source && <span className="ask-source">{m.source}</span>}
        </div>)}
      {waiting > 0 && <AiWait key={waitKey} onStop={stopAll} stopTestId="ask-stop" />}
    </div>
    {messages.length > 0 && suggestionRow}
    <form className="ask-form" onSubmit={e => { e.preventDefault(); void send(text) }}>
      <textarea id="ask-input" ref={input} rows={2} maxLength={1000} value={text} placeholder="Ask a question or describe a task…" aria-label="Message Platypus"
        onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(text) } }} />
      <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()} aria-label="Send">Send</button>
    </form>
  </section>
}

function CardView({ card, onPlan, onTask, onMoved }: { card: ChatCard; onPlan: (c: Extract<ChatCard, { kind: "form" }>, result: PlanResult) => void; onTask: (c: Extract<ChatCard, { kind: "taskform" }>) => void; onMoved: (c: Extract<ChatCard, { kind: "eventdate" }>) => void }) {
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
    case "rule": {
      // Rule-book answers are written by the app, so their "[R06]" tags become names; AI-written archive answers stay as written.
      const sources = distinctSources(card.citations), ruleBook = card.citations.every(id => ruleById(id))
      return <div className="mini-card" data-testid="rule-answer">
        <p className="pre-line">{ruleBook ? withSourceNames(card.answer) : card.answer}</p>
        {sources.length > 0 && <div className="action-row">{sources.map(({ id, name }) => {
          const policy = policySourceById(id), rule = ruleById(id), url = policy?.sourceUrl ?? rule?.sources[0].url
          return url ? <a key={id} className="btn small" data-source-id={id} href={url} target="_blank" rel="noreferrer">{name} ↗</a> : <span key={id} className="small muted" data-source-id={id}>{name} · source saved</span>
        })}</div>}
        <span className="ask-source">{card.label}{sources.length ? ` · ${sources[0].name} checked ${policySourceById(sources[0].id)?.extractedAt ?? ruleById(sources[0].id)?.checkedOn}` : ""}</span>
        <Feedback id={`ask:${card.question}:${card.answer}`} text={card.answer} />
      </div>
    }
    case "changes": return <ChangeCard id={card.changeSetId} />
    case "applied": return <AppliedCard id={card.changeSetId} />
    case "form": return <Suspense fallback={loadingForm}><PlanFormCard card={card} onCreated={onPlan} /></Suspense>
    case "created": return <Suspense fallback={null}><CreatedCard card={card} /></Suspense>
    case "review": {
      const ev = state.events.find(e => e.id === card.eventId)
      return <div className="mini-card" data-testid="event-review">
        <b>Plan check{ev ? `: ${ev.name}` : ""}</b>
        {card.risks.length ? <ul className="review-risks">{card.risks.map((r, i) => <li key={i}>{r.text}{distinctSources(r.rules).map(({ id, name }) => { const rule = ruleById(id); return rule && <a key={id} className="small" data-source-id={id} href={rule.sources[0].url} target="_blank" rel="noreferrer"> {name} ↗</a> })}</li>)}</ul> : <p className="small">Nothing stands out beyond the playbook's steps.</p>}
        <BtsRow>
          {card.label.startsWith("AI") ? <Bts kind="ai" label={card.label}>The AI suggested these risks from the playbook plus what you wrote. Only rules in the rule book and dates the app already knows are kept.</Bts> : <Bts label={card.label}>No AI wrote this list. These are the rule engine's own warnings for the event, each tied to its rule where there is one.</Bts>}
          <Bts label="Rule engine">Every step date is computed by the rule engine; the AI never sets a date.</Bts>
        </BtsRow>
      </div>
    }
    case "eventdate": return <EventDateCard card={card} onDone={onMoved} />
    case "taskform": return card.done && card.changeSetId ? <AppliedCard id={card.changeSetId} /> : <TaskForm card={card} onDone={onTask} />
  }
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
    {finals && <p className="small late-text" role="alert">{fmtLong(date)} is during {finals.label}. ASU does not allow events then ({sourceName("R13")}).</p>}
    {!allowed && <p className="small muted">{eventBlocked(state, "change")}</p>}
    {error && <p className="small late-text" role="alert">{error}</p>}
    <button className="btn btn-primary" type="submit" disabled={!allowed}>Move event</button>
  </form>
}

