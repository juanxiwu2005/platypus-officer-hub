import { useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useStore } from "../../data/store"
import { cheersOf, unseenFor, visibleCheers } from "../../data/cheers"
import { receivedThisTerm } from "../../data/cheerViews"
import { CHEER_CARD_EMOJI, MAX_CARDS_AT_ONCE } from "../../data/cheerRules"
import { fmtLong } from "../../lib/dates"
import { CheerDialog } from "./CheerDialog"
import { canSeeEmail, EmailText, EmailToggle } from "./CheerEmail"
import { firstName, fmtPoints, fullName, joinNames, taskLabel } from "./shared"

/** Cheer IDs already offered to each viewer in this app session, so a card shows once per load even before it is marked seen. */
export type OfferedCards = Map<string, Set<string>>
interface Batch { viewerId: string; ids: string[]; more: number; link?: boolean }

/**
 * F5 (R1): received cards, centered, shown once. On load and when new ones arrive, up to three unseen cards in a row
 * ("1 of N", Next, then Close); closing marks the cards shown so far as seen. `#/?cheer=<id>` opens that one card for its
 * sender, a recipient or someone the sender let know (R1.1, read-only; their inbox notice links here); anyone else sees nothing.
 * The sender and recipients can read the email the recipients got from a small "Email" link on the card.
 */
export default function ReceivedCards({ offered }: { offered: OfferedCards }) {
  const { state, dispatch } = useStore()
  const location = useLocation()
  const navigate = useNavigate()
  const viewer = state.viewerId
  const linked = new URLSearchParams(location.search).get("cheer")
  const unseen = unseenFor(state, viewer)
  const unseenKey = unseen.map(c => c.id).join(",")
  const [batch, setBatch] = useState<Batch | null>(null)
  const [index, setIndex] = useState(0)
  // The cheer whose email text is shown under the card (R1.1, §8.8), if any.
  const [email, setEmail] = useState<string | null>(null)
  // The link a person just closed, until the address no longer carries it (the address updates a moment after closing).
  const closedLink = useRef<string | null>(null)
  const dropLink = () => {
    const params = new URLSearchParams(location.search)
    params.delete("cheer")
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace: true })
  }

  useEffect(() => {
    if (batch && batch.viewerId !== viewer) { setBatch(null); return }
    if (batch) return
    if (!linked) closedLink.current = null
    else if (linked === closedLink.current) return
    if (linked) {
      if (visibleCheers(state, viewer).some(c => c.id === linked)) { setBatch({ viewerId: viewer, ids: [linked], more: 0, link: true }); setIndex(0) }
      else dropLink()
      return
    }
    const known = offered.get(viewer) ?? new Set<string>()
    const fresh = unseen.filter(c => !known.has(c.id))
    if (!fresh.length) return
    fresh.forEach(c => known.add(c.id))
    offered.set(viewer, known)
    setBatch({ viewerId: viewer, ids: fresh.slice(0, MAX_CARDS_AT_ONCE).map(c => c.id), more: Math.max(0, fresh.length - MAX_CARDS_AT_ONCE) })
    setIndex(0)
  }, [viewer, linked, unseenKey, batch])

  if (!batch || batch.viewerId !== viewer) return null
  const cheer = cheersOf(state).cheers.find(c => c.id === batch.ids[index] && !c.withdrawnOn)
  const close = () => {
    const shown = batch.ids.slice(0, index + 1).filter(id => cheersOf(state).cheers.some(c => c.id === id && c.toIds.includes(viewer) && !c.seenBy.includes(viewer)))
    if (shown.length) dispatch({ type: "cheerAction", action: { kind: "markSeen", ids: shown } })
    if (batch.link) { closedLink.current = batch.ids[0]; dropLink() }
    setBatch(null)
  }
  if (!cheer) return <CheerDialog labelledBy="ch-card-gone" onClose={close} narrow testId="cheer-card">
    <h2 id="ch-card-gone" className="ch-title">This cheer was withdrawn.</h2>
    <div className="ch-row"><span className="ch-left"><button type="button" className="btn btn-primary" data-autofocus onClick={close}>Close</button></span></div>
  </CheerDialog>
  const mine = cheer.toIds.includes(viewer)
  const sharedWithMe = !mine && cheer.fromId !== viewer
  const last = index === batch.ids.length - 1
  const task = taskLabel(state, cheer.nodeId)
  const thanked = mine ? firstName(fullName(state, viewer)) : joinNames(cheer.toIds.map(id => firstName(fullName(state, id))))
  // A person the sender let know (R1.1) sees the card read-only: no points are theirs, and the email was not addressed to them.
  const footer = batch.ids.length > 1 ? `${index + 1} of ${batch.ids.length} new cheers`
    : mine ? `You have ${fmtPoints(receivedThisTerm(state, viewer))} points this term.`
    : sharedWithMe ? `${firstName(fullName(state, cheer.fromId))} shared this with you.`
    : cheer.ccIds?.length ? "Only the people in this cheer see this." : "Only you and the people you thanked see this."
  const withEmail = canSeeEmail(cheer, viewer)
  return <CheerDialog labelledBy="ch-card-h" onClose={close} narrow testId="cheer-card">
    <div className={`ch-card ch-card-${cheer.card}`} data-cheer={cheer.id}>
      <span className="ch-deco" aria-hidden="true">{CHEER_CARD_EMOJI[cheer.card] ?? CHEER_CARD_EMOJI.trophy}</span>
      <span className="ch-card-pts">+{fmtPoints(cheer.points)}</span>
      <h2 id="ch-card-h" className="ch-card-to">Thank you, {thanked}!</h2>
      <p className="ch-card-why">“{cheer.note}”</p>
      <p className="ch-card-meta">From {fullName(state, cheer.fromId)}{task && <> · {task}</>} · <span className="ch-d">{fmtLong(cheer.on)}</span>
        {withEmail && <> · <EmailToggle open={email === cheer.id} controls="ch-card-mail" onToggle={() => setEmail(e => e === cheer.id ? null : cheer.id)} /></>}</p>
    </div>
    {withEmail && email === cheer.id && <EmailText s={state} c={cheer} viewerId={viewer} id="ch-card-mail" />}
    <div className="ch-row">
      <span className="small muted" data-testid="cheer-card-count">{footer}</span>
      {last && batch.more > 0 && <Link className="small" to="/team" onClick={close}>{batch.more} more on Team</Link>}
      {/* One button that changes from Next to Close, so focus stays on it. */}
      <span className="ch-left"><button type="button" className="btn btn-primary" data-autofocus data-testid={last ? "cheer-card-close" : "cheer-card-next"} onClick={last ? close : () => setIndex(i => i + 1)}>{last ? "Close" : "Next"}</button></span>
    </div>
  </CheerDialog>
}
