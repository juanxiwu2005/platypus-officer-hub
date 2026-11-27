import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react"
import type { DemoState, Node, WorkflowBranch } from "../../data/types"
import type { Schedule } from "../../engine/schedule"
import type { Forecast } from "../../engine/forecast"
import { fmtShort } from "../../lib/dates"
import { firstName, worstIssue } from "../../pages/helpers"
import { nodeStop } from "../../lib/phases"
import { isAtRisk } from "../../lib/nextUp"
import { useStatusStyles, useTouch } from "../ui"
import { EVENT_KEY, END_KEY, START_KEY, metroLayout } from "./metro"
import { useStore } from "../../data/store"
import { prefersReducedMotion, tokenMs } from "../../lib/motion"
import { nextCounter } from "../../lib/ids"
import { cannotDelete, flowGaps, flowTracks, insertFlowBranch, insertFlowStep, moveBetween, newStepNode, type FlowInsertionTarget, type Gap } from "../../lib/flowEdit"
import { type EditResult, type StepEdit } from "../../lib/stepOrder"
import { isolateDialog, trapTabKey } from "../../lib/focus"
import { branchConditionLabel, conditionLabel, conditionsOf, placementOf, resolveBranches, scopeKey } from "../../engine/workflowBranches"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { WorkflowBranchDialog, type BranchDraft } from "../setup/WorkflowBranchDialog"
import { hasTeamExecutionTracks } from "./teamMetro"

const TeamMetroChart = lazy(() => import("./TeamMetroChart").then(module => ({ default: module.TeamMetroChart })))

const SHORT: Record<string, string> = {
  plan: "Event plan", backup: "Back-up plan", venuechoice: "Candidate venue", registry: "Event Registry", venue: "Book room",
  moderator: "Moderator staffing", materials: "Event materials", checkin: "Check-in forms", headcount: "Headcount",
  thankyou: "Thank you", feedback: "Feedback", postmarketing: "Post marketing", photoBackup: "Photo backup", invoice: "Invoice",
  attendance: "Attendance submit", spending: "Paid reimbursed", financeRecord: "Finance record", documentation: "Documentation",
  partner: "Partner meeting", speakerPacket: "Speaker packet", travel: "Travel plan", partnerReview: "Partner review", parking: "Parking validation",
  budget: "Budget", foodCompliance: "Food exception", quotes: "Quote gather", budgetRequest: "Budget request", budgetApproval: "Budget approval",
  purchaseRequest: "Purchase request", purchaseApproval: "Purchase approval", orderPlaced: "Order placed", advisor: "Advisor", access: "Accessibility",
  security: "Security", eams: "EAMS plan", permit: "Permit insurance", alcohol: "Alcohol permit", drone: "Drone approval", schoolApproval: "School approval",
  marketingNeeds: "Marketing needs", contentCreation: "Content creation", promotionItems: "Promotion items", rsvp: "Open RSVPs", content: "Content distribution", reminder: "Event reminder", finalcheck: "Full check",
}
/** Two to four words for the chart; the full title is in the hover card. */
export const shortTitle = (n: Node) => (n.stepKey && SHORT[n.stepKey]) || n.title.split(/\s+/).slice(0, 3).join(" ").replace(/[,:;]$/, "")

/**
 * What the chart changes when it is edited. For a real event the chart changes the event's steps in the store; for the club's own workflow
 * (setup) the caller supplies the same few actions on its own list of steps, and `template` turns off everything that is about dates and progress.
 */
export interface EditPort {
  snapshot: () => unknown
  restore: (snap: unknown) => boolean | void
  applyEdits: (edits: StepEdit[]) => boolean | void
  addStep: (id: string, uId: string | null, vId: string | null, target?: FlowInsertionTarget) => boolean | void
  addBranch?: (branch: WorkflowBranch, firstId: string, firstTitle: string) => boolean | void
  removeStep: (id: string) => boolean | void
  newId: () => string
  template?: { sublabel: (n: Node) => string; lines: (n: Node) => string[]; marks?: Record<string, "error" | "warn"> }
}
interface Props { state: DemoState; sched: Schedule; forecast: Forecast; eventId: string; selectedId: string | null; onSelect: (id: string) => void; canEdit?: boolean; alwaysEdit?: boolean; editing?: boolean; onEditingChange?: (editing: boolean) => void; port?: EditPort }
type Menu = { kind: "node"; id: string; x: number; y: number } | { kind: "move"; id: string; target: FlowInsertionTarget; x: number; y: number }
const SNAP = 72
// Restore visual link hover by enabling this flag. It never enables link editing.
const ENABLE_LINK_HOVER = false

/** One main line; parallel work forks off and merges back. Look → hover → click. */
export function MetroChart(props: Props) {
  const event = props.state.events.find(item => item.id === props.eventId)
  // Authoring belongs to Settings. New saved-template runs use the same task
  // records as details/reminders, rendered as points on unique team tracks.
  if (!props.port && hasTeamExecutionTracks(event, props.state.nodes.filter(node => node.eventId === props.eventId))) return <Suspense fallback={<p className="small muted" role="status">Loading task tracks…</p>}><TeamMetroChart {...props} /></Suspense>
  return <LegacyMetroChart {...props} />
}

function LegacyMetroChart({ state, sched, forecast, eventId, selectedId, onSelect, canEdit = false, alwaysEdit = false, editing: requestedEditing, onEditingChange, port: given }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const { tryDispatch } = useStore()
  const touch = useTouch()
  const [localEditing, setLocalEditing] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
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
  const [menuBranchId, setMenuBranchId] = useState("")
  const [addingBranch, setAddingBranch] = useState(false)
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
  // Where each step sits in the chart (not its colour or status): when this changes because someone moved a step, the steps glide to
  // their new places and the lines dim while they do, so the dots and the lines never disagree about where things are (DX-22).
  // A window resize or the first draw changes pixel positions but not this, so those snap.
  const placeKey = useMemo(() => L.stations.map(s => `${s.key}:${s.col}`).join() + "|" + L.branches.map(b => `${b.id}:${b.row}:${b.nodes.map(x => `${x.node.id}@${x.col}`).join()}`).join(";"), [L])
  const [restKey, setRestKey] = useState(placeKey)
  const settling = restKey !== placeKey && !prefersReducedMotion()
  useEffect(() => {
    if (restKey === placeKey) return
    const t = setTimeout(() => setRestKey(placeKey), tokenMs("--spring-ui-dur", 450) + 60)
    return () => clearTimeout(t)
  }, [placeKey, restKey])

  // Pixel geometry. Horizontal: columns run left → right, rows above/below. Vertical (phone): top → bottom, branches to the right.
  const COL = vertical ? 64 : Math.max(72, Math.min(96, (width - 80) / Math.max(1, L.cols)))
  const ROW = vertical ? 132 : 60
  const PAD = vertical ? 28 : 56
  // A card for the highest rule-bound step opens above its dot. Keep real headroom for it instead of clipping it at
  // the chart edge (the USG request is a common example).
  const top = vertical ? 40 : 150 + (-L.minRow) * ROW
  const pos = (col: number, row: number) => vertical ? { x: 26 + row * ROW, y: top + col * COL } : { x: PAD + col * COL, y: top + row * ROW }
  const W = vertical ? Math.max(width, 26 + L.maxRow * ROW + 140) : PAD * 2 + L.cols * COL
  const H = vertical ? top + L.cols * COL + 60 : top + L.maxRow * ROW + 130

  const eventNodes = state.nodes.filter(n => n.eventId === eventId)
  const branchDefinitions = resolveBranches(eventNodes, ev.workflowBranches)
  const byId = new Map(eventNodes.map(n => [n.id, n]))
  const gaps = useMemo(() => flowGaps(L), [L])
  const gapPoint = (g: Gap) => pos(g.col, g.row)
  const name = (id: string | null, empty: string) => (id ? `“${byId.get(id)?.title ?? "step"}”` : empty)

  // ---- Editing the flow right on the chart (president and vice president) ----
  const port: EditPort = given ?? {
    snapshot: () => structuredClone({ nodes: eventNodes, branches: branchDefinitions }),
    restore: snap => { const saved = Array.isArray(snap) ? { nodes: snap as Node[], branches: undefined } : snap as { nodes: Node[]; branches?: WorkflowBranch[] }; return tryDispatch({ type: "restoreEventNodes", eventId, nodes: saved.nodes, branches: saved.branches }) },
    applyEdits: edits => tryDispatch({ type: "applyStepEdits", eventId, edits }),
    addStep: (id, uId, vId, target) => tryDispatch({ type: "addEventStep", eventId, id, uId, vId, target }),
    addBranch: (branch, id, title) => tryDispatch({ type: "addEventBranch", eventId, id, branch, title }),
    removeStep: id => tryDispatch({ type: "removeEventStep", eventId, nodeId: id }),
    newId: () => `${eventId}:s${nextCounter(state.nodes.map(n => n.id), new RegExp(`^${eventId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:s(\\d+)$`))}`,
  }
  const tpl = port.template
  const saveSnapshot = (label: string, snap: unknown) => { history.current = [...history.current.slice(-9), { label, snap }]; bump(x => x + 1) }
  const say = (text: string, error = false) => setMsg({ text, error })
  const applyResult = (r: EditResult, label: string) => {
    if (r.error) return say(r.error, true)
    if (!r.edits.length) return say(r.message)
    const snap = port.snapshot()
    if (port.applyEdits(r.edits) === false) return say("The change was not saved. Please retry before leaving.", true)
    saveSnapshot(label, snap)
    say(`${r.message}${r.note ? ` ${r.note}` : ""}`)
  }
  const gapTarget = (g: Gap): FlowInsertionTarget => ({ branchId: g.track, afterId: g.uId, beforeId: g.vId, source: "gap" })
  const moveToTarget = (id: string, target: FlowInsertionTarget, confirmed = false) => {
    const node = byId.get(id)
    if (!node) return
    const origin = branchDefinitions.find(b => b.id === placementOf(node).branchId)
    const destination = branchDefinitions.find(b => b.id === target.branchId)
    if (origin && destination && origin.side !== destination.side) return say("Steps cannot move between preparation and close-out. Choose a branch on the same side of the event day.", true)
    const moved = { ...node, placement: { branchId: target.branchId, order: 0 }, cond: confirmed ? undefined : node.cond }
    const changesScope = placementOf(node).branchId !== target.branchId && scopeKey(node, branchDefinitions) !== scopeKey(moved, branchDefinitions)
    if (changesScope && !confirmed) {
      const preview = moveBetween(eventNodes, id, target.afterId, target.beforeId, { target: { ...target, condition: null }, branches: branchDefinitions, conditionConfirmed: true })
      if (preview.error) return say(preview.error, true)
      const r = canvasRef.current?.getBoundingClientRect()
      setMenu({ kind: "move", id, target, x: r?.left ?? 100, y: r?.top ?? 100 }); return
    }
    applyResult(moveBetween(eventNodes, id, target.afterId, target.beforeId, { target: confirmed ? { ...target, condition: null } : target, branches: branchDefinitions, conditionConfirmed: confirmed }), `Move ${node.title}`)
  }
  const moveTo = (id: string, g: Gap) => moveToTarget(id, gapTarget(g))
  const addAt = (target: FlowInsertionTarget) => {
    const id = port.newId()
    const reference = byId.get(target.referenceId ?? target.afterId ?? target.beforeId ?? "")
    const branch = branchDefinitions.find(b => b.id === target.branchId)
    const fresh = { ...newStepNode(ev, id, reference, state.today, branchDefinitions), phase: branch?.side === "after_event" ? "close" as const : reference?.phase === "close" ? "prepare" as const : reference?.phase ?? "prepare" as const }
    const result = insertFlowStep(eventNodes, fresh, target, branchDefinitions)
    if (result.error) return say(result.error, true)
    const snap = port.snapshot()
    if (port.addStep(id, target.afterId, target.beforeId, target) === false) return say("The new step was not saved. Please retry.", true)
    saveSnapshot("Add a step", snap)
    say("Added a new step. Give it a name and an owner in the details panel.")
    setMenu(null); onSelect(id)
  }
  const createBranch = (draft: BranchDraft): string | null => {
    if (!port.addBranch) return "Adding branches is not available here."
    let branchId = "branch-1", index = 1
    while (branchDefinitions.some(b => b.id === branchId)) branchId = `branch-${++index}`
    const branch: WorkflowBranch = { id: branchId, title: draft.title, side: draft.side, order: Math.max(-1, ...branchDefinitions.map(b => b.order)) + 1, conditions: [...draft.conditions], defaultRoleId: draft.defaultRoleId }
    const id = port.newId()
    const fresh = { ...newStepNode(ev, id, undefined, state.today), title: draft.firstStepTitle, phase: draft.side === "after_event" ? "close" as const : "prepare" as const, stepKind: draft.conditions.length ? "situation" as const : "core" as const }
    const result = insertFlowBranch(eventNodes, fresh, branch, branchDefinitions)
    if (result.error) return result.error
    const snap = port.snapshot()
    if (port.addBranch(branch, id, draft.firstStepTitle) === false) return "The branch was not saved. Please retry."
    saveSnapshot("Add branch", snap); setAddingBranch(false); setMenu(null); onSelect(id)
    say(`Added “${branch.title}” and its first task.`)
    return null
  }
  const removeStep = (id: string) => {
    const n = byId.get(id)
    if (!n || cannotDelete(n)) return
    const snap = port.snapshot()
    if (port.removeStep(id) === false) return say("The deletion was not saved. Please retry.", true)
    saveSnapshot(`Delete ${n.title}`, snap)
    say(`Deleted “${n.title}”. Steps that waited for it now wait for what it waited for.`); setMenu(null)
  }
  const undo = () => {
    const last = history.current.at(-1)
    if (!last) return
    if (port.restore(last.snap) === false) return say("Undo was not saved. Please retry.", true)
    history.current.pop()
    say(`Undone: ${last.label}`); bump(x => x + 1)
  }
  const local = (e: { clientX: number; clientY: number }) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const nearest = (x: number, y: number, rId: string) => {
    let best: Gap | null = null, bd = Infinity
    for (const g of gaps) { if (g.track === "main" || g.uId === rId || g.vId === rId) continue; const p = gapPoint(g), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = g } }
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
      return moveToTarget(id, { branchId: t.id, afterId: a?.node?.id ?? null, beforeId: b?.node?.id ?? null, source: "gap" })
    }
  }
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (!on) return
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); shift(id, e.key === "ArrowRight" ? 1 : -1) }
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setMenuBranchId(""); setMenu({ kind: "node", id, x: r.left, y: r.bottom + 8 }) }
  }
  const openNode = (id: string, e: { clientX: number; clientY: number }) => { if (!on) return; setMenuBranchId(""); setMenu({ kind: "node", id, x: e.clientX, y: e.clientY + 12 }) }
  useEffect(() => {
    if (!menu) return
    const dialog = menuRef.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.querySelector<HTMLElement>("button:not([disabled]), select")?.focus({ preventScroll: true })
    const restoreBackground = isolateDialog(dialog)
    const away = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as globalThis.Node)) setMenu(null) }
    const esc = (e: globalThis.KeyboardEvent) => {
      trapTabKey(e, dialog)
      if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); setMenu(null) }
    }
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc)
      restoreBackground()
      setTimeout(() => {
        if (opener?.isConnected && (document.activeElement === document.body || dialog.contains(document.activeElement))) opener.focus()
      }, 0)
    }
  }, [menu])
  useEffect(() => { history.current = []; setMenu(null); setMsg(null) }, [eventId])
  useEffect(() => {
    const reset = () => {
      history.current = []; setMenu(null); setMsg(null); setDragBoth(null); bump(x => x + 1)
    }
    window.addEventListener("platypus:reset", reset)
    return () => window.removeEventListener("platypus:reset", reset)
  }, [])

  const stateOf = (n: Node) => {
    if (tpl) return "todo" as const
    return nodeStop(n, state.today, isAtRisk(state, sched, forecast, n))
  }
  const lastDoneMain = L.stations.reduce((k, s, i) => (s.node?.status === "done" ? i : k), -1)
  const mainPts = L.stations.map(s => pos(s.col, 0))
  // Start only fans out into the five routes. Do not paint a duplicate centre
  // rail underneath them; the visible main spine begins at Full Check.
  const visibleMainPts = mainPts.slice(1)
  const mainPath = visibleMainPts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ")
  const donePath = lastDoneMain > 1 ? mainPts.slice(1, lastDoneMain + 1).map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ") : ""
  const branchPath = (from: number, to: number, row: number) => {
    const a = pos(L.stations[from].col, 0), b = pos(L.stations[to].col, 0), ra = pos(L.stations[from].col, row), rb = pos(L.stations[to].col, row)
    if (vertical) { const ya = a.y + 30, yb = b.y - 30; return `M${a.x} ${a.y} C${a.x} ${a.y + 20} ${ra.x} ${ya - 20} ${ra.x} ${ya} L${rb.x} ${yb} C${rb.x} ${yb + 20} ${b.x} ${b.y - 20} ${b.x} ${b.y}` }
    const xa = a.x + 34, xb = b.x - 34
    return `M${a.x} ${a.y} C${a.x + 22} ${a.y} ${xa - 22} ${ra.y} ${xa} ${ra.y} L${xb} ${rb.y} C${xb + 22} ${rb.y} ${b.x - 22} ${b.y} ${b.x} ${b.y}`
  }
  /** Optional visual hover follows the rail; line clicks and double-clicks have no action. */
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

  const evStation = L.stations.find(s => s.key === EVENT_KEY)!

  // S3: a lane names its owner once, and again only where the owner changes; every dot's hover card and label still name them.
  const dot = (n: Node, col: number, row: number, labelSide: "below" | "above" | "right", prev?: Node | null) => {
    const showOwner = !prev || prev.ownerId !== n.ownerId
    const p = pos(col, row)
    const st = stateOf(n)
    const plan = sched.nodes[n.id]
    const issue = tpl ? undefined : worstIssue(plan?.issues)    // a workflow has no dates, so the dates' problems are not its problems
    const owner = state.people.find(x => x.id === n.ownerId)?.name
    const mark = tpl?.marks?.[n.id]
    const label = tpl ? tpl.lines(n).join(". ") + "." : `${n.title}. ${styles[n.status].label}. Owner ${owner ?? "none"}. Due ${plan ? fmtShort(plan.club) : "pending"}.${issue ? ` ${issue.text}` : ""}`
    const kind = workflowStepKind(n, branchDefinitions) === "core" ? "baseline" : "situation"
    const showCard = hoveredId === n.id || focusedId === n.id
    const cardId = `flow-card-${n.id}`
    return <div key={n.id} className={`m-node ${labelSide} ${n.id === selectedId ? "is-selected" : ""}${drag?.id === n.id ? " is-dragging" : ""}`} style={{ "--x": `${p.x}px`, "--y": `${p.y}px` } as CSSProperties}
      onPointerEnter={e => { if (e.pointerType !== "touch") setHoveredId(n.id) }} onPointerLeave={() => setHoveredId(null)}
      onFocus={() => setFocusedId(n.id)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusedId(null) }}>
      <button type="button" className={`m-dot ${kind} ${st} ${issue ? `has-${issue.severity}` : ""}${mark ? ` mark-${mark}` : ""}`} onClick={e => { if (justDragged.current) { justDragged.current = false; return } if (on && touch && e.detail > 0) openNode(n.id, e); else onSelect(n.id) }} aria-label={`${label}. ${kind === "baseline" ? "Core event step." : "Situation-based step."}${on ? " Drag to move it, double-click for more, or press Alt and an arrow key to move it." : ""}`} data-testid={`flow-node-${n.stepKey ?? n.id}`}
        aria-describedby={showCard ? cardId : undefined} onPointerDown={e => onDown(e, n.id)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onDoubleClick={e => openNode(n.id, e)} onContextMenu={e => { if (on) { e.preventDefault(); openNode(n.id, e) } }} onKeyDown={e => onKey(e, n.id)} />
      <span className="m-label" aria-hidden="true"><b>{shortTitle(n)}</b><span>{tpl ? tpl.sublabel(n) : showOwner ? firstName(state, n.ownerId) : null}</span></span>
      {showCard && <span id={cardId} className="m-card" role="tooltip">
        <b>{n.title}</b>
        {tpl ? tpl.lines(n).slice(1).map((t, i) => <span key={i}>{t}</span>) : <>
          <span>{owner ?? "No owner"} · {styles[n.status].label}{plan ? ` · Due ${fmtShort(plan.club)}` : ""}</span>
          {issue ? <span className="m-card-warn">{issue.text}</span> : n.waitingOn ? <span>Waiting on: {n.waitingOn}</span> : null}
        </>}
      </span>}
    </div>
  }

  // Open every activity at its beginning so the always-active Start station is visible.
  useEffect(() => {
    const el = wrap.current
    if (!el || vertical || W <= el.clientWidth) return
    el.scrollLeft = 0
  }, [eventId, vertical, L.cols])
  return <>
    {canEdit && <div className="m-edit-bar">
      {!alwaysEdit && requestedEditing === undefined && <button type="button" className="btn small" aria-pressed={editing} onClick={() => { setEditing(!editing); setMenu(null); setDragBoth(null) }} data-testid="flow-edit-toggle">{editing ? "Done editing" : "Edit flow"}</button>}
      {on && <button type="button" className="btn small" onClick={undo} disabled={!history.current.length} data-testid="flow-undo">Undo{history.current.length ? `: ${history.current[history.current.length - 1].label}` : ""}</button>}
      {on && port.addBranch && <button type="button" className="btn small" onClick={() => { setMenu(null); setAddingBranch(true) }} data-testid="flow-add-branch">Add branch</button>}
      {on && <span className="small muted">{touch ? "Tap a step for add, delete and details · Drag it onto a ◆ to move it" : "Drag a step onto a ◆ between two steps · Double-click a step to add or delete"}</span>}
      <span role="status" aria-live="polite" className={`small ${msg?.error ? "late-text" : ""}`} data-testid="flow-edit-msg">{on ? msg?.text : ""}</span>
    </div>}
  <div className={`metro ${vertical ? "vertical" : ""}${on ? " editing" : ""}${drag ? " dragging" : ""}${settling ? " is-settling" : ""}${ENABLE_LINK_HOVER ? " link-hover-enabled" : ""}`} ref={wrap} data-testid="flow-chart" style={{ "--label-w": `${vertical ? 140 : COL - 8}px` } as CSSProperties}>
    <div className="metro-canvas" ref={canvasRef} style={{ width: W, height: H }}>
      <svg width={W} height={H} aria-hidden="true">
        {!vertical && !tpl && <text x={pos(evStation.col, 0).x} y={18} className="m-tick strong" textAnchor="middle">{fmtShort(ev.date)}</text>}
        {L.branches.map(b => <path key={b.id} d={branchPath(b.from, b.to, b.row)} className={`m-line branch ${b.nodes.every(x => x.node.status === "done") ? "done" : ""}`} />)}
        <path d={mainPath} className="m-line main" />
        {donePath && <path d={donePath} className="m-line main done" />}
        {on && gaps.map(g => { const d = gapPath(g); return <g key={g.id}><path d={d} className={`m-hit ${g.track === "main" ? "m-hit-main" : ""}`} data-testid={`flow-line-${g.u.key}-${g.v.key}`} /><path d={d} className="m-hit-line" /></g> })}
      </svg>
      {L.stations.map((s, i) => s.node ? dot(s.node, s.col, 0, vertical ? "right" : "below", L.stations.slice(0, i).reverse().find(x => x.node)?.node) : null)}
      {L.branches.flatMap(b => b.nodes.map((x, i) => dot(x.node, x.col, b.row, vertical ? "right" : b.row < 0 ? "above" : "below", b.nodes[i - 1]?.node)))}
      {L.stations.filter(s => s.key === EVENT_KEY || s.key === START_KEY || s.key === END_KEY).map(s => {
        const p = pos(s.col, 0)
        return <div key={s.key} className={`m-node ${vertical ? "right" : "below"} m-${s.key.replaceAll("_", "")}`} style={{ "--x": `${p.x}px`, "--y": `${p.y}px` } as CSSProperties}>
          <span className={`m-dot station ${s.key === START_KEY ? "done" : s.key === EVENT_KEY ? (ev.date < state.today ? "done" : "event") : "todo"}`} />
          <span className="m-label"><b>{s.key === EVENT_KEY ? "Event day" : s.key === START_KEY ? "Start" : "Done"}</b>{s.key === EVENT_KEY && vertical && !tpl ? <span>{fmtShort(ev.date)}</span> : null}</span>
        </div>
      })}
      {on && drag && <>
        {gaps.filter(g => g.track !== "main" && g.uId !== drag.id && g.vId !== drag.id).map(g => { const p = gapPoint(g); return <span key={g.id} className={`m-gap${drag.gap?.id === g.id ? " is-near" : ""}`} style={{ left: p.x, top: p.y }} aria-hidden="true" /> })}
        <span className="m-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><b>{byId.get(drag.id)?.title}</b>{drag.gap && <i>Between {name(drag.gap.uId, "the start")} and {name(drag.gap.vId, "the event day")}</i>}</span>
      </>}
      {on && menu && (() => {
        const left = Math.max(8, Math.min(menu.x, window.innerWidth - 256)), top = Math.max(8, Math.min(menu.y, window.innerHeight - 380))
        if (menu.kind === "move") {
          const n = byId.get(menu.id)
          if (!n) return null
          const destination = branchDefinitions.find(b => b.id === menu.target.branchId)
          const from = conditionsOf(n, branchDefinitions).map(conditionLabel).join(" and ") || "Every event"
          return <div className="m-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label="Confirm branch scope" style={{ left, top }} data-testid="flow-menu">
            <b>Move “{n.title}”?</b><span className="small">From: {from}. New scope: {branchConditionLabel(destination)}. Its owner and days of work stay the same.</span>
            <button type="button" className="btn small" onClick={() => { moveToTarget(menu.id, menu.target, true); setMenu(null) }}>Move with this scope</button>
            <button type="button" className="btn btn-quiet small" onClick={() => setMenu(null)}>Cancel</button>
          </div>
        }
        if (menu.kind === "node") {
          const n = byId.get(menu.id)
          if (!n) return null
          const tracks = flowTracks(L).filter(t => t.id !== "main")
          const central = placementOf(n).branchId === "main"
          const own = tracks.find(t => t.id === placementOf(n).branchId)
          const incoming = central ? tracks.filter(t => t.items.at(-1)?.node?.id === n.id) : []
          const outgoing = central ? tracks.filter(t => t.items[0]?.node?.id === n.id) : []
          const choices = [...incoming, ...outgoing]
          const beforeTrack = central ? incoming.find(t => t.id === menuBranchId) : own
          const afterTrack = central ? outgoing.find(t => t.id === menuBranchId) : own
          const insertionTarget = (direction: "before" | "after"): FlowInsertionTarget | null => {
            const track = direction === "before" ? beforeTrack : afterTrack
            if (!track) return null
            const i = track.items.findIndex(x => x.node?.id === n.id)
            const prior = track.items[i - 1], next = track.items[i + 1]
            const reference = central ? direction === "before" ? prior?.node : next?.node : n
            return { branchId: track.id, afterId: direction === "before" ? prior?.node?.id ?? null : n.id, beforeId: direction === "before" ? n.id : next?.node?.id ?? null, ...(reference ? { referenceId: reference.id } : {}), source: direction === "before" ? "before_node" : "after_node" }
          }
          const block = cannotDelete(n)
          return <div className="m-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label={`Actions for ${n.title}`} style={{ left, top }} data-testid="flow-menu">
            <b>{n.title}</b>
            {touch && <button type="button" className="btn small" onClick={() => {
              const trigger = canvasRef.current?.querySelector<HTMLElement>(`[data-testid="flow-node-${CSS.escape(n.stepKey ?? n.id)}"]`)
              setMenu(null)
              // Let the modal release its inert background before opening the rail, so it can remember the step.
              setTimeout(() => { trigger?.focus(); onSelect(n.id) }, 0)
            }}>Open details</button>}
            {central && choices.length > 0 && <label className="small">Insert on branch<select aria-label="Insert on branch" value={menuBranchId} onChange={e => setMenuBranchId(e.target.value)}><option value="">Choose a branch</option>{choices.map(t => <option key={t.id} value={t.id}>{branchDefinitions.find(b => b.id === t.id)?.title ?? t.id}</option>)}</select></label>}
            <button type="button" className="btn small" disabled={!afterTrack} onClick={() => { const target = insertionTarget("after"); if (target) addAt(target) }}>Add a step after this one</button>
            <button type="button" className="btn small" disabled={!beforeTrack} onClick={() => { const target = insertionTarget("before"); if (target) addAt(target) }}>Add a step before this one</button>
            <button type="button" className="btn small" disabled={!!block} onClick={() => removeStep(n.id)} aria-describedby={block ? "m-menu-why" : undefined}>Delete this step</button>
            {block && <span id="m-menu-why" className="small muted">Cannot delete: {block}</span>}
            <button type="button" className="btn btn-quiet small" onClick={() => setMenu(null)}>Close</button>
          </div>
        }
        return null
      })()}
    </div>
    {tpl ? <div className="m-legend small" aria-label="Legend"><span><i className="m-dot baseline todo" />Core event step</span><span><i className="m-dot situation todo" />Situation-based step</span></div> : <div className="m-legend small" aria-label="Legend">
      <span><i className="m-dot done" />Done</span><span><i className="m-dot now" />Started or due</span><span><i className="m-dot todo" />Not started</span><span><i className="m-dot risk" />At risk</span>
    </div>}
  </div>
  {addingBranch && <WorkflowBranchDialog roles={state.roles} onAdd={createBranch} onClose={() => setAddingBranch(false)} />}
  </>
}
