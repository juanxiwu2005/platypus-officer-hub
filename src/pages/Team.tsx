import { useState } from "react"
import { Link } from "react-router-dom"
import { useStore } from "../data/store"
import { PageHead } from "../components/Page"
import { useRail } from "../components/rail/RailContext"
import { Avatar, Hover, Info } from "../components/ui"
import { roleName } from "./helpers"
import { contributionBoard, workload } from "../engine/team"
import { MeetingFinder } from "../components/MeetingFinder"
import { officers } from "../data/permissions"

const BAND = { "Room to help": 1, Focused: 2, "Needs support": 3 } as const

export default function Team() {
  const { state } = useStore()
  const rail = useRail()
  const board = contributionBoard(state)
  const [showAll, setShowAll] = useState(false)
  const visibleBoard = state.people.length > 10 && !showAll ? board.slice(0, 10) : board
  return <>
    <PageHead path="/team" actions={<Link className="btn" to="/matching">Set up responsibilities</Link>} />
    <div className="grid-2">
      <section className="card" aria-labelledby="off-h">
        <header><h2 id="off-h">Workload</h2><Info>A qualitative signal for the next two weeks—not a capacity target. It weighs estimated work, urgency, rule and dependency impact, plus a self-reported busy week. It never shows a percentage or “unused” time.</Info></header>
        <table className="tbl" data-testid="officers"><tbody>{officers(state).map(p => {
          const w = workload(state, p.id)
          return <tr key={p.id} className="wl-row">
            <td><span className="who"><Avatar name={p.name} />{p.name.split(" ")[0]}</span></td>
            <td className="small muted">{roleName(state, p.roleId)}</td>
            <td><Hover card={w.nodes.length ? <>{w.nodes.slice(0, 5).map(n => <span key={n.id} className="hc-line">{n.title}</span>)}</> : "No open work in the next two weeks."}>
              <span className={`band b${BAND[w.band as keyof typeof BAND]}`} tabIndex={0} role="img" aria-label={`${w.band}: weighted work signal`}><i /><i /><i /></span>
            </Hover></td>
            <td className="small">{w.band}</td>
          </tr>
        })}</tbody></table>
      </section>
      <section className="card" aria-labelledby="cb-h">
        <header><h2 id="cb-h">Contributions</h2><Info>Impact combines estimated effort and how central a completed step was. Reliability reflects delivery by the club deadline. This is not a task-count leaderboard.</Info>{state.people.length > 10 && <button type="button" className="btn small" onClick={() => setShowAll(all => !all)}>{showAll ? "Show top 10" : `Show all ${state.people.length} officers`}</button>}</header>
        <table className="tbl" data-testid="contribution-board"><thead><tr><th>Rank</th><th>Officer</th><th>Impact</th><th>Reliability</th></tr></thead><tbody>{visibleBoard.map(r => <tr key={r.person.id}>
          <td className="small muted">#{r.rank}</td>
          <td><span className="who"><Avatar name={r.person.name} size="sm" />{r.person.name.split(" ")[0]}</span></td>
          <td><Hover card={r.entries.length ? <>{r.entries.map(c => <button key={c.nodeId} type="button" className="hc-line link" onClick={() => rail.show({ kind: "task", id: c.nodeId })}>{state.nodes.find(n => n.id === c.nodeId)?.title}</button>)}</> : "No finished steps yet."}><span tabIndex={0} className={`impact-meter l${r.impactLevel}`} role="img" aria-label={`Impact: ${r.impactLevel} of 4`}><i /><i /><i /><i /></span></Hover></td>
          <td><span className={`reliability ${r.reliabilityTone}`}><i aria-hidden="true" />{r.reliabilityLabel}</span></td>
        </tr>)}</tbody></table>
      </section>
    </div>
    <MeetingFinder />
  </>
}
