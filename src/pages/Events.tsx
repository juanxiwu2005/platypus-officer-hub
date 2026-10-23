import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useStore, useSchedule } from "../data/store"
import { PageHead } from "../components/Page"
import { MetroChart } from "../components/flow/MetroChart"
import { useRail } from "../components/rail/RailContext"
import { computeForecast } from "../engine/forecast"
import { daysBetween, fmtShort } from "../lib/dates"
import { topoOrder } from "../engine/schedule"
import { Avatar, Info, NodePill } from "../components/ui"
import { SEVERITY_TONE, firstName, worstIssue } from "./helpers"

type View = "flow" | "list"
const VIEW_KEY = "platypus.v1.eventsView"
function initialView(): View {
  try { const v = window.localStorage.getItem(VIEW_KEY); if (v === "flow" || v === "list") return v } catch { /* storage unavailable */ }
  return "flow"
}
const FOOD = { none: "No food", dining: "Sun Devil Dining", offsite: "Outside caterer", onsite: "Food made on site" }
const FUNDING = { usg: "USG funding", college: "College funding", dues: "Dues", sponsor: "Sponsor", none: "No funding" }

export default function Events() {
  const { state, dispatch } = useStore()
  const sched = useSchedule()
  const rail = useRail()
  const [params, setParams] = useSearchParams()
  const [view, setViewState] = useState<View>(initialView)
  const forecast = useMemo(() => computeForecast(state), [state])
  const ev = state.events.find(e => e.id === params.get("event")) ?? state.events[0]
  const selected = rail.detail?.kind === "node" ? rail.detail.id : null
  const setView = (v: View) => { setViewState(v); try { window.localStorage.setItem(VIEW_KEY, v) } catch { /* storage unavailable */ } }
  const nodes = useMemo(() => state.nodes.filter(n => n.eventId === ev?.id), [state.nodes, ev?.id])
  useEffect(() => { if (ev && params.get("event") && !state.events.some(e => e.id === params.get("event"))) setParams({}, { replace: true }) }, [ev?.id])
  if (!ev) return <><PageHead path="/events" /><p className="empty">No events yet. Ask Platypus to plan one.</p></>

  const evIssues = sched.events[ev.id]?.issues ?? []
  const done = nodes.filter(n => n.status === "done").length
  const red = nodes.filter(n => n.status !== "done" && (worstIssue(sched.nodes[n.id]?.issues)?.severity === "error" || forecast.nodes[n.id]?.color === "red")).length
  const ordered = topoOrder(nodes).order

  return (
    <>
      <PageHead path="/events" actions={state.events.length > 1 && (
        <div className="seg" role="group" aria-label="Choose an event">
          {state.events.map(e => <button key={e.id} type="button" aria-pressed={e.id === ev.id} onClick={() => { setParams({ event: e.id }); rail.closeDetail() }}>{e.name}</button>)}
        </div>
      )} />

      <section className="card event-head" aria-labelledby="ev-title">
        <div className="event-head-row">
          <h2 id="ev-title">{ev.name}</h2>
          <Info>{[ev.venue === "campus" ? "On campus" : "Off campus", FOOD[ev.food], FUNDING[ev.funding], ev.speaker ? "Guest speaker" : null, `About ${ev.headcount} people`].filter(Boolean).join(" · ")}. Dates come from the rule engine; see Help.</Info>
          <input type="date" aria-label="Event date" value={ev.date} data-testid="event-date" onChange={e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && dispatch({ type: "updateEvent", id: ev.id, patch: { date: e.target.value } })} />
          <span className="spacer" />
          <div className="stat-row">
            <div><b className="num">{daysBetween(state.today, ev.date)}</b><span>days left</span></div>
            <div><b className="num">{done}/{nodes.length}</b><span>done</span></div>
            <div className={red ? "late-text" : ""}><b className="num">{red}</b><span>at risk</span></div>
          </div>
        </div>
        {evIssues.length > 0 && <ul className="issues" data-testid="event-issues">{evIssues.map(i => <li key={i.code} className={`issue ${SEVERITY_TONE[i.severity]}`}>{i.text}</li>)}</ul>}
      </section>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "flow"} onClick={() => setView("flow")} data-testid="view-flow">Flow</button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} data-testid="view-list">List</button>
        </div>
      </div>

      {view === "flow" && <MetroChart key={ev.id} state={state} sched={sched} forecast={forecast} eventId={ev.id} selectedId={selected} onSelect={id => rail.show({ kind: "node", id })} />}
      {view === "list" && <section className="card tbl-wrap" data-testid="event-list">
        <table className="tbl">
          <thead><tr><th>Step</th><th>Owner</th><th>Status</th><th>Start</th><th>Due</th><th>ASU</th></tr></thead>
          <tbody>{ordered.map(n => {
            const p = sched.nodes[n.id]
            const issue = worstIssue(p.issues)
            return <tr key={n.id}>
              <td><button type="button" className={`row-btn ${issue?.severity === "error" ? "late-text" : ""}`} onClick={() => rail.show({ kind: "node", id: n.id })} title={issue?.text}>{n.title}</button></td>
              <td><span className="who"><Avatar name={state.people.find(x => x.id === n.ownerId)?.name} size="sm" />{firstName(state, n.ownerId)}</span></td>
              <td><NodePill node={n} small /></td>
              <td className="small num">{fmtShort(p.latestStart)}</td>
              <td className="small num">{fmtShort(p.club)}</td>
              <td className="small num">{p.official ? `ASU ${fmtShort(p.official)}` : ""}</td>
            </tr>
          })}</tbody>
        </table>
      </section>}
    </>
  )
}
