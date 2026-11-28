import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import type { DemoState, Node } from "../../data/types"
import type { Forecast } from "../../engine/forecast"
import type { Schedule } from "../../engine/schedule"
import { WORKFLOW_START } from "../../engine/workflowMilestones"
import { fmtShort } from "../../lib/dates"
import { nodeStop } from "../../lib/phases"
import { isAtRisk } from "../../lib/nextUp"
import { firstName } from "../../pages/helpers"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { statusStyles } from "../ui"
import { useRail } from "../rail/RailContext"
import { buildLaneLayout } from "../workflowBuilder/laneLayout"
import { projectMilestoneExecution } from "./milestoneExecution"
import "../workflowBuilder/lane-editor.css"
import "./milestoneExecution.css"

interface Props { state: DemoState; sched: Schedule; forecast: Forecast; eventId: string; selectedId: string | null; onSelect: (id: string) => void }
/** The same tones and readable zoom as Settings → Workflow, so a run looks like its template there. */
const TONES = 6, READABLE_ZOOM = 0.85, MIN_ZOOM = 0.5

/**
 * Execution draws the template's Settings geometry (buildLaneLayout): the main line, one row per team branch and
 * the same joins. It leaves out the tinted team band and every authoring control. Each dot is a real activity task.
 */
export function MilestoneExecutionChart({ state, sched, forecast, eventId, selectedId, onSelect }: Props) {
  const event = state.events.find(item => item.id === eventId)
  const projection = useMemo(() => event ? projectMilestoneExecution(event, state.nodes) : null, [event, state.nodes])
  // Settings keeps empty branches to add tasks to; an activity shows only branches that still hold tasks.
  const graph = useMemo(() => projection?.graph ? { ...projection.graph, teamBranches: projection.graph.teamBranches.filter(branch => branch.stepIds.length) } : null, [projection])
  const viewport = useRef<HTMLDivElement>(null), [available, setAvailable] = useState(940)
  const layout = useMemo(() => graph && projection ? buildLaneLayout(projection.steps, graph, { availableWidth: available - 4 }) : null, [graph, projection, available])
  const [stationId, setStationId] = useState<string | null>(null)
  const lastPositioned = useRef<{ eventId: string; selectedId: string | null } | null>(null)
  const rail = useRail(), styles = statusStyles(state)
  const station = layout?.stations.find(item => item.id === stationId && item.kind !== "task")
  const scale = layout ? Math.max(READABLE_ZOOM, Math.min(1, Math.max(MIN_ZOOM, (available - 4) / layout.width))) : 1
  const screenY = (y: number) => y * scale
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const measure = () => setAvailable(element.clientWidth || 940)
    measure()
    if (typeof ResizeObserver !== "undefined") { const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect() }
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])
  useEffect(() => {
    const element = viewport.current
    if (!element || !layout || !projection) return
    const previous = lastPositioned.current
    if (previous?.eventId === eventId && previous.selectedId === selectedId) return
    const key = selectedId ? [...projection.nodeByStep].find(([, node]) => node.id === selectedId)?.[0] : undefined
    const point = key ? layout.stations.find(item => item.id === key) ?? layout.points.find(item => item.step.key === key) : undefined
    element.scrollTop = Math.max(0, screenY(point?.y ?? layout.mainY) - element.clientHeight / 2)
    if (point) element.scrollLeft = Math.max(0, point.x * scale - element.clientWidth / 2)
    else if (previous?.eventId !== eventId) element.scrollLeft = 0
    lastPositioned.current = { eventId, selectedId }
  }, [eventId, selectedId, layout, projection, scale])
  useEffect(() => {
    if (!station || !event || !graph || !projection) return
    const day = graph.eventDays.find(item => item.id === station.id)
    const description = day?.details ?? (station.id === WORKFLOW_START ? graph.start.details : graph.done.details)
    const date = projection.dates[station.id]
    rail.setWorkflowDetail(<section className="form-stack" data-testid="execution-milestone-details" aria-label="Event day details">
      <header className="action-row"><h3>{station.title}</h3><button type="button" className="btn small" onClick={() => { setStationId(null); rail.closeDetail() }}>Close</button></header>
      <p className="small muted">{day ? "Event day · fixed date" : "Workflow boundary"}</p>
      <p>{event.name}</p>
      {date && <p>Event date <strong><time dateTime={date}>{fmtShort(date)}</time></strong></p>}
      {description && <p>{description}</p>}
      <p className="small muted">From {event.workflowRun?.templateName} · v{event.workflowRun?.templateVersion}. {day ? "Late tasks do not move this date." : "Start or end of the workflow."}</p>
    </section>)
    return () => rail.setWorkflowDetail(null)
  }, [station, event, graph, projection, rail.setWorkflowDetail])
  const selectTask = (node: Node) => { setStationId(null); onSelect(node.id) }
  const toneOf = (teamId: string) => {
    const index = projection?.teams.findIndex(team => team.id === teamId) ?? -1
    return index < 0 ? "none" : String(index % TONES)
  }
  // `tone` is the branch line the dot sits on, so its ring has the line's colour; main-line dots take the main line's.
  const renderTask = (key: string, x: number, y: number, shared = false, tone = "none") => {
    const node = projection?.nodeByStep.get(key)
    if (!node) return null
    const plan = sched.nodes[node.id]
    const status = nodeStop(node, state.today, isAtRisk(state, sched, forecast, node))
    const kind = workflowStepKind(node, event?.workflowBranches) === "core" ? "baseline" : "situation"
    const owner = state.people.find(person => person.id === node.ownerId)?.name ?? "No owner"
    return <button key={key} type="button" className={`m-dot mxe-task ${kind} ${status}${shared ? " is-shared" : ` wfx-tone-${tone}`}`} data-testid={`flow-node-${node.stepKey ?? node.id}`} data-task-id={node.id} data-step-id={key} aria-pressed={!stationId && selectedId === node.id} aria-label={`${node.title}. ${styles[node.status].label}. Owner ${owner}. Due ${plan ? fmtShort(plan.club) : "pending"}.`} title={`${node.title} · ${owner}${plan ? ` · Due ${fmtShort(plan.club)}` : ""}`} style={{ left: x, top: y }} onClick={() => selectTask(node)}>
      <i aria-hidden="true" /><strong>{node.title}</strong><span>{firstName(state, node.ownerId)}{plan ? ` · ${fmtShort(plan.club)}` : ""}</span>
    </button>
  }
  if (!event || !projection) return null
  return <div className="mxe" data-testid="milestone-execution-chart">
    {layout && graph && <div className="wfx-scroll mxe-scroll" data-testid="flow-chart" ref={viewport} tabIndex={0} role="region" aria-label="Activity workflow: main line and team branches" style={{ "--wfx-scale": scale} as CSSProperties}>
      <div className="wfx-size" style={{ width: layout.width * scale, height: layout.height * scale }}><div className="wfx-stage" style={{ width: layout.width, height: layout.height }}>
        {layout.lanes.map(lane => {
          const team = projection.teams.find(item => item.id === lane.branch.teamId)?.name ?? "Team unavailable", count = lane.points.length
          return <div key={lane.branch.id} className={`wfx-lane mxe-lane wfx-tone-${toneOf(lane.branch.teamId)}`} data-testid="milestone-execution-branch" data-branch-id={lane.branch.id} data-team-id={lane.branch.teamId} role="group" aria-label={`${team} branch`} style={{ left: lane.x, top: lane.y, width: lane.width, height: lane.height }}>
            <div className="wfx-lane-head"><span className="wfx-pill">{team} · {count} {count === 1 ? "step" : "steps"}</span></div>
          </div>
        })}
        <svg className="wfx-lines" width={layout.width} height={layout.height} aria-hidden="true">
          <path className="wfx-main-track" d={`M${layout.stations[0]?.x ?? 0} ${layout.mainY} H${layout.stations.at(-1)?.x ?? layout.width}`} />
          {layout.lanes.map(lane => <path key={lane.branch.id} data-testid="milestone-execution-track" data-branch-id={lane.branch.id} className={`wfx-branch-track wfx-tone-${toneOf(lane.branch.teamId)}`} d={lane.path} />)}
        </svg>
        {layout.stations.map(item => item.kind === "task" ? renderTask(item.id, item.x, item.y, true) : <button key={item.id} type="button" className={`wfx-station is-${item.kind}${stationId === item.id ? " is-selected" : ""}`} data-testid={item.kind === "day" ? `flow-event-day-${(item.dayIndex ?? 0) + 1}` : item.id === WORKFLOW_START ? "flow-start" : "flow-done"} data-station-id={item.id} aria-label={`View ${item.title}${projection.dates[item.id] ? `, ${fmtShort(projection.dates[item.id])}` : ""}`} aria-pressed={stationId === item.id} style={{ left: item.x, top: item.y }} onClick={() => { setStationId(item.id); rail.show({ kind: "workflow" }) }}>
          <i aria-hidden="true" /><strong>{item.title}</strong>
          {item.kind === "day" && <><span>{projection.dates[item.id] ? fmtShort(projection.dates[item.id]) : "Date unavailable"}</span><small>{item.dayIndex ? `Event day + ${graph.eventDays[item.dayIndex].offsetDays}` : "Event day"}</small></>}
        </button>)}
        {layout.points.map(point => renderTask(point.step.key, point.x, point.y, false, toneOf(layout.lanes.find(lane => lane.branch.id === point.branchId)?.branch.teamId ?? "")))}
      </div></div>
    </div>}
    {layout && <div className="mxe-legend small" aria-label="Legend"><span><i className="mxe-key" aria-hidden="true" />Not started</span><span><i className="mxe-key is-now" aria-hidden="true" />Started or due</span><span><i className="mxe-key is-done" aria-hidden="true" />Done</span><span><i className="mxe-key is-risk" aria-hidden="true" />At risk</span><span><i className="mxe-key is-situation" aria-hidden="true" />Conditional step</span></div>}
    {!!projection.issues.length && <div role="status">{projection.issues.map(issue => <p className="small muted" key={issue}>{issue}</p>)}</div>}
    {!!projection.unplaced.length && <section className="mxe-unplaced" aria-label="Other activity tasks">{projection.unplaced.map(node => <button type="button" className="btn small" data-task-id={node.id} key={node.id} onClick={() => selectTask(node)}>{node.title}</button>)}</section>}
  </div>
}
