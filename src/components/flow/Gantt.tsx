import { useEffect, useMemo, useRef } from "react"
import type { DemoState } from "../../data/types"
import type { Schedule } from "../../engine/schedule"
import { daysBetween, fmtShort } from "../../lib/dates"
import { statusClass, statusOf, worstIssue } from "../../pages/helpers"
import { lanes, mondays, timeline } from "./layout"

const DW = 20

interface Props {
  state: DemoState
  sched: Schedule
  eventId: string
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Gantt view: one row per step, bar from latest start to club deadline, red tick on the ASU deadline. */
export function Gantt({ state, sched, eventId, selectedId, onSelect }: Props) {
  const ev = state.events.find(e => e.id === eventId)!
  const tl = useMemo(() => timeline(state, sched, eventId, DW, 2), [state, sched, eventId])
  const ls = useMemo(() => lanes(state, sched, eventId, 0), [state, sched, eventId])
  const width = tl.days * DW
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = Math.max(0, tl.x(state.today) - 7 * DW)
  }, [tl, state.today])

  const lines = (
    <>
      <i className="gantt-line today" style={{ left: tl.x(state.today) + DW / 2 }} />
      <i className="gantt-line event" style={{ left: tl.x(ev.date) + DW / 2 }} />
    </>
  )

  return (
    <div className="gantt" ref={scroller} data-testid="gantt">
      <div className="gantt-row gantt-head">
        <div className="gantt-label" />
        <div className="gantt-track" style={{ width }}>
          {mondays(tl.from, tl.to).map(d => <span key={d} className="gantt-tick" style={{ left: tl.x(d) }}>{fmtShort(d)}</span>)}
          <span className="gantt-tick strong" style={{ left: tl.x(state.today) }}>Today</span>
          <span className="gantt-tick strong" style={{ left: tl.x(ev.date) }}>Event</span>
        </div>
      </div>
      {ls.map(lane => (
        <div key={lane.role.id} role="group" aria-label={lane.role.displayName}>
          <div className="gantt-row gantt-lane">
            <div className="gantt-label">{lane.role.displayName}</div>
            <div className="gantt-track" style={{ width }}>{lines}</div>
          </div>
          {lane.nodes.map(n => {
            const p = sched.nodes[n.id]
            const issue = worstIssue(p.issues)
            const st = statusOf(n)
            const left = tl.x(p.latestStart)
            const w = (daysBetween(p.latestStart, p.club) + 1) * DW
            return (
              <div key={n.id} className={`gantt-row ${selectedId === n.id ? "is-selected" : ""}`}>
                <button type="button" className="gantt-label link" onClick={() => onSelect(n.id)} title={n.title}>{n.title}</button>
                <div className="gantt-track" style={{ width }}>
                  {lines}
                  <button
                    type="button"
                    className={`gantt-bar ${statusClass(n)} ${issue ? `has-${issue.severity}` : ""}`}
                    style={{ left, width: Math.max(w, DW) }}
                    onClick={() => onSelect(n.id)}
                    aria-label={`${n.title}: ${fmtShort(p.latestStart)} to ${fmtShort(p.club)}, ${st.text}`}
                  />
                  {p.official && <i className="gantt-official" style={{ left: tl.x(p.official) + DW / 2 }} title={`ASU deadline ${fmtShort(p.official)}`} />}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
