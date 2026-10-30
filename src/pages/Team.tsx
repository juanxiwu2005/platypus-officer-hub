import { useStore } from "../data/store"
import { PageHead } from "../components/Page"
import { useRail } from "../components/rail/RailContext"
import { Avatar, Hover, Info } from "../components/ui"
import { roleName } from "./helpers"
import { contributionBoard, workload } from "../engine/team"
import { MeetingFinder } from "../components/MeetingFinder"

const BAND = { "Room to help": 1, Focused: 2, "Needs support": 3 } as const

export default function Team() {
  const { state } = useStore()
  const rail = useRail()
  const board = contributionBoard(state)
  return <>
    <PageHead path="/team" />
    <div className="grid-2">
      <section className="card" aria-labelledby="off-h">
        <header><h2 id="off-h">Workload</h2><Info>A qualitative signal for the next two weeks—not a capacity target. It weighs estimated work, urgency, rule and dependency impact, plus a self-reported busy week. It never shows a percentage or “unused” time.</Info></header>
        <table className="tbl" data-testid="officers"><tbody>{state.people.map(p => {
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
        <header><h2 id="cb-h">Contribution board</h2><Info>Recognition is based on estimated effort and impact, reliability against the club deadline, and the work a completed step unlocks. It is not a task-count leaderboard.</Info></header>
        <table className="tbl" data-testid="contribution-board"><thead><tr><th>Rank</th><th>Officer</th><th>Impact</th><th>Reliability</th><th>Work unlocked</th></tr></thead><tbody>{board.map(r => <tr key={r.person.id}>
          <td className="small muted">#{r.rank}</td>
          <td><span className="who"><Avatar name={r.person.name} size="sm" />{r.person.name.split(" ")[0]}</span></td>
          <td className="small"><Hover card={r.entries.length ? <>{r.entries.map(c => <button key={c.nodeId} type="button" className="hc-line link" onClick={() => rail.show({ kind: "task", id: c.nodeId })}>{state.nodes.find(n => n.id === c.nodeId)?.title}</button>)}</> : "No finished steps yet."}><span tabIndex={0}>{r.impactLabel}</span></Hover></td>
          <td className="small muted">{r.reliabilityLabel}</td>
          <td className="small muted">{r.unlockLabel}</td>
        </tr>)}</tbody></table>
      </section>
    </div>
    <MeetingFinder />
  </>
}
