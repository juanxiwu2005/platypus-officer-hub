import { useId, useState } from "react"
import { useStore } from "../../data/store"
import { visibleCheers } from "../../data/cheers"
import { givenThisTerm, receivedThisTerm } from "../../data/cheerViews"
import type { Cheer } from "../../data/types"
import { addDays, fmtLong } from "../../lib/dates"
import { CheerDialog } from "./CheerDialog"
import { CheerRow } from "./CheerRow"
import { canSeeEmail, EmailText, EmailToggle } from "./CheerEmail"
import { directionOf, fmtPoints, mondayOf, type Direction } from "./shared"

type Filter = "all" | Direction
const FILTERS: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, { key: "in", label: "Received" }, { key: "out", label: "Sent" }, { key: "cc", label: "Shared with you" }]

/**
 * F3 (R1; R1.1): the viewer's cheers history. Only cheers the viewer is in (`visibleCheers`): sent and received ones grouped by
 * demo week, then those a sender let the viewer know of under "Shared with you" (their points are not the viewer's). Each cheer
 * the viewer sent or received has a small "Email" link that shows the email its recipients got. Cheers cannot be withdrawn (§8.7).
 */
export default function CheerHistory({ onClose }: { onClose: () => void }) {
  const { state } = useStore()
  const viewer = state.viewerId
  const ids = useId()
  const [filter, setFilter] = useState<Filter>("all")
  const [email, setEmail] = useState<string | null>(null)
  const all = visibleCheers(state, viewer)
  const hasShared = all.some(c => directionOf(c, viewer) === "cc")
  const list = all.filter(c => filter === "all" || directionOf(c, viewer) === filter)
  const own = list.filter(c => directionOf(c, viewer) !== "cc"), shared = list.filter(c => directionOf(c, viewer) === "cc")
  const thisWeek = mondayOf(state.today), lastWeek = addDays(thisWeek, -7)
  const groups: { label: string; items: Cheer[] }[] = [
    { label: "This week", items: own.filter(c => c.on >= thisWeek) },
    { label: "Last week", items: own.filter(c => c.on < thisWeek && c.on >= lastWeek) },
    { label: "Earlier", items: own.filter(c => c.on < lastWeek) },
    { label: "Shared with you", items: shared },
  ].filter(g => g.items.length)
  const row = (c: Cheer) => {
    const panel = `${ids}-mail-${c.id}`, open = email === c.id
    const can = canSeeEmail(c, viewer)
    return <CheerRow key={c.id} s={state} c={c} viewerId={viewer} withTask date={fmtLong(c.on)}
      action={can ? <EmailToggle open={open} controls={panel} onToggle={() => setEmail(open ? null : c.id)} /> : undefined}
      extra={can && open ? <EmailText s={state} c={c} viewerId={viewer} id={panel} /> : undefined} />
  }
  return <CheerDialog labelledBy="ch-history-h" onClose={onClose} testId="cheer-history-dialog">
    <div className="ch-mh"><h2 id="ch-history-h">Cheers history</h2><button type="button" className="btn btn-quiet icon-btn ch-x" aria-label="Close history" onClick={onClose}>✕</button></div>
    <div className="ch-stats">
      <div className="ch-stat"><b>{fmtPoints(receivedThisTerm(state, viewer))}</b><span>received this term</span></div>
      <div className="ch-stat"><b>{fmtPoints(givenThisTerm(state, viewer))}</b><span>given this term</span></div>
    </div>
    <div className="ch-seg" role="group" aria-label="Show">{FILTERS.filter(f => f.key !== "cc" || hasShared).map(f => <button key={f.key} type="button" className={`chip${filter === f.key ? " on" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>)}</div>
    {groups.length ? groups.map(g => <section key={g.label} aria-label={g.label}>
      <h3 className="ch-group">{g.label}</h3>
      <ul className="ch-feed">{g.items.map(row)}</ul>
    </section>) : <p className="small muted">Nothing here yet.</p>}
    <p className="small muted ch-privacy">Only the people in each cheer can see it.</p>
  </CheerDialog>
}
