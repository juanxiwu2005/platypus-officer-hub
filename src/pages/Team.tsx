import { useState, type CSSProperties } from "react"
import { useStore } from "../data/store"
import { PageHead } from "../components/Page"
import { useRail } from "../components/rail/RailContext"
import { Avatar, Hover, Info } from "../components/ui"
import { roleName } from "./helpers"
import { availabilityGrid, calendarDraftUrl, commonMeetingSlots, contributionBoard, workload } from "../engine/team"
import { fmtShort, fromISO } from "../lib/dates"

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
              <span className={`band b${BAND[w.band as keyof typeof BAND]}`} tabIndex={0} aria-label={`${w.band}: ${w.nodes.length} steps`}><i /><i /><i /></span>
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

function MeetingFinder() {
  const { state } = useStore()
  const [date, setDate] = useState(state.today)
  const [duration, setDuration] = useState(30)
  const [ids, setIds] = useState(state.people.map(p => p.id))
  const result = commonMeetingSlots(state, ids, date, duration)
  const grid = availabilityGrid(state, ids, state.today)
  const total = Math.max(1, ids.length)
  return <section className="card form-stack" data-testid="meeting-finder" aria-labelledby="mf-h">
    <header><h2 id="mf-h">Find a meeting time</h2><Info>Uses only the free times officers entered. Busy weeks, ASU closures, finals and breaks are skipped. Arizona time. No calendar is read and no invite is sent.</Info></header>
    <div className="heat" role="grid" aria-label="Who is free this week">
      <div className="heat-row head" role="row"><span />{grid.map(d => <span key={d.date} role="columnheader" className={d.date === date ? "on" : ""}>{fromISO(d.date).toLocaleDateString("en-US", { weekday: "short" })}<b>{fromISO(d.date).getDate()}</b></span>)}</div>
      {grid[0].hours.map((h, k) => <div key={h.hour} className="heat-row" role="row">
        <span className="heat-h">{h.hour % 2 === 0 ? `${((h.hour + 11) % 12) + 1}${h.hour < 12 ? "a" : "p"}` : ""}</span>
        {grid.map(d => { const c = d.hours[k].free; return <button key={d.date} type="button" role="gridcell" className={`heat-cell ${c === total ? "all" : ""}`} style={{ "--a": c / total } as CSSProperties} aria-label={`${fmtShort(d.date)} ${h.hour}:00 · ${c} of ${total} free`} title={`${c} of ${total} free`} onClick={() => setDate(d.date)} /> })}
      </div>)}
    </div>
    <div className="action-row">
      <label className="field-inline">Meeting date<input type="date" min={state.today} value={date} onChange={e => setDate(e.target.value)} /></label>
      <label className="field-inline">Length<select aria-label="Meeting length" value={duration} onChange={e => setDuration(Number(e.target.value))}>{[15, 30, 60, 90].map(m => <option key={m} value={m}>{m} min</option>)}</select></label>
    </div>
    <fieldset className="who-picks"><legend className="small muted">Attendees</legend>{state.people.map(p => <label className="check-label" key={p.id}><input type="checkbox" checked={ids.includes(p.id)} onChange={e => setIds(e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))} />{p.name}</label>)}</fieldset>
    {result.reason ? <p role="status" className="small">{result.reason}</p> : <div className="action-row">{result.slots.map(slot => <a key={slot.from} className="btn small" target="_blank" rel="noreferrer" href={calendarDraftUrl(date, slot.from, slot.to)} aria-label="Open Calendar draft">{slot.from}–{slot.to}</a>)}</div>}
  </section>
}
