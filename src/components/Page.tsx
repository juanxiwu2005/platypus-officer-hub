import type { ReactNode } from "react"
import { PAGES } from "../routes"

/** Standard page header: eyebrow (page name), the question the page answers, one line of context. */
export function PageHead({ path, lead }: { path: string; lead?: ReactNode }) {
  const page = PAGES.find(p => p.path === path)
  return (
    <div className="page-head">
      <div className="eyebrow">{page?.label}</div>
      <h1>{page?.question}</h1>
      {lead && <p className="muted">{lead}</p>}
    </div>
  )
}

/** Dashed card listing what a later work package will add to this page. */
export function Coming({ wp, items }: { wp: string; items: string[] }) {
  return (
    <section className="card coming" aria-label={`Coming in ${wp}`}>
      <span className="tag accent">Coming in {wp}</span>
      <ul>
        {items.map(i => <li key={i}>{i}</li>)}
      </ul>
    </section>
  )
}
