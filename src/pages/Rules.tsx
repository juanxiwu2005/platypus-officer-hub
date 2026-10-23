import { useState } from "react"
import { RULES, RULE_CATEGORIES } from "../data/rules"
import { PageHead } from "../components/Page"
import { useRail } from "../components/rail/RailContext"
import { Hover } from "../components/ui"
import type { Rule } from "../data/types"

const ICON: Record<Rule["category"], JSX.Element> = {
  venue: <path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6" />,
  food: <path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M16 3c-2 0-3 3-3 6s1 4 3 4v8" />,
  money: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  marketing: <path d="M4 10v4h3l6 4V6L7 10zM16 9a4 4 0 010 6" />,
  compliance: <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />,
  transition: <path d="M4 12h12M12 7l5 5-5 5M20 4v16" />,
}
const TABS: { id: "all" | Rule["category"]; label: string }[] = [{ id: "all", label: "All" }, ...RULE_CATEGORIES.map(c => ({ id: c.id, label: c.id === "venue" ? "Venue" : c.id === "compliance" ? "Safety" : c.id === "transition" ? "Handoff" : c.label }))]

/** One line per rule, a timing chip, and a button that opens the official page directly (v1.1). */
export default function Rules() {
  const rail = useRail()
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all")
  const rules = RULES.filter(r => tab === "all" || r.category === tab)
  return <>
    <PageHead path="/rules" actions={<div className="seg" role="group" aria-label="Rule category">{TABS.map(t => <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>} />
    <section className="card">
      {rules.length ? <ul className="rule-list" data-testid={`rules-${tab}`}>
        {rules.map(r => <li key={r.id} className="rule-row">
          <svg className="rule-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICON[r.category]}</svg>
          <Hover className="rule-text" card={<><b>{r.id}</b><span className="hc-line">{r.text}</span>{r.limit !== "—" && <span className="hc-line">Timing: {r.limit}</span>}{r.note && <span className="hc-line">{r.note}</span>}<span className="hc-line muted">Checked {r.checkedOn}</span></>}>
            <span tabIndex={0}>{r.short ?? r.text}</span>
          </Hover>
          {r.timing ? <span className="timing">{r.timing}</span> : <span />}
          <span className="rule-actions">
            {r.sources.map(s => <a key={s.url} className="btn small icon-btn" href={s.url} target="_blank" rel="noreferrer" aria-label={`Open source: ${s.label}`} title={s.label}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></a>)}
            <button type="button" className="btn small icon-btn" aria-label={`Ask about ${r.id}`} title="Ask Platypus about this rule" onClick={() => rail.ask(`What does ${r.id} mean for us? (${r.short ?? r.text})`, true)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 016.5 3h7A2.5 2.5 0 0116 5.5v5a2.5 2.5 0 01-2.5 2.5H9l-3.5 3v-3A2.5 2.5 0 014 10.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg></button>
          </span>
        </li>)}
      </ul> : <p className="empty">No checked official rule here. Ask Student Organizations.</p>}
    </section>
  </>
}
