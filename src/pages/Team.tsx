import { useStore } from "../data/store"
import { PageHead } from "../components/Page"
import { useRail } from "../components/rail/RailContext"
import { Avatar, Hover, Info } from "../components/ui"
import { roleName } from "./helpers"
import { contributionBoard, workload } from "../engine/team"
import { MeetingFinder } from "../components/MeetingFinder"

const BAND = { Light: 1, Balanced: 2, Heavy: 3 } as const

export default function Team() {
  const { state } = useStore()
  const rail = useRail()
  const board = contributionBoard(state)
  return <>
    <PageHead path="/team" />
    <div className="grid-2">
      <section className="card" aria-labelledby="off-h">
        <header><h2 id="off-h">Workload</h2><Info>Open steps starting or due in the next 14 days. Light tasks count 1, medium 2, heavy 3. Light is 0–3, balanced 4–7, heavy 8+. Never hours.</Info></header>
        <table className="tbl" data-testid="officers"><tbody>{state.people.map(p => {
          const w = workload(state, p.id)
          return <tr key={p.id} className="wl-row">
            <td><span className="who"><Avatar name={p.name} />{p.name.split(" ")[0]}</span></td>
            <td className="small muted">{roleName(state, p.roleId)}</td>
            <td><Hover card={w.nodes.length ? <>{w.nodes.slice(0, 5).map(n => <span key={n.id} className="hc-line">{n.title}</span>)}</> : "No open work in the next two weeks."}>
              <span className={`band b${BAND[w.band as keyof typeof BAND]}`} tabIndex={0} role="img" aria-label={`${w.band}: ${w.nodes.length} steps`}><i /><i /><i /></span>
            </Hover></td>
            <td className="small">{w.band}</td>
          </tr>
        })}</tbody></table>
      </section>
      <section className="card" aria-labelledby="cb-h">
        <header><h2 id="cb-h">Contribution board</h2><Info>Finished steps only: light 1, medium 2, heavy 3, plus 1 if on time. Ties share a rank.</Info></header>
        <table className="tbl" data-testid="contribution-board"><tbody>{board.map(r => <tr key={r.person.id}>
          <td className="small muted">#{r.rank}</td>
          <td><span className="who"><Avatar name={r.person.name} size="sm" />{r.person.name.split(" ")[0]}</span></td>
          <td className="num"><b>{r.points}</b> <span className="small muted">pts</span></td>
          <td className="small muted"><Hover card={r.entries.length ? <>{r.entries.map(c => <button key={c.nodeId} type="button" className="hc-line link" style={{ color: "inherit" }} onClick={() => rail.show({ kind: "task", id: c.nodeId })}>{state.nodes.find(n => n.id === c.nodeId)?.title}</button>)}</> : "No finished steps yet."}><span tabIndex={0}>{r.completed} done</span></Hover></td>
        </tr>)}</tbody></table>
      </section>
    </div>
    <MeetingFinder />
  </>
}
