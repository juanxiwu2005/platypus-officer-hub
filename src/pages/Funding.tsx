import { useStore } from "../data/store"
import { Coming, PageHead } from "../components/Page"
import { fmtShort } from "../lib/dates"
import type { FundingStage } from "../data/types"

const STAGES: { id: FundingStage; label: string }[] = [
  { id: "budget_request", label: "Budget request" },
  { id: "budget_approved", label: "Budget approved" },
  { id: "purchase_request", label: "Purchase request" },
  { id: "purchase_approved", label: "Purchase approved" },
  { id: "ordered_or_reimbursed", label: "Ordered or reimbursed" },
  { id: "attendance_submitted", label: "Attendance submitted" },
]

export default function Funding() {
  const { state } = useStore()
  return (
    <>
      <PageHead path="/funding" lead="USG money moves through six steps. Platypus shows which step each request is on." />
      {state.funding.map(f => {
        const ev = state.events.find(e => e.id === f.eventId)
        const at = STAGES.findIndex(s => s.id === f.stage)
        return (
          <section key={f.eventId} className="card" aria-label={`Funding for ${ev?.name}`}>
            <header>
              <h2>{ev?.name}</h2>
              <span className="small muted num">{f.source.toUpperCase()} · ${f.amount.toLocaleString()}{f.spendBy ? ` · spend by ${fmtShort(f.spendBy)}` : ""}</span>
            </header>
            <ol className="list" data-testid="funding-stages">
              {STAGES.map((s, i) => (
                <li key={s.id}>
                  <span>{i + 1}. {s.label}</span>
                  <span className={`tag ${i < at ? "good" : i === at ? "accent" : ""}`}>{i < at ? "Done" : i === at ? "Current" : "Later"}</span>
                </li>
              ))}
            </ol>
          </section>
        )
      })}
      <Coming wp="WP4" items={["Funding pipeline across all events", "Spend-by alarm so approved money is not lost", "Reimbursement checklist (invoice to ASU, $999 cap, about 3 weeks)"]} />
    </>
  )
}
