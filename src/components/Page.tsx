import type { ReactNode } from "react"
import { PAGES } from "../routes"

/** Page header (v1.1): the page name only, plus optional actions on the right. The page's question is the nav tooltip. */
export function PageHead({ path, title, actions }: { path: string; title?: string; actions?: ReactNode }) {
  const page = PAGES.find(p => p.path === path)
  return (
    <div className="page-head">
      <h1>{title ?? page?.label}</h1>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
