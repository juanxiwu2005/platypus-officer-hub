import { useLayoutEffect, useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import { Icons } from "../icons"
import { PAGES } from "../../routes"
import { useStore } from "../../data/store"
import { prefersReducedMotion } from "../../lib/motion"

export function SideNav() {
  const { state } = useStore()
  const openTaskCount = state.nodes.filter(n => n.status !== "done" && (n.ownerId === state.viewerId || (n.status === "unclaimed" && !n.ownerId))).length
  // The number gives a small pop each time it changes (not when the page first draws), DX-25.
  const lastCount = useRef(openTaskCount)
  const [pops, setPops] = useState(0)
  useLayoutEffect(() => {
    if (lastCount.current === openTaskCount) return
    lastCount.current = openTaskCount
    if (!prefersReducedMotion()) setPops(n => n + 1)
  }, [openTaskCount])
  return (
    <nav className="sidenav" aria-label="Sections">
      {PAGES.filter(p => p.group === "main").map(p => (
        <NavLink key={p.path} to={p.path} end={p.path === "/"} title={p.question}>
          {Icons[p.icon]}<span>{p.label}</span>
          {p.path === "/tasks" && openTaskCount > 0 && <span key={pops} className={`count${pops ? " is-pop" : ""}`} data-testid="nav-open-tasks">{openTaskCount}<span className="sr-only"> open tasks</span></span>}
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
