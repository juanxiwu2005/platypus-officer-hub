import { Link } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { Coming, PageHead } from "../components/Page"
import { daysBetween, fmtShort } from "../lib/dates"
import { personName, STATUS_LABEL } from "./helpers"

export default function Today() {
  const { state } = useStore()
  const { person } = useViewer()
  const open = state.nodes.filter(n => n.status !== "done")
  // WP0 placeholder ranking: closest club deadline first. The real forecast (plan §9) replaces this in WP5.
  const risks = open
    .filter(n => n.clubDeadline && daysBetween(state.today, n.clubDeadline) <= 2)
    .sort((a, b) => (a.clubDeadline ?? "").localeCompare(b.clubDeadline ?? ""))
    .slice(0, 3)

  return (
    <>
      <PageHead path="/" lead={<>Good to see you, {person.name.split(" ")[0]}. Type what you want done, or start with the risks below.</>} />

      <section className="card command" aria-label="Tell Platypus">
        <label htmlFor="command" className="small muted">Tell Platypus in one sentence, or ask about a rule</label>
        <textarea id="command" placeholder="e.g. Networking Night on Nov 19, 30 people, outside caterer, USG funding" disabled />
        <div><span className="tag accent">Command bar arrives in WP2</span></div>
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="risk-h">
          <header><h2 id="risk-h">Needs a nudge</h2><span className="small muted">Top {risks.length} by club deadline</span></header>
          <ul className="list" data-testid="risk-list">
            {risks.map(n => (
              <li key={n.id}>
                <div>
                  <div>{n.title}</div>
                  <div className="small muted">{personName(state, n.ownerId)} · club deadline {fmtShort(n.clubDeadline!)}</div>
                </div>
                <span className={`tag ${STATUS_LABEL[n.status].tone}`}>{STATUS_LABEL[n.status].text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="ev-h">
          <header><h2 id="ev-h">Events</h2><Link to="/events" className="small">All events</Link></header>
          <ul className="list">
            {state.events.map(ev => {
              const nodes = state.nodes.filter(n => n.eventId === ev.id)
              const done = nodes.filter(n => n.status === "done").length
              return (
                <li key={ev.id}>
                  <div>
                    <div>{ev.name}</div>
                    <div className="small muted">{fmtShort(ev.date)} · in {daysBetween(state.today, ev.date)} days</div>
                  </div>
                  <span className="small muted num">{nodes.length ? `${done}/${nodes.length} steps done` : "No steps yet"}</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <section className="card" aria-labelledby="goal-h">
        <header><h2 id="goal-h">Semester goals</h2></header>
        <div className="grid-3">
          {state.org.goals.map(g => (
            <div key={g.id}>
              <div className="small muted">{g.label}</div>
              <div className="stat num">{g.unit === "USD" ? `$${g.current.toLocaleString()}` : g.current}<span className="small muted"> / {g.unit === "USD" ? `$${g.target.toLocaleString()}` : g.target}</span></div>
              <progress value={g.current} max={g.target} style={{ width: "100%" }} aria-label={g.label} />
            </div>
          ))}
        </div>
      </section>

      <Coming wp="WP2 and WP5" items={[
        "One-sentence command bar that drafts a change set for you to approve",
        "Risk queue ranked by forecast, each with a one-click nudge (WhatsApp, text, Gmail)",
        "Each event as a strip: the current step and the next two",
        "Superstar of the week",
      ]} />
    </>
  )
}
