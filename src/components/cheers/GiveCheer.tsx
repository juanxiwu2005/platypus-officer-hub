import { useId, useMemo, useRef, useState } from "react"
import { useStore } from "../../data/store"
import { allowanceOf, canSendCheers, cheerRecipients, cheersOf, validateCheer, type CheerAction } from "../../data/cheers"
import { CHEER_CARD_EMOJI, CHEER_CARDS, CHEER_POINTS, MAX_RECIPIENTS, NOTE_MAX, QUICK_STARTS } from "../../data/cheerRules"
import type { Cheer, CheerCard, CheerPoints } from "../../data/types"
import { cheerMail } from "../../lib/cheerMail"
import { composeUrl } from "../../lib/nudges"
import { Avatar, Empty } from "../ui"
import { useRail } from "../rail/RailContext"
import { firstName, fullName, toast } from "./shared"
import "../../styles/ch-01-cheers.css"

const CARD_NAME: Record<CheerCard, string> = { thanks: "Thanks card", star: "Star card", teamwork: "Teamwork card" }
type Send = Extract<CheerAction, { kind: "send" }>

/**
 * F2 (R1): Give points, in the right rail's Details. The note is required; Send stays off until `validateCheer` allows it.
 * "Also email" opens a draft the sender sends themselves (composeUrl); the app sends nothing.
 */
export default function GiveCheer({ toIds: initialTo, nodeId: initialNode }: { toIds?: string[]; nodeId?: string }) {
  const { state, tryDispatch, getState } = useStore()
  const rail = useRail()
  const viewer = state.viewerId
  const ids = useId()
  const recipients = cheerRecipients(state, viewer)
  const [to, setTo] = useState<string[]>(() => (initialTo ?? []).filter(id => recipients.some(p => p.id === id)).slice(0, MAX_RECIPIENTS))
  const [adding, setAdding] = useState(false)
  const [nodeId, setNodeId] = useState(initialNode && state.nodes.some(n => n.id === initialNode) ? initialNode : "")
  const [points, setPoints] = useState<CheerPoints>(25)
  const [note, setNote] = useState("")
  const [card, setCard] = useState<CheerCard>("star")
  const [email, setEmail] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState<Cheer | null>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const tasks = useMemo(() => {
    const mine = new Set(to)
    return state.nodes.slice().sort((a, b) => Number(mine.has(b.ownerId ?? "")) - Number(mine.has(a.ownerId ?? "")) || a.title.localeCompare(b.title))
  }, [state.nodes, to])

  if (!canSendCheers(state, viewer)) return <Empty>Only current officers can give points.</Empty>

  const allowance = allowanceOf(state, viewer)
  const action: Send = { kind: "send", toIds: to, points, note, card, email, ...(nodeId ? { nodeId } : {}) }
  const problem = validateCheer(state, viewer, action)
  const left = recipients.filter(p => !to.includes(p.id))
  const eventName = (eventId: string | null) => eventId ? state.events.find(e => e.id === eventId)?.name : undefined
  const draftUrl = (c: Cheer, recipientId: string) => { const mail = cheerMail(getState(), c, recipientId, window.location.href); return composeUrl("email", mail.body, mail.subject) }

  const quick = (phrase: string) => {
    const t = note.trimEnd()
    setNote(t ? `${t}${/[.!?]$/.test(t) ? "" : "."} ${phrase}.` : `${phrase}: `)
    requestAnimationFrame(() => { const el = noteRef.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) } })
  }
  const send = () => {
    if (problem) return
    const known = new Set(cheersOf(getState()).cheers.map(c => c.id))
    if (!tryDispatch({ type: "cheerAction", action })) { setError("This cheer was not sent. Please try again."); return }
    const cheer = cheersOf(getState()).cheers.find(c => !known.has(c.id)) ?? null
    setError("")
    toast("Cheer sent.")
    if (email && cheer) window.open(draftUrl(cheer, cheer.toIds[0]), "_blank", "noopener,noreferrer")
    if (email && cheer && cheer.toIds.length > 1) { setSent(cheer); return }
    rail.closeDetail()
  }

  if (sent) return <div className="ch-panel" data-testid="cheer-sent">
    <h2 className="ch-title">Cheer sent</h2>
    <p className="small muted">One email draft each:</p>
    <ul className="ch-drafts">{sent.toIds.map(id => <li key={id}><a className="btn small" data-testid="cheer-draft" href={draftUrl(sent, id)} target="_blank" rel="noreferrer">Email {firstName(fullName(state, id))}</a></li>)}</ul>
    <button type="button" className="btn btn-primary small" onClick={() => rail.closeDetail()}>Done</button>
  </div>

  const pick = (id: string) => { if (id) setTo(t => t.includes(id) ? t : [...t, id].slice(0, MAX_RECIPIENTS)); setAdding(false) }
  const addSelect = <select id={`${ids}-add`} className="ch-add" aria-label="Add a teammate" value="" onChange={e => pick(e.target.value)}>
    <option value="">+ Add</option>{left.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
  return <form className="ch-panel" data-testid="give-cheer" aria-labelledby={`${ids}-h`} onSubmit={e => { e.preventDefault(); send() }}>
    <div className="ch-head"><h2 id={`${ids}-h`} className="ch-title">Give points</h2><span className="ch-left" data-testid="cheer-form-left">{allowance.left} left this week</span></div>
    <div>
      {to.length <= 1 && !adding ? <>
        <label className="ch-label" htmlFor={`${ids}-to`}>To</label>
        <div className="ch-field">{to[0] && <Avatar name={fullName(state, to[0])} size="sm" />}
          <select id={`${ids}-to`} data-testid="cheer-to" value={to[0] ?? ""} onChange={e => setTo(e.target.value ? [e.target.value] : [])}>
            <option value="">Choose a teammate</option>{recipients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {to.length === 1 && left.length > 0 && <button type="button" className="btn btn-quiet small ch-more" onClick={() => setAdding(true)}>+ Add someone</button>}
      </> : <>
        <span className="ch-label" id={`${ids}-to-l`}>To</span>
        <ul className="ch-recips" aria-labelledby={`${ids}-to-l`} data-testid="cheer-recipients">{to.map(id => <li key={id}><Avatar name={fullName(state, id)} size="sm" />{firstName(fullName(state, id))}<button type="button" className="ch-remove" aria-label={`Remove ${fullName(state, id)}`} onClick={() => setTo(t => t.filter(x => x !== id))}>✕</button></li>)}
          {to.length < MAX_RECIPIENTS && left.length > 0 && <li className="ch-add-li">{addSelect}</li>}
        </ul>
      </>}
    </div>
    <div>
      <label className="ch-label" htmlFor={`${ids}-task`}>For a task (optional)</label>
      <select id={`${ids}-task`} className="ch-select" data-testid="cheer-task" value={nodeId} onChange={e => setNodeId(e.target.value)}>
        <option value="">No task</option>{tasks.map(n => { const ev = eventName(n.eventId); return <option key={n.id} value={n.id}>{ev ? `${n.title} · ${ev}` : n.title}</option> })}
      </select>
    </div>
    <div>
      <span className="ch-label" id={`${ids}-pts`}>{to.length > 1 ? "Points each" : "Points"}</span>
      <div className="ch-seg" role="group" aria-labelledby={`${ids}-pts`}>{CHEER_POINTS.map(p => <button key={p} type="button" className={`chip${points === p ? " on" : ""}`} aria-pressed={points === p} onClick={() => setPoints(p)}>{p}</button>)}</div>
    </div>
    <div>
      <label className="ch-label" htmlFor={`${ids}-note`}>Why they did well <em>Required</em></label>
      <div className="ch-seg ch-quick" role="group" aria-label="Quick starts">{QUICK_STARTS.map(q => <button key={q} type="button" className="chip" onClick={() => quick(q)}>{q}</button>)}</div>
      <textarea id={`${ids}-note`} ref={noteRef} className="ch-note" data-log-name="cheer-note" data-testid="cheer-note" rows={3} required aria-required="true" aria-describedby={`${ids}-count`}
        placeholder="What did they do, and how did it help? Only they will see this." value={note} onChange={e => setNote(e.target.value)} />
      <div className="ch-count" id={`${ids}-count`}><span data-testid="cheer-problem">{problem ?? ""}</span><span>{note.trim().length} / {NOTE_MAX}</span></div>
    </div>
    <div>
      <span className="ch-label" id={`${ids}-card`}>Card</span>
      <div className="ch-styles" role="group" aria-labelledby={`${ids}-card`}>{CHEER_CARDS.map(c => <button key={c} type="button" className={`ch-sw ch-sw-${c}${card === c ? " on" : ""}`} aria-pressed={card === c} aria-label={CARD_NAME[c]} onClick={() => setCard(c)}><span aria-hidden="true">{CHEER_CARD_EMOJI[c]}</span></button>)}</div>
    </div>
    <div className="ch-send">
      <label className="ch-check"><input type="checkbox" data-testid="cheer-email" checked={email} onChange={e => setEmail(e.target.checked)} />Also email</label>
      <button type="submit" className="btn btn-primary" data-testid="cheer-send" disabled={!!problem}>{to.length > 1 ? `Send ${to.length} cheers` : "Send"}</button>
    </div>
    {error && <p className="small late-text" role="alert">{error}</p>}
  </form>
}
