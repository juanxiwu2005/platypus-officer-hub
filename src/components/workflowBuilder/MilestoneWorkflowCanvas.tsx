import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react"
import type { StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { workflowMilestoneDates, WORKFLOW_DONE, WORKFLOW_START } from "../../engine/workflowMilestones"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { fmtShort } from "../../lib/dates"
import { taskShortTitle } from "./taskLabel"
import { buildMilestoneLayout, milestoneDropTarget, type MilestoneTaskPoint } from "./milestoneLayout"
import "./milestone-editor.css"

export interface MilestoneWorkflowCanvasProps {
  steps: StepTemplate[]; graph: WorkflowMilestoneGraph; teams: { id: string; name: string }[]; eventDate: string; selected: string | null
  onSelect: (id: string) => void
  onMove: (stepId: string, branchId: string, targetId?: string, before?: boolean) => void
  onAddTask: (branchId?: string) => void
  onBranchTeamChange: (branchId: string, teamId: string) => void
}
interface Gesture { pointerId: number; stepId: string; x: number; y: number; clientX: number; clientY: number; scrollLeft: number; scrollTop: number; active: boolean }
interface Moving { stepId: string; x: number; y: number; branchId: string | null }
const MIN_ZOOM = 0.86

/** Main-line and branch buttons all report their stored identity to the same Details inspector. */
export function MilestoneWorkflowCanvas({ steps, graph, teams, eventDate, selected, onSelect, onMove, onAddTask, onBranchTeamChange }: MilestoneWorkflowCanvasProps) {
  const layout = useMemo(() => buildMilestoneLayout(steps, graph), [steps, graph])
  const dates = useMemo(() => workflowMilestoneDates(graph, eventDate), [graph, eventDate])
  const viewport = useRef<HTMLDivElement>(null), gesture = useRef<Gesture | null>(null), suppressClick = useRef(false)
  const [available, setAvailable] = useState(1040), [zoom, setZoom] = useState<number | null>(null), [moving, setMoving] = useState<Moving | null>(null)
  const id = useId().replace(/:/g, "")
  const scale = zoom ?? Math.min(1, Math.max(MIN_ZOOM, (available - 4) / layout.width))
  const cancel = () => { gesture.current = null; setMoving(null) }
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
    const point = [...layout.stations, ...layout.points.map(point => ({ id: point.step.key, ...point }))].find(point => point.id === selected), element = viewport.current
    if (!point || !element) return
    const x = point.x * scale, y = point.y * scale
    if (x < element.scrollLeft + 60 || x > element.scrollLeft + element.clientWidth - 60) element.scrollLeft = Math.max(0, x - element.clientWidth / 2)
    if (y < element.scrollTop + 80 || y > element.scrollTop + element.clientHeight - 100) element.scrollTop = Math.max(0, y - element.clientHeight / 2)
  }, [selected, layout, scale])
  const begin = (event: PointerEvent<HTMLButtonElement>, point: MilestoneTaskPoint) => {
    if (event.button !== 0) return
    suppressClick.current = false
    gesture.current = { pointerId: event.pointerId, stepId: point.step.key, x: point.x, y: point.y, clientX: event.clientX, clientY: event.clientY, scrollLeft: viewport.current?.scrollLeft ?? 0, scrollTop: viewport.current?.scrollTop ?? 0, active: false }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const position = (event: PointerEvent<HTMLButtonElement>, active: Gesture) => ({ x: active.x + (event.clientX - active.clientX + (viewport.current?.scrollLeft ?? 0) - active.scrollLeft) / scale, y: active.y + (event.clientY - active.clientY + (viewport.current?.scrollTop ?? 0) - active.scrollTop) / scale })
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    if (!active.active && Math.hypot(event.clientX - active.clientX, event.clientY - active.clientY) < 7) return
    active.active = true; suppressClick.current = true; event.preventDefault()
    const point = position(event, active), target = milestoneDropTarget(layout, active.stepId, point.x, point.y)
    setMoving({ stepId: active.stepId, ...point, branchId: target?.branchId ?? null })
    const element = viewport.current
    if (element && element.clientWidth > 0) {
      const bounds = element.getBoundingClientRect()
      if (event.clientX < bounds.left + 28) element.scrollLeft -= 16
      else if (event.clientX > bounds.right - 28) element.scrollLeft += 16
      if (event.clientY < bounds.top + 28) element.scrollTop -= 14
      else if (event.clientY > bounds.bottom - 28) element.scrollTop += 14
    }
  }
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    const point = position(event, active), target = active.active ? milestoneDropTarget(layout, active.stepId, point.x, point.y) : null
    cancel()
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (target) onMove(active.stepId, target.branchId, target.targetId, target.before)
  }
  const clickTask = (event: React.MouseEvent<HTMLButtonElement>, key: string) => {
    if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; event.preventDefault(); return }
    suppressClick.current = false; onSelect(key)
  }
  return <div className="wfm" data-testid="workflow-dot-canvas">
    <div className="wfm-controls"><span className="small muted">Team branches join the main line. Select any node to edit.</span><div className="wfm-zoom" role="group" aria-label="Canvas zoom"><button type="button" className="btn small" aria-label="Zoom out" disabled={scale <= MIN_ZOOM} onClick={() => setZoom(Math.max(MIN_ZOOM, scale - 0.15))}>−</button><output aria-live="polite">{Math.round(scale * 100)}%</output><button type="button" className="btn small" aria-label="Zoom in" disabled={scale >= 1.6} onClick={() => setZoom(Math.min(1.6, scale + 0.15))}>+</button><button type="button" className="btn small" onClick={() => setZoom(null)}>Fit</button></div></div>
    <div className="wfm-scroll wfb-scroll" ref={viewport} role="region" tabIndex={0} aria-label="Workflow main line and team branches">
      <div className="wfm-size" style={{ width: layout.width * scale, height: layout.height * scale }}><div className="wfm-stage" style={{ width: layout.width, height: layout.height, "--wfm-scale": scale } as CSSProperties}>
        {layout.segments.map((segment, index) => <div key={segment.branch.id} data-testid={`workflow-segment-${segment.branch.id}`} data-branch-id={segment.branch.id} className={`wfm-segment wfm-tone-${teams.findIndex(team => team.id === segment.branch.teamId) % 4}${selected === `branch:${segment.branch.id}` ? " is-selected" : ""}${moving?.branchId === segment.branch.id ? " is-drop-target" : ""}`} role="group" aria-label={`${teams.find(team => team.id === segment.branch.teamId)?.name ?? "Choose team"} branch`} style={{ left: segment.x, top: segment.y, width: segment.width, height: segment.height }}>
          <div className="wfm-branch-head"><label className="sr-only" htmlFor={`${id}-team-${index}`}>Team for {segment.branch.id}</label><select id={`${id}-team-${index}`} aria-label={`Team for ${segment.branch.id}`} value={segment.branch.teamId} onChange={event => onBranchTeamChange(segment.branch.id, event.target.value)}>{!teams.some(team => team.id === segment.branch.teamId) && <option value={segment.branch.teamId}>Choose team</option>}{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button type="button" className="wfm-branch-edit" aria-label={`Edit branch ${segment.branch.id}`} title="Edit branch" onClick={() => onSelect(`branch:${segment.branch.id}`)}>✎</button><button type="button" className="wfm-branch-add" aria-label={`Add task to branch ${segment.branch.id}`} onClick={() => onAddTask(segment.branch.id)}>+</button></div>
        </div>)}
        <svg className="wfm-lines" width={layout.width} height={layout.height} aria-hidden="true"><path className="wfm-main-track" data-testid="workflow-main-track" d={`M${layout.stations[0]?.x ?? 44} ${layout.mainY} H${layout.stations.at(-1)?.x ?? layout.width - 44}`} />{layout.segments.map(segment => <path key={segment.branch.id} className="wfm-branch-track" data-testid="workflow-branch-track" data-branch-id={segment.branch.id} d={segment.path} />)}{layout.stations.filter(station => station.kind === "day").map(station => <path key={station.id} className="wfm-date-guide" d={`M${station.x} 24 V${layout.height - 20}`} />)}</svg>
        {layout.stations.map(station => <button key={station.id} type="button" data-testid={station.id === WORKFLOW_START ? "workflow-start" : station.id === WORKFLOW_DONE ? "workflow-done" : station.kind === "day" ? `workflow-event-day-${(station.dayIndex ?? 0) + 1}` : `workflow-task-${station.id}`} data-station-id={station.id} title={station.title} aria-label={`Edit ${station.title}`} aria-pressed={selected === station.id} className={`wfm-station is-${station.kind}${selected === station.id ? " is-selected" : ""}`} style={{ left: station.x, top: station.y }} onClick={() => onSelect(station.id)}><i aria-hidden="true" /><strong>{station.title}</strong>{station.kind === "day" && <><span>{dates[station.id] ? fmtShort(dates[station.id]) : "Date unavailable"}</span><small>{station.dayIndex === 0 ? "Day 1 · fixed date" : `Day 2 · T+${graph.eventDays[station.dayIndex ?? 0].offsetDays}`}</small></>}</button>)}
        {layout.points.map(point => <button key={point.step.key} type="button" data-testid={`workflow-task-${point.step.key}`} data-branch-id={point.branchId} title={point.step.title} aria-label={`Edit ${point.step.title}`} aria-pressed={selected === point.step.key} className={`wfm-task${workflowStepKind(point.step) === "situation" ? " is-situation" : ""}${selected === point.step.key ? " is-selected" : ""}${moving?.stepId === point.step.key ? " is-dragging" : ""}`} style={{ left: moving?.stepId === point.step.key ? moving.x : point.x, top: moving?.stepId === point.step.key ? moving.y : point.y }} onPointerDown={event => begin(event, point)} onPointerMove={move} onPointerUp={finish} onPointerCancel={() => { suppressClick.current = true; cancel() }} onLostPointerCapture={cancel} onDragStart={event => event.preventDefault()} onClick={event => clickTask(event, point.step.key)}><i aria-hidden="true" /><strong>{taskShortTitle(point.step.title)}</strong></button>)}
      </div></div>
    </div>
    <div className="wfm-legend small"><span><i className="wfm-day-key" />Event day · fixed date</span><span><i />Task / shared check</span><span>Branch → organization team</span></div>
    {!!layout.unplaced.length && <section className="wfm-unplaced" aria-label="Tasks needing a workflow position"><span className="small muted">Choose a position for these tasks:</span>{layout.unplaced.map(step => <button key={step.key} type="button" className="btn small" data-testid={`workflow-task-${step.key}`} onClick={() => onSelect(step.key)}>{step.title}</button>)}</section>}
  </div>
}
