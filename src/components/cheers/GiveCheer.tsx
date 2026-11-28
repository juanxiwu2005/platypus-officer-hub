import { useId, useState } from "react"
import { useStore } from "../../data/store"
import { allowanceOf, canSendCheers, validateCheer, type CheerAction } from "../../data/cheers"
import { ccCandidates, cheerRecipients } from "../../data/cheerViews"
import { CHEER_CARD_DEFAULT, CHEER_CARD_EMOJI, CHEER_CARD_NAME, CHEER_CARDS, MAX_CC, MAX_RECIPIENTS, NOTE_MAX, POINTS_DEFAULT, POINTS_MIN, POINTS_STEP } from "../../data/cheerRules"
import type { CheerCard, Person } from "../../data/types"
import { Avatar, Empty } from "../ui"
import { useRail } from "../rail/RailContext"
import { CheerDialog } from "./CheerDialog"
import { firstName, fmtPoints, fullName, joinNames, toast } from "./shared"
import "../../styles/ch-01-cheers.css"

type Send = Extract<CheerAction, { kind: "send" }>

/** A typed points value: a whole number, or NaN while the field holds anything else (validateCheer then explains). */
const parsePoints = (text: string): number => /^\d{1,9}$/.test(text.trim()) ? Number(text.trim()) : NaN

/**
 * F2 (R1, amended by R1.1 §8): Give points, in the right rail's Details. To; points with − and + (steps of 50 from 100, any
 * whole number from 100 typed, at most what is left); the required note; a trophy; and "Let others know too (optional)".
 * Send stays off until `validateCheer` allows it, then asks for confirmation in a dialog (a cheer cannot be undone). There is
 * no task field: a cheer opened from a finished task's thank prompt carries that task silently. Every cheer is emailed to its
 * recipients by Platypus (the demo records it and sends nothing), so there is no "Also email".
 * Research log: the selects that name people carry `data-log-value="omit"`, and the controls whose names say who carry a fixed
 * `data-log-name`, so the log never records who was cheered or who was let know.
 */
export default function GiveCheer({ toIds: initialTo, nodeId: initialNode }: { toIds?: string[]; nodeId?: string }) {
  const { state, tryDispatch } = useStore()
  const rail = useRail()
  const viewer = state.viewerId
  const ids = useId()
  const recipients = cheerRecipients(state, viewer)
  const [to, setTo] = useState<string[]>(() => (initialTo ?? []).filter(id => recipients.some(p => p.id === id)).slice(0, MAX_RECIPIENTS))
  const [adding, setAdding] = useState(false)
  // §8.1: no task field; the thank prompt's task is kept as it came.
  const [nodeId] = useState(initialNode && state.nodes.some(n => n.id === initialNode) ? initialNode : "")
  const [pointsText, setPointsText] = useState(String(POINTS_DEFAULT))
  const [note, setNote] = useState("")
  const [card, setCard] = useState<CheerCard>(CHEER_CARD_DEFAULT)
  const [cc, setCc] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")

  if (!canSendCheers(state, viewer)) return <Empty>Only current officers can give points.</Empty>

  const allowance = allowanceOf(state, viewer)
  const points = parsePoints(pointsText)
  const ccIds = cc.filter(id => !to.includes(id))
  const action: Send = { kind: "send", toIds: to, points, note, card, ...(ccIds.length ? { ccIds } : {}), ...(nodeId ? { nodeId } : {}) }
  const problem = validateCheer(state, viewer, action)
  const left = recipients.filter(p => !to.includes(p.id))
  // The most each recipient can get from what is left this week; the buttons stay within it.
  const perMax = Math.floor(allowance.left / Math.max(1, to.length))
  const up = Number.isFinite(points) ? Math.max(POINTS_MIN, (Math.floor(points / POINTS_STEP) + 1) * POINTS_STEP) : POINTS_MIN
  // Down from a typed value above what is left goes straight to the last step that fits.
  const down = !Number.isFinite(points) ? POINTS_MIN
    : Math.max(POINTS_MIN, points > perMax ? Math.floor(perMax / POINTS_STEP) * POINTS_STEP : (Math.ceil(points / POINTS_STEP) - 1) * POINTS_STEP)
  const candidates = ccCandidates(state, viewer, to)
  const ccOpen = (list: Person[]) => list.filter(p => !ccIds.includes(p.id))
  const roleName = (p: Person) => state.roles.find(r => r.id === p.roleId)?.displayName
  const optionLabel = (p: Person) => { const role = roleName(p); return role ? `${p.name} · ${role}` : p.name }
  const toNames = joinNames(to.map(id => fullName(state, id)))
  const toFirst = joinNames(to.map(id => firstName(fullName(state, id))))

  const send = () => {
    setConfirming(false)
    if (problem) return
    if (!tryDispatch({ type: "cheerAction", action })) { setError("This cheer was not sent. Please try again."); return }
    setError("")
    toast(`Cheer sent. ${toFirst} will ${to.length > 1 ? "each " : ""}get an email.`)
    rail.closeDetail()
  }

  const pick = (id: string) => { if (id) setTo(t => t.includes(id) ? t : [...t, id].slice(0, MAX_RECIPIENTS)); setAdding(false) }
  const addSelect = <select id={`${ids}-add`} className="ch-add" aria-label="Add a teammate" data-log-value="omit" value="" onChange={e => pick(e.target.value)}>
    <option value="">+ Add</option>{left.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
  const ccAddable = ccOpen(candidates.suggested).length + ccOpen(candidates.others).length > 0
  return <form className="ch-panel" data-testid="give-cheer" aria-labelledby={`${ids}-h`} noValidate onSubmit={e => { e.preventDefault(); if (!problem) setConfirming(true) }}>
    <div className="ch-head"><h2 id={`${ids}-h`} className="ch-title">Give points</h2><span className="ch-left" data-testid="cheer-form-left">{fmtPoints(allowance.left)} left this week</span></div>
    <div>
      {to.length <= 1 && !adding ? <>
        <label className="ch-label" htmlFor={`${ids}-to`}>To</label>
        <div className="ch-field">{to[0] && <Avatar name={fullName(state, to[0])} size="sm" />}
          <select id={`${ids}-to`} data-testid="cheer-to" data-log-value="omit" value={to[0] ?? ""} onChange={e => setTo(e.target.value ? [e.target.value] : [])}>
            <option value="">Choose a teammate</option>{recipients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {to.length === 1 && left.length > 0 && <button type="button" className="btn btn-quiet small ch-more" onClick={() => setAdding(true)}>+ Add someone</button>}
      </> : <>
        <span className="ch-label" id={`${ids}-to-l`}>To</span>
        <ul className="ch-recips" aria-labelledby={`${ids}-to-l`} data-testid="cheer-recipients">{to.map(id => <li key={id}><Avatar name={fullName(state, id)} size="sm" />{firstName(fullName(state, id))}<button type="button" className="ch-remove" data-log-name="cheer-remove" aria-label={`Remove ${fullName(state, id)}`} onClick={() => setTo(t => t.filter(x => x !== id))}>✕</button></li>)}
          {to.length < MAX_RECIPIENTS && left.length > 0 && <li className="ch-add-li">{addSelect}</li>}
        </ul>
      </>}
    </div>
    <div>
      <label className="ch-label" htmlFor={`${ids}-pts`}>{to.length > 1 ? "Points each" : "Points"}</label>
      <div className="ch-stepper">
        <button type="button" className="btn ch-step" aria-label="Fewer points" data-testid="cheer-points-down" disabled={!Number.isFinite(points) ? false : points <= POINTS_MIN} onClick={() => setPointsText(String(down))}><span aria-hidden="true">−</span></button>
        <input id={`${ids}-pts`} className="ch-points" type="number" inputMode="numeric" data-testid="cheer-points" min={POINTS_MIN} step={POINTS_STEP} max={Math.max(POINTS_MIN, perMax)}
          aria-describedby={`${ids}-pts-hint`} value={pointsText} onChange={e => setPointsText(e.target.value)} />
        <button type="button" className="btn ch-step" aria-label="More points" data-testid="cheer-points-up" disabled={up > perMax} onClick={() => setPointsText(String(up))}><span aria-hidden="true">+</span></button>
        <span className="ch-hint" id={`${ids}-pts-hint`}>{perMax >= POINTS_MIN ? `${fmtPoints(POINTS_MIN)} to ${fmtPoints(perMax)}` : `At least ${fmtPoints(POINTS_MIN)}`}</span>
      </div>
    </div>
    <div>
      <label className="ch-label" htmlFor={`${ids}-note`}>What did they do, and how did it help?<span className="ch-req" aria-hidden="true">*</span><span className="sr-only"> (required)</span></label>
      <textarea id={`${ids}-note`} className="ch-note" data-log-name="cheer-note" data-testid="cheer-note" rows={3} required aria-required="true" aria-describedby={`${ids}-count`}
        placeholder="Only the people in this cheer will see it." value={note} onChange={e => setNote(e.target.value)} />
      <div className="ch-count" id={`${ids}-count`}><span data-testid="cheer-problem">{problem ?? ""}</span><span>{note.trim().length} / {NOTE_MAX}</span></div>
    </div>
    <div>
      <span className="ch-label" id={`${ids}-card`}>Trophy</span>
      <div className="ch-styles" role="group" aria-labelledby={`${ids}-card`} data-testid="cheer-trophies">{CHEER_CARDS.map(c => <button key={c} type="button" className={`ch-sw ch-sw-${c}${card === c ? " on" : ""}`} aria-pressed={card === c} aria-label={CHEER_CARD_NAME[c]} onClick={() => setCard(c)}><span aria-hidden="true">{CHEER_CARD_EMOJI[c]}</span></button>)}</div>
    </div>
    <div>
      <label className="ch-label" htmlFor={`${ids}-cc`}>Let others know too (optional)</label>
      <ul className="ch-recips" aria-label="People to let know" data-testid="cheer-cc">
        {ccIds.map(id => <li key={id}><Avatar name={fullName(state, id)} size="sm" />{firstName(fullName(state, id))}<button type="button" className="ch-remove" data-log-name="cheer-cc-remove" aria-label={`Do not tell ${fullName(state, id)}`} onClick={() => setCc(list => list.filter(x => x !== id))}>✕</button></li>)}
        {ccIds.length < MAX_CC && ccAddable && <li className="ch-add-li">
          <select id={`${ids}-cc`} className="ch-add" data-testid="cheer-cc-add" data-log-name="cheer-cc-add" data-log-value="omit" value="" onChange={e => { const id = e.target.value; if (id) setCc(list => list.includes(id) ? list : [...list, id].slice(0, MAX_CC)) }}>
            <option value="">+ Add</option>
            {ccOpen(candidates.suggested).length > 0 && <optgroup label="Suggested">{ccOpen(candidates.suggested).map(p => <option key={p.id} value={p.id}>{optionLabel(p)}</option>)}</optgroup>}
            {ccOpen(candidates.others).length > 0 && <optgroup label="Other officers">{ccOpen(candidates.others).map(p => <option key={p.id} value={p.id}>{optionLabel(p)}</option>)}</optgroup>}
          </select>
        </li>}
      </ul>
      <p className="ch-hint ch-cc-hint">They see the card and your note. No points.</p>
    </div>
    <div className="ch-send">
      <span className="ch-hint">{to.length ? `${toFirst} will get an email.` : ""}</span>
      <button type="submit" className="btn btn-primary" data-testid="cheer-send" disabled={!!problem}>{to.length > 1 ? `Send ${to.length} cheers` : "Send"}</button>
    </div>
    {error && <p className="small late-text" role="alert">{error}</p>}
    {confirming && <CheerDialog labelledBy={`${ids}-confirm-h`} onClose={() => setConfirming(false)} narrow testId="cheer-confirm">
      <h2 id={`${ids}-confirm-h`} className="ch-title">Send {fmtPoints(points)} points{to.length > 1 ? " each" : ""} to {toNames}?</h2>
      <p className="small muted ch-confirm-text">You can't undo this.{ccIds.length > 0 && <> {joinNames(ccIds.map(id => firstName(fullName(state, id))))} will see it too.</>}</p>
      <div className="ch-row ch-confirm-act">
        <button type="button" className="btn" data-autofocus data-testid="cheer-confirm-cancel" onClick={() => setConfirming(false)}>Cancel</button>
        <button type="button" className="btn btn-primary" data-testid="cheer-confirm-send" onClick={send}>Send</button>
      </div>
    </CheerDialog>}
  </form>
}
