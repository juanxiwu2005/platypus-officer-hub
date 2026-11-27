import { lazy, Suspense, useState, type CSSProperties } from "react"
import { useStore } from "../../data/store"
import { allowanceOf, canSendCheers, visibleCheers } from "../../data/cheers"
import { receivedThisTerm } from "../../data/cheerViews"
import { useRail } from "../rail/RailContext"
import { CheerRow } from "./CheerRow"
import { directionOf, fmtPoints } from "./shared"
import "../../styles/ch-01-cheers.css"

const CheerHistory = lazy(() => import("./CheerHistory"))

/**
 * F1 (R1): the viewer's own cheers on Team, in place of the Contributions board. Private: it shows only cheers the viewer
 * sent or received, the viewer's term total and their allowance this week. Cheers a sender let the viewer know of (R1.1) are
 * not the viewer's own, so they are only in the history, under "Shared with you".
 */
export function YourCheers() {
  const { state } = useStore()
  const rail = useRail()
  const viewer = state.viewerId
  const [history, setHistory] = useState(false)
  const visible = visibleCheers(state, viewer)
  const list = visible.filter(c => directionOf(c, viewer) !== "cc")
  const canSend = canSendCheers(state, viewer)
  const allowance = allowanceOf(state, viewer)
  const fill = allowance.total > 0 ? Math.max(0, Math.min(1, allowance.left / allowance.total)) : 0
  const give = canSend && <button type="button" className="btn btn-primary small" data-testid="cheer-give" onClick={() => rail.show({ kind: "cheer" })}><span aria-hidden="true">🙌</span> Give points</button>
  const historyButton = <button type="button" className="btn small" data-testid="cheer-history" onClick={() => setHistory(true)}>View history</button>
  return <section className="card ch-mine" aria-labelledby="ch-mine-h" data-testid="your-cheers">
    <header><h2 id="ch-mine-h">Your cheers</h2><span className="small muted">Only you see this</span></header>
    {list.length ? <>
      <div className="ch-stats">
        <div className="ch-stat" data-testid="cheer-received"><b>{fmtPoints(receivedThisTerm(state, viewer))}</b><span>received this term</span></div>
        {canSend && <div className="ch-stat" data-testid="cheer-left"><b>{fmtPoints(allowance.left)}<small> / {fmtPoints(allowance.total)}</small></b><span>left this week</span>
          <div className="ch-meter" role="meter" aria-label="Points left this week" aria-valuemin={0} aria-valuemax={allowance.total} aria-valuenow={allowance.left}><i style={{ "--ch-fill": fill } as CSSProperties} /></div>
        </div>}
      </div>
      <ul className="ch-feed" data-testid="cheer-latest">{list.slice(0, 3).map(c => <CheerRow key={c.id} s={state} c={c} viewerId={viewer} compact />)}</ul>
      <div className="ch-actions">{historyButton}{give}</div>
    </> : <div className="ch-empty"><p className="small muted">No cheers yet.</p>{(visible.length > 0 || give) && <span className="ch-actions">{visible.length > 0 && historyButton}{give}</span>}</div>}
    {history && <Suspense fallback={null}><CheerHistory onClose={() => setHistory(false)} /></Suspense>}
  </section>
}
