import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { PAGES, PLAN_PAGES } from "../routes"

/** Page header (v1.1): the page name only, plus optional actions on the right. The page's question is the nav tooltip. */
export function PageHead({ path, title, actions }: { path: string; title?: string; actions?: ReactNode }) {
  const page = PAGES.find(p => p.path === path)
  return (
    <div className="page-head">
      <div className="page-title">
        <h1>{title ?? page?.title ?? page?.label}</h1>
        {PLAN_PAGES.some(p => p.path === path) && <PlanSwitch current={path} />}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

/** FB-8: Events and Tasks are the two halves of Plan. The same switch (two links, not a new page) sits at the left of both page heads. */
function PlanSwitch({ current }: { current: string }) {
  return <nav className="plan-switch" aria-label="Plan" data-testid="plan-switch">
    {PLAN_PAGES.map(p => <Link key={p.path} to={p.path} aria-current={p.path === current ? "page" : undefined}>{p.label}</Link>)}
  </nav>
}
