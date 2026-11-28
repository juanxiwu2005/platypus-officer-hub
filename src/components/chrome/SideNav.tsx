import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { Icons } from "../icons"
import { PAGES, PLAN_PAGES, isCurrent, planEntryPath, rememberPlanView, type PageDef } from "../../routes"
import { useStore, useViewer } from "../../data/store"
import { myOpenWorkCount } from "../../data/myWork"
import { prefersReducedMotion } from "../../lib/motion"

/**
 * Primary pages include Team. More only renders when it has active items; archived Partners and Help have no navigation entry.
 * Settings stays at the bottom. The same list is the phone's scrolling strip (DX-20).
 */
export function SideNav() {
  const { state } = useStore()
  const { person } = useViewer()
  const { pathname } = useLocation()
  // The same number as the open rows of Tasks > My tasks (src/data/myWork.ts), which the Plan item opens.
  const openTaskCount = myOpenWorkCount(state, person.id)
  // Plan opens Tasks, or the half of Plan last chosen in this tab (on Plan itself, the half on screen).
  useEffect(() => { rememberPlanView(pathname) }, [pathname])
  const planTo = PLAN_PAGES.some(p => p.path === pathname) ? pathname : planEntryPath()
  // The number gives a small pop each time it changes (not when the page first draws), DX-25.
  const lastCount = useRef(openTaskCount)
  const [pops, setPops] = useState(0)
  useLayoutEffect(() => {
    if (lastCount.current === openTaskCount) return
    lastCount.current = openTaskCount
    if (!prefersReducedMotion()) setPops(n => n + 1)
  }, [openTaskCount])
  const more = PAGES.filter(p => p.group === "more")
  const inMore = more.some(p => isCurrent(p, pathname))
  const [moreOpen, setMoreOpen] = useState(inMore)
  useEffect(() => { if (inMore) setMoreOpen(true) }, [inMore])
  const moreId = useId()
  const item = (p: PageDef) => {
    const current = isCurrent(p, pathname)
    const plan = p.path === "/events"
    return <Link key={p.path} to={plan ? planTo : p.path} title={p.question} aria-current={current ? "page" : undefined} className={current ? "active" : undefined}>
      {Icons[p.icon]}<span>{p.label}</span>
      {plan && openTaskCount > 0 && <span key={pops} className={`count${pops ? " is-pop" : ""}`} data-testid="nav-open-tasks">{openTaskCount}<span className="sr-only"> open tasks</span></span>}
    </Link>
  }
  return (
    <nav className="sidenav" aria-label="Sections">
      {PAGES.filter(p => p.group === "main").map(item)}
      {!!more.length && <><button type="button" className="nav-more" aria-expanded={moreOpen} aria-controls={moreId} data-testid="nav-more" onClick={() => setMoreOpen(o => !o)}>
        {Icons.more}<span>More</span><span className="caret" aria-hidden="true" />
      </button>
      <div id={moreId} className="nav-more-items" hidden={!moreOpen}>{more.map(item)}</div></>}
      <div className="group">Reference</div>
      {PAGES.filter(p => p.group === "footer").map(p => (
        <NavLink key={p.path} to={p.path} title={p.question}>
          {Icons[p.icon]}<span>{p.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
