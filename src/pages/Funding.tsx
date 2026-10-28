import { useState } from "react"
import { useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { useRail } from "../components/rail/RailContext"
import { fmtShort, daysBetween } from "../lib/dates"
import type { Funding } from "../data/types"
import { PLAN_B } from "../engine/playbooks"
import { fundingDecisionDate } from "../engine/schedule"
import { checkPreflight, EMPTY_PACKAGE, type ApplicationPackage } from "../lib/preflight"
import { callApi } from "../lib/api"
import { Chain, Empty, Info, type Stop } from "../components/ui"

export const FUNDING_STAGES = ["Budget request", "Budget approved", "Purchase request", "Purchase approved", "Ordered or reimbursed", "Attendance submitted"]
export const STAGE_IDS = ["budget_request", "budget_approved", "purchase_request", "purchase_approved", "ordered_or_reimbursed", "attendance_submitted"] as const
const HEAD = [["Budget", "request"], ["Budget", "approved"], ["Purchase", "request"], ["Purchase", "approved"], ["Paid or", "reimbursed"], ["Attendance", "submitted"]]

const useEditable = () => {
  const { state } = useStore(); const { canNudge, role } = useViewer()
  return canNudge || (role?.fn === "finance" && role.holderId === state.viewerId)
}

/** Each event's money as one parcel-tracking row (v1.1): six stops, colour shows where it is. */
export default function FundingPage() {
  const { state, dispatch } = useStore()
  const rail = useRail()
  const editable = useEditable()
  const [filter, setFilter] = useState<"all" | "action">("all")
  const events = state.events.filter(e => e.funding !== "none")
  const rows = events.map(e => {
    const f = state.funding.find(x => x.eventId === e.id)
    const at = f ? STAGE_IDS.indexOf(f.stage) : -1
    const decision = fundingDecisionDate(state, e.id)
    const late = !!f && !!decision && state.today >= decision && at < 1
    const spendRisk = !!f && !!f.spendBy && daysBetween(state.today, f.spendBy) <= 14 && (f.amount - (f.spent ?? 0)) > 0 && at >= 1
    return { e, f, at, decision, late: late || spendRisk, action: !f || late || spendRisk || at < 5 }
  }).filter(r => filter === "all" || r.action)
  const total = (k: "amount" | "spent", approvedOnly = false) => state.funding.filter(f => !approvedOnly || STAGE_IDS.indexOf(f.stage) >= 1).reduce((s, f) => s + (k === "amount" ? f.amount : f.spent ?? 0), 0)

  return <>
    <PageHead path="/funding" actions={<div className="seg" role="group" aria-label="Filter"><button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button><button type="button" aria-pressed={filter === "action"} onClick={() => setFilter("action")}>Needs action</button></div>} />
    <section className="card">
      <div className="stat-row">
        <div><b className="num">${total("amount").toLocaleString()}</b><span>Requested</span></div>
        <div><b className="num">${total("amount", true).toLocaleString()}</b><span>Approved</span></div>
        <div><b className="num">${total("spent").toLocaleString()}</b><span>Spent</span></div>
        <span className="spacer" />
        <Info>USG needs food and service requests 10 business days ahead (R09) and speaker requests 14 business days ahead with a signed SAP (R10). From experience, allow 6–8 weeks end to end; that is not official guidance.</Info>
      </div>
    </section>
    <section className="card tbl-wrap" data-testid="funding-table">
      <table className="tbl funding-tbl">
        <thead><tr><th>Event</th><th>Date</th><th className="num">Budget</th>{HEAD.map(([a, b]) => <th key={a + b} className="stage-h"><span>{a}</span><span>{b}</span></th>)}<th>Next</th></tr></thead>
        <tbody>{rows.map(({ e, f, at, decision, late }) => {
          const stops: Stop[] = STAGE_IDS.map((id, i) => ({ key: id, state: !f ? "todo" : i < at ? "done" : i === at ? (late ? "risk" : "now") : "todo", hint: <><b>{FUNDING_STAGES[i]}</b><span className="hc-line">{!f ? "Not started" : i < at ? "Done" : i === at ? `Current${decision ? ` · decide by ${fmtShort(decision)}` : ""}` : "Later"}</span></> }))
          const holder = state.people.find(p => p.id === state.roles.find(r => r.fn === "finance")?.holderId)?.name.split(" ")[0]
          return <tr key={e.id} className="clickable" onClick={() => f && rail.show({ kind: "funding", eventId: e.id })}>
            <td><button type="button" className="row-btn" onClick={ev => { ev.stopPropagation(); if (f) rail.show({ kind: "funding", eventId: e.id }) }}>{e.name}</button></td>
            <td className="small num">{fmtShort(e.date)}</td>
            <td className="num">{f ? `$${f.amount.toLocaleString()}` : "—"}</td>
            <td colSpan={6} className="chain-cell" data-testid="funding-stages"><Chain label={`${e.name} funding`} stops={stops} showLabels={false} compact /></td>
            <td className={`small ${late ? "late-text" : ""}`}>{!f
              ? (editable ? <button type="button" className="btn small" onClick={ev => { ev.stopPropagation(); dispatch({ type: "startFunding", eventId: e.id }) }}>Start</button> : "Not started")
              : at === 5 ? "Closed" : `${holder ?? "Finance"}${decision && at < 1 ? ` · ${fmtShort(decision)}` : ""}`}</td>
          </tr>
        })}</tbody>
      </table>
      {!rows.length && <Empty>Nothing needs action.</Empty>}
    </section>
  </>
}

/** Details for one event's funding, shown in the right rail. */
export function FundingDetail({ eventId }: { eventId: string }) {
  const { state } = useStore()
  const f = state.funding.find(x => x.eventId === eventId)
  return f ? <FundingCard key={eventId} funding={f} /> : <Empty>No funding request yet.</Empty>
}

function FundingCard({ funding: f }: { funding: Funding }) {
  const { state, dispatch } = useStore()
  const editable = useEditable()
  const e = state.events.find(e => e.id === f.eventId)!; const at = STAGE_IDS.indexOf(f.stage)
  const [pack, setPack] = useState<ApplicationPackage>(() => ({ ...EMPTY_PACKAGE, amount: f.amount, attendees: e.headcount, ...f.application }))
  const [result, setResult] = useState<ReturnType<typeof checkPreflight> | null>(null), [label, setLabel] = useState("")
  const decision = fundingDecisionDate(state, e.id), remaining = Math.max(0, f.amount - (f.spent ?? 0))
  const lateSpend = f.spendBy && daysBetween(state.today, f.spendBy) <= 14 && remaining > 0 && at >= 1
  const patch = (key: keyof ApplicationPackage, value: string | number | boolean) => setPack({ ...pack, [key]: value })
  async function check() { dispatch({ type: "fundingPackage", eventId: e.id, application: pack }); try { await callApi("/preflight", pack); setLabel("Checked by the server and the rule book.") } catch { setLabel("Checked locally against R11 and R12.") } setResult(checkPreflight(pack)) }
  return <section className="form-stack funding-detail" aria-label={`Funding for ${e.name}`}>
    <h2>{e.name}</h2>
    <p className="small muted">{f.source.toUpperCase()} · ${f.amount.toLocaleString()}</p>
    <Chain label={`${e.name} funding stages`} stops={FUNDING_STAGES.map((s, i) => ({ key: s, label: s, state: i < at ? "done" : i === at ? "now" : "todo" }))} />
    <button className="btn btn-primary" disabled={!editable || at === 5} onClick={() => dispatch({ type: "advanceFunding", eventId: e.id })}>Confirm current step complete</button>
    <div className="kv">
      <label htmlFor="f-amt">Allocated amount ($)</label><input id="f-amt" type="number" min="0" value={f.amount} disabled={!editable} onChange={x => dispatch({ type: "fundingAmount", eventId: e.id, amount: Number(x.target.value) })} />
      <label htmlFor="f-spent">Spent so far ($)</label><input id="f-spent" type="number" min="0" max={f.amount} value={f.spent ?? 0} disabled={!editable} onChange={x => dispatch({ type: "fundingSpend", eventId: e.id, spent: Number(x.target.value) })} />
      <label htmlFor="f-by">Spend-by date · confirmed by you</label><input id="f-by" type="date" value={f.spendBy ?? ""} disabled={!editable} onChange={x => dispatch({ type: "fundingSpendBy", eventId: e.id, date: x.target.value })} />
    </div>
    <progress value={f.spent ?? 0} max={f.amount || 1} aria-label="Funding used" />
    <p className="small">${remaining.toLocaleString()} left{f.spendBy ? ` · spend by ${fmtShort(f.spendBy)}` : ""}{decision ? ` · Plan B decision ${fmtShort(decision)}` : ""}</p>
    {lateSpend && <p role="status" className="warn-text small">{f.spendBy! < state.today ? "Spend-by date has passed" : "Spend-by date is within 14 days"} with money unspent. Check with the funding office.</p>}
    {decision && state.today >= decision && at < 1 && <aside className="plan-b"><h3>Funding is still unapproved · review Plan B</h3>{PLAN_B.map(b => <p key={b.id}><b>{b.label}</b> · {b.when}</p>)}<p className="small muted">Choose with the president; nothing changes automatically.</p></aside>}
    <details className="more"><summary>Pre-submission check · R11 / R12</summary><fieldset disabled={!editable} className="form-stack"><label><input type="checkbox" checked={pack.flyer} onChange={x => patch("flyer", x.target.checked)} /> Event flyer attached</label><label>Public purpose<input value={pack.publicPurpose} onChange={x => patch("publicPurpose", x.target.value)} /></label><label>Invoice addressed to<input value={pack.invoiceTo} onChange={x => patch("invoiceTo", x.target.value)} /></label><label><input type="checkbox" checked={pack.reimbursement} onChange={x => patch("reimbursement", x.target.checked)} /> Reimbursement request</label><label>Request amount ($)<input type="number" min="0" value={pack.amount} onChange={x => patch("amount", Number(x.target.value))} /></label><label><input type="checkbox" checked={pack.amazon} onChange={x => patch("amazon", x.target.checked)} /> Amazon purchase</label><label>Total meal cost ($)<input type="number" min="0" value={pack.mealCost} onChange={x => patch("mealCost", Number(x.target.value))} /></label><label>Meal attendees (estimate only)<input type="number" min="0" step="1" value={pack.attendees} onChange={x => patch("attendees", Number(x.target.value))} /></label><label><input type="checkbox" checked={pack.businessMealsForm} onChange={x => patch("businessMealsForm", x.target.checked)} /> Business Meals Form attached</label><label><input type="checkbox" checked={pack.attendanceList} onChange={x => patch("attendanceList", x.target.checked)} /> Attendance list attached</label><p className="small muted">Record only whether a list is attached; never upload names.</p><button type="button" className="btn" onClick={check}>Check before submitting</button></fieldset>{result && <div data-testid="preflight-result"><p className="small muted">{label}</p><b>{result.ready ? "Checklist complete · office review still required" : "Resolve these items before submitting"}</b>{result.issues.map(i => <p key={i.field}><a href={result.rules.find(r => r.id === i.ruleId)!.sources[0].url} target="_blank" rel="noreferrer">[{i.ruleId}]</a> {i.text}</p>)}</div>}</details>
  </section>
}
