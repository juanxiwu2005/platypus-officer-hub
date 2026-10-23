import { Link } from "react-router-dom"
import { useSchedule, useStore, useViewer } from "../data/store"
import { Coming, PageHead } from "../components/Page"
import { daysBetween, fmtShort } from "../lib/dates"
import { SEVERITY_RANK, personName, statusOf, worstIssue } from "./helpers"

export default function Today() {
  const { state } = useStore()
  const { person } = useViewer()
  const sched = useSchedule()
  // WP1: ranked by the rule engine's warnings (red before amber, then nearest club deadline).
  // The forecast from 1,000 simulated runs (plan §9) replaces this ranking in WP5.
  const risks = state.nodes
    .filter(n => n.status !== "done")
    .map(n => ({ n, issue: worstIssue(sched.nodes[n.id]?.issues) }))
    .filter((x): x is { n: typeof x.n; issue: NonNullable<typeof x.issue> } => !!x.issue)
    .sort((a, b) => SEVERITY_RANK[a.issue.severity] - SEVERITY_RANK[b.issue.severity] || (a.n.clubDeadline ?? "").localeCompare(b.n.clubDeadline ?? ""))
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
          <header><h2 id="risk-h">Needs a nudge</h2><span className="small muted">Top {risks.length} by risk</span></header>
          <ul className="list" data-testid="risk-list">
            {risks.map(({ n, issue }) => (
              <li key={n.id}>
                <div>
                  <div>{n.title}</div>
                  <div className="small muted">{personName(state, n.ownerId)}{n.clubDeadline ? ` · club deadline ${fmtShort(n.clubDeadline)}` : ""}</div>
                  <div className={`small ${issue.severity === "error" ? "late-text" : "warn-text"}`}>{issue.text}</div>
                </div>
                <span className={`tag ${statusOf(n).tone}`}>{statusOf(n).text}</span>
              </li>
            ))}
            {risks.length === 0 && <li className="muted">Nothing at risk right now.</li>}
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
