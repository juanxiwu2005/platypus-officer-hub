import { NavLink } from "react-router-dom"
import { Logo } from "../icons"
import { useStore } from "../../data/store"
import { useRail } from "../rail/RailContext"
import { DemoMenu } from "./DemoMenu"
import { Bell } from "./Bell"

export function TopBar({ onReset }: { onReset: () => void }) {
  const { state, dispatch } = useStore()
  const rail = useRail()
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
  )
}
