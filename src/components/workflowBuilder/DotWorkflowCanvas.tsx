import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react"
import type { StepTemplate, WorkflowBranch } from "../../data/types"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { taskShortTitle } from "./taskLabel"
import { buildDotLayout, dotDropTarget, type DotPoint, type DotTeam } from "./dotLayout"
import "./dot-editor.css"

export interface DotWorkflowCanvasProps {
  steps: StepTemplate[]; branches?: WorkflowBranch[]; stepTeams: Record<string, string>; teams: DotTeam[]
  selected: string | null; connecting: boolean
  onSelect: (key: string) => void
  onMove: (key: string, teamId: string, targetId?: string, before?: boolean) => void
  onAddTask: (teamId: string) => void
  onRenameTeam?: (teamId: string, name: string) => boolean
}
interface Gesture { key: string; pointerId: number; clientX: number; clientY: number; x: number; y: number; active: boolean; startScrollLeft: number; startScrollTop: number }
interface Dragging { key: string; x: number; y: number; teamId: string | null }
const MIN_SCALE = 0.86

/** The organization owns the team map. Pointer gestures report intent, never mutate workflow data. */
export function DotWorkflowCanvas({ steps, branches, stepTeams, teams, selected, connecting, onSelect, onMove, onAddTask, onRenameTeam }: DotWorkflowCanvasProps) {
  const graph = useMemo(() => buildDotLayout(steps, stepTeams, teams), [steps, stepTeams, teams])
  const viewport = useRef<HTMLDivElement>(null), gestures = useRef<Gesture | null>(null)
  const suppressClick = useRef(false)
  const [available, setAvailable] = useState(940), [zoom, setZoom] = useState<number | null>(null)
  const [drag, setDrag] = useState<Dragging | null>(null), [showLinks, setShowLinks] = useState(false)
  const [rename, setRename] = useState<string | null>(null), [teamName, setTeamName] = useState(""), [renameError, setRenameError] = useState("")
  const marker = useId().replace(/:/g, "")
  const scale = zoom ?? Math.min(1, Math.max(MIN_SCALE, (available - 4) / graph.width))
  const clearDrag = () => { gestures.current = null; setDrag(null) }
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const measure = () => setAvailable(element.clientWidth || 940)
    measure()
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure); observer.observe(element)
      return () => observer.disconnect()
    }
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === "Escape" && gestures.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = true; clearDrag() } }
    window.addEventListener("keydown", cancel, true)
    return () => window.removeEventListener("keydown", cancel, true)
  }, [])
  useEffect(() => {
    const point = graph.points.find(item => item.step.key === selected), element = viewport.current
    if (!point || !element || drag) return
    const left = point.x * scale, top = point.y * scale
    if (left < element.scrollLeft + 60 || left > element.scrollLeft + element.clientWidth - 60) element.scrollLeft = Math.max(0, left - element.clientWidth / 2)
    if (top < element.scrollTop + 80 || top > element.scrollTop + element.clientHeight - 80) element.scrollTop = Math.max(0, top - element.clientHeight / 2)
  }, [selected, graph, scale])
  const begin = (event: PointerEvent<HTMLButtonElement>, point: DotPoint) => {
    if (event.button !== 0 || connecting) return
    suppressClick.current = false
    gestures.current = { key: point.step.key, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: point.x, y: point.y, active: false, startScrollLeft: viewport.current?.scrollLeft ?? 0, startScrollTop: viewport.current?.scrollTop ?? 0 }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const position = (event: PointerEvent<HTMLButtonElement>, gesture: Gesture) => ({
    x: gesture.x + (event.clientX - gesture.clientX + (viewport.current?.scrollLeft ?? 0) - gesture.startScrollLeft) / scale,
    y: gesture.y + (event.clientY - gesture.clientY + (viewport.current?.scrollTop ?? 0) - gesture.startScrollTop) / scale,
  })
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestures.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (!gesture.active && Math.hypot(event.clientX - gesture.clientX, event.clientY - gesture.clientY) < 7) return
    gesture.active = true; suppressClick.current = true; event.preventDefault()
    const point = position(event, gesture), target = dotDropTarget(graph, gesture.key, point.x, point.y)
    setDrag({ key: gesture.key, ...point, teamId: target?.teamId ?? null })
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
    const gesture = gestures.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    const point = position(event, gesture), target = gesture.active ? dotDropTarget(graph, gesture.key, point.x, point.y) : null
    clearDrag()
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (target) onMove(gesture.key, target.teamId, target.targetId, target.before)
  }
  const renameTeam = (id: string) => {
    if (!teamName.trim()) { setRenameError("Give this team a name."); return }
    if (onRenameTeam?.(id, teamName.trim())) { setRename(null); setRenameError("") }
    else setRenameError("Could not rename this team. Use a distinct name and try again.")
  }
  return <div className="wfd" data-testid="workflow-dot-canvas">
    <div className="wfd-controls">
      <span className="small muted">Drag a dot to another team. Select it to edit.</span>
      <div className="wfd-zoom" role="group" aria-label="Canvas zoom">
        <button type="button" className="btn small" aria-label="Zoom out" disabled={scale <= MIN_SCALE} onClick={() => setZoom(Math.max(MIN_SCALE, scale - 0.15))}>−</button>
        <output aria-live="polite">{Math.round(scale * 100)}%</output>
        <button type="button" className="btn small" aria-label="Zoom in" disabled={scale >= 1.6} onClick={() => setZoom(Math.min(1.6, scale + 0.15))}>+</button>
        <button type="button" className="btn small" onClick={() => setZoom(null)}>Fit</button>
      </div>
    </div>
    <div className="wfd-scroll wfb-scroll" ref={viewport} tabIndex={0} role="region" aria-label="Workflow team branches, scroll to explore">
      <div className="wfd-size" style={{ width: graph.width * scale, height: graph.height * scale }}>
        <div className="wfd-stage" style={{ width: graph.width, height: graph.height, "--wfd-scale": scale } as CSSProperties}>
          {graph.lanes.map(lane => <div key={lane.team.id} data-testid={`workflow-team-${lane.team.id}`} data-team-id={lane.team.id} className={`wfd-team wfd-tone-${lane.row % 4}${drag?.teamId === lane.team.id ? " is-drop-target" : ""}`} role="group" aria-label={`${lane.team.name} branch`} style={{ top: lane.top, height: lane.height, width: graph.width - 144 }}>
            <div className="wfd-team-head">
              {rename === lane.team.id ? <form className="wfd-team-rename" onSubmit={event => { event.preventDefault(); renameTeam(lane.team.id) }}><label className="sr-only" htmlFor={`${marker}-team-name`}>Team name</label><input id={`${marker}-team-name`} value={teamName} maxLength={80} onChange={event => setTeamName(event.target.value)} autoFocus onKeyDown={event => { if (event.key === "Escape") { setRename(null); setRenameError("") } }} /><button type="submit" className="btn small">Save name</button><button type="button" className="btn small" onClick={() => { setRename(null); setRenameError("") }}>Cancel</button></form>
                : <><button type="button" className="wfd-team-title" disabled={!onRenameTeam} aria-label={`Rename ${lane.team.name}`} onClick={() => { setTeamName(lane.team.name); setRename(lane.team.id); setRenameError("") }}><b>{lane.team.name}</b><span>{lane.points.length} {lane.points.length === 1 ? "node" : "nodes"}</span>{onRenameTeam && <span aria-hidden="true">⌄</span>}</button><button type="button" className="wfd-add" aria-label={`Add task to ${lane.team.name}`} onClick={() => onAddTask(lane.team.id)}>+ Add node</button></>}
            </div>
            {!lane.points.length && <span className="wfd-empty">Add a node or drag one here</span>}
            {rename === lane.team.id && renameError && <span role="alert" className="wfd-rename-error">{renameError}</span>}
          </div>)}
          <svg className="wfd-lines" width={graph.width} height={graph.height} aria-hidden="true">
            <defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" className="wfd-arrow" /></marker></defs>
            <path className="wfd-main-track" data-testid="workflow-main-track" d={`M${graph.start.x} ${graph.start.y} H${graph.done.x}`} />
            {graph.lanes.map(lane => <path key={lane.team.id} className="wfd-team-track" data-testid="workflow-branch-track" d={lane.path} />)}
            {graph.links.map(link => <path key={`${link.from}:${link.to}`} data-testid="workflow-dependency" data-from={link.from} data-to={link.to} d={link.path} markerEnd={`url(#${marker})`} className={`wfd-dependency${selected === link.from || selected === link.to ? " is-related" : ""}${showLinks ? " is-shown" : ""}`} />)}
          </svg>
          <div className="wfd-endpoint" data-testid="workflow-start" style={{ left: graph.start.x, top: graph.start.y }}><i /><b>Start</b></div>
          <div className="wfd-endpoint" data-testid="workflow-done" style={{ left: graph.done.x, top: graph.done.y }}><i /><b>Done</b></div>
          {graph.points.map(point => {
            const dragged = drag?.key === point.step.key, kind = workflowStepKind(point.step, branches)
            return <button key={point.step.key} type="button" data-testid={`workflow-task-${point.step.key}`} data-team-id={point.teamId} data-col={point.col} aria-label={`Edit ${point.step.title || "Untitled task"}`} aria-pressed={selected === point.step.key} title={`${point.step.title || "Untitled task"} · ${kind === "core" ? "Core step" : "Situation-based step"}. Drag to move; select to edit.`}
              className={`wfd-node ${kind === "situation" ? "is-situation" : "is-core"}${selected === point.step.key ? " is-selected" : ""}${dragged ? " is-dragging" : ""}`}
              style={{ left: dragged ? drag.x : point.x, top: dragged ? drag.y : point.y }}
              onPointerDown={event => begin(event, point)} onPointerMove={move} onPointerUp={finish} onPointerCancel={() => { suppressClick.current = true; clearDrag() }} onLostPointerCapture={clearDrag} onDragStart={event => event.preventDefault()}
              onClick={event => { if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; event.preventDefault(); return }; suppressClick.current = false; onSelect(point.step.key) }}>
              <i className="wfd-dot" aria-hidden="true" /><strong data-testid="task-title">{taskShortTitle(point.step.title)}</strong>
            </button>
          })}
        </div>
      </div>
    </div>
    <div className="wfd-footer small"><span className="wfd-key"><i className="is-core" />Core step</span><span className="wfd-key"><i className="is-situation" />Situation-based step</span><label className="check-label"><input type="checkbox" checked={showLinks} onChange={event => setShowLinks(event.target.checked)} />Show all prerequisites</label></div>
    {!!graph.unassigned.length && <p className="small muted">{graph.unassigned.length} {graph.unassigned.length === 1 ? "node needs" : "nodes need"} a team. Select {graph.unassigned.length === 1 ? "it" : "one"} above to assign a branch.</p>}
  </div>
}
