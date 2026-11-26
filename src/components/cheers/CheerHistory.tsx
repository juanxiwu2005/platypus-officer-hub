import { useState } from "react"
import { useStore } from "../../data/store"
import { givenThisTerm, receivedThisTerm, visibleCheers } from "../../data/cheers"
import type { Cheer } from "../../data/types"
import { addDays, fmtLong } from "../../lib/dates"
import { CheerDialog } from "./CheerDialog"
import { CheerRow } from "./CheerRow"
import { directionOf, mondayOf, toast } from "./shared"

type Filter = "all" | "in" | "out"
const FILTERS: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, { key: "in", label: "Received" }, { key: "out", label: "Sent" }]

/**
 * F3 (R1): the viewer's cheers history. Only cheers the viewer sent or received (`visibleCheers`), grouped by demo week.
 * The sender may withdraw a cheer on the day it was sent.
 */
export default function CheerHistory({ onClose }: { onClose: () => void }) {
  const { state, tryDispatch } = useStore()
  const viewer = state.viewerId
  const [filter, setFilter] = useState<Filter>("all")
  const [note, setNote] = useState("")
  const list = visibleCheers(state, viewer).filter(c => filter === "all" || directionOf(c, viewer) === filter)
  const thisWeek = mondayOf(state.today), lastWeek = addDays(thisWeek, -7)
  const groups: { label: string; items: Cheer[] }[] = [
    { label: "This week", items: list.filter(c => c.on >= thisWeek) },
    { label: "Last week", items: list.filter(c => c.on < thisWeek && c.on >= lastWeek) },
    { label: "Earlier", items: list.filter(c => c.on < lastWeek) },
  ].filter(g => g.items.length)
  const withdraw = (c: Cheer) => {
    const ok = tryDispatch({ type: "cheerAction", action: { kind: "withdraw", id: c.id } })
    setNote(ok ? "" : "This cheer was not withdrawn. Please try again.")
    if (ok) toast("Cheer withdrawn.")
  }
  return <CheerDialog labelledBy="ch-history-h" onClose={onClose} testId="cheer-history-dialog">
    <div className="ch-mh"><h2 id="ch-history-h">Cheers history</h2><button type="button" className="btn btn-quiet icon-btn ch-x" aria-label="Close history" onClick={onClose}>✕</button></div>
    <div className="ch-stats">
      <div className="ch-stat"><b>{receivedThisTerm(state, viewer)}</b><span>received this term</span></div>
      <div className="ch-stat"><b>{givenThisTerm(state, viewer)}</b><span>given this term</span></div>
    </div>
    <div className="ch-seg" role="group" aria-label="Show">{FILTERS.map(f => <button key={f.key} type="button" className={`chip${filter === f.key ? " on" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>)}</div>
    {groups.length ? groups.map(g => <section key={g.label} aria-label={g.label}>
      <h3 className="ch-group">{g.label}</h3>
      <ul className="ch-feed">{g.items.map(c => <CheerRow key={c.id} s={state} c={c} viewerId={viewer} withTask date={fmtLong(c.on)}
        action={c.fromId === viewer && c.on === state.today ? <button type="button" className="btn btn-quiet small ch-withdraw" data-testid="cheer-withdraw" onClick={() => withdraw(c)}>Withdraw</button> : undefined} />)}</ul>
    </section>) : <p className="small muted">Nothing here yet.</p>}
    {note && <p className="small" role="alert">{note}</p>}
    <p className="small muted ch-privacy">Only you and the other person in each cheer can see it.</p>
  </CheerDialog>
}

