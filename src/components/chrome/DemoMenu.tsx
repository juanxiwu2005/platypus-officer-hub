import { useEffect, useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import { useStore, useViewer } from "../../data/store"
import { getHealth, type Health } from "../../lib/api"
import { fmtLong } from "../../lib/dates"
import { useBts } from "../Bts"

/** Everything about the demo itself lives behind one small pill. */
export function DemoMenu({ onReset }: { onReset: () => void }) {
  const { state, dispatch, reset } = useStore()
  const { canNudge } = useViewer()
  const [open, setOpen] = useState(false)
  const [health, setHealth] = useState<Health | null>(null)
  // Reset wipes everything and sits next to the clock buttons, so it asks once. Not confirm():
  // a native dialog is blocked in Playwright and on some phone browsers.
  const [armed, setArmed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { getHealth().then(setHealth) }, [])
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  useEffect(() => { if (!open) setArmed(false) }, [open])
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", off); window.addEventListener("keydown", esc)
    return () => { document.removeEventListener("mousedown", off); window.removeEventListener("keydown", esc) }
  }, [open])
  const bts = useBts()
  const aiNote = health?.configured ? `AI answers come live from ${health.provider}${health.model ? ` (${health.model})` : ""}.` : "AI answers are simulated."
  return <div className="menu-wrap" ref={ref}>
    <button type="button" className="demo-pill" aria-expanded={open} onClick={() => setOpen(!open)} data-testid="demo-menu">
      Demo · <span data-testid="demo-date">{fmtLong(state.today)}</span>
    </button>
    <div className="menu" hidden={!open} role="group" aria-label="Demo controls">
      <p className="small muted" data-testid="ai-status">Fictional club and example data. {aiNote} Nothing is sent from this page.</p>
      {canNudge && <div className="menu-row"><span className="small">Demo clock</span>{[1, 3, 10].map(days => <button key={days} type="button" className="btn small" data-testid={`clock-${days}`} onClick={() => dispatch({ type: "advanceClock", days })}>+{days} day{days > 1 ? "s" : ""}</button>)}</div>}
      <div className="menu-row">
        {canNudge && <NavLink className="btn small" to="/welcome/classic" onClick={() => setOpen(false)}>Replay walkthrough</NavLink>}
        <label className="switch"><input type="checkbox" checked={bts.on} onChange={e => bts.setOn(e.target.checked)} data-testid="bts-toggle" />Behind the scenes</label>
      </div>
      <button type="button" className={`btn small ${armed ? "btn-primary" : ""}`} data-testid="reset-demo" onClick={() => {
        if (!armed) { setArmed(true); return }
        setArmed(false); reset(); try { window.localStorage.removeItem("platypus.v1.chat") } catch { /* storage unavailable */ } window.dispatchEvent(new Event("platypus:reset")); setOpen(false); onReset()
      }}>{armed ? "Click again to reset" : "Reset demo"}</button>
      {armed && <p className="small muted" role="status">This clears every task, note and reminder in the demo.</p>}
    </div>
  </div>
}
