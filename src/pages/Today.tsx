import { useState } from "react"
import { Link } from "react-router-dom"
import { useSchedule, useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { CommandBar } from "../components/CommandBar"
import { NudgeComposer } from "../components/NudgeComposer"
import { NodePanel } from "../components/NodePanel"
import { nudgeBlocked } from "../lib/nudges"
import { eventStrip, weeklyStars } from "../lib/today"
import { daysBetween, fmtShort } from "../lib/dates"
import { SEVERITY_RANK, personName, statusOf, worstIssue } from "./helpers"

export default function Today() {
  const { state } = useStore()
  const { person, canNudge } = useViewer()
  const [nudgeId, setNudgeId] = useState<string | null>(null)
  const [nodeId, setNodeId] = useState<string | null>(null)
  const sched = useSchedule()
  const stars = weeklyStars(state)
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

      <CommandBar onNudge={id => { setNodeId(null); setNudgeId(id) }} />

      <div className="grid-2">
        <section className="card" aria-labelledby="risk-h">
          <header><h2 id="risk-h">Needs a nudge</h2><span className="small muted">Top {risks.length} by risk</span></header>
          <ul className="list" data-testid="risk-list">
            {risks.map(({ n, issue }) => (
              <li key={n.id}>
                <div>
                  <button className="row-btn" onClick={() => { setNudgeId(null); setNodeId(n.id) }}>{n.title}</button>
                  <div className="small muted">{personName(state, n.ownerId)}{n.clubDeadline ? ` · club deadline ${fmtShort(n.clubDeadline)}` : ""}</div>
                  <div className={`small ${issue.severity === "error" ? "late-text" : "warn-text"}`}>{issue.text}</div>
                </div>
                <div className="risk-actions"><span className={`tag ${statusOf(n).tone}`}>{statusOf(n).text}</span>{canNudge && <button className="btn small" disabled={!!nudgeBlocked(state, n)} title={nudgeBlocked(state, n) ?? "Review a private reminder"} onClick={() => { setNodeId(null); setNudgeId(n.id) }}>Draft reminder</button>}{!n.ownerId && <span className="small muted">Assign an owner first</span>}</div>
              </li>
            ))}
            {risks.length === 0 && <li className="muted">Nothing at risk right now.</li>}
          </ul>
        </section>

        <section className="card" aria-labelledby="ev-h">
          <header><h2 id="ev-h">Events</h2><Link to="/events" className="small">All events</Link></header>
          <ul className="list event-strips">
            {state.events.map(ev => {
              const nodes = state.nodes.filter(n => n.eventId === ev.id)
              const done = nodes.filter(n => n.status === "done").length
              return (
                <li key={ev.id} className="event-strip" data-testid="event-strip">
                  <div className="action-row">
                    <div>{ev.name}</div>
                    <div className="small muted">{fmtShort(ev.date)} · in {daysBetween(state.today, ev.date)} days</div>
                    <span className="small muted num">{nodes.length ? `${done}/${nodes.length} steps done` : "No steps yet"}</span>
                  </div>
                  <ol className="step-strip">{eventStrip(nodes).map((n, i) => <li key={n.id}><button className="step-button" onClick={() => { setNudgeId(null); setNodeId(n.id) }}><span className="eyebrow">{i === 0 ? "Current" : `Next ${i}`}</span><b>{n.title}</b><span className="small muted">{personName(state, n.ownerId)} · {n.latestStart ? fmtShort(n.latestStart) : "Date pending"}</span></button></li>)}</ol>
                  {!!nodes.length && done === nodes.length && <p className="small good-text">All steps complete.</p>}
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

      <section className="card" aria-labelledby="star-h">
        <header><h2 id="star-h">Superstar of the week</h2><span className="small muted">{stars.length > 1 ? "Shared spotlight" : "Visible contributions"}</span></header>
        {stars.length ? <><div className="action-row">{stars.map(star => <div key={star.person.id} className="star-card"><span className="avatar">★</span><b>{star.person.name}</b><span className="small muted">{star.points} contribution point{star.points === 1 ? "" : "s"}</span></div>)}</div><details><summary className="small">How this is counted</summary><p className="small muted">Existing contribution points for completed tasks updated this calendar week, through the demo date. Ties share the spotlight.</p><ul>{stars.flatMap(star => star.nodes.map(n => <li key={n.id} className="small">{star.person.name}: {n.title} · updated {n.lastUpdate}</li>))}</ul></details></> : <p className="muted">No recorded contributions from completed tasks updated this week.</p>}
      </section>
      {nodeId && <NodePanel nodeId={nodeId} onClose={() => setNodeId(null)} onSelect={setNodeId} />}
      {nudgeId && <NudgeComposer key={nudgeId} nodeId={nudgeId} onClose={() => setNudgeId(null)} />}
    </>
  )
}

