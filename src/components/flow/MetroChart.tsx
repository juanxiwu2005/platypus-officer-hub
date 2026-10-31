import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react"
import type { DemoState, Node } from "../../data/types"
import type { Schedule } from "../../engine/schedule"
import type { Forecast } from "../../engine/forecast"
import { daysBetween, fmtShort } from "../../lib/dates"
import { firstName, worstIssue } from "../../pages/helpers"
import { nodeStop } from "../../lib/phases"
import { useStatusStyles, useTouch } from "../ui"
import { EVENT_KEY, END_KEY, START_KEY, metroLayout } from "./metro"
import { useStore } from "../../data/store"
import { nextCounter } from "../../lib/ids"
import { cannotDelete, flowGaps, flowTracks, moveBetween, unlinkSteps, type Gap } from "../../lib/flowEdit"
import { ancestorsOf, doAfter, type EditResult, type StepEdit } from "../../lib/stepOrder"

const SHORT: Record<string, string> = {
  partner: "Partner meeting", draft: "Event plan", mktneeds: "Marketing needs", budget: "Budget", approve: "Approve plan",
  registry: "Event Registry", venue: "Book room", offvenue: "Off-campus venue", ritm: "RITM number", advisor: "Advisor",
  quote: "Caterer quote", foodex: "Food exception", dining: "Dining order", permit: "Food permit", usg: "USG request",
  sap: "Speaker SAP", usgspeaker: "USG speaker", flyer: "Flyer", partnerreview: "Partner review", rsvp: "Open RSVPs",
  promo: "Promotion", review: "Full check", runshow: "Run of show", headcount: "Headcount", feedback: "Feedback",
  closeout: "Close out", archive: "Archive",
}
const SITUATION_KEYS = new Set(["partner", "speakerPacket", "travel", "parking", "quotes", "foodCompliance", "budgetRequest", "budgetApproval", "purchaseRequest", "purchaseApproval", "access", "security", "permit", "alcohol", "drone", "schoolApproval", "content"])
/** Two to four words for the chart; the full title is in the hover card. */
export const shortTitle = (n: Node) => (n.stepKey && SHORT[n.stepKey]) || n.title.split(/\s+/).slice(0, 3).join(" ").replace(/[,:;]$/, "")

/**
 * What the chart changes when it is edited. For a real event the chart changes the event's steps in the store; for the club's own workflow
 * (setup) the caller supplies the same few actions on its own list of steps, and `template` turns off everything that is about dates and progress.
 */
export interface EditPort {
  snapshot: () => unknown
  restore: (snap: unknown) => void
  applyEdits: (edits: StepEdit[]) => void
  addStep: (id: string, uId: string | null, vId: string | null) => void
  removeStep: (id: string) => void
  newId: () => string
  template?: { sublabel: (n: Node) => string; lines: (n: Node) => string[]; marks?: Record<string, "error" | "warn"> }
}
interface Props { state: DemoState; sched: Schedule; forecast: Forecast; eventId: string; selectedId: string | null; onSelect: (id: string) => void; canEdit?: boolean; alwaysEdit?: boolean; editing?: boolean; onEditingChange?: (editing: boolean) => void; port?: EditPort }
type Menu = { kind: "node"; id: string; x: number; y: number } | { kind: "gap"; gap: Gap; x: number; y: number }
const SNAP = 72

/** One main line; parallel work forks off and merges back. Look → hover → click. */
export function MetroChart({ state, sched, forecast, eventId, selectedId, onSelect, canEdit = false, alwaysEdit = false, editing: requestedEditing, onEditingChange, port: given }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const { dispatch } = useStore()
  const touch = useTouch()
  const [localEditing, setLocalEditing] = useState(false)
  const editing = requestedEditing ?? localEditing
  const setEditing = (next: boolean) => {
    if (requestedEditing === undefined) setLocalEditing(next)
    onEditingChange?.(next)
  }
  const on = canEdit && (alwaysEdit || editing)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; gap: Gap | null } | null>(null)
  const dragRef = useRef<typeof drag>(null)
  const press = useRef<{ id: string; sx: number; sy: number; active: boolean } | null>(null)
  const justDragged = useRef(false)
  const [menu, setMenu] = useState<Menu | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null)
  const history = useRef<{ label: string; snap: unknown }[]>([])
  const [, bump] = useState(0)
  const [width, setWidth] = useState(1000)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el); setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  // Vertical only on a phone. On a computer the time line always runs left to right and the chart scrolls sideways if it is wide.
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(max-width: 700px)").matches)
  useEffect(() => {
    const mq = window.matchMedia?.("(max-width: 700px)")
    if (!mq) return
    const on2 = () => setPhone(mq.matches)
    mq.addEventListener("change", on2)
    return () => mq.removeEventListener("change", on2)
  }, [])
  const vertical = phone
  const styles = useStatusStyles()
  const ev = state.events.find(e => e.id === eventId)!
  const L = useMemo(() => metroLayout(state, sched, eventId, !vertical), [state, sched, eventId, vertical])

  // Pixel geometry. Horizontal: columns run left → right, rows above/below. Vertical (phone): top → bottom, branches to the right.
  const COL = vertical ? 64 : Math.max(96, Math.min(132, (width - 112) / Math.max(1, L.cols)))
  const ROW = vertical ? 132 : 76
  const PAD = vertical ? 28 : 56
  // A card for the highest rule-bound step opens above its dot. Keep real headroom for it instead of clipping it at
  // the chart edge (the USG request is a common example).
  const top = vertical ? 40 : 144 + (-L.minRow) * ROW
  const pos = (col: number, row: number) => vertical ? { x: 26 + row * ROW, y: top + col * COL } : { x: PAD + col * COL, y: top + row * ROW }
  const W = vertical ? Math.max(width, 26 + L.maxRow * ROW + 140) : PAD * 2 + L.cols * COL
  const H = vertical ? top + L.cols * COL + 60 : top + L.maxRow * ROW + 70

  const eventNodes = state.nodes.filter(n => n.eventId === eventId)
  const byId = new Map(eventNodes.map(n => [n.id, n]))
  const gaps = useMemo(() => flowGaps(L), [L])
  const gapPoint = (g: Gap) => pos(g.col, g.row)
  const name = (id: string | null, empty: string) => (id ? `“${byId.get(id)?.title ?? "step"}”` : empty)

  // ---- Editing the flow right on the chart (president and vice president) ----
  const port: EditPort = given ?? {
    snapshot: () => structuredClone(eventNodes),
    restore: snap => dispatch({ type: "restoreEventNodes", eventId, nodes: snap as Node[] }),
    applyEdits: edits => dispatch({ type: "applyStepEdits", eventId, edits }),
    addStep: (id, uId, vId) => dispatch({ type: "addEventStep", eventId, id, uId, vId }),
    removeStep: id => dispatch({ type: "removeEventStep", eventId, nodeId: id }),
    newId: () => `${eventId}:s${nextCounter(state.nodes.map(n => n.id), new RegExp(`^${eventId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:s(\\d+)$`))}`,
  }
  const tpl = port.template
  const snapshot = (label: string) => { history.current = [...history.current.slice(-9), { label, snap: port.snapshot() }]; bump(x => x + 1) }
  const say = (text: string, error = false) => setMsg({ text, error })
  const applyResult = (r: EditResult, label: string) => {
    if (r.error) return say(r.error, true)
    if (!r.edits.length) return say(r.message)
    snapshot(label)
    port.applyEdits(r.edits)
    say(`${r.message}${r.note ? ` ${r.note}` : ""}`)
  }
  const moveTo = (id: string, g: Gap) => applyResult(moveBetween(eventNodes, id, g.uId, g.vId), `Move ${byId.get(id)?.title ?? "step"}`)
  const addAt = (uId: string | null, vId: string | null) => {
    const id = port.newId()
    snapshot("Add a step")
    port.addStep(id, uId, vId)
    say("Added a new step. Give it a name and an owner in the details panel.")
    setMenu(null); onSelect(id)
  }
  const removeStep = (id: string) => {
    const n = byId.get(id)
    if (!n || cannotDelete(n)) return
    snapshot(`Delete ${n.title}`)
    port.removeStep(id)
    say(`Deleted “${n.title}”. Steps that waited for it now wait for what it waited for.`); setMenu(null)
  }
  const undo = () => {
    const last = history.current.pop()
    if (!last) return
    port.restore(last.snap)
    say(`Undone: ${last.label}`); bump(x => x + 1)
  }
  const local = (e: { clientX: number; clientY: number }) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const nearest = (x: number, y: number, rId: string) => {
    let best: Gap | null = null, bd = Infinity
    for (const g of gaps) { if (g.uId === rId || g.vId === rId) continue; const p = gapPoint(g), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = g } }
    return bd <= SNAP ? best : null
  }
  const setDragBoth = (d: typeof drag) => { dragRef.current = d; setDrag(d) }
  const onDown = (e: RPointerEvent<HTMLButtonElement>, id: string) => {
    if (!on || e.button !== 0) return
    press.current = { id, sx: e.clientX, sy: e.clientY, active: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const p = press.current
    if (!p) return
    if (!p.active && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6) return
    p.active = true; setMenu(null)
    const at = local(e)
    setDragBoth({ id: p.id, x: at.x, y: at.y, gap: nearest(at.x, at.y, p.id) })
    const w = wrap.current
    if (w) { const r = w.getBoundingClientRect(); if (e.clientX > r.right - 40) w.scrollLeft += 18; else if (e.clientX < r.left + 40) w.scrollLeft -= 18 }
  }
  const onUp = () => {
    const p = press.current; press.current = null
    if (!p?.active) return
    justDragged.current = true
    const d = dragRef.current; setDragBoth(null)
    if (d?.gap) moveTo(p.id, d.gap); else say("Dropped away from the line, so nothing changed. Drop a step on a diamond between two steps.")
  }
  const onCancel = () => { press.current = null; setDragBoth(null) }
  /** Keyboard alternative to dragging: Alt + ← / → moves the step one place earlier or later on its line. */
  const shift = (id: string, dir: -1 | 1) => {
    for (const t of flowTracks(L)) {
      const i = t.items.findIndex(x => x.node?.id === id && (t.id === "main" || x.row !== 0))
      if (i < 0) continue
      const to = t.items[i + dir], beyond = t.items[i + 2 * dir]
      if (!to || !to.node) return say(dir > 0 ? "It is already the last step before the event day." : "It is already the first step.")
      const [a, b] = dir > 0 ? [to, beyond] : [beyond, to]
      return applyResult(moveBetween(eventNodes, id, a?.node?.id ?? null, b?.node?.id ?? null), `Move ${byId.get(id)?.title ?? "step"}`)
    }
  }
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (!on) return
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); shift(id, e.key === "ArrowRight" ? 1 : -1) }
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setMenu({ kind: "node", id, x: r.left, y: r.bottom + 8 }) }
  }
  const openNode = (id: string, e: { clientX: number; clientY: number }) => { if (!on) return; setMenu({ kind: "node", id, x: e.clientX, y: e.clientY + 12 }) }
  const openGap = (g: Gap, e: { clientX: number; clientY: number }) => setMenu({ kind: "gap", gap: g, x: e.clientX, y: e.clientY + 12 })
  useEffect(() => {
    if (!menu) return
    menuRef.current?.querySelector<HTMLElement>("button:not([disabled]), select")?.focus({ preventScroll: true })
    const away = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as globalThis.Node)) setMenu(null) }
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setMenu(null) }
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc)
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc) }
  }, [menu])
  useEffect(() => { history.current = []; setMenu(null); setMsg(null) }, [eventId])

  const stateOf = (n: Node) => {
    if (tpl) return "todo" as const
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
  /** A hit target follows the exact painted rail segment, so its mint feedback overlays the grey line. */
  const gapPath = (g: Gap) => {
    if (g.track === "main") { const a = pos(g.u.col, 0), b = pos(g.v.col, 0); return `M${a.x} ${a.y}L${b.x} ${b.y}` }
    const branch = L.branches.find(b => b.id === g.track)!
    const a = pos(L.stations[branch.from].col, 0), b = pos(L.stations[branch.to].col, 0)
    const points = branch.nodes.map(x => pos(x.col, branch.row))
    const at = points.findIndex(p => p.x === pos(g.u.col, g.u.row).x && p.y === pos(g.u.col, g.u.row).y)
    const next = points.findIndex(p => p.x === pos(g.v.col, g.v.row).x && p.y === pos(g.v.col, g.v.row).y)
    if (vertical) {
      const ra = pos(L.stations[branch.from].col, branch.row), rb = pos(L.stations[branch.to].col, branch.row), ya = a.y + 30, yb = b.y - 30
      if (at === -1) return `M${a.x} ${a.y} C${a.x} ${a.y + 20} ${ra.x} ${ya - 20} ${ra.x} ${ya} L${ra.x} ${points[0].y}`
      if (next === -1) return `M${points.at(-1)!.x} ${points.at(-1)!.y} L${rb.x} ${yb} C${rb.x} ${yb + 20} ${b.x} ${b.y - 20} ${b.x} ${b.y}`
      return `M${points[at].x} ${points[at].y}L${points[next].x} ${points[next].y}`
    }
    const ra = pos(L.stations[branch.from].col, branch.row), rb = pos(L.stations[branch.to].col, branch.row), xa = a.x + 34, xb = b.x - 34
    if (at === -1) return `M${a.x} ${a.y} C${a.x + 22} ${a.y} ${xa - 22} ${ra.y} ${xa} ${ra.y} L${points[0].x} ${ra.y}`
    if (next === -1) return `M${points.at(-1)!.x} ${points.at(-1)!.y} L${xb} ${rb.y} C${xb + 22} ${rb.y} ${b.x - 22} ${b.y} ${b.x} ${b.y}`
    return `M${points[at].x} ${points[at].y}L${points[next].x} ${points[next].y}`
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
    const issue = tpl ? undefined : worstIssue(plan?.issues)    // a workflow has no dates, so the dates' problems are not its problems
    const owner = state.people.find(x => x.id === n.ownerId)?.name
    const mark = tpl?.marks?.[n.id]
    const label = tpl ? tpl.lines(n).join(". ") + "." : `${n.title}. ${styles[n.status].label}. Owner ${owner ?? "none"}. Club deadline ${plan ? fmtShort(plan.club) : "pending"}${plan?.official ? `, ASU deadline ${fmtShort(plan.official)}` : ""}.${issue ? ` ${issue.text}` : ""}`
    const kind = SITUATION_KEYS.has(n.stepKey ?? "") ? "situation" : "baseline"
    return <div key={n.id} className={`m-node ${labelSide} ${n.id === selectedId ? "is-selected" : ""}${drag?.id === n.id ? " is-dragging" : ""}`} style={{ left: p.x, top: p.y }}>
      <button type="button" className={`m-dot ${kind} ${st} ${issue ? `has-${issue.severity}` : ""}${mark ? ` mark-${mark}` : ""}`} onClick={e => { if (justDragged.current) { justDragged.current = false; return } if (on && touch) openNode(n.id, e); else onSelect(n.id) }} aria-label={`${label}. ${kind === "baseline" ? "Core event step." : "Situation-based step."}${on ? " Drag to move it, double-click for more, or press Alt and an arrow key to move it." : ""}`} data-testid={`flow-node-${n.stepKey ?? n.id}`}
        onPointerDown={e => onDown(e, n.id)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onDoubleClick={e => openNode(n.id, e)} onContextMenu={e => { if (on) { e.preventDefault(); openNode(n.id, e) } }} onKeyDown={e => onKey(e, n.id)} />
      <span className="m-label" aria-hidden="true"><b>{shortTitle(n)}</b><span>{tpl ? tpl.sublabel(n) : firstName(state, n.ownerId)}</span></span>
      <span className="m-card" role="tooltip">
        <b>{n.title}</b>
        {tpl ? tpl.lines(n).slice(1).map((t, i) => <span key={i}>{t}</span>) : <>
          <span>{owner ?? "No owner"} · {styles[n.status].label}{plan ? ` · due ${fmtShort(plan.club)}` : ""}</span>
          {plan?.official ? <span>ASU deadline {fmtShort(plan.official)}{n.ruleIds[0] ? ` (${n.ruleIds[0]})` : ""}</span> : null}
          {issue ? <span className="m-card-warn">{issue.text}</span> : n.waitingOn ? <span>Waiting on: {n.waitingOn}</span> : null}
        </>}
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
  return <>
    {canEdit && <div className="m-edit-bar">
      {!alwaysEdit && requestedEditing === undefined && <button type="button" className="btn small" aria-pressed={editing} onClick={() => { setEditing(!editing); setMenu(null); setDragBoth(null) }} data-testid="flow-edit-toggle">{editing ? "Done editing" : "Edit flow"}</button>}
      {on && <button type="button" className="btn small" onClick={undo} disabled={!history.current.length} data-testid="flow-undo">Undo{history.current.length ? `: ${history.current[history.current.length - 1].label}` : ""}</button>}
      {on && <span className="small muted">{touch ? "Tap a step for add, delete and details · Drag it onto a ◆ to move it · Double-tap a line to cut or add a link" : "Drag a step onto a ◆ between two steps · Double-click a step to add or delete · Double-click a line to cut or add a link"}</span>}
      <span role="status" aria-live="polite" className={`small ${msg?.error ? "late-text" : ""}`} data-testid="flow-edit-msg">{on ? msg?.text : ""}</span>
    </div>}
  <div className={`metro ${vertical ? "vertical" : ""}${on ? " editing" : ""}${drag ? " dragging" : ""}`} ref={wrap} data-testid="flow-chart" style={{ "--label-w": `${vertical ? 140 : COL - 8}px` } as CSSProperties}>
    <div className="metro-canvas" ref={canvasRef} style={{ width: W, height: H }}>
      <svg width={W} height={H} aria-hidden="true">
        {!vertical && !tpl && ticks.map(t => <text key={t.label} x={pos(t.at, 0).x} y={18} className="m-tick" textAnchor="middle">{t.label}</text>)}
        {!vertical && !tpl && <text x={pos(evStation.col, 0).x} y={18} className="m-tick strong" textAnchor="middle">{fmtShort(ev.date)}</text>}
        {L.branches.map(b => <path key={b.id} d={branchPath(b.from, b.to, b.row)} className={`m-line branch ${b.nodes.every(x => x.node.status === "done") ? "done" : ""}`} />)}
        <path d={mainPath} className="m-line main" />
        {donePath && <path d={donePath} className="m-line main done" />}
        {on && gaps.map(g => { const d = gapPath(g); return <g key={g.id}><path d={d} className={`m-hit ${g.track === "main" ? "m-hit-main" : ""}`} data-testid={`flow-line-${g.u.key}-${g.v.key}`} onDoubleClick={e => openGap(g, e)} /><path d={d} className="m-hit-line" /></g> })}
        {!tpl && (() => { const p = pos(todayCol, 0); return vertical
          ? <g className="m-today"><line x1={4} x2={W - 4} y1={p.y} y2={p.y} /><text x={W - 8} y={p.y - 6} textAnchor="end">Today</text></g>
          : <g className="m-today"><line x1={p.x} x2={p.x} y1={28} y2={H - 18} /><text x={p.x} y={H - 4} textAnchor="middle">Today</text></g> })()}
      </svg>
      {L.stations.map(s => s.node ? dot(s.node, s.col, 0, vertical ? "right" : "below") : null)}
      {L.branches.flatMap(b => b.nodes.map(x => dot(x.node, x.col, b.row, vertical ? "right" : b.row < 0 ? "above" : "below")))}
      {L.stations.filter(s => s.key === EVENT_KEY || s.key === START_KEY || s.key === END_KEY).map(s => {
        const p = pos(s.col, 0)
        return <div key={s.key} className={`m-node ${vertical ? "right" : "below"} m-${s.key.replaceAll("_", "")}`} style={{ left: p.x, top: p.y }}>
          <span className={`m-dot station ${s.key === EVENT_KEY ? (ev.date < state.today ? "done" : "event") : "todo"}`} />
          <span className="m-label"><b>{s.key === EVENT_KEY ? "Event day" : s.key === START_KEY ? "Start" : "Done"}</b>{s.key === EVENT_KEY && vertical && !tpl ? <span>{fmtShort(ev.date)}</span> : null}</span>
        </div>
      })}
      {on && drag && <>
        {gaps.filter(g => g.uId !== drag.id && g.vId !== drag.id).map(g => { const p = gapPoint(g); return <span key={g.id} className={`m-gap${drag.gap?.id === g.id ? " is-near" : ""}`} style={{ left: p.x, top: p.y }} aria-hidden="true" /> })}
        <span className="m-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><b>{byId.get(drag.id)?.title}</b>{drag.gap && <i>Between {name(drag.gap.uId, "the start")} and {name(drag.gap.vId, "the event day")}</i>}</span>
      </>}
      {on && menu && (() => {
        const left = Math.max(8, Math.min(menu.x, window.innerWidth - 256)), top = Math.max(8, Math.min(menu.y, window.innerHeight - 380))
        if (menu.kind === "node") {
          const n = byId.get(menu.id)
          if (!n) return null
          const track = flowTracks(L).map(t => ({ t, i: t.items.findIndex(x => x.node?.id === n.id && (t.id === "main" || x.row !== 0)) })).find(x => x.i >= 0)
          const prev = track?.t.items[track.i - 1], next = track?.t.items[track.i + 1]
          const block = cannotDelete(n)
          const upstream = n.dependsOn.map(d => byId.get(d)).filter((x): x is Node => !!x)
          return <div className="m-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label={`Actions for ${n.title}`} style={{ left, top }} data-testid="flow-menu">
            <b>{n.title}</b>
            {touch && <button type="button" className="btn small" onClick={() => { setMenu(null); onSelect(n.id) }}>Open details</button>}
            <button type="button" className="btn small" onClick={() => addAt(n.id, next && next.key !== EVENT_KEY && next.key !== END_KEY ? next.node?.id ?? null : null)}>Add a step after this one</button>
            <button type="button" className="btn small" disabled={!prev || prev.key === EVENT_KEY} onClick={() => addAt(prev?.node?.id ?? null, n.id)}>Add a step before this one</button>
            <button type="button" className="btn small" disabled={!!block} onClick={() => removeStep(n.id)} aria-describedby={block ? "m-menu-why" : undefined}>Delete this step</button>
            {block && <span id="m-menu-why" className="small muted">Cannot delete: {block}</span>}
            {upstream.length > 0 && <label className="small">Stop waiting for…<select aria-label={`Stop ${n.title} waiting for`} value="" onChange={e => { if (e.target.value) { applyResult(unlinkSteps(eventNodes, n.id, e.target.value), "Cut a link"); setMenu(null) } }}><option value="">Choose a step</option>{upstream.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}</select></label>}
            <button type="button" className="btn btn-quiet small" onClick={() => setMenu(null)}>Close</button>
          </div>
        }
        const g = menu.gap, u = g.uId ? byId.get(g.uId) : undefined, v = g.vId ? byId.get(g.vId) : undefined
        const direct = !!(u && v && v.dependsOn.includes(u.id)), indirect = !!(u && v && !direct && ancestorsOf(eventNodes, v.id).has(u.id))
        return <div className="m-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label="Actions for this line" style={{ left, top }} data-testid="flow-menu">
          <b>{u ? `After “${u.title}”` : "From the start"}{v ? `, before “${v.title}”` : ", before the event day"}</b>
          {u && v && direct && <button type="button" className="btn small" onClick={() => { applyResult(unlinkSteps(eventNodes, v.id, u.id), "Cut a link"); setMenu(null) }}>Remove the link: “{v.title}” stops waiting</button>}
          {u && v && !direct && !indirect && <><span className="small muted">These two steps are not linked: the line only shows their order.</span><button type="button" className="btn small" onClick={() => { applyResult(doAfter(eventNodes, v.id, u.id), "Add a link"); setMenu(null) }}>Make “{v.title}” wait for “{u.title}”</button></>}
          {u && v && indirect && <span className="small muted">“{v.title}” waits for “{u.title}” through other steps. Cut a link on that path to separate them.</span>}
          {!(u && v) && <span className="small muted">This line has no link to cut. It leads to the start or the event day.</span>}
          <button type="button" className="btn small" onClick={() => addAt(g.uId, g.vId)}>Add a step here</button>
          <button type="button" className="btn btn-quiet small" onClick={() => setMenu(null)}>Close</button>
        </div>
      })()}
    </div>
    {tpl ? <div className="m-legend small" aria-label="Legend"><span><i className="m-dot baseline todo" />Core event step</span><span><i className="m-dot situation todo" />Situation-based step</span></div> : <div className="m-legend small" aria-label="Legend">
      <span><i className="m-dot done" />Done</span><span><i className="m-dot now" />In progress</span><span><i className="m-dot todo" />Not started</span><span><i className="m-dot risk" />At risk</span>
    </div>}
  </div>
  </>
}
