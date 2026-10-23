import { useEffect, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { Icons, Logo } from "./icons"
import { PAGES } from "../routes"
import { useStore } from "../data/store"
import { getHealth, type Health } from "../lib/api"
import { fmtLong } from "../lib/dates"

export function Layout() {
  const { state, dispatch, reset } = useStore()
  const [health, setHealth] = useState<Health | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getHealth().then(setHealth)
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const aiNote = health?.configured
    ? `AI answers come live from ${health.provider}${health.model ? ` (${health.model})` : ""}.`
    : "AI answers are simulated."

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
            <label className="field-inline">
              View as
              <select
                value={state.viewerId}
                onChange={e => dispatch({ type: "setViewer", viewerId: e.target.value })}
                data-testid="view-as"
              >
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
          </div>
        </div>
        <div className="demo-strip">
          <div className="bar-in">
            <b>Prototype v1 · in development</b>
            <span data-testid="demo-date">Demo date: {fmtLong(state.today)}.</span>
            <span data-testid="ai-status">Fictional organization and example data. {aiNote} No message is sent from this page.</span>
            <span className="spacer" />
            <button className="btn btn-quiet small" type="button" disabled title="Arrives in WP4">Replay setup</button>
            <button
              className="btn btn-quiet small"
              type="button"
              data-testid="reset-demo"
              onClick={() => { reset(); setToast("Demo data reset") }}
            >
              Reset demo
            </button>
          </div>
        </div>
      </header>

      <div className="shell">
        <nav className="sidenav" aria-label="Sections">
          {PAGES.filter(p => p.group === "main").map(p => (
            <NavLink key={p.path} to={p.path} end={p.path === "/"}>
              {Icons[p.icon]}<span>{p.label}</span>
            </NavLink>
          ))}
          <div className="group">More</div>
          {PAGES.filter(p => p.group === "footer").map(p => (
            <NavLink key={p.path} to={p.path}>
              {Icons[p.icon]}<span>{p.label}</span>
            </NavLink>
          ))}
        </nav>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}
