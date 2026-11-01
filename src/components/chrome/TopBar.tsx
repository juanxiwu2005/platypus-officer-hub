import { useEffect, useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import { Logo } from "../icons"
import { useStore } from "../../data/store"
import { useRail } from "../rail/RailContext"
import { DemoMenu } from "./DemoMenu"
import { Bell } from "./Bell"

export function TopBar({ onReset }: { onReset: () => void }) {
  const { state, dispatch } = useStore()
  const rail = useRail()
  // On a phone "View as" and "AI features" live behind a "⋯" button so the top bar is one line (DX-20). On a computer the
  // same two controls stay in the bar exactly where they were: `.controls-extra` is then `display: contents`.
  const [moreOpen, setMoreOpen] = useState(false)
  const moreBox = useRef<HTMLDivElement>(null)
  const moreToggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!moreOpen) return
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!moreBox.current?.contains(t) && !moreToggle.current?.contains(t)) setMoreOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setMoreOpen(false); moreToggle.current?.focus() } }
    document.addEventListener("pointerdown", away); window.addEventListener("keydown", esc)
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc) }
  }, [moreOpen])
  return (
    <header className="topbar">
      <div className="bar-in">
        <NavLink to="/" className="brand">
          <Logo />
          <div>
            <b>Platypus</b>{" "}
            <span>{state.org.name}</span>
          </div>
        </NavLink>
        <div className="controls">
          <DemoMenu onReset={onReset} />
          <div className="controls-extra" id="topbar-more" ref={moreBox} data-open={moreOpen}>
            <p className="more-org">{state.org.name}</p>
            <label className="field-inline view-as">
              <span>View as</span>
              <select value={state.viewerId} onChange={e => { dispatch({ type: "setViewer", viewerId: e.target.value }); setMoreOpen(false) }} data-testid="view-as">
                {state.people.map(p => {
                  const role = state.roles.find(r => r.id === p.roleId)
                  return <option key={p.id} value={p.id}>{p.name} · {role?.displayName}</option>
                })}
              </select>
            </label>
            <label className="switch">
              <input type="checkbox" checked={state.aiEnabled} onChange={e => { dispatch({ type: "setAi", enabled: e.target.checked }); setMoreOpen(false) }} />
              AI features
            </label>
          </div>
          <button type="button" ref={moreToggle} className="btn btn-quiet icon-btn more-toggle" aria-label="More options" aria-expanded={moreOpen} aria-controls="topbar-more" data-testid="more-toggle" onClick={() => setMoreOpen(o => !o)}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4.5" cy="10" r="1.6" fill="currentColor" /><circle cx="10" cy="10" r="1.6" fill="currentColor" /><circle cx="15.5" cy="10" r="1.6" fill="currentColor" /></svg>
          </button>
          <Bell />
          <button type="button" className={`btn ask-toggle ${rail.open ? "on" : ""}`} aria-pressed={rail.open} onClick={() => rail.setOpen(!rail.open)} data-testid="ask-toggle">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 016.5 3h7A2.5 2.5 0 0116 5.5v5a2.5 2.5 0 01-2.5 2.5H9l-3.5 3v-3A2.5 2.5 0 014 10.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            Ask Platypus
          </button>
        </div>
      </div>
    </header>
  )
}
