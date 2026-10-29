import { useEffect, useRef, useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Icons, Logo } from "./icons"
import { PAGES } from "../routes"
import { useStore, useViewer } from "../data/store"
import { getHealth, type Health } from "../lib/api"
import { fmtLong } from "../lib/dates"
import { RailProvider, useRail } from "./rail/RailContext"
import { BtsProvider, useBts } from "./Bts"
import { Rail } from "./rail/Rail"
import { PrivateInbox } from "./PrivateInbox"

export function Layout() {
  return <BtsProvider><RailProvider><Frame /></RailProvider></BtsProvider>
}

function Frame() {
  const { state, dispatch } = useStore()
  const rail = useRail()
  const location = useLocation()
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])
  // A new page starts with Ask, not with the last page's details.
  const lastPath = useRef(location.pathname)
  useEffect(() => {
    if (lastPath.current !== location.pathname) {
      if (rail.detail && rail.detail.kind !== "task") rail.closeDetail()
      // On a phone or tablet the panel covers the page, so a new page starts with it closed — except right after a
      // new event, whose plan check is about to appear in Ask (M2b), and a link straight to a task (?node=), whose details
      // the Tasks page opens in this same render pass (rail.detail is still the old value here).
      if (!window.matchMedia?.("(min-width: 1200px)").matches && !location.search.includes("node=") && !rail.reviewEventId) rail.setOpen(false)
    }
    lastPath.current = location.pathname
  }, [location.pathname])

  return (
    <>
      <header className="topbar">
        <div className="bar-in">
          <NavLink to="/" className="brand" aria-label="Platypus home">
            <Logo />
            <div>
              <b>Platypus</b>
              <span>{state.org.name}</span>
            </div>
          </NavLink>
          <div className="controls">
            <DemoMenu onReset={() => setToast("Demo data reset")} />
            <label className="field-inline view-as">
              <span>View as</span>
              <select value={state.viewerId} onChange={e => dispatch({ type: "setViewer", viewerId: e.target.value })} data-testid="view-as">
                {state.people.map(p => {
                  const role = state.roles.find(r => r.id === p.roleId)
                  return <option key={p.id} value={p.id}>{p.name} · {role?.displayName}</option>
                })}
              </select>
            </label>
            <label className="switch">
              <input type="checkbox" checked={state.aiEnabled} onChange={e => dispatch({ type: "setAi", enabled: e.target.checked })} />
              AI features
            </label>
            <Bell />
            <button type="button" className={`btn ask-toggle ${rail.open ? "on" : ""}`} aria-pressed={rail.open} onClick={() => rail.setOpen(!rail.open)} data-testid="ask-toggle">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 016.5 3h7A2.5 2.5 0 0116 5.5v5a2.5 2.5 0 01-2.5 2.5H9l-3.5 3v-3A2.5 2.5 0 014 10.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              Ask Platypus
            </button>
          </div>
        </div>
      </header>

      <div className={`shell${rail.open ? " with-rail" : ""}`}>
        <nav className="sidenav" aria-label="Sections">
          {PAGES.filter(p => p.group === "main").map(p => (
            <NavLink key={p.path} to={p.path} end={p.path === "/"} title={p.question}>
              {Icons[p.icon]}<span>{p.label}</span>
            </NavLink>
          ))}
          <div className="group" aria-hidden="true" />
          {PAGES.filter(p => p.group === "footer").map(p => (
            <NavLink key={p.path} to={p.path} title={p.question}>
              {Icons[p.icon]}<span>{p.label}</span>
            </NavLink>
          ))}
        </nav>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
        {rail.open && <Rail />}
      </div>
      {!rail.open && <button type="button" className="ask-fab" onClick={() => rail.setOpen(true)} aria-label="Ask Platypus">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 016.5 3h7A2.5 2.5 0 0116 5.5v5a2.5 2.5 0 01-2.5 2.5H9l-3.5 3v-3A2.5 2.5 0 014 10.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </button>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}

/** Everything about the demo itself lives behind one small pill. */
function DemoMenu({ onReset }: { onReset: () => void }) {
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
        {canNudge && <NavLink className="btn small" to="/setup" onClick={() => setOpen(false)}>Replay setup</NavLink>}
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

function Bell() {
  const { state } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = state.notifications.filter(n => n.recipientId === state.viewerId && !n.read).length
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", off)
    return () => document.removeEventListener("mousedown", off)
  }, [open])
  return <div className="menu-wrap" ref={ref}>
    <button type="button" className="btn btn-quiet icon-btn bell" aria-label={`Private updates, ${unread} unread`} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="bell">
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 14V9a5 5 0 0110 0v5l1.5 1.5h-13zM8.5 17.5a1.6 1.6 0 003 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      {unread > 0 && <span className="badge">{unread}</span>}
    </button>
    <div className="menu wide" hidden={!open}><PrivateInbox onPick={() => setOpen(false)} /></div>
  </div>
}
