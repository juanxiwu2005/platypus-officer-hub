import { lazy, Suspense, useState, type CSSProperties } from "react"
import { useStore } from "../../data/store"
import { allowanceOf, canSendCheers, receivedThisTerm, visibleCheers } from "../../data/cheers"
import { useRail } from "../rail/RailContext"
import { CheerRow } from "./CheerRow"
import "../../styles/ch-01-cheers.css"

const CheerHistory = lazy(() => import("./CheerHistory"))

/**
 * F1 (R1): the viewer's own cheers on Team, in place of the Contributions board. Private: it shows only cheers the viewer
 * sent or received, the viewer's term total and their allowance this week.
 */
export function YourCheers() {
  const { state } = useStore()
  const rail = useRail()
  const viewer = state.viewerId
  const [history, setHistory] = useState(false)
  const list = visibleCheers(state, viewer)
  const canSend = canSendCheers(state, viewer)
  const allowance = allowanceOf(state, viewer)
  const fill = allowance.total > 0 ? Math.max(0, Math.min(1, allowance.left / allowance.total)) : 0
  const give = canSend && <button type="button" className="btn btn-primary small" data-testid="cheer-give" onClick={() => rail.show({ kind: "cheer" })}><span aria-hidden="true">🙌</span> Give points</button>
  return <section className="card ch-mine" aria-labelledby="ch-mine-h" data-testid="your-cheers">
    <header><h2 id="ch-mine-h">Your cheers</h2><span className="small muted">Only you see this</span></header>
    {list.length ? <>
      <div className="ch-stats">
        <div className="ch-stat" data-testid="cheer-received"><b>{receivedThisTerm(state, viewer)}</b><span>received this term</span></div>
        {canSend && <div className="ch-stat" data-testid="cheer-left"><b>{allowance.left}<small> / {allowance.total}</small></b><span>left this week</span>
          <div className="ch-meter" role="meter" aria-label="Points left this week" aria-valuemin={0} aria-valuemax={allowance.total} aria-valuenow={allowance.left}><i style={{ "--ch-fill": fill } as CSSProperties} /></div>
        </div>}
      </div>
      <ul className="ch-feed" data-testid="cheer-latest">{list.slice(0, 3).map(c => <CheerRow key={c.id} s={state} c={c} viewerId={viewer} compact />)}</ul>
      <div className="ch-actions"><button type="button" className="btn small" data-testid="cheer-history" onClick={() => setHistory(true)}>View history</button>{give}</div>
    </> : <div className="ch-empty"><p className="small muted">No cheers yet.</p>{give}</div>}
    {history && <Suspense fallback={null}><CheerHistory onClose={() => setHistory(false)} /></Suspense>}
  </section>
}
