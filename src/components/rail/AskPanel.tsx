import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { useStore, useViewer } from "../../data/store"
import type { Event } from "../../data/types"
import { respond, SUGGESTIONS, ruleById, type ChatCard, type ChatMsg, type Focus } from "../../lib/assistant"
import { PAGES } from "../../routes"
import { fmtShort } from "../../lib/dates"
import { sanitizeOps } from "../../lib/commands"
import { NodePill } from "../ui"
import { Feedback } from "../Feedback"
import { useRail } from "./RailContext"
import { ChangeCard } from "./ChangeCard"

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
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [focusOff, setFocusOff] = useState<string | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => save(messages), [messages])
  useEffect(() => {
    const clear = () => setMessages([])
    window.addEventListener("platypus:reset", clear)
    return () => window.removeEventListener("platypus:reset", clear)
  }, [])
  useEffect(() => { list.current?.scrollTo?.({ top: list.current.scrollHeight, behavior: "smooth" }) }, [messages.length, busy])

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

  async function send(raw: string) {
    const t = raw.trim()
    if (!t || busy) return
    const user: ChatMsg = { id: uid(), role: "user", text: t }
    setMessages(m => [...m, user]); setText(""); setBusy(true)
    try {
      const reply = await respond(t, state, person.id, activeFocus, location.pathname, messages)
      if (reply.changeSet) dispatch({ type: "draftChanges", changeSet: reply.changeSet })
      setMessages(m => [...m, { id: uid(), role: "assistant", cards: reply.cards, source: reply.source }])
    } catch {
      setMessages(m => [...m, { id: uid(), role: "assistant", cards: [{ kind: "text", text: "Something went wrong. Please try again." }], source: "Platypus" }])
    } finally { setBusy(false) }
  }

  // Questions sent from elsewhere ("Ask about this rule", "Ask AI about this step").
  useEffect(() => {
    const p = rail.pending
    if (!p) return
    rail.takePending()
    if (p.send) void send(p.text)
    else { setText(p.text); setTimeout(() => input.current?.focus(), 30) }
  }, [rail.pending?.n])

  const patchCard = (msgId: string, cardIndex: number, card: ChatCard) => setMessages(m => m.map(x => x.id === msgId ? { ...x, cards: x.cards?.map((c, i) => i === cardIndex ? card : c) } : x))
  /** The filled form becomes a change set straight away; the date is the one the person picked. */
  function submitPlan(msgId: string, index: number, c: Extract<ChatCard, { kind: "form" }>) {
    patchCard(msgId, index, c)
    const op = sanitizeOps([{ ...c.prefill, op: "create_event" }], state)[0]
    if (!op) return
    const id = `change-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    dispatch({ type: "draftChanges", changeSet: { id, sentence: `Plan ${c.prefill.name} on ${c.date}`, ops: [op], status: "pending", source: "Your details + the club playbook" } })
    setMessages(m => [...m,
      { id: uid(), role: "user", text: `${c.prefill.name} · ${c.date} · ${c.prefill.headcount} people · ${c.prefill.venue === "offcampus" ? "off campus" : "on campus"} · food: ${FOOD[c.prefill.food ?? "none"]} · funding: ${FUND[c.prefill.funding ?? "none"]}` },
      { id: uid(), role: "assistant", cards: [{ kind: "text", text: "Here is the draft. Approve it and I'll open its flow chart." }, { kind: "changes", changeSetId: id }], source: "Club playbook" },
    ])
  }
  const suggestions = SUGGESTIONS[location.pathname] ?? SUGGESTIONS["/"]

  return <section className="ask" aria-label="Ask Platypus" data-testid="ask-panel">
    <header className="ask-head">
      <b>Ask Platypus</b>
      {messages.length > 0 && <button type="button" className="btn btn-quiet small" onClick={() => setMessages([])}>New chat</button>}
    </header>
    {activeFocus && <div className="focus-chip" data-testid="focus-chip"><span>Looking at: {activeFocus.title}</span><button type="button" aria-label="Stop using this context" onClick={() => setFocusOff(`${activeFocus.kind}:${activeFocus.id}`)}>×</button></div>}
    <div className="ask-list" ref={list} aria-live="polite">
      {!messages.length && <p className="ask-hello">Hi {person.name.split(" ")[0]}. What do you need?</p>}
      {messages.map(m => m.role === "user"
        ? <div key={m.id} className="bubble user">{m.text}</div>
        : <div key={m.id} className="bubble bot" data-testid="bot-reply">
          {m.cards?.map((c, i) => <CardView key={i} card={c} onPlan={card => submitPlan(m.id, i, card)} />)}
          {m.source && <span className="ask-source">{m.source}</span>}
        </div>)}
      {busy && <div className="bubble bot typing" aria-label="Thinking"><i /><i /><i /></div>}
    </div>
    <div className="chips" aria-label="Suggestions">{suggestions.map(s => <button key={s} type="button" className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>)}</div>
    <form className="ask-form" onSubmit={e => { e.preventDefault(); void send(text) }}>
      <textarea id="ask-input" ref={input} rows={2} maxLength={1000} value={text} placeholder="Ask or tell Platypus…" aria-label="Message Platypus"
        onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(text) } }} />
      <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()} aria-label="Send">Send</button>
    </form>
  </section>
}

function CardView({ card, onPlan }: { card: ChatCard; onPlan: (c: Extract<ChatCard, { kind: "form" }>) => void }) {
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
      <p style={{ whiteSpace: "pre-line" }}>{card.answer}</p>
      {card.citations.length > 0 && <div className="action-row">{card.citations.map(id => { const r = ruleById(id); return r && <a key={id} className="btn small" href={r.sources[0].url} target="_blank" rel="noreferrer">{id} source ↗</a> })}</div>}
      <span className="ask-source">{card.label}{card.citations.length ? ` · checked ${ruleById(card.citations[0])?.checkedOn}` : ""}</span>
      <Feedback id={`ask:${card.question}:${card.answer}`} text={card.answer} />
    </div>
    case "changes": return <ChangeCard id={card.changeSetId} />
    case "form": return <PlanForm card={card} onDone={onPlan} />
  }
}

const FOOD: Record<Event["food"], string> = { none: "none", dining: "Sun Devil Dining", offsite: "outside caterer", onsite: "made on site" }
const FUND: Record<Event["funding"], string> = { none: "none", usg: "USG", college: "college", dues: "dues", sponsor: "sponsor" }

/** The "fill in what I need" card: dropdowns and a date, no typing paragraphs. */
function PlanForm({ card, onDone }: { card: Extract<ChatCard, { kind: "form" }>; onDone: (c: Extract<ChatCard, { kind: "form" }>) => void }) {
  const { state } = useStore()
  const [f, setF] = useState({ name: card.prefill.name ?? "", type: card.prefill.type ?? "social", headcount: card.prefill.headcount ?? 30, venue: card.prefill.venue ?? "campus", food: card.prefill.food ?? "none", funding: card.prefill.funding ?? "none", speaker: card.prefill.speaker ?? false })
  const [date, setDate] = useState(card.date)
  const [error, setError] = useState("")
  if (card.done) return <div className="mini-card done"><b>{card.prefill.name}</b><span className="small muted">Details sent · {card.date}</span></div>
  return <form className="mini-card plan-form" data-testid="plan-form" onSubmit={e => {
    e.preventDefault()
    if (!f.name.trim()) return setError("Give the event a name.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < state.today) return setError("Pick a date from today on.")
    onDone({ ...card, done: true, date, prefill: { ...f, name: f.name.trim() } })
  }}>
    <b>I need these details</b>
    <label>Event name<input value={f.name} maxLength={80} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Founder Dinner" /></label>
    <div className="form-2">
      <label>Date<input type="date" value={date} min={state.today} onChange={e => setDate(e.target.value)} /></label>
      <label>People<input type="number" min={1} max={5000} value={f.headcount} onChange={e => setF({ ...f, headcount: Number(e.target.value) })} /></label>
      <label>Where<select value={f.venue} onChange={e => setF({ ...f, venue: e.target.value as Event["venue"] })}><option value="campus">On campus</option><option value="offcampus">Off campus</option></select></label>
      <label>Food<select value={f.food} onChange={e => setF({ ...f, food: e.target.value as Event["food"] })}><option value="none">No food</option><option value="dining">Sun Devil Dining</option><option value="offsite">Outside caterer</option><option value="onsite">Made on site</option></select></label>
      <label>Funding<select value={f.funding} onChange={e => setF({ ...f, funding: e.target.value as Event["funding"] })}><option value="none">None</option><option value="usg">USG</option><option value="college">College</option><option value="dues">Dues</option><option value="sponsor">Sponsor</option></select></label>
      <label>Type<select value={f.type} onChange={e => setF({ ...f, type: e.target.value as Event["type"] })}>{["social", "speaker", "workshop", "meeting", "fundraiser", "offcampus"].map(v => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}</select></label>
    </div>
    <label className="check-label"><input type="checkbox" checked={f.speaker} onChange={e => setF({ ...f, speaker: e.target.checked })} />Guest speaker or performer</label>
    {error && <p className="small late-text" role="alert">{error}</p>}
    <button className="btn btn-primary" type="submit">Continue</button>
  </form>
}
