import { Link, useNavigate } from "react-router-dom"
import { useSchedule, useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { Bts, BtsRow, BtsTr } from "../components/Bts"
import { useRail } from "../components/rail/RailContext"
import { nudgeBlocked } from "../lib/nudges"
import { weeklyStars } from "../lib/today"
import { FORECAST_ASSUMPTIONS, forecastFor, forecastQueue } from "../engine/forecast"
import { daysBetween, fmtShort } from "../lib/dates"
import { Avatar, Chain, Empty, Info, NodePill, RiskDot, Ring } from "../components/ui"
import { phaseChain } from "../lib/phases"
import { firstName } from "./helpers"

export default function Today() {
  const { state } = useStore()
  const { canNudge } = useViewer()
  const rail = useRail()
  const navigate = useNavigate()
  const forecast = forecastFor(state)
  const sched = useSchedule()
  const stars = weeklyStars(state)
  const risks = forecastQueue(state, forecast)

  return (
    <>
      <PageHead path="/" />

      <section className="card" aria-labelledby="risk-h">
        <header><h2 id="risk-h">Needs a nudge</h2><Info>The three open steps least likely to finish on time, from 1,000 simulated runs. Rest on a dot to see why.</Info></header>
        <table className="tbl" data-testid="risk-list">
          <tbody>
            {risks.map(n => [
              <tr key={n.id}>
                <td><RiskDot result={forecast.nodes[n.id]} /></td>
                <td><button className="row-btn" onClick={() => rail.show({ kind: "node", id: n.id })}>{n.title}</button></td>
                <td><span className="who"><Avatar name={state.people.find(p => p.id === n.ownerId)?.name} size="sm" /><span className="small hide-sm">{firstName(state, n.ownerId)}</span></span></td>
                <td className="small nowrap">{n.clubDeadline ? fmtShort(n.clubDeadline) : ""}</td>
                <td className="hide-sm"><NodePill node={n} small /></td>
                <td className="num">{canNudge && n.ownerId && <button className="btn small" disabled={!!nudgeBlocked(state, n)} title={nudgeBlocked(state, n) ?? "Review a private reminder"} onClick={() => rail.show({ kind: "nudge", id: n.id })}>Remind</button>}</td>
              </tr>,
              <BtsTr key={`${n.id}-bts`} cols={6}>
                <Bts label="Rule engine">Club deadline: {sched.nodes[n.id]?.explain.club}</Bts>
                <Bts label="Forecast">{Math.round((forecast.nodes[n.id]?.probability ?? 0) * 100)}% of {forecast.nodes[n.id]?.runs.toLocaleString()} simulated runs finish on time. {forecast.nodes[n.id]?.reasons.join(" ")}</Bts>
              </BtsTr>,
            ])}
            {risks.length === 0 && <tr><td className="empty">Nothing at risk right now.</td></tr>}
          </tbody>
        </table>
        <BtsRow>
          <Bts label="Forecast">Dot: green at 80% or more, yellow at 50% or more, red below. {FORECAST_ASSUMPTIONS[0]}</Bts>
          <Bts label="Computed">The list shows the three open steps with the lowest on-time chance.</Bts>
        </BtsRow>
      </section>

      <section className="card" aria-labelledby="ev-h">
        <header><h2 id="ev-h">Events</h2><Link to="/events" className="small">Open</Link></header>
        <div className="event-rows">
          {state.events.map(ev => {
            const nodes = state.nodes.filter(n => n.eventId === ev.id)
            const done = nodes.filter(n => n.status === "done").length
            return [
              <div key={ev.id} className="event-row" data-testid="event-strip">
                <button type="button" className="row-btn event-name" onClick={() => navigate(`/events?event=${encodeURIComponent(ev.id)}`)}>
                  <b>{ev.name}</b><span className="small muted">{fmtShort(ev.date)} · {daysBetween(state.today, ev.date)}d</span>
                </button>
                <Chain label={`${ev.name} progress`} stops={phaseChain(state, forecast, ev.id).map(p => ({ ...p, onClick: () => navigate(`/events?event=${encodeURIComponent(ev.id)}`) }))} />
                <span className="small muted num">{done}/{nodes.length}</span>
                <RiskDot result={forecast.events[ev.id]} />
              </div>,
              <BtsRow key={`${ev.id}-bts`}>
                <Bts label="Data">The event date is the one date a person sets.</Bts>
                <Bts label="Computed">Days left = event date minus today, counted in calendar days.</Bts>
                <Bts label="Computed">Progress dots, one per phase: done when every step in it is done; risk when a step's forecast is red; now when a step has started or its start date is today or earlier; otherwise to do.</Bts>
              </BtsRow>
            ]
          })}
        </div>
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="goal-h">
          <header><h2 id="goal-h">Semester goals</h2></header>
          <div className="goals">
            {state.org.goals.map(g => (
              <div key={g.id} className="goal">
                <Ring value={g.current} max={g.target} label={`${g.label}: ${g.current} of ${g.target}`} />
                <div><b className="num">{g.unit === "USD" ? `$${g.current.toLocaleString()}` : g.current}<span className="small muted"> / {g.unit === "USD" ? `$${g.target.toLocaleString()}` : g.target}</span></b><span className="small muted">{g.label}</span></div>
              </div>
            ))}
          </div>
          <BtsRow><Bts label="Data">Goal names, targets and current values are typed in Settings. Nothing here is calculated from tasks.</Bts></BtsRow>
        </section>

        <section className="card" aria-labelledby="star-h">
          <header><h2 id="star-h">Superstar of the week</h2><Info>Points for steps finished this week: light 1, medium 2, heavy 3, plus 1 if on time. Ties share the spotlight.</Info></header>
          {stars.length ? <div className="stars">{stars.map(star => <span key={star.person.id} className="star"><Avatar name={star.person.name} /> <b>{star.person.name.split(" ")[0]}</b> <span className="small muted">{star.points} pts</span></span>)}</div> : <Empty>No stars yet. Finish a step.</Empty>}
          <BtsRow><Bts label="Computed">Points for steps finished this week (Monday to today): light 1, medium 2, heavy 3, plus 1 if on time. The top score wins; ties share the spotlight.</Bts></BtsRow>
        </section>
      </div>
    </>
  )
}
