import { useCallback, useMemo, useState } from "react"
import { useStore, useSchedule } from "../data/store"
import { Coming, PageHead } from "../components/Page"
import { FlowChart } from "../components/flow/FlowChart"
import { Gantt } from "../components/flow/Gantt"
import { lanes } from "../components/flow/layout"
import { NodePanel } from "../components/NodePanel"
import { daysBetween, fmtLong, fmtShort } from "../lib/dates"
import { SEVERITY_TONE, firstName, statusOf, worstIssue } from "./helpers"

type View = "flow" | "gantt" | "list"
const VIEW_KEY = "platypus.v1.eventsView"

function initialView(): View {
  try {
    const v = window.localStorage.getItem(VIEW_KEY)
    if (v === "flow" || v === "gantt" || v === "list") return v
  } catch {
    /* storage unavailable */
  }
  return typeof window !== "undefined" && window.matchMedia?.("(max-width: 860px)").matches ? "list" : "flow"
}

const FOOD = { none: "No food", dining: "Sun Devil Dining", offsite: "Outside caterer", onsite: "Food made on site" }
const FUNDING = { usg: "USG funding", college: "College funding", dues: "Dues", sponsor: "Sponsor", none: "No funding" }

export default function Events() {
  const { state, dispatch } = useStore()
  const sched = useSchedule()
  const [eventId, setEventId] = useState(state.events[0]?.id ?? "")
  const [view, setViewState] = useState<View>(initialView)
  const [selected, setSelected] = useState<string | null>(null)
  const ev = state.events.find(e => e.id === eventId) ?? state.events[0]
  const onSelect = useCallback((id: string) => setSelected(id), [])
  const onClose = useCallback(() => setSelected(null), [])

  const setView = (v: View) => {
    setViewState(v)
    try {
      window.localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* storage unavailable */
    }
  }

  const nodes = useMemo(() => state.nodes.filter(n => n.eventId === ev?.id), [state.nodes, ev?.id])
  if (!ev) return <PageHead path="/events" lead="No events yet." />
  const evIssues = sched.events[ev.id]?.issues ?? []
  const done = nodes.filter(n => n.status === "done").length
  const red = nodes.filter(n => worstIssue(sched.nodes[n.id]?.issues)?.severity === "error").length
  const amber = nodes.filter(n => worstIssue(sched.nodes[n.id]?.issues)?.severity === "warn").length

  return (
    <>
      <PageHead path="/events" lead="Each event is a flow: one owner per step, three deadlines, and who waits on whom. Click a step to edit it." />

      {state.events.length > 1 && (
        <div className="seg" role="group" aria-label="Choose an event">
          {state.events.map(e => (
            <button key={e.id} type="button" aria-pressed={e.id === ev.id} onClick={() => { setEventId(e.id); setSelected(null) }}>
              {e.name} <span className="muted small">{fmtShort(e.date)}</span>
            </button>
          ))}
        </div>
      )}

      <section className="card event-head" aria-labelledby="ev-title">
        <header>
          <div>
            <h2 id="ev-title">{ev.name}</h2>
            <div className="chips small muted">
              <span>{ev.venue === "campus" ? "On campus" : "Off campus"}</span>
              <span>{FOOD[ev.food]}</span>
              <span>{FUNDING[ev.funding]}</span>
              {ev.speaker && <span>Guest speaker</span>}
              <span>About {ev.headcount} people</span>
            </div>
          </div>
          <label className="field-inline">
            Event date
            <input type="date" value={ev.date} data-testid="event-date"
              onChange={e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && dispatch({ type: "updateEvent", id: ev.id, patch: { date: e.target.value } })} />
          </label>
        </header>
        <div className="event-stats">
          <span><b className="num">{daysBetween(state.today, ev.date)}</b> days away</span>
          <span><b className="num">{done}/{nodes.length}</b> steps done</span>
          <span className={red ? "late-text" : ""}><b className="num">{red}</b> red</span>
          <span className={amber ? "warn-text" : ""}><b className="num">{amber}</b> amber</span>
        </div>
        {evIssues.length > 0 && (
          <ul className="issues" data-testid="event-issues">
            {evIssues.map(i => <li key={i.code} className={`issue ${SEVERITY_TONE[i.severity]}`}>{i.text}</li>)}
          </ul>
        )}
      </section>

      <div className="view-bar">
        <div className="seg" role="group" aria-label="View">
          {(["flow", "gantt", "list"] as View[]).map(v => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} data-testid={`view-${v}`}>
              {v === "flow" ? "Flow chart" : v === "gantt" ? "Gantt" : "List"}
            </button>
          ))}
        </div>
        <div className="legend small muted" aria-label="Legend">
          <span><i className="lg st-done" />Done</span>
          <span><i className="lg st-in_progress" />In progress</span>
          <span><i className="lg st-waiting" />Waiting</span>
          <span><i className="lg st-proposed" />Not claimed yet</span>
          <span><i className="lg st-unclaimed" />No owner</span>
          <span><i className="lg has-error" />Misses an ASU deadline</span>
        </div>
      </div>

      {view === "flow" && <FlowChart key={ev.id} state={state} sched={sched} eventId={ev.id} selectedId={selected} onSelect={onSelect} />}
      {view === "gantt" && <Gantt state={state} sched={sched} eventId={ev.id} selectedId={selected} onSelect={onSelect} />}
      {view === "list" && (
        <div className="card" data-testid="event-list">
          {lanes(state, sched, ev.id, 0).map(lane => (
            <section key={lane.role.id} aria-label={lane.role.displayName} className="lane-list">
              <h3>{lane.role.displayName}</h3>
              <ul className="list">
                {lane.nodes.map(n => {
                  const p = sched.nodes[n.id]
                  const issue = worstIssue(p.issues)
                  const st = statusOf(n)
                  return (
                    <li key={n.id}>
                      <button type="button" className="row-btn" onClick={() => onSelect(n.id)}>
                        <span>{n.title}</span>
                        <span className="small muted num">
                          {firstName(state, n.ownerId)} · start {fmtShort(p.latestStart)} · club {fmtShort(p.club)}{p.official ? ` · ASU ${fmtShort(p.official)}` : ""}
                        </span>
                        {issue && <span className={`small ${issue.severity === "error" ? "late-text" : "warn-text"}`}>{issue.text}</span>}
                      </button>
                      <span className={`tag ${st.tone}`}>{st.text}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="small muted">Dates come only from the rule engine: ASU rules, the club buffer ({state.org.settings.clubBufferBusinessDays} business days), each officer's personal buffer and busy weeks, and ASU holidays. Club work skips finals weeks and the break between semesters. Today in the demo: {fmtLong(state.today)}.</p>

      {selected && <NodePanel nodeId={selected} onClose={onClose} onSelect={onSelect} />}

      <Coming wp="WP2, WP3 and WP5" items={[
        "Add or change steps from one sentence, as a change set you approve (WP2)",
        "Claim button, four status buttons and the silence protocol (WP3)",
        "Forecast colours from 1,000 simulated runs, and Plan B options (WP5)",
      ]} />
    </>
  )
}
