import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useStore, useSchedule } from "../data/store"
import { PageHead } from "../components/Page"
import { Bts, BtsRow, BtsTr } from "../components/Bts"
import { MetroChart } from "../components/flow/MetroChart"
import { hasTeamExecutionTracks } from "../components/flow/teamMetro"
import { useRail } from "../components/rail/RailContext"
import { forecastFor } from "../engine/forecast"
import { daysBetween, fmtShort } from "../lib/dates"
import { topoOrder } from "../engine/schedule"
import { Avatar, Empty, Info, NodePill } from "../components/ui"
import { canCreateEvent, canLead } from "../data/changeReview"
import { isOfficer } from "../data/permissions"
import type { DemoState } from "../data/types"
import { SEVERITY_TONE, firstName, worstIssue } from "./helpers"
import { EventBudget } from "../components/EventBudget"
import { budgetTotal } from "../engine/eventBudget"
import { TaskTypeIcon } from "../components/TaskTypeIcon"
import { asuSentence, isLate, reminderSentence } from "../lib/taskDue"

import { resolvePlanEntry } from "../reminders/planEntry"
import { useTaskAccess } from "../reminders/useTaskAccess"
import { recentPlanEvent, rememberPlanEvent } from "../reminders/planEventPreference"

type View = "flow" | "list" | "budget"
const VIEW_KEY = "platypus.v1.eventsView"
function initialView(): View {
  try { const v = window.localStorage.getItem(VIEW_KEY); if (v === "flow" || v === "list") return v } catch { /* storage unavailable */ }
  return "flow"
}
const FOOD = { none: "No food", dining: "Sun Devil Dining", offsite: "Outside caterer", onsite: "Food made on site", tbd: "Food (how to be decided)" }
const FUNDING = { usg: "USG funding", college: "College funding", dues: "Dues", sponsor: "Sponsor", none: "No funding" }

export default function Events() {
  const { state, dispatch } = useStore()
  const sched = useSchedule()
  const rail = useRail()
  const [params, setParams] = useSearchParams()
  const access = useTaskAccess(params.get("access") ?? "")
  const entry = resolvePlanEntry(state, params, access.grant, access.checking, "events", recentPlanEvent(state))
  const appliedSelection = useRef<string | null>(null)
  const chart = useRef<HTMLDivElement>(null)
  const [savedView, setViewState] = useState<View>(initialView)
  const [editingFlow, setEditingFlow] = useState(false)
  const lead = canLead(state)
  const requestedView = params.get("view")
  const view: View = requestedView === "flow" || requestedView === "list" || requestedView === "budget" ? requestedView : params.has("node") ? "flow" : savedView
  const forecast = forecastFor(state)
  const ev = entry.linked ? entry.event : state.events.find(e => e.id === params.get("event")) ?? state.events[0]
  const eventsByDate = useMemo(() => [...state.events].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)), [state.events])
  const selected = entry.linked && !entry.error && !entry.checking ? entry.node?.id ?? null : rail.detail?.kind === "node" || rail.detail?.kind === "task" ? rail.detail.id : null
  const selectionKey = JSON.stringify([params.get("event"), params.get("node"), params.get("access"), params.get("from")])
  useEffect(() => {
    if (entry.linked && entry.event && !entry.checking && !entry.error && !params.has("event")) {
      const next = new URLSearchParams(params); next.set("event", entry.event.id)
      setParams(next, { replace: true })
    }
  }, [selectionKey, entry.event?.id, entry.checking, entry.error])
  useEffect(() => {
    if (entry.checking || entry.error) {
      appliedSelection.current = null
      if (rail.detail?.kind === "task" || rail.detail?.kind === "node") rail.closeDetail()
    } else if (entry.linked && entry.node) {
      if (appliedSelection.current === selectionKey) return
      appliedSelection.current = selectionKey
      rail.show({ kind: "task", id: entry.node.id })
    } else if (appliedSelection.current !== null) {
      appliedSelection.current = null
      if (rail.detail?.kind === "task") rail.closeDetail()
    }
  }, [selectionKey, entry.checking, entry.error, state.demoLinkKey])
  useEffect(() => {
    if (view !== "flow" || !selected || entry.error || entry.checking) return
    const center = () => {
      const scroller = chart.current?.querySelector<HTMLElement>(".metro")
      const dot = chart.current?.querySelector<HTMLElement>(".is-selected .m-dot")
      if (!scroller || !dot) return
      const frame = scroller.getBoundingClientRect(), point = dot.getBoundingClientRect()
      scroller.scrollBy?.({ left: point.left + point.width / 2 - frame.left - frame.width / 2, behavior: "instant" })
    }
    let second = 0
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(center) })
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(center) : null
    if (chart.current) observer?.observe(chart.current)
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); observer?.disconnect() }
  }, [selected, view, ev?.id, entry.error, entry.checking, rail.open])
  const openNode = (id: string) => {
    const next = new URLSearchParams(params)
    next.set("event", ev!.id); next.set("node", id)
    if (entry.origin) next.set("from", entry.origin.id)
    setParams(next)
    // Clicking the current node should also reopen a deliberately hidden panel.
    if (id === entry.node?.id) rail.show({ kind: "task", id })
  }
  const chooseEvent = (eventId: string) => {
    rememberPlanEvent(state, eventId)
    if (params.has("access") && entry.origin && !entry.origin.eventId) {
      const next = new URLSearchParams(params)
      next.set("event", eventId); next.set("node", entry.origin.id); next.set("from", entry.origin.id)
      setParams(next)
      return
    }
    const next = new URLSearchParams(params)
    for (const key of ["node", "access", "from"]) next.delete(key)
    next.set("event", eventId)
    setParams(next)
    rail.show({ kind: "event", eventId })
  }
  const setView = (v: View) => {
    setViewState(v)
    const next = new URLSearchParams(params)
    next.set("view", v)
    setParams(next, { replace: true })
    if (v !== "budget") try { window.localStorage.setItem(VIEW_KEY, v) } catch { /* storage unavailable */ }
  }
  useEffect(() => { if (ev && !entry.checking && !entry.error) rememberPlanEvent(state, ev.id) }, [ev?.id, state.demoLinkKey, entry.checking, entry.error])
  const nodes = useMemo(() => state.nodes.filter(n => n.eventId === ev?.id), [state.nodes, ev?.id])
  useEffect(() => { if (!entry.linked && ev && params.get("event") && !state.events.some(e => e.id === params.get("event"))) setParams({}, { replace: true }) }, [ev?.id])
  if (entry.checking) return <p role="status">Opening your task in Plan…</p>
  if (entry.error) return <section className="card"><h1>Check your task link</h1><p role="alert">{entry.error}</p><Link to="/events">Open Plan</Link></section>
  if (!ev) return <><PageHead path="/events" actions={<NewEvent />} /><div className="new-event-empty"><Empty>No events yet.</Empty><NewEvent testId="new-event-empty" /></div></>

  const evIssues = sched.events[ev.id]?.issues ?? []
  const done = nodes.filter(n => n.status === "done").length
  const red = nodes.filter(n => n.status !== "done" && (worstIssue(sched.nodes[n.id]?.issues)?.severity === "error" || forecast.nodes[n.id]?.color === "red")).length
  const ordered = topoOrder(nodes).order

  return (
    <div className="events-layout">
      {state.events.length > 1 && <nav className="event-nav" aria-label="Events">
        {eventsByDate.map(e => <button key={e.id} type="button" title={e.name} aria-current={e.id === ev.id ? "page" : undefined} onClick={() => chooseEvent(e.id)}>{e.name}</button>)}
      </nav>}
      <div className="events-content">
        <PageHead path="/events" actions={<>{state.events.length > 1 && (
          <label className="event-picker">
            <span className="sr-only">Choose an event</span>
            <select aria-label="Choose an event" value={ev.id} onChange={e => chooseEvent(e.target.value)}>
              {eventsByDate.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
        )}<NewEvent /></>} />

      <section className="card event-head" aria-labelledby="ev-title">
        <div className="event-head-row">
          <h2 id="ev-title">{ev.name}</h2>
          {ev.workflowRun && <span className="tag" title="The saved workflow version used to create these independent tasks">{ev.workflowRun.templateName} · v{ev.workflowRun.templateVersion}</span>}
          <Info>{[ev.venue === "campus" ? "On campus" : "Off campus", FOOD[ev.food], FUNDING[ev.funding], ev.speaker ? "Guest speaker" : null, `About ${ev.headcount} people`].filter(Boolean).join(" · ")}.{ev.details ? ` ${ev.details}` : ""} Dates come from the rule engine; see Help.</Info>
          <input type="date" aria-label="Event date" value={ev.date} data-testid="event-date" onChange={e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && dispatch({ type: "updateEvent", id: ev.id, patch: { date: e.target.value } })} />
          <span className="spacer" />
          <div className="stat-row">
            <div><b className="num">${budgetTotal(ev.budgetItems).toLocaleString()}</b><span>requested</span></div>
            <div><b className="num">{daysBetween(state.today, ev.date)}</b><span>days left</span></div>
            <div><b className="num">{done}/{nodes.length}</b><span>done</span></div>
            <div className={red ? "late-text" : ""}><b className="num">{red}</b><span>at risk</span></div>
          </div>
        </div>
        {evIssues.length > 0 && <ul className="issues" data-testid="event-issues">{evIssues.map(i => <li key={i.code} className={`issue ${SEVERITY_TONE[i.severity]}`}>{i.text}</li>)}</ul>}
        <BtsRow>
          <Bts label="Data">The event date is the one date a person sets. Every step date below is computed from it.</Bts>
          <Bts label="Rule engine">Each step has an ASU deadline (where a rule sets one), a club deadline and a latest start day, worked out backwards from the event date. Warnings come from the same schedule.</Bts>
          <Bts label="Computed">Days left = event date minus today (calendar days). At risk = steps with a schedule error or a red forecast.</Bts>
        </BtsRow>
      </section>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "flow"} onClick={() => setView("flow")} data-testid="view-flow">Flow</button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} data-testid="view-list">List</button>
          <button type="button" aria-pressed={view === "budget"} onClick={() => setView("budget")} data-testid="view-budget">Budget</button>
        </div>
        {lead && view === "flow" && !hasTeamExecutionTracks(ev, nodes) && <button type="button" className="btn small" aria-pressed={editingFlow} onClick={() => setEditingFlow(editing => !editing)} data-testid="flow-edit-toggle">{editingFlow ? "Done editing" : "Edit flow"}</button>}
      </div>

      {view === "flow" && <BtsRow><Bts label="Computed">{hasTeamExecutionTracks(ev, nodes) ? "Dots follow task dependencies within the saved team tracks. Dates come from the rule engine; select a task for its current progress." : "Each dot's place comes from its dates. Colour: done when finished; risk when its forecast is red; now when it has started or its start day is today or earlier; otherwise to do."}</Bts><Bts label="Forecast">{Math.round((forecast.events[ev.id]?.probability ?? 0) * 100)}% of {forecast.events[ev.id]?.runs.toLocaleString()} simulated runs finish this event on time.</Bts></BtsRow>}
      {view === "flow" && <div className="metro-fade" ref={chart}><MetroChart key={ev.id} state={state} sched={sched} forecast={forecast} eventId={ev.id} selectedId={selected} onSelect={openNode} canEdit={lead && !hasTeamExecutionTracks(ev, nodes)} editing={editingFlow} onEditingChange={setEditingFlow} /></div>}
      {view === "list" && <section className="card tbl-wrap" data-testid="event-list">
        <table className="tbl">
          <thead><tr><th>Step</th><th>Owner</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>{ordered.map(n => {
            const p = sched.nodes[n.id]
            const issue = worstIssue(p.issues)
            const asu = asuSentence(n, p)
            return [<tr key={n.id}>
              <td><button type="button" className={`row-btn task-title ${issue?.severity === "error" ? "late-text" : ""}`} onClick={() => openNode(n.id)} data-testid={`event-step-${n.id}`} title={issue?.text}><TaskTypeIcon node={n} /><span>{n.title}</span></button></td>
              <td><span className="who"><Avatar name={state.people.find(x => x.id === n.ownerId)?.name} size="sm" />{firstName(state, n.ownerId)}</span></td>
              <td><NodePill node={n} small /></td>
              <td className={`small num nowrap ${isLate(n, p.club, state.today) ? "late-text" : ""}`}>{fmtShort(p.club)}</td>
            </tr>,
            <BtsTr key={`${n.id}-bts`} cols={4}>
              <Bts label="Due">{p.explain.club}.{asu ? ` ${asu}` : ""}</Bts>
              <Bts label="Reminder">{reminderSentence(n, p, state.viewerId)}{n.ownerId === state.viewerId ? ` ${p.explain.latestStart}.` : ""}</Bts>
            </BtsTr>]
          })}</tbody>
        </table>
      </section>}
        {view === "budget" && <EventBudget event={ev} />}
      </div>
    </div>
  )
}

/** Why "+ New event" is off for this viewer, in the words of the Settings choice (FB-5); null when they may create events. */
export function newEventBlocked(s: DemoState): string | null {
  if (s.people.some(p => p.id === s.viewerId && !isOfficer(p))) return "Only current officers can create events."
  if (canCreateEvent(s)) return null
  return (s.org.settings.eventCreators ?? "leads") === "chosen" ? "Only the president, VP and officers they choose can create events." : "Only the president or VP can create events."
}

/** "+ New event" (FB-5): opens Ask with the empty event form. No AI box on the page itself (AGENTS.md 7.1). */
function NewEvent({ testId = "new-event" }: { testId?: string }) {
  const { state } = useStore()
  const rail = useRail()
  const why = newEventBlocked(state)
  return <span className="new-event">
    <button type="button" className="btn btn-primary" data-testid={testId} disabled={!!why} aria-describedby={why ? `${testId}-why` : undefined} onClick={() => rail.newEvent()}>+ New event</button>
    {why && <span className="small muted new-event-why" id={`${testId}-why`} data-testid={`${testId}-why`}>{why}</span>}
  </span>
}
