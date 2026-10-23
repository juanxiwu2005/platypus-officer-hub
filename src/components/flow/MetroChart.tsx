import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import type { DemoState, Node } from "../../data/types"
import type { Schedule } from "../../engine/schedule"
import type { Forecast } from "../../engine/forecast"
import { daysBetween, fmtShort } from "../../lib/dates"
import { firstName, worstIssue } from "../../pages/helpers"
import { nodeStop } from "../../lib/phases"
import { useStatusStyles } from "../ui"
import { EVENT_KEY, END_KEY, START_KEY, metroLayout } from "./metro"

const SHORT: Record<string, string> = {
  partner: "Partner meeting", draft: "Event plan", mktneeds: "Marketing needs", budget: "Budget", approve: "Approve plan",
  registry: "Event Registry", venue: "Book room", offvenue: "Off-campus venue", ritm: "RITM number", advisor: "Advisor",
  quote: "Caterer quote", foodex: "Food exception", dining: "Dining order", permit: "Food permit", usg: "USG request",
  sap: "Speaker SAP", usgspeaker: "USG speaker", flyer: "Flyer", partnerreview: "Partner review", rsvp: "Open RSVPs",
  promo: "Promotion", review: "Full check", runshow: "Run of show", headcount: "Headcount", feedback: "Feedback",
  closeout: "Close out", archive: "Archive",
}
/** Two to four words for the chart; the full title is in the hover card. */
export const shortTitle = (n: Node) => (n.stepKey && SHORT[n.stepKey]) || n.title.split(/\s+/).slice(0, 3).join(" ").replace(/[,:;]$/, "")

interface Props { state: DemoState; sched: Schedule; forecast: Forecast; eventId: string; selectedId: string | null; onSelect: (id: string) => void }

/** One main line; parallel work forks off and merges back. Look → hover → click. */
export function MetroChart({ state, sched, forecast, eventId, selectedId, onSelect }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1000)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el); setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const vertical = width < 640
  const styles = useStatusStyles()
  const ev = state.events.find(e => e.id === eventId)!
  const L = useMemo(() => metroLayout(state, sched, eventId, !vertical), [state, sched, eventId, vertical])

  // Pixel geometry. Horizontal: columns run left → right, rows above/below. Vertical (phone): top → bottom, branches to the right.
  const COL = vertical ? 64 : Math.max(96, Math.min(132, (width - 112) / Math.max(1, L.cols)))
  const ROW = vertical ? 132 : 88
  const PAD = vertical ? 28 : 56
  const top = vertical ? 40 : 52 + (-L.minRow) * ROW + 34
  const pos = (col: number, row: number) => vertical ? { x: 26 + row * ROW, y: top + col * COL } : { x: PAD + col * COL, y: top + row * ROW }
  const W = vertical ? Math.max(width, 26 + L.maxRow * ROW + 140) : PAD * 2 + L.cols * COL
  const H = vertical ? top + L.cols * COL + 60 : top + L.maxRow * ROW + 70

  const stateOf = (n: Node) => {
    const issue = worstIssue(sched.nodes[n.id]?.issues)
    const late = n.status !== "done" && (sched.nodes[n.id]?.club ?? "9999") < state.today
    return nodeStop(n, state.today, issue?.severity === "error" || late || forecast.nodes[n.id]?.color === "red" || n.status === "blocked")
  }
  const lastDoneMain = L.stations.reduce((k, s, i) => (s.node?.status === "done" ? i : k), -1)
  const mainPts = L.stations.map(s => pos(s.col, 0))
  const mainPath = mainPts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ")
  const donePath = lastDoneMain > 0 ? mainPts.slice(0, lastDoneMain + 1).map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ") : ""
  const branchPath = (from: number, to: number, row: number) => {
    const a = pos(L.stations[from].col, 0), b = pos(L.stations[to].col, 0), ra = pos(L.stations[from].col, row), rb = pos(L.stations[to].col, row)
    if (vertical) { const ya = a.y + 30, yb = b.y - 30; return `M${a.x} ${a.y} C${a.x} ${a.y + 20} ${ra.x} ${ya - 20} ${ra.x} ${ya} L${rb.x} ${yb} C${rb.x} ${yb + 20} ${b.x} ${b.y - 20} ${b.x} ${b.y}` }
    const xa = a.x + 34, xb = b.x - 34
    return `M${a.x} ${a.y} C${a.x + 22} ${a.y} ${xa - 22} ${ra.y} ${xa} ${ra.y} L${xb} ${rb.y} C${xb + 22} ${rb.y} ${b.x - 22} ${b.y} ${b.x} ${b.y}`
  }

  // Soft time labels: weeks before the event, shown once each.
  const ticks: { at: number; label: string }[] = []
  for (const w of [8, 6, 4, 2]) {
    const st = L.stations.find(s => s.node && daysBetween(sched.nodes[s.node.id]?.club ?? ev.date, ev.date) <= w * 7 && !ticks.some(t => t.at === s.col))
    if (st && !ticks.some(t => t.label.startsWith(`${w} `)) && !ticks.some(t => Math.abs(t.at - st.col) < 1.5)) ticks.push({ at: st.col, label: `${w} weeks out` })
  }
  const evStation = L.stations.find(s => s.key === EVENT_KEY)!
  // Today marker sits after the last main station that is already behind us.
  const pastIdx = L.stations.reduce((k, s, i) => (s.node && (sched.nodes[s.node.id]?.club ?? "9999") < state.today ? i : s.key === EVENT_KEY && ev.date < state.today ? i : k), -1)
  const todayCol = pastIdx < 0 ? L.stations[0].col - 0.5 : pastIdx >= L.stations.length - 1 ? L.stations[pastIdx].col + 0.5 : (L.stations[pastIdx].col + L.stations[pastIdx + 1].col) / 2

  const dot = (n: Node, col: number, row: number, labelSide: "below" | "above" | "right") => {
    const p = pos(col, row)
    const st = stateOf(n)
    const plan = sched.nodes[n.id]
    const issue = worstIssue(plan?.issues)
    const owner = state.people.find(x => x.id === n.ownerId)?.name
    const label = `${n.title}. ${styles[n.status].label}. Owner ${owner ?? "none"}. Club deadline ${plan ? fmtShort(plan.club) : "pending"}${plan?.official ? `, ASU deadline ${fmtShort(plan.official)}` : ""}.${issue ? ` ${issue.text}` : ""}`
    return <div key={n.id} className={`m-node ${labelSide} ${n.id === selectedId ? "is-selected" : ""}`} style={{ left: p.x, top: p.y }}>
      <button type="button" className={`m-dot ${st} ${issue ? `has-${issue.severity}` : ""}`} onClick={() => onSelect(n.id)} aria-label={label} data-testid={`flow-node-${n.stepKey ?? n.id}`} />
      <span className="m-label" aria-hidden="true"><b>{shortTitle(n)}</b><span>{firstName(state, n.ownerId)}</span></span>
      <span className="m-card" role="tooltip">
        <b>{n.title}</b>
        <span>{owner ?? "No owner"} · {styles[n.status].label}{plan ? ` · due ${fmtShort(plan.club)}` : ""}</span>
        {plan?.official ? <span>ASU deadline {fmtShort(plan.official)}{n.ruleIds[0] ? ` (${n.ruleIds[0]})` : ""}</span> : null}
        {issue ? <span className="m-card-warn">{issue.text}</span> : n.waitingOn ? <span>Waiting on: {n.waitingOn}</span> : null}
      </span>
    </div>
  }

  // Open with "today" in view.
  useEffect(() => {
    const el = wrap.current
    if (!el || vertical || W <= el.clientWidth) return
    // Start at a station a little before today, so no label is cut in half.
    const target = pos(todayCol, 0).x - el.clientWidth * 0.35
    const st = [...L.stations].reverse().find(s => pos(s.col, 0).x - 60 <= target)
    el.scrollLeft = Math.max(0, st ? pos(st.col, 0).x - 60 : 0)
  }, [eventId, vertical, L.cols])
  return <div className={`metro ${vertical ? "vertical" : ""}`} ref={wrap} data-testid="flow-chart" style={{ "--label-w": `${vertical ? 140 : COL - 8}px` } as CSSProperties}>
    <div className="metro-canvas" style={{ width: W, height: H }}>
      <svg width={W} height={H} aria-hidden="true">
        {!vertical && ticks.map(t => <text key={t.label} x={pos(t.at, 0).x} y={18} className="m-tick" textAnchor="middle">{t.label}</text>)}
        {!vertical && <text x={pos(evStation.col, 0).x} y={18} className="m-tick strong" textAnchor="middle">{fmtShort(ev.date)}</text>}
        {L.branches.map(b => <path key={b.id} d={branchPath(b.from, b.to, b.row)} className={`m-line branch ${b.nodes.every(x => x.node.status === "done") ? "done" : ""}`} />)}
        <path d={mainPath} className="m-line main" />
        {donePath && <path d={donePath} className="m-line main done" />}
        {(() => { const p = pos(todayCol, 0); return vertical
          ? <g className="m-today"><line x1={4} x2={W - 4} y1={p.y} y2={p.y} /><text x={W - 8} y={p.y - 6} textAnchor="end">Today</text></g>
          : <g className="m-today"><line x1={p.x} x2={p.x} y1={28} y2={H - 18} /><text x={p.x} y={H - 4} textAnchor="middle">Today</text></g> })()}
      </svg>
      {L.stations.map(s => s.node ? dot(s.node, s.col, 0, vertical ? "right" : "below") : null)}
      {L.branches.flatMap(b => b.nodes.map(x => dot(x.node, x.col, b.row, vertical ? "right" : b.row < 0 ? "above" : "below")))}
      {L.stations.filter(s => s.key === EVENT_KEY || s.key === START_KEY || s.key === END_KEY).map(s => {
        const p = pos(s.col, 0)
        return <div key={s.key} className={`m-node ${vertical ? "right" : "below"} m-${s.key.replaceAll("_", "")}`} style={{ left: p.x, top: p.y }}>
          <span className={`m-dot station ${s.key === EVENT_KEY ? (ev.date < state.today ? "done" : "event") : "todo"}`} />
          <span className="m-label"><b>{s.key === EVENT_KEY ? "Event day" : s.key === START_KEY ? "Start" : "Done"}</b>{s.key === EVENT_KEY && vertical ? <span>{fmtShort(ev.date)}</span> : null}</span>
        </div>
      })}
    </div>
    <div className="m-legend small" aria-label="Legend">
      <span><i className="m-dot done" />Done</span><span><i className="m-dot now" />In progress</span><span><i className="m-dot todo" />Not started</span><span><i className="m-dot risk" />At risk</span>
    </div>
  </div>
}
