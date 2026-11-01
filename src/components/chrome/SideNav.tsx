import { NavLink } from "react-router-dom"
import { Icons } from "../icons"
import { PAGES } from "../../routes"
import { useStore } from "../../data/store"

export function SideNav() {
  const { state } = useStore()
  const openTaskCount = state.nodes.filter(n => n.status !== "done" && (n.ownerId === state.viewerId || (n.status === "unclaimed" && !n.ownerId))).length
  return (
    <nav className="sidenav" aria-label="Sections">
      {PAGES.filter(p => p.group === "main").map(p => (
        <NavLink key={p.path} to={p.path} end={p.path === "/"} title={p.question}>
          {Icons[p.icon]}<span>{p.label}</span>
          {p.path === "/tasks" && openTaskCount > 0 && <span className="count" data-testid="nav-open-tasks">{openTaskCount}<span className="sr-only"> open tasks</span></span>}
        </NavLink>
      ))}
      <div className="group">Reference</div>
      {PAGES.filter(p => p.group === "footer").map(p => (
        <NavLink key={p.path} to={p.path} title={p.question}>
          {Icons[p.icon]}<span>{p.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
