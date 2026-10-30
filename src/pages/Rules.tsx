import { useState } from "react"
import { PageHead } from "../components/Page"
import { Empty, Hover } from "../components/ui"
import { POLICY_RECORDS } from "../policy/catalog"
import { sourceById } from "../policy/query"
import type { PolicyCondition, PolicyPhase, PolicyRecord } from "../policy/types"

const PHASES: { id: PolicyPhase; label: string }[] = [
  { id: "start", label: "Start" }, { id: "plan", label: "Plan" }, { id: "venue", label: "Venue" },
  { id: "special", label: "Special" }, { id: "funding", label: "Funding" }, { id: "close", label: "Close" },
]

const ICON: Record<PolicyPhase, JSX.Element> = {
  start: <><path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6" /><path d="M12 4v6M9 7h6" /></>,
  plan: <><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></>,
  venue: <><path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-5h6v5" /></>,
  special: <><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="5" /></>,
  funding: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  safety: <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />,
  close: <><path d="M4 12h12M12 7l5 5-5 5M20 4v16" /></>,
}

const conditionText = (condition: PolicyCondition) => {
  if (condition.field === "headcount") return `${condition.min ?? ""}+ guests`
  const labels: Partial<Record<PolicyCondition["field"], Record<string, string>>> = {
    onCampus: { true: "On campus" }, food: { provider: "Food provider", onsite: "On-site food" }, alcohol: { true: "Alcohol" },
    paidSpeaker: { true: "Paid speaker" }, musicOrStreaming: { true: "Music / streaming" }, drone: { true: "Drone" },
    raffle: { true: "Prize / raffle" }, travel: { international: "International travel" }, funding: { usg_tempe: "USG Tempe" }, venue: { outdoor: "Outdoor" },
  }
  return labels[condition.field]?.[String(condition.equals)] ?? "When applicable"
}

const timing = (policy: PolicyRecord) => {
  const deadline = policy.deadline
  if (!deadline) return "Check source"
  const days = Math.abs(deadline.daysBeforeEvent)
  const unit = deadline.unit === "business_days" ? "work days" : "days"
  return deadline.kind === "hard" ? `Min ${days} ${unit}` : `Plan ${days} ${unit}`
}

/** Policy catalog view: compact evidence-first cards. Full text stays off the main page. */
export default function Rules() {
  const [phase, setPhase] = useState<PolicyPhase>("plan")
  const policies = POLICY_RECORDS.filter(policy => policy.phase === phase)
  return <>
    <PageHead path="/rules" actions={<div className="seg policy-tabs" role="group" aria-label="Policy phase">{PHASES.map(item => <button key={item.id} type="button" aria-pressed={phase === item.id} onClick={() => setPhase(item.id)}>{item.label}</button>)}</div>} />
    <section className="card policy-card" aria-label={`${PHASES.find(item => item.id === phase)?.label} policies`}>
      {policies.length ? <ul className="policy-list" data-testid={`policies-${phase}`}>
        {policies.map(policy => {
          const source = policy.sources.map(sourceById).find(candidate => candidate?.url)
          const applies = policy.conditions.map(conditionText).join(" · ") || "All events"
          return <li key={policy.id} className="policy-row">
            <svg className="policy-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICON[policy.phase]}</svg>
            <Hover className="policy-text" card={<><b>{policy.id}</b><span className="hc-line">{policy.requirement}</span><span className="hc-line">Sources: {policy.sources.join(", ")}</span><span className="hc-line muted">{policy.status === "needs_live_confirmation" ? "Confirm live source before acting" : "Verified snapshot"}</span></>}>
              <span tabIndex={0}><b>{policy.title}</b><small>{applies}</small></span>
            </Hover>
            <span className={`timing ${policy.deadline?.kind === "hard" ? "hard" : ""}`}>{timing(policy)}</span>
            {source?.url ? <a className="btn small icon-btn" href={source.url} target="_blank" rel="noreferrer" aria-label={`Open source: ${source.title}`} title={source.title}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></a> : <span className="policy-source-missing" title="Live source needs confirmation">?</span>}
          </li>
        })}
      </ul> : <Empty>No checked policy in this phase yet.</Empty>}
    </section>
  </>
}
