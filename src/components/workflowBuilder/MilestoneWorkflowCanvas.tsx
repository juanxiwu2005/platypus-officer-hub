import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react"
import type { StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { workflowMilestoneDates, WORKFLOW_DONE, WORKFLOW_START } from "../../engine/workflowMilestones"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { fmtShort } from "../../lib/dates"
import { buildLaneLayout, laneDropSlots, nearestDropSlot, PHASE_HEADER, type Lane, type LaneDropSlot, type LaneStation } from "./laneLayout"
import "./lane-editor.css"

export interface MilestoneWorkflowCanvasProps {
  steps: StepTemplate[]; graph: WorkflowMilestoneGraph; teams: { id: string; name: string }[]
  eventDate: string; selected: string | null
  selectMode: boolean; checked: ReadonlySet<string>
  /** Stations, tasks (normal mode) and "branch:<id>" all open the same Details inspector. */
  onSelect: (id: string) => void
  /** Branch tasks report here instead of onSelect while selectMode is on. */
  onToggleCheck: (stepKey: string) => void
  onMove: (stepId: string, branchId: string, targetId?: string, before?: boolean) => void
  onAddTask: (branchId?: string) => void
}
interface Gesture { pointerId: number; stepId: string; x: number; y: number; clientX: number; clientY: number; scrollLeft: number; scrollTop: number; active: boolean; slots: LaneDropSlot[] }
interface Moving { stepId: string; x: number; y: number; slots: LaneDropSlot[]; near: LaneDropSlot | null }
/** A drop counts when the pointer is this close to a diamond, in screen pixels. */
const SNAP_PX = 48
const MISSED_DROP = "Dropped away from a diamond, so nothing changed. Drop a step on a diamond."
const MIN_ZOOM = 0.5, MAX_ZOOM = 1.6, READABLE_ZOOM = 0.85, ZOOM_STEP = 0.15, TONES = 6
/** Approximate width of one phase-label character at --fs-sm semibold, plus the label's left padding. */
const PHASE_CHAR = 7.6, PHASE_PAD = 12

const stationTestId = (station: LaneStation) => station.id === WORKFLOW_START ? "workflow-start" : station.id === WORKFLOW_DONE ? "workflow-done" : station.kind === "day" ? `workflow-event-day-${(station.dayIndex ?? 0) + 1}` : `workflow-task-${station.id}`

/** One horizontal row per team branch around a centred main line; every node reports its stored identity. */
export function MilestoneWorkflowCanvas({ steps, graph, teams, eventDate, selected, selectMode, checked, onSelect, onToggleCheck, onMove, onAddTask }: MilestoneWorkflowCanvasProps) {
  const viewport = useRef<HTMLDivElement>(null), gesture = useRef<Gesture | null>(null), suppressClick = useRef(false)
  const [available, setAvailable] = useState(1040), [zoom, setZoom] = useState<number | null>(null), [moving, setMoving] = useState<Moving | null>(null), [dropNote, setDropNote] = useState("")
  const layout = useMemo(() => buildLaneLayout(steps, graph, { availableWidth: available - 4 }), [steps, graph, available])
  const dates = useMemo(() => workflowMilestoneDates(graph, eventDate), [graph, eventDate])
  // Fit shows the whole chart; the default opens at a readable size and scrolls sideways when the chart is wider.
  const fit = Math.min(1, Math.max(MIN_ZOOM, (available - 4) / layout.width))
  const scale = zoom ?? Math.max(READABLE_ZOOM, fit)
  // The phase header is a fixed-height strip; the scaled stage starts right under it.
  const screenY = (y: number) => PHASE_HEADER + (y - PHASE_HEADER) * scale
  // Narrow phases (one event day at a small zoom) push the next label right instead of overlapping it.
  const phaseIndents = layout.phases.reduce<{ indents: number[]; end: number }>((acc, phase) => {
    const start = Math.max(phase.x0 * scale + PHASE_PAD, acc.end + PHASE_PAD)
    return { indents: [...acc.indents, start - phase.x0 * scale], end: start + phase.label.length * PHASE_CHAR }
  }, { indents: [], end: -Infinity }).indents
  const cancel = () => { gesture.current = null; setMoving(null) }
  const teamOf = (lane: Lane) => {
    const index = teams.findIndex(team => team.id === lane.branch.teamId)
    return { name: index < 0 ? "Choose team" : teams[index].name, tone: index < 0 ? "none" : String(index % TONES) }
  }

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const measure = () => setAvailable(element.clientWidth || 1040)
    measure()
    if (typeof ResizeObserver !== "undefined") { const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect() }
    window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure)
  }, [])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && gesture.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = true; cancel() } }
    window.addEventListener("keydown", escape, true); return () => window.removeEventListener("keydown", escape, true)
  }, [])
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const lane = layout.lanes.find(item => `branch:${item.branch.id}` === selected)
    const point = [...layout.stations, ...layout.points.map(item => ({ id: item.step.key, x: item.x, y: item.y }))].find(item => item.id === selected) ?? (lane ? { x: lane.x + lane.width / 2, y: lane.y + 20 } : null)
    if (!point) {
      if (!selected) element.scrollTop = Math.max(0, screenY(layout.mainY) - (element.clientHeight || 560) / 2)
      return
    }
    const x = point.x * scale, y = screenY(point.y)
    if (x < element.scrollLeft + 60 || x > element.scrollLeft + element.clientWidth - 60) element.scrollLeft = Math.max(0, x - element.clientWidth / 2)
    if (y < element.scrollTop + PHASE_HEADER + 60 || y > element.scrollTop + element.clientHeight - 100) element.scrollTop = Math.max(0, y - element.clientHeight / 2)
  }, [selected, layout, scale])

  // Tasks in a lane and tasks on the main line drag the same way; event days, Start and Done stay put.
  const begin = (event: PointerEvent<HTMLButtonElement>, stepId: string, x: number, y: number) => {
    if (event.button !== 0) return
    suppressClick.current = false
    gesture.current = { pointerId: event.pointerId, stepId, x, y, clientX: event.clientX, clientY: event.clientY, scrollLeft: viewport.current?.scrollLeft ?? 0, scrollTop: viewport.current?.scrollTop ?? 0, active: false, slots: [] }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const position = (event: PointerEvent<HTMLButtonElement>, active: Gesture) => ({ x: active.x + (event.clientX - active.clientX + (viewport.current?.scrollLeft ?? 0) - active.scrollLeft) / scale, y: active.y + (event.clientY - active.clientY + (viewport.current?.scrollTop ?? 0) - active.scrollTop) / scale })
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    if (!active.active && Math.hypot(event.clientX - active.clientX, event.clientY - active.clientY) < 7) return
    if (!active.active) { active.active = true; active.slots = laneDropSlots(layout, active.stepId); setDropNote("") }
    suppressClick.current = true; event.preventDefault()
    const point = position(event, active)
    setMoving({ stepId: active.stepId, ...point, slots: active.slots, near: nearestDropSlot(active.slots, point.x, point.y, SNAP_PX / scale) })
    const element = viewport.current
    if (element && element.clientWidth > 0) {
      const bounds = element.getBoundingClientRect()
      if (event.clientX < bounds.left + 28) element.scrollLeft -= 16
      else if (event.clientX > bounds.right - 28) element.scrollLeft += 16
      if (event.clientY < bounds.top + PHASE_HEADER + 28) element.scrollTop -= 14
      else if (event.clientY > bounds.bottom - 28) element.scrollTop += 14
    }
  }
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    const point = position(event, active), slot = active.active ? nearestDropSlot(active.slots, point.x, point.y, SNAP_PX / scale) : null
    cancel()
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (slot) onMove(active.stepId, slot.branchId, slot.targetId, slot.before)
    else if (active.active) setDropNote(MISSED_DROP)
  }
  const dragHandlers = (stepId: string, x: number, y: number) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => begin(event, stepId, x, y), onPointerMove: move, onPointerUp: finish,
    onPointerCancel: () => { suppressClick.current = true; cancel() }, onLostPointerCapture: cancel, onDragStart: (event: { preventDefault: () => void }) => event.preventDefault(),
  })
  /** A click right after a drag is the drag's own release, not a selection. */
  const swallowDragClick = (event: MouseEvent<HTMLButtonElement>) => {
    const swallow = suppressClick.current && event.detail !== 0
    suppressClick.current = false
    if (swallow) event.preventDefault()
    return swallow
  }
  const clickTask = (event: MouseEvent<HTMLButtonElement>, key: string) => {
    if (swallowDragClick(event)) return
    if (selectMode) onToggleCheck(key)
    else onSelect(key)
  }
  const clickStation = (event: MouseEvent<HTMLButtonElement>, id: string) => { if (!swallowDragClick(event)) onSelect(id) }

  return <div className="wfx" data-testid="workflow-dot-canvas">
    <div className="wfx-controls">
      <span className="small muted">Team branches join the main line. Select any node to edit.</span>
      <div className="wfx-zoom" role="group" aria-label="Canvas zoom">
        <button type="button" className="btn small" aria-label="Zoom out" disabled={scale <= MIN_ZOOM} onClick={() => setZoom(Math.max(MIN_ZOOM, scale - ZOOM_STEP))}>−</button>
        <output aria-live="polite">{Math.round(scale * 100)}%</output>
        <button type="button" className="btn small" aria-label="Zoom in" disabled={scale >= MAX_ZOOM} onClick={() => setZoom(Math.min(MAX_ZOOM, scale + ZOOM_STEP))}>+</button>
        <button type="button" className="btn small" onClick={() => setZoom(fit)}>Fit</button>
      </div>
    </div>
    <p className="small wfx-drop-note" role="status" data-testid="workflow-drop-note">{dropNote}</p>
    <div className="wfx-scroll" ref={viewport} role="region" tabIndex={0} aria-label="Workflow main line and team branches" style={{ "--wfx-scale": scale, "--wfx-head": `${PHASE_HEADER}px` } as CSSProperties}>
      <ol className="wfx-phases" aria-label="Workflow phases" style={{ width: layout.width * scale }}>
        {layout.phases.map((phase, index) => <li key={phase.id} data-testid={`workflow-phase-${phase.id}`} className={`wfx-phase is-${phase.id}`} style={{ left: phase.x0 * scale, width: (phase.x1 - phase.x0) * scale, "--wfx-indent": `${phaseIndents[index]}px` } as CSSProperties}><span>{phase.label}</span><i aria-hidden="true" /></li>)}
      </ol>
      <div className="wfx-size" style={{ width: layout.width * scale, height: (layout.height - PHASE_HEADER) * scale }}>
        <div className="wfx-stage" style={{ width: layout.width, height: layout.height }}>
          {layout.lanes.map(lane => {
            const team = teamOf(lane), count = lane.branch.stepIds.length
            return <div key={lane.branch.id} data-testid={`workflow-segment-${lane.branch.id}`} data-branch-id={lane.branch.id} role="group" aria-label={`${team.name} branch`} className={`wfx-lane wfx-tone-${team.tone}${selected === `branch:${lane.branch.id}` ? " is-selected" : ""}${moving?.near?.branchId === lane.branch.id ? " is-drop-target" : ""}`} style={{ left: lane.x, top: lane.y, width: lane.width, height: lane.height }}>
              <div className="wfx-lane-head">
                <button type="button" className="wfx-pill" data-testid={`workflow-branch-pill-${lane.branch.id}`} aria-label={`${team.name} · ${count} ${count === 1 ? "step" : "steps"}, edit branch`} aria-pressed={selected === `branch:${lane.branch.id}`} title={`${team.name} · ${count} ${count === 1 ? "step" : "steps"}`} onClick={() => onSelect(`branch:${lane.branch.id}`)}>{team.name} · {count} {count === 1 ? "step" : "steps"}</button>
                <button type="button" className="wfx-add" aria-label={`Add task to ${team.name} branch`} title="Add task" onClick={() => onAddTask(lane.branch.id)}>+</button>
              </div>
            </div>
          })}
          <svg className="wfx-lines" width={layout.width} height={layout.height} aria-hidden="true">
            <path className="wfx-main-track" data-testid="workflow-main-track" d={`M${layout.stations[0]?.x ?? 0} ${layout.mainY} H${layout.stations.at(-1)?.x ?? layout.width}`} />
            {layout.lanes.map(lane => <path key={lane.branch.id} className={`wfx-branch-track wfx-tone-${teamOf(lane).tone}`} data-testid="workflow-branch-track" data-branch-id={lane.branch.id} d={lane.path} />)}
          </svg>
          {layout.stations.map(station => {
            const situation = station.step && workflowStepKind(station.step) === "situation", dragging = moving?.stepId === station.id
            return <button key={station.id} type="button" data-testid={stationTestId(station)} data-station-id={station.id} title={station.title} aria-label={`Edit ${station.title}`} aria-pressed={selected === station.id} className={`wfx-station is-${station.kind}${situation ? " is-situation" : ""}${selected === station.id ? " is-selected" : ""}${dragging ? " is-dragging" : ""}`} style={{ left: dragging ? moving.x : station.x, top: dragging ? moving.y : station.y }} {...(station.kind === "task" ? dragHandlers(station.id, station.x, station.y) : {})} onClick={event => station.kind === "task" ? clickStation(event, station.id) : onSelect(station.id)}>
              <i aria-hidden="true" />
              <strong>{station.title}</strong>
              {station.kind === "day" && <><span>{dates[station.id] ? fmtShort(dates[station.id]) : "Date unavailable"}</span><small>{station.dayIndex === 0 ? "Day 1 · T0" : `Day 2 · T+${graph.eventDays[station.dayIndex ?? 0].offsetDays}`}</small></>}
            </button>
          })}
          {layout.points.map(point => {
            const key = point.step.key, isChecked = selectMode && checked.has(key), dragging = moving?.stepId === key
            return <button key={key} type="button" data-testid={`workflow-task-${key}`} data-branch-id={point.branchId} title={point.step.title} aria-label={`${selectMode ? "Select" : "Edit"} ${point.step.title}`} aria-pressed={selectMode ? isChecked : selected === key} className={`wfx-task${workflowStepKind(point.step) === "situation" ? " is-situation" : ""}${!selectMode && selected === key ? " is-selected" : ""}${isChecked ? " is-checked" : ""}${dragging ? " is-dragging" : ""}`} style={{ left: dragging ? moving.x : point.x, top: dragging ? moving.y : point.y }} {...dragHandlers(key, point.x, point.y)} onClick={event => clickTask(event, key)}>
              <i aria-hidden="true">{isChecked ? "✓" : ""}</i>
              <strong>{point.step.title || "Untitled task"}</strong>
            </button>
          })}
          {moving?.slots.map(slot => <span key={slot.id} aria-hidden="true" data-testid="workflow-drop-slot" data-branch-id={slot.branchId} data-target-id={slot.targetId} data-before={slot.before === undefined ? undefined : String(slot.before)} className={`wfx-slot${moving.near?.id === slot.id ? " is-near" : ""}`} style={{ left: slot.x, top: slot.y }} />)}
        </div>
      </div>
    </div>
    <ul className="wfx-legend small" aria-label="Legend">
      <li><i className="wfx-key is-core" aria-hidden="true" /><strong>Core step</strong><span>Required in all events</span></li>
      <li><i className="wfx-key is-situation" aria-hidden="true" /><strong>Conditional step</strong><span>Used only when needed</span></li>
      <li><i className="wfx-key is-team" aria-hidden="true" /><strong>Team area</strong><span>Owned by an organization team</span></li>
      <li><i className="wfx-key is-day" aria-hidden="true" /><strong>Event day</strong><span>fixed date</span></li>
    </ul>
    {!!layout.unplaced.length && <section className="wfx-unplaced" aria-label="Tasks needing a workflow position"><span className="small muted">Choose a position for these tasks:</span>{layout.unplaced.map(step => <button key={step.key} type="button" className="btn small" data-testid={`workflow-task-${step.key}`} aria-label={`Edit ${step.title}`} onClick={() => onSelect(step.key)}>{step.title}</button>)}</section>}
  </div>
}
