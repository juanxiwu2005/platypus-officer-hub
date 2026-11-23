import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useStore, useSchedule } from "../data/store"
import { PageHead } from "../components/Page"
import { Bts, BtsRow } from "../components/Bts"
import { MetroChart } from "../components/flow/MetroChart"
import { hasTeamExecutionTracks } from "../components/flow/teamMetro"
import { useRail } from "../components/rail/RailContext"
import { forecastFor } from "../engine/forecast"
import { daysBetween, fmtLong } from "../lib/dates"
import { Empty, Info } from "../components/ui"
import { canChangeEvent, canLead, eventBlocked } from "../data/changeReview"
import type { DemoState } from "../data/types"
import { SEVERITY_TONE } from "./helpers"
import { EventBudget } from "../components/EventBudget"
import { budgetTotal } from "../engine/eventBudget"
import { NextUp } from "../components/NextUp"
import { isAtRisk } from "../lib/nextUp"

import { resolvePlanEntry } from "../reminders/planEntry"
import { useTaskAccess } from "../reminders/useTaskAccess"
import { recentPlanEvent, rememberPlanEvent } from "../reminders/planEventPreference"

// The List view was removed in S3 (Juanxi 2026-11-23): Flow is the one way to see the steps; Budget stays.
type View = "flow" | "budget"
const FOOD = { none: "No food", dining: "Sun Devil Dining", offsite: "Outside caterer", onsite: "Food made on site", tbd: "Food (how to be decided)" }
const FUNDING = { usg: "USG funding", college: "College funding", dues: "Dues", sponsor: "Sponsor", none: "No funding" }

export default function Events() {
  const { state, dispatch } = useStore()
  const sched = useSchedule()
  const rail = useRail()
  const [urlParams, setParams] = useSearchParams()
  // A step selected here and then deleted (flow edit, Undo, Reset demo) is not a bad task link: drop its stale node choice.
  // Links that were never shown on this page, or that carry an access grant or return task, are still checked strictly.
  const shownNode = useRef<string | null>(null)
  const staleNode = urlParams.get("node")
  const vanished = !!staleNode && staleNode === shownNode.current && !urlParams.has("access") && !urlParams.has("from") && !state.nodes.some(n => n.id === staleNode)
  const params = useMemo(() => { if (!vanished) return urlParams; const next = new URLSearchParams(urlParams); next.delete("node"); return next }, [urlParams, vanished])
  useEffect(() => { if (vanished) setParams(params, { replace: true }) }, [vanished])
  const access = useTaskAccess(params.get("access") ?? "")
  const entry = resolvePlanEntry(state, params, access.grant, access.checking, "events", recentPlanEvent(state))
  useEffect(() => { if (entry.node && !entry.error) shownNode.current = entry.node.id }, [entry.node?.id, entry.error])
  const appliedSelection = useRef<string | null>(null)
  const chart = useRef<HTMLDivElement>(null)
  const [savedView, setViewState] = useState<View>("flow")
  const [editingFlow, setEditingFlow] = useState(false)
  const lead = canLead(state)
  const requestedView = params.get("view")
  const view: View = requestedView === "flow" || requestedView === "budget" ? requestedView : params.has("node") ? "flow" : savedView
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
  }
  const setView = (v: View) => {
    setViewState(v)
    const next = new URLSearchParams(params)
    next.set("view", v)
    setParams(next, { replace: true })
  }
  useEffect(() => { if (ev && !entry.checking && !entry.error) rememberPlanEvent(state, ev.id) }, [ev?.id, state.demoLinkKey, entry.checking, entry.error])
  const nodes = useMemo(() => state.nodes.filter(n => n.eventId === ev?.id), [state.nodes, ev?.id])
  useEffect(() => { if (!entry.linked && ev && params.get("event") && !state.events.some(e => e.id === params.get("event"))) setParams({}, { replace: true }) }, [ev?.id])
  if (entry.checking) return <p role="status">Opening task…</p>
  if (entry.error) return <section className="card"><h1>Check your task link</h1><p role="alert">{entry.error}</p><Link to="/events">Open Plan</Link></section>
  if (!ev) return <><PageHead path="/events" actions={<NewEvent />} /><div className="new-event-empty"><Empty>No events yet.</Empty><NewEvent testId="new-event-empty" /></div></>

  const evIssues = sched.events[ev.id]?.issues ?? []
  const done = nodes.filter(n => n.status === "done").length
  const red = nodes.filter(n => isAtRisk(state, sched, forecast, n)).length

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
          <Info>{[ev.venue === "campus" ? "On campus" : "Off campus", FOOD[ev.food], FUNDING[ev.funding], ev.speaker ? "Guest speaker" : null, `About ${ev.headcount} people`].filter(Boolean).join(" · ")}.{ev.details ? ` ${ev.details}` : ""}</Info>
          <button type="button" className="btn btn-quiet small" onClick={() => rail.show({ kind: "event", eventId: ev.id })} data-testid="event-details-open">Details</button>
          {!canChangeEvent(state) ? <time dateTime={ev.date} data-testid="event-date-text">{fmtLong(ev.date)}</time>
            : <input type="date" aria-label="Event date" value={ev.date} data-testid="event-date" onChange={e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && dispatch({ type: "updateEvent", id: ev.id, patch: { date: e.target.value } })} />}
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
          <Bts label="Computed">Days left = event date minus today (calendar days). At risk = unfinished steps with a schedule error, a red forecast, Stuck status, or a passed club deadline.</Bts>
        </BtsRow>
      </section>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "flow"} onClick={() => setView("flow")} data-testid="view-flow">Flow</button>
          <button type="button" aria-pressed={view === "budget"} onClick={() => setView("budget")} data-testid="view-budget">Budget</button>
        </div>
        {lead && view === "flow" && !hasTeamExecutionTracks(ev, nodes) && <button type="button" className="btn small" aria-pressed={editingFlow} onClick={() => setEditingFlow(editing => !editing)} data-testid="flow-edit-toggle">{editingFlow ? "Done editing" : "Edit flow"}</button>}
      </div>

      {view === "flow" && <BtsRow><Bts label="Computed">{hasTeamExecutionTracks(ev, nodes) ? "Dots follow task dependencies within the saved team tracks. Dates come from the rule engine; select a task for its current progress." : "Each dot's place comes from its dates. Colour: done when finished; at risk with a schedule error, a red forecast, Stuck status or a passed club deadline; started or due when work began or its start day has come; otherwise not started."}</Bts><Bts label="Forecast">{Math.round((forecast.events[ev.id]?.probability ?? 0) * 100)}% of {forecast.events[ev.id]?.runs.toLocaleString()} simulated runs finish this event on time.</Bts></BtsRow>}
      {view === "flow" && <div className="metro-fade" ref={chart}><MetroChart key={ev.id} state={state} sched={sched} forecast={forecast} eventId={ev.id} selectedId={selected} onSelect={openNode} canEdit={lead && !hasTeamExecutionTracks(ev, nodes)} editing={editingFlow} onEditingChange={setEditingFlow} /></div>}
      {view === "flow" && !editingFlow && <NextUp eventId={ev.id} sched={sched} forecast={forecast} onOpen={openNode} />}
        {view === "budget" && <EventBudget event={ev} />}
      </div>
    </div>
  )
}

/** Why "+ New event" is off for this viewer (FB-5); null when they may create events. The words live in changeReview. */
export const newEventBlocked = (s: DemoState): string | null => eventBlocked(s, "create")

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
